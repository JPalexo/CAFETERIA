# TAREA_02 — Backend de autenticación y Rate Limiting

**Objetivo:** login con usuarios y roles, sesiones en caché, **máximo 5 intentos fallidos por minuto por IP → HTTP 429** y API protegida por rol. Solo backend (el frontend es la T03).
**Requerimientos:** RN1–RN7, RN8–RN13 (solo la parte del servidor), RF-L2, RF-L3, RF-S3 (servidor), RNF-1, RNF-2, RNF-3.
**Decisiones:** D05–D19, D21 (leer `DECISIONES.md` antes de empezar).

## Antes de empezar
- Lee `_CLAUDE/REQUERIMIENTOS.md` secciones 1–3, `_CLAUDE/DECISIONES.md` y `_CLAUDE/ARQUITECTURA.md`.
- Instala: `npm install bcryptjs node-cache` (en `app/`). No instales `express-rate-limit` ni nada más: el limitador se hace a mano (es lo que pide la práctica).

## Pasos

### 1. Configuración
- `src/config/env.js`: agrega con valores por defecto `LOGIN_MAX_INTENTOS=5`, `LOGIN_VENTANA_SEG=60`, `SESION_HORAS=8`, `SESION_MODO_PRUEBA=false` (booleano: solo `"true"` es verdadero), `ADMIN_USUARIO=admin`, `ADMIN_NOMBRE=Administrador`, `ADMIN_PASSWORD` (sin valor por defecto).
- `.env.example`: agrega esas variables con valores de ejemplo y `ADMIN_PASSWORD=cambia-esta-contrasena`. **No abras ni edites `.env`**; en el informe dile a Alejandro qué líneas debe agregar a su `.env`.

### 2. Colección `usuarios` (D05)
- En `src/config/db.js` agrega la colección `usuarios` a `colecciones` e índice único `{ usuario: 1 }`.
- Documento: `{ usuario (minúsculas, sin espacios), nombre, rol: 'admin'|'atencion', password_hash, activo: true, fecha_registro: Date }`.
- `src/validators/usuario.validator.js`: `usuario` 3–30 caracteres `[a-z0-9._]`, `nombre` obligatorio (sin acentos con `quitarAcentos`), `rol` en la lista, `password` mínimo 8 caracteres (RN20).

### 3. Caché del rate limit — `src/cache/intentosLogin.js` (D12–D14, D17)
- Una instancia `new NodeCache({ stdTTL: LOGIN_VENTANA_SEG, checkperiod: 30 })`. Clave: `login_fallidos_<ip>`.
- Exporta:
  - `consultar(ip)` → `{ bloqueado, intentos, segundosRestantes }` (`bloqueado` si `intentos >= LOGIN_MAX_INTENTOS`).
  - `registrarFallo(ip)` → suma 1. **Ventana fija (D13):** si la clave no existe, `set(clave, 1)` con el TTL de la ventana; si existe, `set(clave, n + 1, ttlRestante)` donde `ttlRestante = Math.max(1, Math.ceil((getTtl(clave) - Date.now()) / 1000))`. Devuelve los intentos restantes.
  - `limpiar(ip)` → `del(clave)` (se llama cuando el login es correcto).
- Comentario arriba del archivo que explique por qué no se usa el `set()` tal cual del PDF (cada `set` reiniciaba el TTL y el bloqueo nunca se levantaba).

### 4. Middleware — `src/middlewares/rateLimiter.js` (D12, D15, D16)
- Toma la IP con `req.ip` (no actives `trust proxy`).
- Si `consultar(ip).bloqueado`: responde **de inmediato** (sin tocar la BD):
  - Encabezado `Retry-After: <segundosRestantes>`.
  - `429` con `{ "error": "Demasiados intentos fallidos de inicio de sesion. Intenta de nuevo en N segundos.", "intentosPermitidos": 5, "retryAfterSeconds": N }`.
- Si no, `next()`.

