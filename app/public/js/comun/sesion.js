// Sesion en cada pagina protegida: revisa token y rol, pinta el encabezado y maneja la alerta de
// cierre de sesion (RN8–RN13, RF-S1–RF-S3, D19–D21, D34). El servidor manda en el tiempo.
// Modo prueba (D34): la alerta es solo un "cascaron" de demostracion: sale UNA vez por sesion a los
// 10 s, sus botones solo la cierran y, si nadie responde, muestra el aviso de extension automatica.
// No llama al servidor ni cambia nada de la sesion. Se quitara cuando ya no se necesite.
import { api, obtenerToken, borrarToken } from './api.js';
import { $, escapar, toast } from './ui.js';

const VISTA_POR_ROL = { admin: '/admin/', atencion: '/atencion/' };
const NOMBRE_ROL = { admin: 'Administrador', atencion: 'Atención' };

const DURACION_ALERTA = 30 * 1000; // RF-S1
const PRUEBA_RETRASO = 10 * 1000; // D34: si se recarga antes de verla, sale 10 s despues de cargar
const CLAVE_PRUEBA_VISTA = 'alertaPruebaVista'; // sessionStorage: token de la sesion que ya la vio
const MARGEN_REAL = 2 * 1000; // en real la alerta abre 2 s antes para que termine antes de que expire
const PASO = 5;
const EXTRA_MAX = 60; // RN9
const nuncaTermina = () => new Promise(() => {});

// ===================== Pagina =====================

// Devuelve los datos de la sesion. Si no hay sesion o el rol no corresponde, redirige.
export async function iniciarPagina({ roles, titulo }) {
  if (!obtenerToken()) {
    location.replace('/');
    return nuncaTermina();
  }

  let sesion;
  try {
    ({ datos: sesion } = await api('/api/auth/sesion'));
  } catch (e) {
    document.body.classList.remove('cargando');
    toast(e.message, true);
    throw e;
  }

  const { rol } = sesion.usuario;
  if (!roles.includes(rol)) {
    location.replace(`${VISTA_POR_ROL[rol]}?motivo=sinpermiso`);
    return nuncaTermina();
  }

  pintarEncabezado(sesion, titulo);
  if (new URLSearchParams(location.search).get('motivo') === 'sinpermiso') {
    toast('No tienes permiso para esa vista', true);
    history.replaceState(null, '', location.pathname);
  }
  iniciarAlerta(sesion);
  document.body.classList.remove('cargando');
  return sesion;
}

// Si el navegador muestra la pagina desde su cache (boton "atras") se vuelve a revisar la sesion.
window.addEventListener('pageshow', (ev) => {
  if (!ev.persisted) return;
  if (!obtenerToken()) location.replace('/');
  else api('/api/auth/sesion').catch(() => {}); // un 401 manda al login
});

function pintarEncabezado(sesion, titulo) {
  const { nombre, rol } = sesion.usuario;
  const enlaces = rol === 'admin'
    ? [['/admin/', 'Catálogo'], ['/atencion/', 'Atención']]
    : [['/atencion/', 'Atención']];
  const proximamente = rol === 'admin' ? ['Usuarios', 'Clientes', 'Pedidos'] : [];

  $('#encabezado').innerHTML = `
    <div class="marca">
      <span class="logo" aria-hidden="true">☕</span>
      <div>
        <h1>Café Central</h1>
        <p>${escapar(titulo)}</p>
      </div>
    </div>
    <nav class="menu" aria-label="Menú principal">
      ${enlaces.map(([href, texto]) => (location.pathname === href
        ? `<a href="${href}" class="activo" aria-current="page">${texto}</a>`
        : `<a href="${href}">${texto}</a>`)).join('')}
      ${proximamente.map((texto) =>
        `<span class="deshabilitado" aria-disabled="true" title="Próximamente">${texto} <small>· Próximamente</small></span>`).join('')}
    </nav>
    <div class="usuario-actual">
      <div class="nombre">${escapar(nombre)}<span class="rol">${NOMBRE_ROL[rol] || escapar(rol)}</span></div>
      <button type="button" class="btn btn-secundario" id="btnCerrarSesion">Cerrar sesión</button>
    </div>`;
  $('#btnCerrarSesion').onclick = () => cerrarSesion('cerrada');
}

// Cierra la sesion en el servidor y vuelve al login. Se usa fetch directo para que un 401
// (sesion ya vencida) no cambie el motivo.
export async function cerrarSesion(motivo = 'cerrada') {
  clearInterval(estado.intervalo);
  estado.fase = 'cerrando';
  const token = obtenerToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch { /* sin conexion: igual se borra el token */ }
  }
  borrarToken();
  location.replace(`/?motivo=${motivo}`);
}

// ===================== Alerta de sesion =====================

