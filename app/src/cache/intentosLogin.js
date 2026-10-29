// Cache (node-cache) con los intentos fallidos de login por IP, para el rate limit (D12–D14, D17).
//
// Por que no se usa el set() tal cual del PDF: alla cada fallo hacia set(clave, n + 1) con el TTL
// por defecto, y cada set() reinicia el TTL a 60 s. Mientras sigan llegando intentos el bloqueo
// nunca se levanta, asi que no es "5 por minuto". Aqui la ventana es FIJA: empieza con el primer
// fallo y los siguientes set() conservan el TTL que le quedaba a la clave (D13).
const NodeCache = require('node-cache');
const { LOGIN_MAX_INTENTOS, LOGIN_VENTANA_SEG } = require('../config/env');

const cache = new NodeCache({ stdTTL: LOGIN_VENTANA_SEG, checkperiod: 30 });

const clave = (ip) => `login_fallidos_${ip}`;

// Segundos que le quedan a la ventana de esa clave (0 si no existe).
function segundosRestantes(k) {
  const expira = cache.getTtl(k);
  if (!expira) return 0;
  return Math.max(1, Math.ceil((expira - Date.now()) / 1000));
}

function consultar(ip) {
  const k = clave(ip);
  const intentos = cache.get(k) || 0;
  return {
    bloqueado: intentos >= LOGIN_MAX_INTENTOS,
    intentos,
    segundosRestantes: intentos ? segundosRestantes(k) : 0,
  };
}

// Suma un fallo y devuelve los intentos que le quedan a esa IP.
function registrarFallo(ip) {
  const k = clave(ip);
  const actual = cache.get(k);
  let intentos;
  if (actual === undefined) {
    intentos = 1;
    cache.set(k, intentos); // abre la ventana con el TTL por defecto
  } else {
    intentos = actual + 1;
    cache.set(k, intentos, segundosRestantes(k)); // conserva el TTL restante
  }
  return Math.max(0, LOGIN_MAX_INTENTOS - intentos);
}

// Login correcto: se reinicia el contador de esa IP (RN4).
function limpiar(ip) {
  cache.del(clave(ip));
}

module.exports = { consultar, registrarFallo, limpiar };
