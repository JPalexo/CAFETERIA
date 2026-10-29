// Logica de /api/auth: login, logout, consultar y extender la sesion.
const bcrypt = require('bcryptjs');
const { colecciones } = require('../config/db');
const intentosLogin = require('../cache/intentosLogin');
const sesiones = require('../cache/sesiones');

// Hash de una contrasena que nadie usa: si el usuario no existe se compara contra este,
// asi la respuesta tarda lo mismo y no da pistas de que usuarios existen (D10).
const HASH_FALSO = bcrypt.hashSync('usuario-que-no-existe', 10);

const REDIRECCION = { admin: '/admin/', atencion: '/atencion/' };

async function login(req, res, next) {
  try {
    const { usuario, password } = req.body || {};
    if (typeof usuario !== 'string' || !usuario.trim() || typeof password !== 'string' || !password) {
      // el intento ya se conto en el rate limiter (D29)
      return res.status(400).json({ error: 'Usuario y contrasena son obligatorios.', intentosRestantes: req.intentosRestantes });
    }

    const doc = await colecciones.usuarios.findOne({ usuario: usuario.trim().toLowerCase(), activo: true });
    const correcta = await bcrypt.compare(password, doc ? doc.password_hash : HASH_FALSO);
    if (!doc || !correcta) {
      return res.status(401).json({ error: 'Usuario o contrasena incorrectos.', intentosRestantes: req.intentosRestantes });
    }

    intentosLogin.limpiar(req.ip); // RN4: un login correcto reinicia el contador
    const { token, sesion } = sesiones.crear(doc);
    res.json({
      mensaje: `Bienvenido, ${doc.nombre}`,
      token,
      redirigirA: REDIRECCION[doc.rol],
      sesion: sesiones.aPublico(sesion),
    });
  } catch (e) { next(e); }
}

function logout(req, res) {
  sesiones.eliminar(req.token);
  res.json({ mensaje: 'Sesion cerrada.' });
}

function sesion(req, res) {
  res.json(sesiones.aPublico(req.sesion));
}

function extender(req, res) {
  const { minutos, automatica } = req.body || {};
  const r = sesiones.extender(req.token, minutos, automatica);
  if (r.error) return res.status(400).json({ error: r.error });
  res.json({
    mensaje: r.simulado ? 'Modo prueba: la sesion no cambio (extension simulada).' : 'Sesion extendida.',
    simulado: r.simulado,
    sesion: sesiones.aPublico(r.sesion),
  });
}

module.exports = { login, logout, sesion, extender };
