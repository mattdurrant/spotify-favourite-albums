const mysql     = require('mysql2');
const db        = require('./database-pool.js');
const sqlString = require('sqlstring')

async function insert(album) {
    let tracksJson = mysql.escape(JSON.stringify(album.tracks))
        
    try {
        let sql = `INSERT INTO homepage.spotify (\`albumId\`, \`artist\`, \`name\`, \`tracks\`, \`type\`, \`updated\`) VALUES ('${album.albumId}', ${sqlString.escape(album.artistName)}, ${sqlString.escape(album.albumName)}, ${tracksJson}, '${album.type}', UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE updated = UTC_TIMESTAMP();`
        // console.log(sql)
        await db.execute(sql)
    }
    catch (exception) {
        console.log(exception)
    } 
}

async function load(albumId) {
    try {        
        let sql = `SELECT * FROM homepage.spotify WHERE albumId = '${albumId}';`
        const [rows, fields] = await db.execute(sql)
        
        if (rows[0] == null)
            return null

        let album = {
            albumId: rows[0].albumId,
            artist: rows[0].artist,
            name: rows[0].name,
            tracks: rows[0].tracks,
            type: rows[0].type
        }
        
        return album
    }
    catch (exception) {
        console.log(exception)
    }
}

module.exports = {
    insert,
    load
}