const estado = {
  modoPrueba: false,
  alertaEn: 0,
  extraDisponibleMin: EXTRA_MAX,
  autoExtensionUsada: false,
  fase: 'espera', // espera | alerta | ocupado | cerrando | inactiva (modo prueba ya mostrada)
  finAlerta: 0,
  minutos: PASO,
  modalAbierto: false,
  intervalo: null,
};

let modal;
let avisoAuto;

function iniciarAlerta(sesion) {
  crearModales();
  estado.modoPrueba = sesion.modoPrueba;
  aplicarSesion(sesion);
  if (estado.modoPrueba) {
    // D34: una sola vez por sesion (aunque se cambie de vista o se recargue)
    if (pruebaYaVista()) { estado.fase = 'inactiva'; return; }
    if (estado.alertaEn < Date.now()) estado.alertaEn = Date.now() + PRUEBA_RETRASO;
  }

  // Un solo temporizador que compara contra la hora real: si la pestana estuvo dormida, al volver
  // la alerta se ubica donde debe (no se confia en un setTimeout largo).
  estado.intervalo = setInterval(revisar, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisar(); });
}

function aplicarSesion(s) {
  estado.alertaEn = s.alertaEn;
  estado.extraDisponibleMin = s.extraDisponibleMin;
  estado.autoExtensionUsada = s.autoExtensionUsada;
}

// ----- Modo prueba (D34) -----
function pruebaYaVista() {
  try { return sessionStorage.getItem(CLAVE_PRUEBA_VISTA) === obtenerToken(); } catch { return false; }
}
function marcarPruebaVista() {
  try { sessionStorage.setItem(CLAVE_PRUEBA_VISTA, obtenerToken()); } catch { /* sin storage: solo esta pagina */ }
}
// Cualquier boton de la alerta de prueba solo la cierra; no toca la sesion.
function terminarPrueba() {
  estado.fase = 'inactiva';
  clearInterval(estado.intervalo);
  cerrarModal();
}

function revisar() {
  const ahora = Date.now();
  if (estado.fase === 'espera') {
    const inicio = estado.modoPrueba ? estado.alertaEn : estado.alertaEn - MARGEN_REAL;
    if (ahora >= inicio) abrirAlerta(inicio);
  } else if (estado.fase === 'alerta') {
    const restante = estado.finAlerta - ahora;
    if (restante <= 0) sinRespuesta();
    else pintarCuenta(restante);
  }
}

function crearModales() {
  modal = document.createElement('dialog');
  modal.className = 'alerta-sesion';
  modal.setAttribute('aria-labelledby', 'alertaTitulo');
  modal.setAttribute('aria-describedby', 'alertaTexto');
  modal.innerHTML = `
    <div class="modal-cuerpo">
      <span class="etiqueta-prueba" id="alertaPrueba">MODO PRUEBA</span>
      <h2 id="alertaTitulo">Tu sesión está por terminar</h2>
      <div class="cuenta"><span id="alertaSegundos">30</span> <small>s</small></div>
      <div class="barra-progreso" aria-hidden="true"><div id="alertaBarra"></div></div>
      <div id="alertaSelector">
        <p class="texto-pequeno">Tiempo extra</p>
        <div class="selector-extra">
          <button type="button" class="btn btn-secundario" id="btnMenos" aria-label="Quitar 5 minutos">−</button>
          <output id="alertaMinutos" aria-live="polite">5 min</output>
          <button type="button" class="btn btn-secundario" id="btnMas" aria-label="Agregar 5 minutos">+</button>
        </div>
      </div>
      <p class="texto-pequeno" id="alertaTexto"></p>
      <div class="acciones">
        <button type="button" class="btn btn-secundario" id="btnAlertaCerrar">Cerrar sesión</button>
        <button type="button" class="btn btn-primario" id="btnAlertaExtender">Extender sesión</button>
      </div>
    </div>`;

  avisoAuto = document.createElement('dialog');
  avisoAuto.className = 'aviso-auto';
  avisoAuto.setAttribute('aria-labelledby', 'avisoAutoTitulo');
  avisoAuto.innerHTML = `
    <div class="modal-cuerpo">
      <div class="icono" aria-hidden="true">⏳</div>
      <h2 id="avisoAutoTitulo">Sesión extendida</h2>
      <p>Tu sesión se extendió 5 minutos porque no hubo respuesta. En el siguiente aviso, si no respondes, la sesión se cerrará.</p>
      <div class="acciones"><button type="button" class="btn btn-primario" id="btnEntendido">Entendido</button></div>
    </div>`;
  document.body.append(modal, avisoAuto);

  // Esc no cierra la alerta; si el navegador la cierra de todos modos, se vuelve a abrir.
  modal.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') ev.preventDefault(); });
  modal.addEventListener('cancel', (ev) => ev.preventDefault());
  modal.addEventListener('close', () => { if (estado.modalAbierto) modal.showModal(); });

  modal.querySelector('#btnMenos').onclick = () => cambiarMinutos(-PASO);
  modal.querySelector('#btnMas').onclick = () => cambiarMinutos(PASO);
  modal.querySelector('#btnAlertaExtender').onclick = () => (estado.modoPrueba ? terminarPrueba() : extender());
  modal.querySelector('#btnAlertaCerrar').onclick = () => (estado.modoPrueba ? terminarPrueba() : cerrarSesion('cerrada'));
  avisoAuto.querySelector('#btnEntendido').onclick = () => avisoAuto.close();
}

