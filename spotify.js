const config          = require('./config.json')
const SpotifyWebApi   = require('spotify-web-api-node')
const ora             = require('ora')
const Filter          = require('bad-words'), filter = new Filter()
filter.removeWords('god', 'bastard', 'hell', 'damn', 'sex', 'whore', 'rape')

let spotifyApi = new SpotifyWebApi({
    clientId:         config.spotify.api.clientId,
    clientSecret:     config.spotify.api.clientSecret
})

async function getPurchasedAlbums() {
  console.log('yes')
  await setSpotifyCredentials()
  
  let purchasedTracks = await getTracksFromPlaylist(config.spotify.purchasedPlaylistId, -1)
  
  var albums = await groupTracksIntoAlbums(purchasedTracks)
  return albums
}

async function getFavouriteAlbums(filter) {
  await setSpotifyCredentials()
  
  let favouriteTracks = await getTracksFromPlaylist(config.spotify.excludedPlaylistId, -1)
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.lovePlaylistId, 1))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.likePlaylistId, 0.75))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.averagePlaylistId, 0.5))
 
  var albums = await groupTracksIntoAlbums(favouriteTracks)
  albums = await scoreAlbums(albums, 0.25)
  albums = await filterAlbums(albums, filter, config.albumsInList)
  albums = await getAlbumTracks(albums)
  return albums
}

async function setSpotifyCredentials() {
  await spotifyApi
    .clientCredentialsGrant()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token'])
    })  
}

async function getTracksFromPlaylist(playlistId, score) {
  let playlistMetadata = await getPlaylistMetadata(playlistId),
      tracks    = [], 
      pageSize  = 100,
      spinner   = ora(`Loading playlist ${playlistMetadata.name}`).start()
  
  for(let offset = 0; offset < playlistMetadata.totalTracks; offset += pageSize) {
    spinner.text = `Loading tracks ${offset}-${Math.min(offset + pageSize, playlistMetadata.totalTracks)} of ${playlistMetadata.totalTracks} for '${playlistMetadata.name}'.`
    let playlistTracksPage = await getTracksFromPlaylistPage(playlistId, offset, pageSize, score)
    tracks = tracks.concat(playlistTracksPage)
  }

  spinner.succeed(`${playlistMetadata.totalTracks} tracks for '${playlistMetadata.name}' loaded.`)
  return tracks
}

async function getPlaylistMetadata(playlistId) {
  let data = await spotifyApi.getPlaylist(config.spotify.username, playlistId)
  return {
    name:        data.body.name,
    owner:       data.body.owner.display_name,
    totalTracks: data.body.tracks.total,
    description: data.body.description,
    url:         data.body.external_urls.spotify
  }
}

async function getTracksFromPlaylistPage(playlistId, offset, pageSize, score) {
  let data = await spotifyApi
    .getPlaylistTracks(config.spotify.username, playlistId, {
      offset:   offset,
      limit:    pageSize,
      fields:   'items'
    })

  return data.body.items.map(x => 
  ({
    trackName:        x.track.name,
    trackId:          x.track.id,
    albumName:        x.track.album.name,
    albumId:          x.track.album.id,
    trackNumber:      x.track.track_number,
    totalTracks:      x.track.album.total_tracks,
    artistName:       (x.track.album.artists.length > 0) ? x.track.album.artists[0].name : 'Unknown',
    albumArtUrl:      x.track.album.images[0] ? x.track.album.images[0].url : null,
    albumUrl:         x.track.album.external_urls.spotify,
    albumReleaseDate: x.track.album.release_date,
    score:            score
  }))
}

async function groupTracksIntoAlbums(tracks) {
  let albums = [],
    spinner = ora(`Grouping tracks into albums`).start()
 
  for (let track of tracks) { 
    if (track.albumId === null) 
      continue
    
    if (albums.findIndex(r => r.albumId === track.albumId) === -1) {
      albums.push(
      { 
          albumId: track.albumId,
          tracks: [], 
          tracksStatus: [],
          percentage: 0,
          totalTracks: track.totalTracks, 
          albumName: track.albumName.replace(/ *\([^)]*\) */g, ""), 
          artistName: track.artistName,
          albumUrl: track.albumUrl,
          albumArtUrl: track.albumArtUrl,
          albumYear: track.albumReleaseDate.split('-')[0]
      })
    }

    let albumIndex = albums.findIndex(r => r.albumId === track.albumId)
    
    if (!albums[albumIndex].tracks.some(e => e.trackId === track.trackId)) {
      albums[albumIndex].tracks.push({ trackId: track.trackId, trackNumber: track.trackNumber, score: track.score })
    }
  }

  spinner.succeed(`Tracks grouped into albums.`)
  return albums
}

async function scoreAlbums(albums, longAlbumBoostScore) {
  let spinner = ora(`Boosting score of long albums`).start()
  for(let album of albums) {
    album.tracks = album.tracks.sort((a, b) => a.trackNumber - b.trackNumber)
    
    if (album.albumUrl === 'https://open.spotify.com/album/6eGYLONkDMja0MNtZWnRRB') {
      let a = 0
    }

    let score = 0
    for(let track of album.tracks) {
      if (track.score === -1)
        continue
      score += track.score
    }

    // It's harder for albums with more tracks to get high scores. Give longer albums a boost.
    let totalTracks = album.totalTracks - (album.tracks.filter(x => x.score === -1).length)
    
    let longAlbumBoost = (totalTracks >= 10) ? (((totalTracks - 10) / 3) + 1) * longAlbumBoostScore : 0
    score = Math.min(score + longAlbumBoost, totalTracks)

    let percentage = (score / totalTracks) * 100
    album.percentage = percentage
  }

  spinner.succeed(`Album scores set.`)
  return albums
}

async function filterAlbums(albums, filter, numberOfAlbumsToSelect) {
  let spinner = ora(`Filtering albums`).start()
  
  if (filter !== '') {
    albums = albums.filter(r => r.albumYear == filter)
  }

  albums = await albums.filter(r => r.totalTracks >= config.minimumTrackLength).sort(
    function(a, b) {
      if (a.percentage !== b.percentage) 
         return b.percentage - a.percentage
      return b.tracks.length - a.tracks.length
    }).slice(0, numberOfAlbumsToSelect)
  
  spinner.succeed(`Albums compiled and ` + albums.length + ` albums selected.`)
  return albums
}

async function getAlbumTracks(albums) {
  let spinner = ora(`Loading album tracklists`).start()

  for (let album of albums) {
    spinner.text = `Loading tracks for '${album.albumName}'.`
    
    let albumTracks = await spotifyApi.getAlbumTracks(album.albumId)
    
    for (let albumTrack of albumTracks.body.items) {
      
      let foundTrack = album.tracks.find(obj => {
        return obj.trackId === albumTrack.id
      })

      let score = foundTrack ? foundTrack.score : 0

      album.tracksStatus.push({ 
        track: albumTrack.track_number, 
        name: filter.clean(albumTrack.name),
        href: albumTrack.external_urls.spotify,
        score: score
      })
    }
  } 

  spinner.succeed(`All album tracklists loaded.`)
  return albums
}

module.exports = {
  getFavouriteAlbums,
  getPurchasedAlbums
}
