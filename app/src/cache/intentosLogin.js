// Cache (node-cache) con los intentos de login por IP, para el rate limit (D12–D14, D17, D29).
//
// Por que no se usa el set() tal cual del PDF: alla cada fallo hacia set(clave, n + 1) con el TTL
// por defecto, y cada set() reinicia el TTL a 60 s. Mientras sigan llegando intentos el bloqueo
// nunca se levanta, asi que no es "5 por minuto". Aqui la ventana es FIJA: empieza con el primer
// intento contado y los siguientes set() conservan el TTL que le quedaba a la clave (D13).
//
// Por que se cuenta ANTES de verificar la contrasena (D29): si el fallo se sumara despues de
// bcrypt.compare (que es asincrono), con muchas peticiones simultaneas todas pasarian la consulta
// antes de que se registrara el primer fallo y se podrian hacer mas de 5 intentos. reservar() revisa
// y suma en una sola operacion sincrona (Node no la interrumpe), asi el conteo es exacto aunque
// lleguen 100 peticiones a la vez. Si el login resulta correcto, limpiar() borra el contador (RN4).
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

// Revisa el limite y, si no esta bloqueado, cuenta el intento de inmediato.
function reservar(ip) {
  const k = clave(ip);
  const actual = cache.get(k);
  if (actual !== undefined && actual >= LOGIN_MAX_INTENTOS) {
    return { bloqueado: true, intentosRestantes: 0, segundosRestantes: segundosRestantes(k) };
  }
  const intentos = (actual || 0) + 1;
  if (actual === undefined) cache.set(k, intentos); // abre la ventana con el TTL por defecto
  else cache.set(k, intentos, segundosRestantes(k)); // conserva el TTL restante
  return {
    bloqueado: false,
    intentosRestantes: Math.max(0, LOGIN_MAX_INTENTOS - intentos),
    segundosRestantes: segundosRestantes(k),
  };
}

// Login correcto: se reinicia el contador de esa IP (RN4).
function limpiar(ip) {
  cache.del(clave(ip));
}

module.exports = { reservar, limpiar };
