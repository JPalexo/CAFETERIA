// Rutas de /api/productos (URL -> controlador).
const express = require('express');
const productos = require('../controllers/productos.controller');

const router = express.Router();

router.get('/', productos.listar);
router.get('/categorias', productos.categorias); // antes de /:id para que no lo tome como id
router.get('/:id', productos.obtener);
router.post('/', productos.crear);
router.patch('/:id', productos.editar);
router.delete('/:id', productos.eliminar);

module.exports = router;
