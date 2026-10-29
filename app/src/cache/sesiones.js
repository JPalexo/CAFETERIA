// Cache (node-cache) de sesiones: clave = token aleatorio, valor = datos de la sesion (D07, D19, D21).
const crypto = require('crypto');
const NodeCache = require('node-cache');
const { SESION_HORAS, SESION_MODO_PRUEBA } = require('../config/env');

const cache = new NodeCache({ checkperiod: 60 });

const EXTRA_MAX_MIN = 60; // RN9: tiempo extra maximo por sesion
const AUTO_MIN = 5; // RN11: extension automatica
const MIN = 60 * 1000;

// TTL de la clave: hasta que expira la sesion + 60 s de margen.
const ttlHasta = (expira) => Math.ceil((expira - Date.now()) / 1000) + 60;

function crear(usuarioDoc) {
  const token = crypto.randomBytes(32).toString('hex');
  const inicio = Date.now();
  const sesion = {
    usuarioId: String(usuarioDoc._id),
    usuario: usuarioDoc.usuario,
    nombre: usuarioDoc.nombre,
    rol: usuarioDoc.rol,
    inicio,
    expira: inicio + SESION_HORAS * 60 * MIN,
    extraUsadoMin: 0,
    autoExtensionUsada: false,
  };
  cache.set(token, sesion, ttlHasta(sesion.expira));
  return { token, sesion };
}

function obtener(token) {
  if (typeof token !== 'string' || !token) return null;
  const sesion = cache.get(token);
  if (!sesion) return null;
  if (Date.now() > sesion.expira) {
    cache.del(token);
    return null;
  }
  return sesion;
}

// Aplica RN9–RN12. Devuelve { sesion, simulado } o { error } si la peticion no es valida.
function extender(token, minutos, automatica) {
  const sesion = obtener(token);
  if (!sesion) return { error: 'Sesion no valida o expirada. Inicia sesion de nuevo.' };

  if (automatica === true) {
    if (sesion.autoExtensionUsada) return { error: 'La extension automatica ya se uso en esta sesion.' };
    minutos = AUTO_MIN;
  }

  const disponible = EXTRA_MAX_MIN - sesion.extraUsadoMin;
  if (disponible < 5) return { error: 'Ya no queda tiempo extra disponible en esta sesion.' };
  if (!Number.isInteger(minutos) || minutos % 5 !== 0 || minutos < 5 || minutos > disponible) {
    return { error: `Los minutos deben ser multiplo de 5, entre 5 y ${disponible}.` };
  }

  // Modo prueba: se valida igual pero no cambia el tiempo real (D21)
  if (SESION_MODO_PRUEBA) return { sesion, simulado: true };

  sesion.expira += minutos * MIN;
  sesion.extraUsadoMin += minutos;
  if (automatica === true) sesion.autoExtensionUsada = true;
  cache.set(token, sesion, ttlHasta(sesion.expira));
  return { sesion, simulado: false };
}

function eliminar(token) {
  cache.del(token);
}

// Cierra todas las sesiones de un usuario (RN7, se usara al desactivar usuarios en la T05).
function eliminarPorUsuario(usuarioId) {
  const id = String(usuarioId);
  const tokens = cache.keys().filter((t) => cache.get(t)?.usuarioId === id);
  cache.del(tokens);
  return tokens.length;
}

// Lo que ve el frontend (sin el token).
function aPublico(sesion) {
  return {
    usuario: { id: sesion.usuarioId, usuario: sesion.usuario, nombre: sesion.nombre, rol: sesion.rol },
    inicio: sesion.inicio,
    expira: sesion.expira,
    alertaEn: SESION_MODO_PRUEBA ? sesion.inicio + 10 * 1000 : sesion.expira - 30 * 1000,
    extraUsadoMin: sesion.extraUsadoMin,
    extraDisponibleMin: EXTRA_MAX_MIN - sesion.extraUsadoMin,
    autoExtensionUsada: sesion.autoExtensionUsada,
    modoPrueba: SESION_MODO_PRUEBA,
  };
}

module.exports = { crear, obtener, extender, eliminar, eliminarPorUsuario, aPublico };
