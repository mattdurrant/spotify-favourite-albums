const mysql     = require('mysql2');
const config    = require('./config.json')

function createPool() {
  try {
     const pool = mysql.createPool({
        host: config.mysql.host,
        port: config.mysql.port,
        user: config.mysql.user,
        password: config.mysql.password,
        database: config.mysql.database,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0
    });

    const promisePool = pool.promise();

    return promisePool;
  } catch (error) {
    return console.log(`Could not connect - ${error}`);
  }
}

const pool = createPool();

module.exports = {
  connection: async () => pool.getConnection(),
  execute: (...params) => pool.execute(...params),
  query: (...params) => pool.query(...params)
};