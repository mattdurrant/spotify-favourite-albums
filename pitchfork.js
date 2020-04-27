const pitchfork = require('pitchfork')

async function addReviews(albums) {
    var s = new pitchfork.Search('wilco')
    
    s.on('ready', function(results){
        console.log("results", results)
    })
}

module.exports = {
    addReviews
}
