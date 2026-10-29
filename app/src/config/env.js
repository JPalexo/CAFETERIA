// Lee las variables de .env con sus valores por defecto.
require('dotenv').config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  DB_NAME: process.env.DB_NAME || 'CAFETERIA',
  PORT: process.env.PORT || 3000,

  // Rate limit del login (D17)
  LOGIN_MAX_INTENTOS: Number(process.env.LOGIN_MAX_INTENTOS) || 5,
  LOGIN_VENTANA_SEG: Number(process.env.LOGIN_VENTANA_SEG) || 60,

  // Sesiones (RN8, RF-S3): solo "true" activa el modo prueba
  SESION_HORAS: Number(process.env.SESION_HORAS) || 8,
  SESION_MODO_PRUEBA: process.env.SESION_MODO_PRUEBA === 'true',

  // Primer administrador (D11). La contrasena no tiene valor por defecto.
  ADMIN_USUARIO: process.env.ADMIN_USUARIO || 'admin',
  ADMIN_NOMBRE: process.env.ADMIN_NOMBRE || 'Administrador',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
};
