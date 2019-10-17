const config        = require('./config.json')
const SpotifyWebApi = require('spotify-web-api-node')
const ora           = require('ora')

let spotifyApi = new SpotifyWebApi({
    clientId:         config.spotify.api.clientId,
    clientSecret:     config.spotify.api.clientSecret
})

async function getAlbums() {
  await setSpotifyCredentials()
  
  let playlistData = await getPlaylist(config.spotify.playlistId),
    albums    = [], 
    pageSize  = 100,
    spinner   = ora(`Loading playlist ${playlistData.name}`).start()

  for(let offset = 0; offset < playlistData.totalTracks; offset += pageSize) {
    spinner.text = `Loading tracks ${offset}-${Math.min(offset + pageSize, playlistData.totalTracks)} of ${playlistData.totalTracks} for '${playlistData.name}'.`
    let tracks = await getPlaylistTracks(offset, pageSize) 
 
    for (let track of tracks) {
      if (track.albumId === null) continue
      
      if (albums.findIndex(r => r.albumId === track.albumId) === -1) {
        albums.push(
          { 
             albumId: track.albumId,
             tracks: [], 
             tracksStatus: [],
             totalTracks: track.totalTracks, 
             percentage: null, 
             albumName: track.albumName.replace(/ *\([^)]*\) */g, ""), 
             artistName: track.artistName,
             albumUrl: track.albumUrl,
             albumArtUrl: track.albumArtUrl,
             albumYear: track.albumReleaseDate.split('-')[0]
          })
      }

      let index = albums.findIndex(r => r.albumId === track.albumId)
      if(albums[index].tracks.indexOf(track.trackNumber) === -1)
      {
        albums[index].tracks.push(track.trackNumber)
        albums[index].tracks = albums[index].tracks.sort((a, b) => a - b)
        albums[index].percentage = (albums[index].tracks.length / track.totalTracks) * 100
      }
    }
  }
  spinner.succeed(`${playlistData.totalTracks} tracks for '${playlistData.name}' loaded.`)

  return await processResults(albums)
}

async function processResults(albums) {
  albums = await albums.filter(r => r.totalTracks >= config.minimumTrackLength).sort(
    function(a, b) {
      if (a.percentage !== b.percentage) 
         return b.percentage - a.percentage
      return b.tracks.length - a.tracks.length
    }).slice(0, config.albumsInList)

  // Add list of liked and non-liked tracks for each album
  for (let album of albums) {
    let albumTracks = await spotifyApi.getAlbumTracks(album.albumId)
    
    for (let albumTrack of albumTracks.body.items) {
      album.tracksStatus.push({ 
        track: albumTrack.track_number, 
        name: albumTrack.name,
        href: albumTrack.external_urls.spotify,
        liked: album.tracks.indexOf(albumTrack.track_number) > -1})
    }
  } 

  return albums
}

async function setSpotifyCredentials() {
  await spotifyApi
    .clientCredentialsGrant()
    .then(function(data) {
      spotifyApi.setAccessToken(data.body['access_token'])
    })  
}

async function getPlaylist() {
  let data = await spotifyApi.getPlaylist(config.spotify.username, config.spotify.playlistId)
  
  return {
    name:        data.body.name,
    owner:       data.body.owner.display_name,
    totalTracks: data.body.tracks.total,
    description: data.body.description,
    url:         data.body.external_urls.spotify
  }
}

async function getPlaylistTracks(offset, pageSize) {
  let data = await spotifyApi
    .getPlaylistTracks(config.spotify.username, config.spotify.playlistId, {
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
    albumReleaseDate: x.track.album.release_date
  }))
}

module.exports = {
  getAlbums
}
