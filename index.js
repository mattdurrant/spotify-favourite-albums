const spotify           = require('./spotify.js')
const albumRepository   = require('./album-repository')
const spotifyRepository = require('./spotify-repository')
const retry             = require('async-retry')
const ora               = require('ora')
const Filter            = require('bad-words'), filter = new Filter()
filter.removeWords('god', 'bastard', 'hell', 'damn', 'sex', 'whore', 'rape')

; (async () => {
  await start();
})()

async function start() {
  await saveFavouriteAlbums()
  await savePurchasedAlbums()
  process.exit()
}

async function saveFavouriteAlbums() {
  try {
    //await retry(async bail => {
      let favouriteTracks = await spotify.getFavouriteTracks()
      
      let albums  = await groupTracksIntoAlbums(favouriteTracks)
      albums      = await scoreAlbums(albums, 0.25)
      albums      = await fillInUnratedAlbumTracks(albums)
     
      for (let i = 0; i < albums.length; i++) {
          await albumRepository.insert(albums[i])
      }
    /*}, {
      retries: 10
    })*/
  }
  catch(ex) {
    console.log(ex)
  }
} 

async function fillInUnratedAlbumTracks(albums) {
  for (let album of albums) {
    let savedAlbum = await spotifyRepository.load(album.albumId)
    if (savedAlbum == null) 
      await fillInAlbumFromSpotify(album)
    else
      await fillInAlbumFromDatabase(savedAlbum, album)  
  }

  return albums
}

async function fillInAlbumFromDatabase(savedAlbum, album) {
  album.type = savedAlbum.type
  
  for (let albumTrack of savedAlbum.tracks) {        
    let foundTrack = album.tracks.find(obj => {
      return obj.trackId === albumTrack.id
    })

    let score = foundTrack ? foundTrack.score : 0

    album.tracksStatus.push({ 
      track:  albumTrack.track, 
      name:   albumTrack.name,
      href:   albumTrack.href,
      score:  score
    })
  }

  return album
}

async function fillInAlbumFromSpotify(album) {
  let spotifyAlbum = await spotify.getAlbum(album)
  spotifyRepository.insert(spotifyAlbum)

  album.type = spotifyAlbum.type
  
  for (let track of spotifyAlbum.tracks) { 
    let foundTrack = album.tracks.find(x => {
      return x.trackId === track.id
    }) 

    let score = foundTrack ? foundTrack.score : 0

    album.tracksStatus.push({ 
      track:  track.track, 
      name:   track.name,
      href:   track.href,
      score:  score
    })
  }

  let spinner = ora(`Loaded album data for ${album.albumName} (${album.artistName}) from spotify.`).succeed()
  return album
}

async function groupTracksIntoAlbums(tracks) {
  let albums = []

  for (let track of tracks) { 
    if (track.albumId === null) 
      continue
    
    if (albums.findIndex(r => r.albumId === track.albumId) === -1) {
      albums.push(
      { 
          albumId:      track.albumId,
          tracks:       [], 
          tracksStatus: [],
          percentage:   0,
          totalTracks:  track.totalTracks, 
          albumName:    track.albumName.replace(/ *\([^)]*\) */g, ""), 
          artistName:   track.artistName,
          albumUrl:     track.albumUrl,
          albumArtUrl:  track.albumArtUrl,
          albumYear:    track.albumReleaseDate.split('-')[0]
      })
    }

    let albumIndex = albums.findIndex(r => r.albumId === track.albumId)
    
    if (!albums[albumIndex].tracks.some(e => e.trackId === track.trackId)) {
      albums[albumIndex].tracks.push({ trackId: track.trackId, trackNumber: track.trackNumber, score: track.score })
    }
  }

  return albums
}

async function scoreAlbums(albums, longAlbumBoostScore) {
  for(let album of albums) {
    album.tracks = album.tracks.sort((a, b) => a.trackNumber - b.trackNumber)
    
    let score = 0
    for(let track of album.tracks) {
      if (track.score < 0)
        continue
      score += track.score
    }
 
    // It's harder for albums with more tracks to get high scores. Give longer albums a boost.
    let totalTracks = album.totalTracks - (album.tracks.filter(x => x.score < 0).length)
    
    let longAlbumBoost = (totalTracks >= 10) ? (((totalTracks - 10) / 3) + 1) * longAlbumBoostScore : 0
    score = Math.min(score + longAlbumBoost, totalTracks)

    let percentage = (score / totalTracks) * 100
    album.percentage = percentage
  }

  return albums
}

async function savePurchasedAlbums() {
  try {
    await retry(async bail => {
      console.log(`Marking albums as purchased.`)
      let albums = await spotify.getPurchasedAlbums()
    
      if (albums === null)
        return
      
      for (let i = 0; i < albums.length; i++) {
          await albumRepository.setAsPurchased(albums[i])
      }
    }, {
      retries: 10
    })
  }
  catch(ex) {
    console.log(ex)
  }
}