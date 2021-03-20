const mysql     = require('mysql2');
const db        = require('./database-pool.js');

async function insert(album) {
    try {
        let albumJson = mysql.escape(JSON.stringify(album))
        let sql = `INSERT INTO homepage.albums (albumId, year, percentage, album, updated) VALUES ('${album.albumId}', '${album.albumYear}', '${album.percentage}', ${albumJson}, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE year = '${album.albumYear}', percentage = '${album.percentage}', album = ${albumJson}, updated = UTC_TIMESTAMP()`
        await db.execute(sql)
    }
    catch (exception) {
        console.log(exception)
    }
}

async function setAsPurchased(album) {
    try {
        let sql = `UPDATE homepage.albums SET purchased = 1 WHERE albumId = '${album.albumId}'`
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