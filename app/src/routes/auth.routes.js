// Rutas de /api/auth (URL -> middlewares -> controlador).
const express = require('express');
const auth = require('../controllers/auth.controller');
const rateLimiter = require('../middlewares/rateLimiter');
const { requiereSesion } = require('../middlewares/autenticacion');

const router = express.Router();

router.post('/login', rateLimiter, auth.login); // el rate limit va solo aqui (D12)
router.post('/logout', requiereSesion, auth.logout);
router.get('/sesion', requiereSesion, auth.sesion);
router.post('/extender', requiereSesion, auth.extender);

module.exports = router;
