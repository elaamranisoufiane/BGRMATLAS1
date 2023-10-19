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

    host: 'sql11.freemysqlhosting.net',
    user: 'sql11654310',
    password: 'YsBySaS6vu',
    database: 'sql11654310',

    /*
     host: 'bgai.mysql.database.azure.com',
     user: 'bgai',
     password: 'Sql11653990',
     database: 'bgai',
 */
});

module.exports = db;
