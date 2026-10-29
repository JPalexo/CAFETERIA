// Quita acentos (vocales) de todos los strings de clientes, productos y pedidos.
// La ñ/Ñ se conserva. Actualiza solo los campos de primer nivel que cambiaron.
// Uso:
//   node scripts/quitar-acentos.js --dry-run   (solo muestra que cambiaria)
//   node scripts/quitar-acentos.js             (aplica los cambios)
require('dotenv').config();
const { MongoClient } = require('mongodb');
const { normalizarValor } = require('../src/utils/texto');

const COLECCIONES = ['clientes', 'productos', 'pedidos'];

// Compara el documento original contra su version normalizada y arma
// el objeto para $set solo con los campos de primer nivel que cambiaron.
function calcularCambios(doc) {
  const cambios = {};
  for (const [campo, valor] of Object.entries(doc)) {
    if (campo === '_id') continue;
    const nuevo = normalizarValor(valor);
    if (JSON.stringify(nuevo) !== JSON.stringify(valor)) {
      cambios[campo] = nuevo;
    }
  }
  return cambios;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const dbName = process.env.DB_NAME || 'CAFETERIA';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbName);

  console.log(dryRun ? '=== Modo simulacion (--dry-run): no se escribe nada ===\n' : '=== Aplicando cambios ===\n');

  let totalCambiados = 0;
  for (const nombreColeccion of COLECCIONES) {
    const col = db.collection(nombreColeccion);
    const docs = await col.find({}).toArray();
    let cambiadosEnColeccion = 0;

    for (const doc of docs) {
      const cambios = calcularCambios(doc);
      if (Object.keys(cambios).length === 0) continue;

      cambiadosEnColeccion++;
      totalCambiados++;
      console.log(`[${nombreColeccion}] _id=${doc._id}`);
      for (const [campo, valor] of Object.entries(cambios)) {
        console.log(`  ${campo}: ${JSON.stringify(doc[campo])} -> ${JSON.stringify(valor)}`);
      }

      if (!dryRun) {
        await col.updateOne({ _id: doc._id }, { $set: cambios });
      }
    }

    console.log(`${nombreColeccion}: ${cambiadosEnColeccion} de ${docs.length} documento(s) ${dryRun ? 'cambiarian' : 'actualizados'}.\n`);
  }

  console.log(`Total: ${totalCambiados} documento(s) ${dryRun ? 'cambiarian' : 'actualizados'}.`);
  await client.close();
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