const maxMinutos = () => Math.min(EXTRA_MAX, estado.extraDisponibleMin);

function abrirAlerta(inicio) {
  estado.fase = 'alerta';
  estado.finAlerta = inicio + DURACION_ALERTA;
  estado.minutos = PASO;
  if (estado.modoPrueba) marcarPruebaVista();
  if (avisoAuto.open) avisoAuto.close();

  const hayExtra = estado.extraDisponibleMin >= PASO;
  modal.querySelector('#alertaPrueba').classList.toggle('oculto', !estado.modoPrueba);
  modal.querySelector('#alertaSelector').classList.toggle('oculto', !hayExtra);
  modal.querySelector('#btnAlertaExtender').classList.toggle('oculto', !hayExtra);
  modal.querySelector('#alertaTexto').textContent = hayExtra
    ? `Tiempo extra disponible: ${estado.extraDisponibleMin} min.${estado.autoExtensionUsada ? ' Si no respondes, la sesión se cerrará.' : ''}`
    : 'Ya usaste todo el tiempo extra. La sesión se cerrará al terminar la cuenta.'; // RN13
  habilitarBotones(true);
  pintarMinutos();
  pintarCuenta(estado.finAlerta - Date.now());

  estado.modalAbierto = true;
  modal.showModal();
  modal.querySelector(hayExtra ? '#btnAlertaExtender' : '#btnAlertaCerrar').focus();
}

function cerrarModal() {
  estado.modalAbierto = false;
  if (modal.open) modal.close();
}

function pintarCuenta(restanteMs) {
  const seg = Math.max(0, Math.ceil(restanteMs / 1000));
  modal.querySelector('#alertaSegundos').textContent = seg;
  modal.querySelector('#alertaBarra').style.width = `${Math.max(0, Math.min(100, (restanteMs / DURACION_ALERTA) * 100))}%`;
}

function cambiarMinutos(delta) {
  estado.minutos = Math.min(maxMinutos(), Math.max(PASO, estado.minutos + delta));
  pintarMinutos();
}

function pintarMinutos() {
  const menos = modal.querySelector('#btnMenos');
  const mas = modal.querySelector('#btnMas');
  modal.querySelector('#alertaMinutos').textContent = `${estado.minutos} min`;
  menos.disabled = estado.minutos <= PASO;
  mas.disabled = estado.minutos >= maxMinutos();
  // si el boton con el foco se deshabilito, el foco pasa al otro para no salir del modal
  if (document.activeElement === menos && menos.disabled) mas.disabled ? modal.querySelector('#btnAlertaExtender').focus() : mas.focus();
  if (document.activeElement === mas && mas.disabled) menos.disabled ? modal.querySelector('#btnAlertaExtender').focus() : menos.focus();
}

function habilitarBotones(si) {
  modal.querySelectorAll('button').forEach((b) => { b.disabled = !si; });
}

async function extender() {
  const minutos = estado.minutos;
  estado.fase = 'ocupado';
  habilitarBotones(false);
  try {
    const { datos } = await api('/api/auth/extender', { method: 'POST', body: JSON.stringify({ minutos }) });
    aplicarSesion(datos.sesion);
    estado.fase = 'espera';
    cerrarModal();
    toast(`Sesión extendida ${minutos} min`);
  } catch (e) {
    toast(e.message, true);
    estado.fase = 'alerta'; // si ya se acabo la cuenta, el siguiente tick lo trata como sin respuesta
    habilitarBotones(true);
    pintarMinutos();
  }
}

// RN11 / RN12: sin respuesta en 30 s.
async function sinRespuesta() {
  estado.fase = 'ocupado';
  cerrarModal();
  if (estado.modoPrueba) {
    // D34: solo se muestra el aviso como demostracion; la sesion no cambia
    terminarPrueba();
    avisoAuto.showModal();
    avisoAuto.querySelector('#btnEntendido').focus();
    return;
  }
  if (estado.autoExtensionUsada || estado.extraDisponibleMin < PASO) {
    cerrarSesion('expirada');
    return;
  }
  try {
    const { datos } = await api('/api/auth/extender', {
      method: 'POST',
      body: JSON.stringify({ minutos: PASO, automatica: true }),
    });
    aplicarSesion(datos.sesion);
    estado.fase = 'espera';
    avisoAuto.showModal();
    avisoAuto.querySelector('#btnEntendido').focus();
  } catch {
    cerrarSesion('expirada');
  }
}
