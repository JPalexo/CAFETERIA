// Rutas de /api/productos (URL -> middlewares -> controlador).
const express = require('express');
const productos = require('../controllers/productos.controller');
const { requiereSesion, requiereRol } = require('../middlewares/autenticacion');

const router = express.Router();

// Consultar: cualquier rol con sesion. Modificar: solo admin (RNF-1).
router.get('/', requiereSesion, productos.listar);
router.get('/categorias', requiereSesion, productos.categorias); // antes de /:id para que no lo tome como id
router.get('/:id', requiereSesion, productos.obtener);
router.post('/', requiereRol('admin'), productos.crear);
router.patch('/:id', requiereRol('admin'), productos.editar);
router.delete('/:id', requiereRol('admin'), productos.eliminar);

module.exports = router;
