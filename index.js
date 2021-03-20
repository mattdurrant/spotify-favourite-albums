const spotify         = require('./spotify.js')
const albumRepository = require('./album-repository')
const retry           = require('async-retry')

; (async () => {
  await start();
})()

async function start() {
  await getFavouriteAlbums()
  await getPurchasedAlbums()
}

async function getFavouriteAlbums() {
  try {
    let filter = getFilter()
    console.log(`Getting favourite albums for ` + filter === '' ? 'all time' : filter)
    
    await retry(async bail => {
      let albums = await spotify.getFavouriteAlbums(filter)
    
      if (albums === null)
        return
      
      for (let i = 0; i < albums.length; i++) {
          await albumRepository.insert(albums[i])
      }
    }, {
      retries: 10
    })
  }
  catch(ex) {
    console.log(ex)
  }
  finally {
    process.exit()
  }
}

async function getPurchasedAlbums() {
  try {
    await retry(async bail => {
      console.log(`Getting purchased albums`)
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
  finally {
    process.exit()
  }
}

function getFilter() {
  var date = new Date();
  var year = date.getFullYear();
  var hours = date.getHours();
  return (hours === 0) ? '' : (year + 1) - hours
}