const config        = require('./config.json')
const SpotifyWebApi = require('spotify-web-api-node')
const ora           = require('ora')
const Filter        = require('bad-words'), filter = new Filter()
filter.removeWords('god', 'bastard', 'hell', 'damn', 'sex', 'whore')

let spotifyApi = new SpotifyWebApi({
    clientId:         config.spotify.api.clientId,
    clientSecret:     config.spotify.api.clientSecret
})

async function getFavouriteAlbums() {
  await setSpotifyCredentials()
  
  let favouriteTracks = await getTracksFromPlaylist(config.spotify.lovePlaylistId, 1)
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.likePlaylistId, 0.75))
  
  var albums = await groupTracksIntoAlbums(favouriteTracks)
  albums = await boostLongAlbums(albums)
  albums = await selectFavouriteAlbums(albums, config.albumsInList)
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
    albumName:        x.track.album.name,
    albumId:          x.track.album.id,
    trackNumber :     x.track.track_number,
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
  
  if (!albums[albumIndex].tracks.some(e => e.trackNumber === track.trackNumber)) {
    albums[albumIndex].tracks.push({ trackNumber: track.trackNumber, score: track.score })
  }

  spinner.succeed(`Tracks grouped into albums.`)
  return albums
}

async function scoreAlbums(albums, longAlbumBoost) {
  let spinner = ora(`Boosting score of long albums`).start()
  for(let album of albums) {
    album.tracks = album.tracks.sort((a, b) => a.trackNumber - b.trackNumber)
    
    let score = 0
    for(let track of album.tracks) {
      score += track.score
    }

    // It's harder for albums with more tracks to get high scores. Give longer albums a boost.
    let longAlbumBoost = (album.totalTracks >= 10) ? (((album.totalTracks - 10) / 3) + 1) * longAlbumBoostScore : 0
    score = Math.min(score + longAlbumBoost, album.totalTracks)

    let percentage = (score / album.totalTracks) * 100
    album.percentage = percentage
  }
  spinner.succeed(`Album scores set.`)
  return albums
}

async function selectFavouriteAlbums(albums, numberOfAlbumsToSelect) {
  let spinner = ora(`Compiling albums`).start()
  
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
        return obj.trackNumber === albumTrack.track_number
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
  getFavouriteAlbums
}
