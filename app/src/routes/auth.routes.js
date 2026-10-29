// Rutas de /api/auth (URL -> middlewares -> controlador).
// Cada ruta lee su propio JSON: en el login express.json() va DESPUES del rate limiter, asi un
// cuerpo mal formado tambien cuenta como intento (D29).
const express = require('express');
const auth = require('../controllers/auth.controller');
const rateLimiter = require('../middlewares/rateLimiter');
const { requiereSesion } = require('../middlewares/autenticacion');

const router = express.Router();
const json = express.json();

router.post('/login', rateLimiter, json, auth.login); // el rate limit va solo aqui (D12)
router.post('/logout', json, requiereSesion, auth.logout);
router.get('/sesion', requiereSesion, auth.sesion);
router.post('/extender', json, requiereSesion, auth.extender);

module.exports = router;
