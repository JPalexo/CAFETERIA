# TAREA_03 — Frontend: login, vistas por rol y alerta de sesión

**Objetivo:** pantalla de login, redirección por rol, panel de admin con el catálogo actual, vista de atención (base) y la alerta de cierre de sesión. Además, un arreglo de seguridad en el rate limit.
**Requerimientos:** RF-L1, RF-L3 (lado cliente), RF-L4, RN8–RN13, RF-S1–RF-S3, RF-D1, RNF-4.
**Decisiones:** D04, D08, D09, D19–D21, D29, D30.

## Antes de empezar
- Lee `REQUERIMIENTOS.md` §2–3, `DECISIONES.md` (D19–D21, D29, D30) y `ARQUITECTURA.md` (estructura de `public/`).
- Revisa `app/public/index.html`, `app.js` y `styles.css` actuales (catálogo de productos).
- Si el servidor viejo sigue en el puerto 3000, detenlo y vuelve a arrancarlo con el código nuevo.

## Parte A — Arreglo del rate limit (D29)
Hoy el middleware solo **consulta** y el fallo se suma después de `bcrypt.compare`. Con muchas peticiones **simultáneas** todas pasan la consulta antes de que se registre el primer fallo → se pueden hacer más de 5 intentos.
1. `intentosLogin.js`: agrega `reservar(ip)`, que en una sola operación síncrona revisa el límite y, si no está bloqueado, **suma 1 de inmediato** (misma ventana fija de D13). Devuelve `{ bloqueado, intentosRestantes, segundosRestantes }`.
2. `rateLimiter.js`: usa `reservar(ip)`; si está bloqueado responde 429 igual que ahora; si no, guarda `req.intentosRestantes` y `next()`.
3. `auth.controller.js`: ya no llama `registrarFallo` (el intento ya se contó); en fallo responde con `req.intentosRestantes`; en éxito sigue llamando `limpiar(ip)`. Puedes quitar `registrarFallo` si ya no se usa.
4. Actualiza el comentario del archivo explicando por qué se cuenta antes de verificar.
5. JSON mal formado en cualquier `POST /api` → `400 { error: "El cuerpo de la peticion no es JSON valido." }` (hoy cae al 500). En el login también cuenta como intento: basta con que `express.json()` del login vaya **después** del rate limiter, o revisa `err.type === 'entity.parse.failed'` en `errores.js` (elige una y explícala en el informe).
6. Agrega a `probar-auth.js`: **10 logins fallidos simultáneos** (`Promise.all`) → exactamente 5 respuestas 401 y 5 respuestas 429. Todas las pruebas anteriores deben seguir en ✅.

## Parte B — Estructura de `public/` (D04)
```
public/
├── index.html              ← login
├── admin/index.html        ← panel admin = catálogo de productos actual
├── atencion/index.html     ← vista de atención (base)
├── css/base.css            ← variables (colores, fuentes), botones, inputs, modal, toasts, encabezado
├── css/login.css, css/admin.css, css/atencion.css
└── js/
    ├── comun/api.js        ← fetch con token
    ├── comun/sesion.js     ← proteger página, encabezado, alerta de sesión
    ├── comun/ui.js         ← toasts, escapar(), formatear dinero
    ├── login.js
    ├── admin/productos.js  ← el app.js actual, adaptado
    └── atencion/inicio.js
```
- Mueve el catálogo actual a `admin/` (HTML → `admin/index.html`, `app.js` → `js/admin/productos.js`, estilos → `css/base.css` + `css/admin.css`). **El catálogo debe funcionar igual** (filtros, chips, crear, editar, eliminar, disponibilidad).
- Conserva el estilo visual actual como base para todo (colores, tipografía) y que se vea como una sola app.

## Parte C — Comunes
- **`api.js`**: `api(ruta, opciones)` agrega `Authorization: Bearer <token>` desde `sessionStorage` y `Content-Type: application/json`; si la respuesta es **401** → borra el token y manda a `/?motivo=expirada`; devuelve `{ status, datos }` o lanza un error con el mensaje `error` del servidor.
- **`sesion.js`** → `iniciarPagina({ roles })`:
  1. Sin token → `/`. Con token, `GET /api/auth/sesion`.
  2. Si el rol no está en `roles` → redirige a su vista (`/admin/` o `/atencion/`) con `?motivo=sinpermiso` y la página muestra un toast "No tienes permiso para esa vista".
  3. Pinta el **encabezado**: nombre del café, nombre del usuario y su rol, enlaces según rol (admin ve "Catálogo" y "Atención"; atención solo su vista) y botón **Cerrar sesión** (`POST /api/auth/logout` → `/`).
  4. Programa la **alerta de sesión** (Parte E).
- `admin/` → `roles: ['admin']`; `atencion/` → `roles: ['admin', 'atencion']`.

## Parte D — Login (`index.html` + `login.js`)
- Formulario usuario + contraseña (con botón para mostrar/ocultar), botón "Entrar".
- Si ya hay una sesión válida → redirige a su vista sin mostrar el login.
- Respuestas:
  - 200 → guarda `token` en `sessionStorage` y va a `redirigirA`.
  - 400/401 → mensaje del servidor + "Te quedan N intentos" (si `intentosRestantes` llega a 0: "El siguiente intento fallido bloqueará el acceso por 1 minuto").
  - **429** → mensaje de bloqueo con **cuenta regresiva** desde `retryAfterSeconds`, botón e inputs deshabilitados; al llegar a 0 se habilitan solos.
- Mensajes por `?motivo=`: `expirada` → "Tu sesión terminó, vuelve a iniciar sesión"; `cerrada` → "Cerraste sesión".

