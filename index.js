const spotify         = require('./spotify.js')
const albumRepository = require('./album-repository')

; (async () => {
  await start();
})()

async function start() {
  getFavouriteAlbums()
}

async function getFavouriteAlbums() {
  try {
    let filter = '' //getFilter()
    console.log(`Getting favourite albums for ` + filter === '' ? 'all time' : filter)
    
    let albums = await spotify.getFavouriteAlbums(filter)
    
    if (albums === null)
      return
    
    for (let i = 0; i < albums.length; i++) {
        await albumRepository.insert(albums[i])
    }
  }
  catch(ex) {
    console.log(ex)
  }
  finally {
    process.exit()
  }
}

function getFilter() {
  var date = new Date();
  var hours = date.getHours();
  return (hours > 20) ? '' : hours < 10 ? '200' + hours : '20' + hours
}