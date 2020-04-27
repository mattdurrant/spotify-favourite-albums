const spotify     = require('./spotify.js')
const output      = require('./output.js')
const uploader    = require('./uploader.js')
const schedule    = require('node-schedule')

; (async () => {
  await start();
})()

async function start() {
  getFavouriteAlbums()
}

async function getFavouriteAlbums() {
  var date = new Date();
  var hours = date.getHours();
  let filter = (hours > 20) ? '' : hours < 10 ? '200' + hours : '20' + hours
  let albums = await spotify.getFavouriteAlbums(filter)
  
  if (albums === null)
    return
  
  let fileName = filter === '' ? 'albums.html' : 'albums' + filter + '.html'
  let htmlFile = await output.writeToHtml(filter, albums)
  await uploader.upload(fileName, htmlFile)
  process.exit()
}
