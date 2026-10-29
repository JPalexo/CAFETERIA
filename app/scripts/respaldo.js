// Exporta clientes, productos y pedidos a respaldos/AAAA-MM-DD_HHMM/<coleccion>.json
// usando EJSON (relaxed:false) para conservar ObjectId y Date tal cual.
// Uso: node scripts/respaldo.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const COLECCIONES = ['clientes', 'productos', 'pedidos'];

function nombreCarpeta() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'CAFETERIA';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbName);

  const carpeta = path.join(__dirname, '..', 'respaldos', nombreCarpeta());
  fs.mkdirSync(carpeta, { recursive: true });

  for (const nombre of COLECCIONES) {
    const docs = await db.collection(nombre).find({}).toArray();
    const texto = EJSON.stringify(docs, null, 2, { relaxed: false });
    fs.writeFileSync(path.join(carpeta, `${nombre}.json`), texto);
    console.log(`${nombre}: ${docs.length} documento(s) -> ${path.join(carpeta, `${nombre}.json`)}`);
  }

  console.log(`\nRespaldo guardado en: ${carpeta}`);
  await client.close();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
