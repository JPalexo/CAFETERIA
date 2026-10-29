// Rate limit del login: si la IP ya agoto sus intentos responde 429 sin tocar la BD (RF-L3, D15, D16).
const { LOGIN_MAX_INTENTOS } = require('../config/env');
const intentosLogin = require('../cache/intentosLogin');

function rateLimiter(req, res, next) {
  // req.ip sin "trust proxy": en local no hay proxy y asi no se puede falsificar con X-Forwarded-For
  const { bloqueado, segundosRestantes } = intentosLogin.consultar(req.ip);
  if (!bloqueado) return next();

  res.set('Retry-After', String(segundosRestantes));
  res.status(429).json({
    error: `Demasiados intentos fallidos de inicio de sesion. Intenta de nuevo en ${segundosRestantes} segundos.`,
    intentosPermitidos: LOGIN_MAX_INTENTOS,
    retryAfterSeconds: segundosRestantes,
  });
}

module.exports = rateLimiter;
