// Validacion y normalizacion de los datos de un usuario del personal.
const { quitarAcentos } = require('../utils/texto');

const ROLES = ['admin', 'atencion'];
const PASSWORD_MIN = 8; // RN20

// Devuelve { errores, datos }. datos.password va en texto plano: quien lo use debe guardarlo como hash.
// parcial = true valida solo los campos que vienen (para ediciones futuras).
function validarUsuario(body, parcial = false) {
  const errores = [];
  const datos = {};

  if (!parcial || body.usuario !== undefined) {
    const v = typeof body.usuario === 'string' ? body.usuario.trim().toLowerCase() : '';
    if (!/^[a-z0-9._]{3,30}$/.test(v)) {
      errores.push('El usuario debe tener de 3 a 30 caracteres: letras minusculas, numeros, punto o guion bajo.');
    } else datos.usuario = v;
  }
  if (!parcial || body.nombre !== undefined) {
    const v = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (!v) errores.push('El nombre es obligatorio.');
    else datos.nombre = quitarAcentos(v);
  }
  if (!parcial || body.rol !== undefined) {
    if (!ROLES.includes(body.rol)) errores.push(`El rol debe ser uno de: ${ROLES.join(', ')}.`);
    else datos.rol = body.rol;
  }
  if (!parcial || body.password !== undefined) {
    if (typeof body.password !== 'string' || body.password.length < PASSWORD_MIN) {
      errores.push(`La contrasena debe tener al menos ${PASSWORD_MIN} caracteres.`);
    } else datos.password = body.password;
  }
  return { errores, datos };
}

module.exports = { validarUsuario, ROLES, PASSWORD_MIN };
