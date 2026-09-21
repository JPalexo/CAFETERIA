// Utilidades de texto compartidas entre el backend (server.js) y los scripts de mantenimiento.

// Quita acentos de vocales (á é í ó ú ü, mayúsculas incluidas). La ñ/Ñ se conserva.
// normalize('NFD') separa cada letra acentuada en "letra base" + "marca combinante".
// Se quitan las marcas ̀-ͯ, excepto la tilde ̃ cuando va sobre n/N (esa es la ñ).
function quitarAcentos(str) {
  if (typeof str !== 'string') return str;
  return str
    .normalize('NFD')
    .replace(/([nN])̃|[̀-ͯ]/g, (coincidencia, letraN) => (letraN ? coincidencia : ''))
    .normalize('NFC');
}

// Aplica quitarAcentos recursivamente a todos los strings de un valor,
// sin tocar ObjectId, Date, numeros, booleanos ni nombres de campos.
function normalizarValor(valor) {
  if (typeof valor === 'string') return quitarAcentos(valor);
  if (Array.isArray(valor)) return valor.map(normalizarValor);
  if (valor && typeof valor === 'object' && !(valor instanceof Date) && valor._bsontype !== 'ObjectId') {
    const out = {};
    for (const [campo, v] of Object.entries(valor)) out[campo] = normalizarValor(v);
    return out;
  }
  return valor;
}

module.exports = { quitarAcentos, normalizarValor };
