// Funcion compartida por crear-admin.js y crear-usuario.js: valida, guarda el hash y nunca imprime la contrasena.
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const { MONGODB_URI, DB_NAME } = require('../src/config/env');
const { validarUsuario } = require('../src/validators/usuario.validator');

async function crearUsuario(body) {
  const { errores, datos } = validarUsuario(body);
  if (errores.length) {
    console.error('ERROR:', errores.join(' '));
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const usuarios = client.db(DB_NAME).collection('usuarios');
    await usuarios.createIndex({ usuario: 1 }, { unique: true });

    if (await usuarios.findOne({ usuario: datos.usuario })) {
      console.log(`El usuario "${datos.usuario}" ya existe. No se modifico nada.`);
      return;
    }

    await usuarios.insertOne({
      usuario: datos.usuario,
      nombre: datos.nombre,
      rol: datos.rol,
      password_hash: await bcrypt.hash(datos.password, 10),
      activo: true,
      fecha_registro: new Date(),
    });
    console.log(`Usuario "${datos.usuario}" (${datos.rol}) creado en la base "${DB_NAME}".`);
  } finally {
    await client.close();
  }
}

module.exports = { crearUsuario };
