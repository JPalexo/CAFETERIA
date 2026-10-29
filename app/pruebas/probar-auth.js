// Pruebas de la TAREA_02 y TAREA_03 (login, rate limit, sesiones y API protegida) contra el servidor corriendo.
// Crea dos usuarios temporales con contrasenas aleatorias y los borra al final, aunque algo falle.
// Uso: npm start (en otra terminal) y luego npm run probar-auth
// Si el servidor corre con SESION_MODO_PRUEBA=true, solo se prueban los criterios del modo prueba.
const crypto = require('crypto');
const path = require('path');
const { spawnSync } = require('child_process');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');
const env = require('../src/config/env');

const BASE = `http://localhost:${env.PORT}`;
const PRODUCTO_PRUEBA = 'Producto PRUEBA T02';
const ADMIN = { usuario: 'prueba_admin_t02', password: crypto.randomBytes(12).toString('hex') };
const ATENCION = { usuario: 'prueba_atencion_t02', password: crypto.randomBytes(12).toString('hex') };

const resultados = [];
function revisar(nombre, ok, detalle = '') {
  resultados.push({ ok, nombre, detalle });
  console.log(`${ok ? '✅' : '❌'} ${nombre}${detalle ? `  (${detalle})` : ''}`);
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(metodo, ruta, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(BASE + ruta, { method: metodo, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const texto = await r.text();
  return { status: r.status, headers: r.headers, json: texto ? JSON.parse(texto) : null };
}

const login = (u, password) => api('POST', '/api/auth/login', { body: { usuario: u.usuario, password } });

async function pruebasModoPrueba() {
  const r = await login(ADMIN, ADMIN.password);
  const s = r.json.sesion;
  revisar('Modo prueba: alertaEn = inicio + 10 s', s.alertaEn === s.inicio + 10000, `alertaEn - inicio = ${s.alertaEn - s.inicio} ms`);
  const ext = await api('POST', '/api/auth/extender', { token: r.json.token, body: { minutos: 20 } });
  const despues = await api('GET', '/api/auth/sesion', { token: r.json.token });
  revisar('Modo prueba: /extender responde simulado: true', ext.status === 200 && ext.json.simulado === true, `status ${ext.status}`);
  revisar('Modo prueba: expira no cambia', despues.json.expira === s.expira && despues.json.extraUsadoMin === 0);
}

async function pruebasNormales(usuarios) {
  // --- Login y redireccion por rol ---
  const rA = await login(ADMIN, ADMIN.password);
  revisar('Login admin → 200, token, redirigirA /admin/', rA.status === 200 && !!rA.json.token && rA.json.redirigirA === '/admin/', `status ${rA.status}`);
  const rB = await login(ATENCION, ATENCION.password);
  revisar('Login atencion → 200, redirigirA /atencion/', rB.status === 200 && rB.json.redirigirA === '/atencion/', `status ${rB.status}`);
  const tAdmin = rA.json.token;
  const tAtencion = rB.json.token;

  // --- API de productos protegida ---
  let r = await api('GET', '/api/productos');
  revisar('GET /api/productos sin token → 401', r.status === 401, `status ${r.status}`);
  r = await api('GET', '/api/productos', { token: tAtencion });
  revisar('GET /api/productos con atencion → 200', r.status === 200, `status ${r.status}`);
  r = await api('GET', '/api/productos', { token: 'token-inventado' });
  revisar('GET /api/productos con token inventado → 401', r.status === 401, `status ${r.status}`);
  const nuevo = { nombre: PRODUCTO_PRUEBA, categoria: 'Postres', precio: 10, ingredientes: 'azucar', disponibilidad: true };
  r = await api('POST', '/api/productos', { token: tAtencion, body: nuevo });
  revisar('POST /api/productos con atencion → 403', r.status === 403, `status ${r.status}`);
  r = await api('POST', '/api/productos', { token: tAdmin, body: nuevo });
  revisar('POST /api/productos con admin → 201', r.status === 201, `status ${r.status}`);
  if (r.status === 201) {
    const d = await api('DELETE', `/api/productos/${r.json._id}`, { token: tAdmin });
    revisar('DELETE del producto de prueba con admin → 204', d.status === 204, `status ${d.status}`);
  }

  // --- Datos de la sesion ---
  r = await api('GET', '/api/auth/sesion', { token: tAdmin });
  const s = r.json;
  revisar(`GET /api/auth/sesion → expira = inicio + ${env.SESION_HORAS} h`, s.expira - s.inicio === env.SESION_HORAS * 3600000);
  revisar('GET /api/auth/sesion → extraDisponibleMin 60', s.extraDisponibleMin === 60);
  revisar('GET /api/auth/sesion → alertaEn = expira − 30 s', s.alertaEn === s.expira - 30000);

  // --- Extender ---
  const ext = (token, body) => api('POST', '/api/auth/extender', { token, body });
  r = await ext(tAdmin, { minutos: 7 });
  revisar('/extender 7 min → 400', r.status === 400, `status ${r.status}`);
  r = await ext(tAdmin, { minutos: 0 });
  revisar('/extender 0 min → 400', r.status === 400, `status ${r.status}`);
  const r20 = await ext(tAdmin, { minutos: 20 });
  const r40 = await ext(tAdmin, { minutos: 40 });
  revisar('/extender 20 + 40 → 200 y extraDisponibleMin 0',
    r20.status === 200 && r40.status === 200 && r40.json.sesion.extraDisponibleMin === 0
      && r40.json.sesion.expira === s.expira + 60 * 60000,
    `status ${r20.status}/${r40.status}`);
  r = await ext(tAdmin, { minutos: 5 });
  revisar('/extender 5 min sin tiempo disponible → 400', r.status === 400, `status ${r.status}`);
  const otra = await login(ADMIN, ADMIN.password);
  const a1 = await ext(otra.json.token, { automatica: true });
  const a2 = await ext(otra.json.token, { automatica: true });
  revisar('/extender automatica dos veces → 200 y la 2.ª 400', a1.status === 200 && a1.json.sesion.extraUsadoMin === 5 && a2.status === 400, `status ${a1.status}/${a2.status}`);

  // --- Logout ---
  r = await api('POST', '/api/auth/logout', { token: otra.json.token });
  const tras = await api('GET', '/api/auth/sesion', { token: otra.json.token });
  revisar('Logout → 200 y el mismo token da 401', r.status === 200 && tras.status === 401, `status ${r.status}/${tras.status}`);

  // --- crear-admin sin contrasena ---
  const p = spawnSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'crear-admin.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, ADMIN_PASSWORD: '' },
    encoding: 'utf8',
  });
  revisar('crear-admin sin ADMIN_PASSWORD → error claro', p.status === 1 && p.stderr.includes('ADMIN_PASSWORD'), p.stderr.trim());

  // --- Rate limit ---
  r = await api('POST', '/api/auth/login', { body: {} });
  revisar('Body vacio → 400 y cuenta como intento', r.status === 400 && r.json.intentosRestantes === env.LOGIN_MAX_INTENTOS - 1, `status ${r.status}, restantes ${r.json.intentosRestantes}`);
  await usuarios.updateOne({ usuario: ATENCION.usuario }, { $set: { activo: false } });
  const inactivo = await login(ATENCION, ATENCION.password);
  const malo = await login(ADMIN, 'contrasena-incorrecta');
  revisar('Usuario desactivado con contrasena correcta → 401 con el mismo mensaje',
    inactivo.status === 401 && inactivo.json.error === malo.json.error, `status ${inactivo.status}: "${inactivo.json.error}"`);
  r = await login(ADMIN, ADMIN.password);
  revisar('3 fallos + login correcto → 200', r.status === 200, `status ${r.status}`);

  const restantes = [];
  let todos401 = true;
  let inicioVentana = 0;
  for (let i = 0; i < env.LOGIN_MAX_INTENTOS; i++) {
    r = await login(ADMIN, 'contrasena-incorrecta');
    if (i === 0) inicioVentana = Date.now();
    todos401 = todos401 && r.status === 401;
    restantes.push(r.json.intentosRestantes);
  }
  revisar('Tras el login correcto el contador se reinicia: 5 fallos → 401 con 4,3,2,1,0',
    todos401 && restantes.join(',') === '4,3,2,1,0', `restantes ${restantes.join(',')}`);

  r = await login(ADMIN, 'contrasena-incorrecta');
  const retry = Number(r.headers.get('retry-after'));
  revisar('6.º intento → 429 con Retry-After, error, intentosPermitidos, retryAfterSeconds',
    r.status === 429 && retry > 0 && !!r.json.error && r.json.intentosPermitidos === env.LOGIN_MAX_INTENTOS && r.json.retryAfterSeconds === retry,
    `status ${r.status}, Retry-After ${retry}`);
  console.log(`   429 → ${JSON.stringify(r.json)}`);
  r = await login(ADMIN, ADMIN.password);
  revisar('Bloqueado, con la contrasena correcta → 429', r.status === 429, `status ${r.status}`);

  console.log('   esperando 15 s e intentando de nuevo durante el bloqueo…');
  await esperar(15000);
  r = await login(ADMIN, 'contrasena-incorrecta');
  revisar('Seguir intentando no alarga el bloqueo (retryAfter baja)',
    r.status === 429 && r.json.retryAfterSeconds <= retry - 14, `retryAfter ${retry} → ${r.json.retryAfterSeconds}`);

  const falta = inicioVentana + env.LOGIN_VENTANA_SEG * 1000 + 1500 - Date.now();
  console.log(`   esperando ${Math.ceil(falta / 1000)} s a que termine la ventana del primer fallo…`);
  await esperar(Math.max(0, falta));
  r = await login(ADMIN, 'contrasena-incorrecta');
  const seg = Math.round((Date.now() - inicioVentana) / 1000);
  revisar('Ventana fija: a los ~60 s del primer fallo se puede intentar (401, no 429)', r.status === 401, `status ${r.status} a los ${seg} s`);
  await login(ADMIN, ADMIN.password); // deja el contador limpio

  // --- TAREA_03: JSON mal formado y fallos simultaneos (D29) ---
  const crudo = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"usuario": "admin", ',
  });
  const crudoJson = await crudo.json();
  revisar('JSON mal formado en /api/auth/login → 400 y cuenta como intento',
    crudo.status === 400 && crudoJson.error === 'El cuerpo de la peticion no es JSON valido.'
      && crudoJson.intentosRestantes === env.LOGIN_MAX_INTENTOS - 1,
    `status ${crudo.status}, restantes ${crudoJson.intentosRestantes}`);
  await login(ADMIN, ADMIN.password); // limpia el contador
  const malo2 = await fetch(`${BASE}/api/productos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tAdmin}` }, body: '{mal',
  });
  revisar('JSON mal formado en POST /api/productos → 400 (no 500)', malo2.status === 400, `status ${malo2.status}`);

  const simultaneos = await Promise.all(
    Array.from({ length: 10 }, () => login(ADMIN, 'contrasena-incorrecta'))
  );
  const n401 = simultaneos.filter((x) => x.status === 401).length;
  const n429 = simultaneos.filter((x) => x.status === 429).length;
  revisar('10 logins fallidos simultaneos → 5 × 401 y 5 × 429', n401 === 5 && n429 === 5, `${n401} × 401, ${n429} × 429`);
  console.log('   (esta IP queda bloqueada ~60 s por la prueba anterior)');
}

