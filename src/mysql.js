const mysql = require('mysql');

class dbConnector {
    constructor() {
        this.connection = mysql.createConnection({
            host     : process.env.DB_HOST,
            user     : process.env.DB_USER,
            password : process.env.DB_PASSWORD,
            database : process.env.DB_DATABASE,
        });

        this.connection.connect();

        process.on('SIGINT', () => {
            this.connection.end();
            process.exit();
        });
    }

    static getConnection() {
        return this.connection || (new this()).connection;
    }

    connection;
}

module.exports = dbConnector;