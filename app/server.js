// Arranque: conecta a MongoDB y levanta el servidor.
const { PORT, DB_NAME } = require('./src/config/env');
const { conectar } = require('./src/config/db');
const app = require('./src/app');

async function iniciar() {
  const { productos } = await conectar();
  const total = await productos.countDocuments();
  console.log(`Conectado a MongoDB -> base "${DB_NAME}", coleccion "productos" (${total} documentos)`);
  app.listen(PORT, () => console.log(`Abre http://localhost:${PORT}`));
}

iniciar().catch((e) => {
  console.error('No se pudo conectar a MongoDB:', e.message);
  console.error('Revisa que el servicio de MongoDB este encendido y la cadena MONGODB_URI en .env');
  process.exit(1);
});

module.exports = app;