async function main() {
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(env.DB_NAME);
  const usuarios = db.collection('usuarios');
  const productos = db.collection('productos');
  try {
    for (const [u, rol] of [[ADMIN, 'admin'], [ATENCION, 'atencion']]) {
      await usuarios.deleteOne({ usuario: u.usuario });
      await usuarios.insertOne({
        usuario: u.usuario, nombre: `Prueba ${rol} T02`, rol,
        password_hash: await bcrypt.hash(u.password, 10), activo: true, fecha_registro: new Date(),
      });
    }

    const r = await login(ADMIN, ADMIN.password);
    if (r.status !== 200) throw new Error(`No se pudo iniciar sesion con el admin de prueba (status ${r.status}). ¿Hay un bloqueo de rate limit activo?`);
    if (r.json.sesion.modoPrueba) {
      console.log('Servidor en SESION_MODO_PRUEBA=true: solo se prueban los criterios del modo prueba.\n');
      await pruebasModoPrueba();
    } else {
      await pruebasNormales(usuarios);
    }
  } catch (e) {
    revisar('Error inesperado', false, e.message);
  } finally {
    await usuarios.deleteMany({ usuario: /^prueba_.*_t02$/ });
    await productos.deleteMany({ nombre: PRODUCTO_PRUEBA });
    const quedan = await usuarios.countDocuments({ usuario: /^prueba_/ }) + await productos.countDocuments({ nombre: PRODUCTO_PRUEBA });
    revisar('Al final no queda ningun usuario prueba_* ni producto de prueba', quedan === 0, `quedan ${quedan}`);
    await client.close();
  }

  const git = spawnSync('git', ['ls-files'], { cwd: path.join(__dirname, '..', '..'), encoding: 'utf8' });
  if (git.status === 0) {
    const archivos = git.stdout.split('\n');
    revisar('.env sigue fuera del repo', !archivos.includes('app/.env'));
  }

  const fallas = resultados.filter((x) => !x.ok).length;
  console.log(`\n${resultados.length - fallas} de ${resultados.length} pruebas correctas.`);
  process.exit(fallas ? 1 : 0);
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
