// Lee las variables de .env con sus valores por defecto.
require('dotenv').config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  DB_NAME: process.env.DB_NAME || 'CAFETERIA',
  PORT: process.env.PORT || 3000,
};
