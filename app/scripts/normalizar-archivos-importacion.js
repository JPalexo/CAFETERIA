// Quita acentos de los archivos de importacion ../datos/clientes.json, productos.json y
// pedidos.json (los que usa el grupo para reimportar), conservando el formato
// Extended JSON ($oid, $date) y la indentacion de 2 espacios.
// Uso: node scripts/normalizar-archivos-importacion.js
const fs = require('fs');
const path = require('path');
const { normalizarValor } = require('../src/utils/texto');

const ARCHIVOS = ['clientes.json', 'productos.json', 'pedidos.json'];

function main() {
  for (const nombre of ARCHIVOS) {
    const ruta = path.join(__dirname, '..', '..', 'datos', nombre);
    const original = fs.readFileSync(ruta, 'utf8');
    const datos = JSON.parse(original);
    const normalizado = normalizarValor(datos);
    const texto = JSON.stringify(normalizado, null, 2) + '\n';
    fs.writeFileSync(ruta, texto, 'utf8');
    console.log(`${nombre}: normalizado (${datos.length} documento(s)) -> ${ruta}`);
  }
}

main();
