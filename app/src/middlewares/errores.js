// 404 para rutas /api que no existen y manejador general de errores (500).

function noEncontradoApi(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  console.error(err);
  res.status(500).json({ error: 'Error en el servidor o en la base de datos.' });
}

module.exports = { noEncontradoApi, manejarErrores };
