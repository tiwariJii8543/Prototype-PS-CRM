const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: process.env.MYSQL_PROXY_HOST || "crossover.proxy.rlwy.net",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "Harsh@7983",
  database: process.env.DB_NAME || "railway",
  port: process.env.MYSQL_PROXY_PORT || 42756
});

connection.connect((err) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err);
  } else {
    console.log("✅ Connected to Railway MySQL");
  }
});

module.exports = connection;
