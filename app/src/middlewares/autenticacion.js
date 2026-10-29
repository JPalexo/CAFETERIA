// Protege la API: requiereSesion (token Bearer valido) y requiereRol(...roles) (D08, D09).
const sesiones = require('../cache/sesiones');

function requiereSesion(req, res, next) {
  const [tipo, token] = (req.get('Authorization') || '').split(' ');
  const sesion = tipo === 'Bearer' ? sesiones.obtener(token) : null;
  if (!sesion) return res.status(401).json({ error: 'Sesion no valida o expirada. Inicia sesion de nuevo.' });
  req.sesion = sesion;
  req.token = token;
  next();
}

function requiereRol(...roles) {
  return (req, res, next) => {
    requiereSesion(req, res, () => {
      if (!roles.includes(req.sesion.rol)) {
        return res.status(403).json({ error: 'No tienes permiso para esta accion.' });
      }
      next();
    });
  };
}

module.exports = { requiereSesion, requiereRol };
