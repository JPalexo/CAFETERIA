// Pantalla de login: envia usuario y contrasena, muestra intentos restantes y el bloqueo (429) con
// cuenta regresiva (RF-L1, RF-L3). Si ya hay una sesion valida manda directo a la vista del rol.
import { api, obtenerToken, guardarToken } from './comun/api.js';
import { $, escapar } from './comun/ui.js';

const VISTA_POR_ROL = { admin: '/admin/', atencion: '/atencion/' };
const MENSAJES_MOTIVO = {
  expirada: 'Tu sesión terminó, vuelve a iniciar sesión.',
  cerrada: 'Cerraste sesión.',
};
const CLAVE_BLOQUEO = 'loginBloqueadoHasta'; // para que la cuenta regresiva siga si se recarga

const form = $('#formLogin');
const mensaje = $('#mensaje');
const campos = [$('#usuario'), $('#password'), $('#btnVer'), $('#btnEntrar')];
let intervaloBloqueo;

function mostrarMensaje(html, tipo) {
  mensaje.className = `mensaje ${tipo}`;
  mensaje.innerHTML = html;
}

function ocultarMensaje() {
  mensaje.className = 'mensaje oculto';
  mensaje.textContent = '';
}

function habilitar(si) {
  campos.forEach((c) => { c.disabled = !si; });
}

// ---------- Bloqueo por rate limit (429) ----------
function bloquear(hasta) {
  clearInterval(intervaloBloqueo);
  sessionStorage.setItem(CLAVE_BLOQUEO, String(hasta));
  habilitar(false);

  const pintar = () => {
    const seg = Math.ceil((hasta - Date.now()) / 1000);
    if (seg <= 0) {
      clearInterval(intervaloBloqueo);
      sessionStorage.removeItem(CLAVE_BLOQUEO);
      habilitar(true);
      mostrarMensaje('Ya puedes intentar de nuevo.', 'info');
      $('#password').focus();
      return;
    }
    mostrarMensaje(`Demasiados intentos fallidos. Podrás intentar de nuevo en <strong>${seg} s</strong>`, 'bloqueo');
  };
  pintar();
  intervaloBloqueo = setInterval(pintar, 1000);
}

// ---------- Mostrar / ocultar contrasena ----------
$('#btnVer').onclick = () => {
  const input = $('#password');
  const ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  $('#btnVer').textContent = ver ? 'Ocultar' : 'Mostrar';
  $('#btnVer').setAttribute('aria-pressed', String(ver));
  $('#btnVer').setAttribute('aria-label', ver ? 'Ocultar contraseña' : 'Mostrar contraseña');
};

// ---------- Enviar ----------
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const usuario = $('#usuario').value.trim();
  const password = $('#password').value;

  habilitar(false);
  $('#btnEntrar').textContent = 'Entrando…';
  try {
    const { datos } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usuario, password }),
    });
    guardarToken(datos.token);
    location.replace(datos.redirigirA);
    return;
  } catch (e) {
    $('#btnEntrar').textContent = 'Entrar';
    if (e.status === 429) {
      bloquear(Date.now() + (e.datos?.retryAfterSeconds || 60) * 1000);
      return;
    }
    habilitar(true);
    let html = escapar(e.message);
    const restantes = e.datos?.intentosRestantes;
    if (restantes === 0) html += '<small>El siguiente intento fallido bloqueará el acceso por 1 minuto.</small>';
    else if (restantes > 0) html += `<small>Te quedan ${restantes} ${restantes === 1 ? 'intento' : 'intentos'}.</small>`;
    mostrarMensaje(html, 'error');
    $('#password').select();
  }
});

// ---------- Al abrir la pagina ----------
async function iniciar() {
  if (obtenerToken()) {
    try {
      const { datos } = await api('/api/auth/sesion'); // si el token ya no sirve, api() recarga con ?motivo=expirada
      location.replace(VISTA_POR_ROL[datos.usuario.rol]);
      return;
    } catch (e) {
      mostrarMensaje(escapar(e.message), 'error');
    }
  }

  const motivo = new URLSearchParams(location.search).get('motivo');
  if (MENSAJES_MOTIVO[motivo]) mostrarMensaje(MENSAJES_MOTIVO[motivo], 'info');
  else if (!mensaje.textContent) ocultarMensaje();

  const hasta = Number(sessionStorage.getItem(CLAVE_BLOQUEO));
  if (hasta > Date.now()) bloquear(hasta);
  else $('#usuario').focus();

  document.body.classList.remove('cargando');
}

iniciar();
