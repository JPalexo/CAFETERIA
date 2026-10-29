// Conexion a MongoDB: expone las colecciones y crea los indices.
const { MongoClient } = require('mongodb');
const { MONGODB_URI, DB_NAME } = require('./env');

// Referencias a las colecciones (se llenan al llamar a conectar()).
const colecciones = {};

async function conectar() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(DB_NAME);
  colecciones.productos = db.collection('productos');
  // Indices para que los filtros respondan rapido (RNF1)
  await colecciones.productos.createIndex({ categoria: 1 });
  await colecciones.productos.createIndex({ disponibilidad: 1 });
  await colecciones.productos.createIndex({ ingredientes: 1 });
  // Personal del negocio (D05): el nombre de usuario no se repite
  colecciones.usuarios = db.collection('usuarios');
  await colecciones.usuarios.createIndex({ usuario: 1 }, { unique: true });
  return colecciones;
}

module.exports = { conectar, colecciones };
