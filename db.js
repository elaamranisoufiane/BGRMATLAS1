const mysql = require('mysql');
require('dotenv').config();
//const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

const db = mysql.createPool({
    connectionLimit: 100,
    /*
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'bgai',
    */

    host: 'sql9.freemysqlhosting.net',
    user: 'sql9652325',
    password: 'H8SKXvKz34',
    database: 'sql9652325',


});

module.exports = db;