### 5. Caché de sesiones — `src/cache/sesiones.js` (D07, D19, D21)
- Instancia `NodeCache` con `checkperiod: 60`. Clave: el token (`crypto.randomBytes(32).toString('hex')`).
- Valor: `{ usuarioId, usuario, nombre, rol, inicio, expira, extraUsadoMin, autoExtensionUsada }` (fechas en ms).
- `crear(usuarioDoc)` → `expira = inicio + SESION_HORAS h`; TTL de la clave = hasta `expira` + 60 s de margen. Devuelve `{ token, sesion }`.
- `obtener(token)` → la sesión o `null` (también `null` si `Date.now() > expira`, y en ese caso la borra).
- `extender(token, minutos, automatica)` → aplica RN9–RN12 y D21:
  - `minutos` entero, múltiplo de 5, entre 5 y `60 − extraUsadoMin`; si no → error 400 con mensaje claro.
  - `automatica === true` → solo `minutos = 5` y solo si `autoExtensionUsada === false`; marca `autoExtensionUsada = true`.
  - **Modo prueba:** valida igual pero **no** cambia `expira` ni los contadores; responde con `simulado: true`.
  - Fuera de modo prueba: `expira += minutos`, `extraUsadoMin += minutos`, actualiza el TTL de la clave.
- `eliminar(token)`, `eliminarPorUsuario(usuarioId)` (se usará en la T05 al desactivar usuarios).
- `aPublico(sesion)` → lo que ve el frontend: `{ usuario: { id, usuario, nombre, rol }, inicio, expira, alertaEn, extraUsadoMin, extraDisponibleMin, autoExtensionUsada, modoPrueba }`, donde `alertaEn = modoPrueba ? inicio + 10 000 : expira − 30 000` (D20).

### 6. Middlewares de acceso — `src/middlewares/autenticacion.js` (D08, D09)
- `requiereSesion`: lee `Authorization: Bearer <token>`; si falta o no es válido → `401 { error: "Sesion no valida o expirada. Inicia sesion de nuevo." }`. Si es válido, `req.sesion` y `req.token`.
- `requiereRol(...roles)`: usa `requiereSesion` primero; si el rol no está → `403 { error: "No tienes permiso para esta accion." }`.

### 7. Controlador y rutas de auth — `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`
- `POST /api/auth/login` → `rateLimiter`, luego `login`:
  - Faltan `usuario` o `password` (o no son texto) → `registrarFallo` y `400 { error: "Usuario y contrasena son obligatorios.", intentosRestantes }`.
  - Busca por `usuario` normalizado (trim + minúsculas) **y** `activo: true`. Si no existe, compara igual contra un hash falso para que tarde lo mismo.
  - Contraseña incorrecta o usuario inexistente/desactivado → `registrarFallo` y `401 { error: "Usuario o contrasena incorrectos.", intentosRestantes }` (mismo mensaje en todos los casos, D10).
  - Correcto → `limpiar(ip)`, crea la sesión y `200 { mensaje: "Bienvenido, <nombre>", token, redirigirA: "/admin/" | "/atencion/", sesion: aPublico(...) }`.
- `POST /api/auth/logout` (con sesión) → borra la sesión, `200 { mensaje }`.
- `GET /api/auth/sesion` (con sesión) → `aPublico(sesion)`.
- `POST /api/auth/extender` (con sesión) body `{ minutos, automatica }` → `200 { mensaje, simulado, sesion }` o `400`.

### 8. Proteger la API de productos (RNF-1)
- `GET /api/productos`, `/categorias`, `/:id` → `requiereSesion`.
- `POST`, `PATCH`, `DELETE` → `requiereRol('admin')`.
- La página actual de productos va a dejar de cargar datos porque aún no tiene login: es esperado, se arregla en la T03. Anótalo en el informe.

### 9. Scripts de usuarios
- `scripts/crear-admin.js` (`npm run crear-admin`): crea el admin con `ADMIN_USUARIO`, `ADMIN_NOMBRE`, `ADMIN_PASSWORD` del `.env`. Si falta la contraseña o tiene menos de 8 caracteres → error y sale. Si el usuario ya existe → avisa y **no** lo sobrescribe. Nunca imprime la contraseña.
- `scripts/crear-usuario.js` (`npm run crear-usuario -- --usuario mesero1 --nombre "Ana Lopez" --rol atencion`): la contraseña se lee de la variable de entorno `NUEVO_USUARIO_PASSWORD` (Alejandro la pone en la terminal antes de correrlo). Mismas validaciones.
- **No corras `crear-admin` tú**: lo corre Alejandro con su contraseña.

