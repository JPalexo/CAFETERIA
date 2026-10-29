// Utilidades para ids de MongoDB y expresiones regulares.
const { ObjectId } = require('mongodb');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function idValido(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

module.exports = { idValido, escapeRegex };
