require('dotenv').config();
const path = require('path');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const { quitarAcentos } = require('./utils/texto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'CAFETERIA';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let productos; // referencia a la coleccion

// ---------- Utilidades ----------
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function idValido(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

// Valida y normaliza los campos del producto.
// parcial = true se usa en PATCH (solo valida lo que viene).
function validarProducto(body, parcial = false) {
  const errores = [];
  const datos = {};

  if (!parcial || body.nombre !== undefined) {
    const v = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (!v) errores.push('El nombre es obligatorio.');
    else datos.nombre = quitarAcentos(v);
  }
  if (!parcial || body.categoria !== undefined) {
    const v = typeof body.categoria === 'string' ? body.categoria.trim() : '';
    if (!v) errores.push('La categoria es obligatoria.');
    else datos.categoria = quitarAcentos(v);
  }
  if (!parcial || body.precio !== undefined) {
    const v = Number(body.precio);
    if (body.precio === '' || body.precio === null || !Number.isFinite(v) || v <= 0) {
      errores.push('El precio debe ser un numero mayor a 0.');
    } else datos.precio = Math.round(v * 100) / 100;
  }
  if (!parcial || body.descripcion !== undefined) {
    const v = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    datos.descripcion = quitarAcentos(v);
  }
  if (!parcial || body.ingredientes !== undefined) {
    let lista = body.ingredientes;
    if (typeof lista === 'string') lista = lista.split(',');
    if (!Array.isArray(lista)) lista = [];
    datos.ingredientes = lista.map((i) => quitarAcentos(String(i).trim())).filter(Boolean);
  }
  if (!parcial || body.disponibilidad !== undefined) {
    if (typeof body.disponibilidad !== 'boolean') {
      errores.push('La disponibilidad debe ser verdadero o falso.');
    } else datos.disponibilidad = body.disponibilidad;
  }
  return { errores, datos };
}

// ---------- API REST /api/productos ----------

// Listar con filtros: ?categoria=&disponibilidad=true|false&ingrediente=&q=
app.get('/api/productos', async (req, res, next) => {
  try {
    const { categoria, disponibilidad, ingrediente, q } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = quitarAcentos(categoria);
    if (disponibilidad === 'true' || disponibilidad === 'false') {
      filtro.disponibilidad = disponibilidad === 'true';
    }
    if (ingrediente) {
      const valores = ingrediente.split(',').map((v) => quitarAcentos(v.trim())).filter(Boolean);
      if (valores.length) {
        filtro.ingredientes = { $all: valores.map((v) => new RegExp(escapeRegex(v), 'i')) };
      }
    }
    if (q) filtro.nombre = { $regex: escapeRegex(quitarAcentos(q.trim())), $options: 'i' };

    const lista = await productos.find(filtro).sort({ categoria: 1, nombre: 1 }).toArray();
    res.json(lista);
  } catch (e) { next(e); }
});

// Categorias existentes (para el filtro y el formulario)
app.get('/api/productos/categorias', async (req, res, next) => {
  try {
    const cats = await productos.distinct('categoria');
    res.json(cats.filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')));
  } catch (e) { next(e); }
});

// Obtener uno
app.get('/api/productos/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
    const doc = await productos.findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(doc);
  } catch (e) { next(e); }
});

// Crear
app.post('/api/productos', async (req, res, next) => {
  try {
    const { errores, datos } = validarProducto(req.body);
    if (errores.length) return res.status(400).json({ error: errores.join(' ') });
    const r = await productos.insertOne(datos);
    res.status(201).json({ _id: r.insertedId, ...datos });
  } catch (e) { next(e); }
});

// Editar (solo $set de los campos enviados: no borra campos extra del documento)
app.patch('/api/productos/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
    const { errores, datos } = validarProducto(req.body, true);
    if (errores.length) return res.status(400).json({ error: errores.join(' ') });
    if (!Object.keys(datos).length) return res.status(400).json({ error: 'No hay cambios.' });
    const doc = await productos.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: datos },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(doc);
  } catch (e) { next(e); }
});

// Eliminar
app.delete('/api/productos/:id', async (req, res, next) => {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
    const r = await productos.deleteOne({ _id: new ObjectId(req.params.id) });
    if (!r.deletedCount) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.status(204).end();
  } catch (e) { next(e); }
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error en el servidor o en la base de datos.' });
});

// ---------- Arranque ----------
async function iniciar() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(DB_NAME);
  productos = db.collection('productos');
  // Indices para que los filtros respondan rapido (RNF1)
  await productos.createIndex({ categoria: 1 });
  await productos.createIndex({ disponibilidad: 1 });
  await productos.createIndex({ ingredientes: 1 });
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
