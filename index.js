const spotify     = require('./spotify.js')
const output      = require('./output.js')
const uploader    = require('./uploader.js')

; (async () => {
  await start();
})()

async function start() {
  getFavouriteAlbums()
}

async function getFavouriteAlbums() {
  
  let filter = getFilter()
  console.log(`Getting favourite albums for ` + filter)
  
  let albums = await spotify.getFavouriteAlbums(filter)
  
  if (albums === null)
    return
  
  let htmlFile = await output.writeToHtml(filter, albums)
  
  let fileName = filter === '' ? 'albums.html' : 'albums' + filter + '.html'
  await uploader.upload(fileName, htmlFile)
  process.exit()
}

function getFilter() {
  var date = new Date();
  var hours = date.getHours();
  return (hours > 20) ? '' : hours < 10 ? '200' + hours : '20' + hours
}