require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,          // Default user for SQL Server
  process.env.DB_PASS, // Replace with your SQL Server password
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mssql', // Changed from mysql to mssql
    dialectOptions: {
      options: {
        encrypt: true, // Used for Azure SQL or secure connections
        trustServerCertificate: true // Usually needed when connecting to local SQL Server Express
      }
    },
    logging: false
  }
);

module.exports = sequelize;