### 10. Script de pruebas — `pruebas/probar-auth.js` (`npm run probar-auth`)
- Node 18+ con `fetch`, contra `http://localhost:PORT`. Crea al inicio **dos usuarios temporales** directo en la BD (`prueba_admin_t02` y `prueba_atencion_t02`) con contraseñas aleatorias generadas en el script (no son contraseñas reales) y **los borra al final**, aunque falle una prueba (`finally`). También limpia los productos de prueba que cree.
- Imprime una tabla ✅/❌ por cada criterio de abajo y termina con código 1 si alguno falla.
- Las pruebas que esperan 60 s pueden tardar; muestra un mensaje "esperando…".

## Fuera de alcance (no hacer)
- Nada de HTML/CSS/JS del frontend (T03).
- CRUD de usuarios y clientes por API (T05), pedidos (T06).
- Colección de Bruno (la armamos en la T04 con Cowork).

## Criterios de aceptación (todos en `probar-auth.js`, con `SESION_MODO_PRUEBA=false` salvo donde se indique)
- [ ] Login correcto (admin) → 200 con `token`, `redirigirA: "/admin/"`; atención → `"/atencion/"`.
- [ ] 5 logins con contraseña incorrecta → 401 cada uno, con `intentosRestantes` 4, 3, 2, 1, 0.
- [ ] 6.º intento → **429** con encabezado `Retry-After` y JSON con `error`, `intentosPermitidos` y `retryAfterSeconds`.
- [ ] Bloqueado, incluso con la contraseña **correcta** → 429 (se rechaza antes de revisar la BD).
- [ ] **Ventana fija:** seguir intentando durante el bloqueo no lo alarga; a los ~60 s del **primer** fallo se puede volver a intentar (401, no 429).
- [ ] 3 fallos + login correcto → el contador se reinicia (se permiten otros 5 fallos antes del 429).
- [ ] Usuario desactivado (`activo: false`) con su contraseña correcta → 401 con el mismo mensaje.
- [ ] Body vacío → 400 y cuenta como intento.
- [ ] `GET /api/productos` sin token → 401; con token de atención → 200; token inventado → 401.
- [ ] `POST /api/productos` con atención → 403; con admin → 201 (y se borra después).
- [ ] `POST /api/auth/logout` → 200 y el mismo token ya da 401.
- [ ] `GET /api/auth/sesion` → `expira` ≈ inicio + 8 h, `extraDisponibleMin: 60`, `alertaEn = expira − 30 s`.
- [ ] `/extender`: `{minutos: 7}` → 400; `{minutos: 0}` → 400; 20 + 40 → 200 y `extraDisponibleMin: 0`; luego 5 → 400; `automatica` dos veces → la 2.ª 400.
- [ ] Con `SESION_MODO_PRUEBA=true` (arranca el servidor con esa variable en la terminal, sin tocar `.env`): `alertaEn = inicio + 10 s` y `/extender` responde `simulado: true` sin cambiar `expira`.
- [ ] `npm run crear-admin` sin `ADMIN_PASSWORD` → mensaje de error claro (prueba con la variable vacía en la terminal; no la corras con una real).
- [ ] Al final no queda ningún usuario `prueba_*` ni producto de prueba en la BD.
- [ ] `git status`: `.env` sigue fuera del repo.

## Al terminar
- Commit: `feat: login con roles, sesiones en cache y rate limiting (TAREA_02)`. **No hagas push** (lo hace Alejandro).
- Informe `_CLAUDE/informes/INFORME_02.md` con: la salida de `probar-auth.js`, las líneas que Alejandro debe agregar a su `.env` y cómo crear el admin.
- Actualiza `ESTADO.md` y `BITACORA.md`.
