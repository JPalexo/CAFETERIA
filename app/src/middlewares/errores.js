// 404 para rutas /api que no existen y manejador general de errores (400 por JSON mal formado, 500).

function noEncontradoApi(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada.' });
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(err, req, res, next) {
  // express.json() no pudo leer el cuerpo. En el login el intento ya se conto en el rate limiter.
  if (err.type === 'entity.parse.failed') {
    const respuesta = { error: 'El cuerpo de la peticion no es JSON valido.' };
    if (req.intentosRestantes !== undefined) respuesta.intentosRestantes = req.intentosRestantes;
    return res.status(400).json(respuesta);
  }
  console.error(err);
  res.status(500).json({ error: 'Error en el servidor o en la base de datos.' });
}

module.exports = { noEncontradoApi, manejarErrores };
