const config          = require('./config.json')
const SpotifyWebApi   = require('spotify-web-api-node')
const ora             = require('ora')
const Filter          = require('bad-words'), filter = new Filter()
filter.removeWords('god', 'bastard', 'hell', 'damn', 'sex', 'whore', 'rape')

let spotifyApi = new SpotifyWebApi({
    clientId:         config.spotify.api.clientId,
    clientSecret:     config.spotify.api.clientSecret
})

async function getFavouriteTracks() {
  await setSpotifyCredentials()
  
  let favouriteTracks = await getTracksFromPlaylist(config.spotify.excludedPlaylistId, -1)
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.fillerPlaylistId, -2))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.FiveStarPlaylistId, 1))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.FourStarPlaylistId, 0.9))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.ThreeStarPlaylistId, 0.75))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.TwoStarPlaylistId, 0.5))
  favouriteTracks = favouriteTracks.concat(await getTracksFromPlaylist(config.spotify.OneStarPlaylistId, 0.4))
  return favouriteTracks
}

async function getPurchasedAlbums() {
  await setSpotifyCredentials()
  
  let purchasedTracks = await getTracksFromPlaylist(config.spotify.purchasedPlaylistId, -1)
  
  var albums = await groupTracksIntoAlbums(purchasedTracks)
  return albums
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

async function getAlbum(album) {
  let spotifyAlbum      = await spotifyApi.getAlbum(album.albumId)
  let spotifyTracks     = await spotifyApi.getAlbumTracks(album.albumId)
  
  var tracks = spotifyTracks.body.items.map(x => 
    ({
        track:  x.track_number, 
        name:   filter.clean(x.name),
        href:   x.external_urls.spotify,
        id:     x.id
    }))  

  let albumData = {
    albumName:    spotifyAlbum.body.name,
    artistName:   spotifyAlbum.body.artists[0].name,
    albumId:      spotifyAlbum.body.id,
    type:         spotifyAlbum.body.album_type,
    tracks:       tracks
  }

  return albumData
}

module.exports = {
  getFavouriteTracks,
  getPurchasedAlbums,
  getAlbum
}
