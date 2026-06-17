const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.MYSQL_PROXY_HOST || process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ps_crm_db',
  port: Number(process.env.MYSQL_PROXY_PORT || process.env.DB_PORT || 3306)
});

connection.connect(err => {
  if (err) {
    console.error('DB connection failed:', err.message);
  } else {
    console.log('Connected to MySQL');
  }
});

module.exports = connection;
