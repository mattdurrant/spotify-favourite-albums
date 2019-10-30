const spotify   = require('./spotify.js')
const output    = require('./output.js')
const uploader  = require('./uploader.js')
const schedule  = require('node-schedule')

; (async () => {
  await start();
})()

async function start() {
  getFavouriteAlbums()
}

async function getFavouriteAlbums() {
  let albums = await spotify.getAlbums()
  
  if (albums === null)
    return

  let htmlFile = await output.writeToHtml(albums)
  await uploader.upload(htmlFile)
}