## Parte E — Alerta de cierre de sesión (`sesion.js`, RN8–RN13, D19–D21, D30)
El servidor manda el tiempo (`GET /api/auth/sesion` → `alertaEn`, `expira`, `extraDisponibleMin`, `autoExtensionUsada`, `modoPrueba`).

**Modal de alerta** (aparece en `alertaEn`, dura **30 s**):
- Título "Tu sesión está por terminar" + cuenta regresiva visible (30 → 0) y barra de progreso.
- Selector de tiempo extra: botón **−**, contador "5 min", botón **+**. Empieza en 5, cambia de 5 en 5, mínimo 5, máximo `extraDisponibleMin` (tope 60). Deshabilita − / + en los límites.
- Botones **"Extender sesión"** (`POST /api/auth/extender { minutos }`) y **"Cerrar sesión"**.
- Texto pequeño: "Tiempo extra disponible: N min".
- Si `extraDisponibleMin === 0` (RN13): no hay selector ni "Extender"; el texto dice "Ya usaste todo el tiempo extra. La sesión se cerrará al terminar la cuenta." y solo está "Cerrar sesión".
- Si el usuario extiende → toast "Sesión extendida N min" y se reprograma la alerta con el nuevo `alertaEn`.

**Si nadie responde en 30 s:**
- Si `autoExtensionUsada === false` y queda tiempo extra → `POST /api/auth/extender { minutos: 5, automatica: true }` y se muestra el **aviso de extensión automática**: tarjeta **centrada**, fondo **difuminado** (`backdrop-filter: blur`), texto "Tu sesión se extendió 5 minutos porque no hubo respuesta. En el siguiente aviso, si no respondes, la sesión se cerrará." y botón "Entendido". Luego se reprograma la alerta.
- Si ya se usó la extensión automática, o no queda tiempo extra → cierra sesión (`logout` → `/?motivo=expirada`).

**Modo prueba (D30):** como el servidor no cambia el tiempo real (D21), el cliente **simula el ciclo** para que se vea completo:
- La primera alerta sale a los 10 s del login (`alertaEn` del servidor).
- Después de cada acción (extender o extensión automática) la siguiente alerta sale **10 s después**, y el cliente lleva sus propios contadores simulados (`extraUsadoMin`, `autoExtensionUsada`) para que el selector, el tope de 60 min y "la siguiente ya no se extiende" se vean igual que en real.
- Muestra una etiqueta discreta "MODO PRUEBA" en la alerta.
- "Cerrar sesión" y el cierre por no responder después de la extensión automática **sí cierran** la sesión de verdad.
- Los contadores simulados viven solo en memoria de la página (si recargas, empieza de nuevo).

**General:**
- Usa un solo temporizador por página; si la pestaña estuvo dormida, al volver revisa la hora real (`Date.now()` contra `alertaEn`) en lugar de confiar en el `setTimeout`.
- El modal se puede usar con teclado (foco dentro del modal, `Esc` no lo cierra).

## Parte F — Vista de atención (base)
- `atencion/index.html` con el encabezado común y un aviso "Aquí se tomarán los pedidos (TAREA_06)".
- Debajo, el catálogo **solo lectura** de productos disponibles (tarjetas con nombre, categoría y precio) usando `GET /api/productos?disponibilidad=true`. Sin botones de editar.

## Fuera de alcance (no hacer)
- Pantallas de usuarios, clientes, pedidos y recibos (T05–T07). En el menú de admin pueden aparecer como enlaces deshabilitados con "Próximamente".
- Cambios a las reglas de sesión del servidor (solo el arreglo de la Parte A).

## Criterios de aceptación
**Automáticos (`npm run probar-auth`):**
- [ ] Todas las pruebas de la T02 siguen en ✅.
- [ ] 10 fallidos simultáneos → 5 × 401 y 5 × 429.
- [ ] JSON mal formado en `/api/auth/login` → 400 y cuenta como intento.

**En el navegador** (si tienes una herramienta de navegador úsala; si no, sigue la lista a mano y dilo en el informe; Cowork lo revisará en la T04). Usa un admin y un atención **temporales** creados para la prueba y bórralos al final:
- [ ] Login admin → `/admin/` con el catálogo funcionando igual que antes (filtros, chips, crear/editar/eliminar con un producto de prueba que luego se borra).
- [ ] Login atención → `/atencion/`; si escribe `/admin/` en la URL vuelve a `/atencion/` con el toast de "sin permiso".
- [ ] Admin puede abrir `/atencion/`.
- [ ] Sin sesión, `/admin/` y `/atencion/` mandan a `/`.
- [ ] 5 contraseñas incorrectas → mensajes con intentos restantes; 6.º → bloqueo con cuenta regresiva y botón deshabilitado; al terminar se habilita.
- [ ] Cerrar sesión → `/` con "Cerraste sesión"; con "atrás" del navegador no se puede usar la vista anterior (pide login).
- [ ] **Modo prueba** (`SESION_MODO_PRUEBA=true` en la terminal): a los 10 s sale la alerta; − / + van de 5 en 5 entre 5 y 60; "Extender" → toast y la alerta vuelve 10 s después; sin responder → aviso centrado con fondo difuminado; la siguiente sin responder → cierra sesión; "Cerrar sesión" cierra.
- [ ] Tope: en modo prueba, extender 60 min en total → la siguiente alerta ya no tiene selector, solo "Cerrar sesión".
- [ ] No hay errores en la consola del navegador.
- [ ] Se ve bien en ancho de celular (~375 px) y en escritorio.

## Al terminar
- **No hagas commit ni push**: deja los cambios sin confirmar (Cowork arma los comandos de git).
- Informe `INFORME_03.md` (incluye qué pruebas de navegador hiciste tú y cuáles quedaron a mano), `ESTADO.md` y `BITACORA.md`.
