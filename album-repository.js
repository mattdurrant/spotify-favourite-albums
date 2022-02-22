const mysql     = require('mysql2');
const db        = require('./database-pool.js');
const sqlString = require('sqlstring')

async function insert(album) {
    try {
        let albumJson = mysql.escape(JSON.stringify(album))
        let sql = `INSERT INTO homepage.albums (albumId, year, percentage, album, updated, artist, name, type) VALUES ('${album.albumId}', '${album.albumYear}', '${album.percentage}', ${albumJson}, UTC_TIMESTAMP(), ${sqlString.escape(album.artistName)}, ${sqlString.escape(album.albumName)}, '${album.type}') ON DUPLICATE KEY UPDATE year = '${album.albumYear}', percentage = '${album.percentage}', album = ${albumJson}, type = '${album.type}', updated = UTC_TIMESTAMP()`
        await db.execute(sql)
    }
    catch (exception) {
        console.log(`Failed for ${album.albumName} - ${album.artistName}`)
        console.log(exception)
    }
}

async function setAsPurchased(album) {
    try {
        let sql = `UPDATE homepage.albums SET purchased = 1 WHERE albumId = '${album.albumId}';`
        await db.execute(sql)
    }
    catch (exception) {
        console.log(exception)
    }
}

module.exports = {
    insert,
    setAsPurchased
}