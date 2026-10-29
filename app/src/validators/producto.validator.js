// Validacion y normalizacion de los datos de un producto.
const { quitarAcentos } = require('../utils/texto');

// Valida y normaliza los campos del producto.
// parcial = true se usa en PATCH (solo valida lo que viene).
function validarProducto(body, parcial = false) {
  const errores = [];
  const datos = {};

  if (!parcial || body.nombre !== undefined) {
    const v = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    if (!v) errores.push('El nombre es obligatorio.');
    else datos.nombre = quitarAcentos(v);
  }
  if (!parcial || body.categoria !== undefined) {
    const v = typeof body.categoria === 'string' ? body.categoria.trim() : '';
    if (!v) errores.push('La categoria es obligatoria.');
    else datos.categoria = quitarAcentos(v);
  }
  if (!parcial || body.precio !== undefined) {
    const v = Number(body.precio);
    if (body.precio === '' || body.precio === null || !Number.isFinite(v) || v <= 0) {
      errores.push('El precio debe ser un numero mayor a 0.');
    } else datos.precio = Math.round(v * 100) / 100;
  }
  if (!parcial || body.descripcion !== undefined) {
    const v = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
    datos.descripcion = quitarAcentos(v);
  }
  if (!parcial || body.ingredientes !== undefined) {
    let lista = body.ingredientes;
    if (typeof lista === 'string') lista = lista.split(',');
    if (!Array.isArray(lista)) lista = [];
    datos.ingredientes = lista.map((i) => quitarAcentos(String(i).trim())).filter(Boolean);
  }
  if (!parcial || body.disponibilidad !== undefined) {
    if (typeof body.disponibilidad !== 'boolean') {
      errores.push('La disponibilidad debe ser verdadero o falso.');
    } else datos.disponibilidad = body.disponibilidad;
  }
  return { errores, datos };
}

module.exports = { validarProducto };
