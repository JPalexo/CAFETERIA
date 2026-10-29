// Logica de cada endpoint de /api/productos.
const { ObjectId } = require('mongodb');
const { colecciones } = require('../config/db');
const { quitarAcentos } = require('../utils/texto');
const { idValido, escapeRegex } = require('../utils/ids');
const { validarProducto } = require('../validators/producto.validator');

// Listar con filtros: ?categoria=&disponibilidad=true|false&ingrediente=&q=
async function listar(req, res, next) {
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

    const lista = await colecciones.productos.find(filtro).sort({ categoria: 1, nombre: 1 }).toArray();
    res.json(lista);
  } catch (e) { next(e); }
}

// Categorias existentes (para el filtro y el formulario)
async function categorias(req, res, next) {
  try {
    const cats = await colecciones.productos.distinct('categoria');
    res.json(cats.filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')));
  } catch (e) { next(e); }
}

// Obtener uno
async function obtener(req, res, next) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
    const doc = await colecciones.productos.findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(doc);
  } catch (e) { next(e); }
}

// Crear
async function crear(req, res, next) {
  try {
    const { errores, datos } = validarProducto(req.body);
    if (errores.length) return res.status(400).json({ error: errores.join(' ') });
    const r = await colecciones.productos.insertOne(datos);
    res.status(201).json({ _id: r.insertedId, ...datos });
  } catch (e) { next(e); }
}

// Editar (solo $set de los campos enviados: no borra campos extra del documento)
async function editar(req, res, next) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
    const { errores, datos } = validarProducto(req.body, true);
    if (errores.length) return res.status(400).json({ error: errores.join(' ') });
    if (!Object.keys(datos).length) return res.status(400).json({ error: 'No hay cambios.' });
    const doc = await colecciones.productos.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: datos },
      { returnDocument: 'after' }
    );
    if (!doc) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.json(doc);
  } catch (e) { next(e); }
}

// Eliminar
async function eliminar(req, res, next) {
  try {
    if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
    const r = await colecciones.productos.deleteOne({ _id: new ObjectId(req.params.id) });
    if (!r.deletedCount) return res.status(404).json({ error: 'Producto no encontrado.' });
    res.status(204).end();
  } catch (e) { next(e); }
}

module.exports = { listar, categorias, obtener, crear, editar, eliminar };
