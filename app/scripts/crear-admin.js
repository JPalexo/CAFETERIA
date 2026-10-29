// Crea el primer administrador con ADMIN_USUARIO, ADMIN_NOMBRE y ADMIN_PASSWORD del .env (RN3, D11).
// Si el usuario ya existe no lo sobrescribe.
// Uso: npm run crear-admin
const { ADMIN_USUARIO, ADMIN_NOMBRE, ADMIN_PASSWORD } = require('../src/config/env');
const { crearUsuario } = require('./usuarios-comun');

if (!ADMIN_PASSWORD) {
  console.error('ERROR: falta ADMIN_PASSWORD en el archivo .env (minimo 8 caracteres).');
  process.exit(1);
}

crearUsuario({ usuario: ADMIN_USUARIO, nombre: ADMIN_NOMBRE, rol: 'admin', password: ADMIN_PASSWORD })
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
