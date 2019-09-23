const spotify   = require('./spotify.js')
const output    = require('./output.js')
const uploader  = require('./uploader.js')
const schedule  = require('node-schedule')
 
; (async () => {
  
  console.log('Lets get started')
  getFavouriteAlbums()
  schedule.scheduleJob('0 * * * *', function(){
    console.log(`Finding vinyl at ${new Date().toISOString()}`)
    getFavouriteAlbums()
  });
})()

async function getFavouriteAlbums() {
  let albums = await spotify.getAlbums()
  
  if (albums === null)
    return

  let htmlFile = await output.writeToHtml(albums)
  await uploader.upload(htmlFile)
}
