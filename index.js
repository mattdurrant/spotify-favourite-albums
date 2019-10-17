const spotify   = require('./spotify.js')
const output    = require('./output.js')
const uploader  = require('./uploader.js')
const schedule  = require('node-schedule')
const Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'SpotifyFavouriteAlbums',
  description: 'Searches spotify for my 100 favourite albums and then uploads the results to my website.',
  script: 'C:\\Code\\spotify-favourite-albums\\index.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  start()
});

svc.install();


async function start() {
  console.log('Lets get started')
  getFavouriteAlbums()
  schedule.scheduleJob('0 * * * *', function(){
    console.log(`Finding vinyl at ${new Date().toISOString()}`)
    getFavouriteAlbums()
  });
}

async function getFavouriteAlbums() {
  let albums = await spotify.getAlbums()
  
  if (albums === null)
    return

  let htmlFile = await output.writeToHtml(albums)
  await uploader.upload(htmlFile)
}
