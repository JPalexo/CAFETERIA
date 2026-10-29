// fetch a la API con el token de la sesion (D08). Si el servidor responde 401 la sesion ya no sirve:
// se borra el token y se manda al login.

const CLAVE_TOKEN = 'token';

export const obtenerToken = () => sessionStorage.getItem(CLAVE_TOKEN);
export const guardarToken = (token) => sessionStorage.setItem(CLAVE_TOKEN, token);
export const borrarToken = () => sessionStorage.removeItem(CLAVE_TOKEN);

// Devuelve { status, datos } o lanza un Error con el mensaje del servidor (y .status y .datos).
export async function api(ruta, opciones = {}) {
  const token = obtenerToken();
  const headers = { 'Content-Type': 'application/json', ...opciones.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(ruta, { ...opciones, headers });
  } catch {
    throw new Error('No hay conexión con el servidor. Verifica que esté corriendo (npm start).');
  }

  const texto = await res.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = null; }

  // Sesion vencida o token invalido. Solo aplica si se mando un token (en el login un 401 es
  // "contrasena incorrecta" y lo maneja la pagina).
  if (res.status === 401 && token) {
    borrarToken();
    location.replace('/?motivo=expirada');
    return new Promise(() => {}); // la pagina se va; no sigue el codigo que esperaba la respuesta
  }

  if (!res.ok) {
    const error = new Error(datos?.error || `Error ${res.status}`);
    error.status = res.status;
    error.datos = datos;
    throw error;
  }
  return { status: res.status, datos };
}
