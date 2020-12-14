const mysql     = require('mysql2/promise')
const config    = require('./config.json')

async function insert(album) {
    try {
        const connection = await mysql.createConnection({
            host: config.mysql.host,
            port: config.mysql.port,
            user: config.mysql.user,
            password: config.mysql.password,
            database: config.mysql.database    
        })

        let albumJson = mysql.escape(JSON.stringify(album))
        let sql = `INSERT INTO homepage.albums (albumId, year, percentage, album, updated) VALUES ('${album.albumId}', '${album.albumYear}', '${album.percentage}', ${albumJson}, UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE year = '${album.albumYear}', percentage = '${album.percentage}', album = ${albumJson}, updated = UTC_TIMESTAMP()`
        await connection.query(sql)
    }
    catch (exception) {
        console.log(exception)
    }
}

module.exports = {
    insert
}