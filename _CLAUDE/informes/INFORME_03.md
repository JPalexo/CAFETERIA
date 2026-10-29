# INFORME_03 — Frontend: login, vistas por rol y alerta de sesión

**Fecha:** 2026-10-29 · **Resultado:** ⚠️ parcial — código completo y pruebas automáticas 31/31 ✅; las pruebas en navegador **no las pude hacer** (sin herramienta de navegador en esta sesión) y quedan a mano para Cowork/Alejandro (T04).

## Qué se hizo
**Parte A — Rate limit (D29)**
- `intentosLogin.reservar(ip)`: en una sola operación síncrona revisa el límite y, si no está bloqueado, suma 1 de inmediato (ventana fija de D13). Devuelve `{ bloqueado, intentosRestantes, segundosRestantes }`. Se quitaron `consultar` y `registrarFallo` (ya no se usan). Comentario del archivo actualizado con el porqué.
- `rateLimiter.js` usa `reservar`; 429 igual que antes; si pasa, guarda `req.intentosRestantes`.
- `auth.controller.js` ya no registra el fallo; responde 400/401 con `req.intentosRestantes`; en éxito sigue con `limpiar(ip)`.
- **JSON mal formado** → `400 { error: "El cuerpo de la peticion no es JSON valido." }`. Opción elegida: **las dos piezas juntas**:
  - En el login `express.json()` va **después** del rate limiter (`router.post('/login', rateLimiter, json, auth.login)`), por eso el intento ya está contado cuando falla el parseo. Para lograrlo, `/api/auth` se monta **antes** del `express.json()` global y cada ruta de auth lee su propio JSON.
  - `errores.js` traduce `err.type === 'entity.parse.failed'` a 400 (para cualquier `POST /api`) e incluye `intentosRestantes` si viene del login.
  - Por qué: con solo `errores.js` el parseo global ocurría antes del limiter y el intento no contaba; con solo el orden, el error seguía cayendo al 500.
- `probar-auth.js`: JSON mal formado en login (400 + cuenta), JSON mal formado en productos (400), y 10 logins fallidos simultáneos → 5 × 401 y 5 × 429.

**Partes B–F — Frontend** (módulos ES nativos, sin frameworks)
- `public/index.html` + `js/login.js`: usuario/contraseña con Mostrar/Ocultar; si ya hay sesión válida redirige; 400/401 con "Te quedan N intentos" (y el aviso del siguiente bloqueo cuando llega a 0); 429 con cuenta regresiva y campos deshabilitados que se habilitan solos; mensajes `?motivo=expirada|cerrada`.
- `admin/index.html` + `js/admin/productos.js`: el catálogo anterior (movido con `git mv` desde `app.js`), ahora usando `api()` con token. Misma lógica de filtros, chips, crear/editar/eliminar y disponibilidad. "+ Nuevo producto" pasó del encabezado a una barra bajo él.
- `atencion/index.html` + `js/atencion/inicio.js`: aviso "Aquí se tomarán los pedidos (TAREA_06)" y catálogo solo lectura de `GET /api/productos?disponibilidad=true`.
- `js/comun/api.js`: token de `sessionStorage`, `Content-Type`, 401 → borra token y va a `/?motivo=expirada`; devuelve `{ status, datos }` o lanza Error con `.status` y `.datos`.
- `js/comun/sesion.js` → `iniciarPagina({ roles, titulo })`: sin token → `/`; rol no permitido → su vista con `?motivo=sinpermiso` y toast; encabezado con café, usuario, rol, enlaces por rol (admin: Catálogo, Atención y Usuarios/Clientes/Pedidos deshabilitados "Próximamente") y Cerrar sesión; alerta de sesión.
- **Alerta**: un solo `setInterval` de 1 s que compara `Date.now()` contra la hora de la alerta (también revisa al volver a la pestaña). Modal `<dialog>` con cuenta 30 → 0, barra, selector −/+ (5 en 5, de 5 a `min(60, extraDisponibleMin)`, botones deshabilitados en los límites), "Extender sesión", "Cerrar sesión", "Tiempo extra disponible: N min" y caso RN13. Esc no la cierra. Sin respuesta → extensión automática + aviso centrado con `backdrop-filter: blur`; la siguiente sin respuesta (o sin tiempo extra) → logout `?motivo=expirada`.
- **Modo prueba (D30)**: etiqueta "MODO PRUEBA"; se llama igual a `/extender` (el servidor valida y responde `simulado`) y el cliente lleva `extraDisponibleMin` y `autoExtensionUsada` en memoria; la siguiente alerta sale 10 s después. Si se recarga la página después de que pasó `alertaEn`, la alerta sale 10 s después de cargar (empieza de nuevo).
- `css/base.css` (variables, encabezado, botones, campos, tarjetas, modales, alerta, toasts), `css/admin.css`, `css/atencion.css`, `css/login.css`. Mismos colores y tipografía de antes.
- Botón "atrás" tras cerrar sesión: `pageshow` con `persisted` vuelve a revisar el token/sesión y manda al login.

## Archivos creados / modificados / movidos
| Archivo | Acción | Nota |
|---|---|---|
| `app/src/cache/intentosLogin.js` | modificado | `reservar()`; se quitan `consultar` y `registrarFallo` |
| `app/src/middlewares/rateLimiter.js` | modificado | usa `reservar`, guarda `req.intentosRestantes` |
| `app/src/middlewares/errores.js` | modificado | 400 por JSON mal formado |
| `app/src/routes/auth.routes.js` | modificado | `express.json()` por ruta, en login después del limiter |
| `app/src/app.js` | modificado | `/api/auth` antes del `express.json()` global |
| `app/src/controllers/auth.controller.js` | modificado | ya no cuenta el fallo |
| `app/pruebas/probar-auth.js` | modificado | 3 pruebas nuevas |
| `app/public/index.html` | reescrito | ahora es el login |
| `app/public/app.js` → `app/public/js/admin/productos.js` | movido + adaptado | |
| `app/public/styles.css` | eliminado | repartido en `css/base.css` y `css/admin.css` |
| `app/public/admin/index.html`, `atencion/index.html` | creado | |
| `app/public/css/base.css`, `admin.css`, `atencion.css`, `login.css` | creado | |
| `app/public/js/comun/api.js`, `sesion.js`, `ui.js`, `js/login.js`, `js/atencion/inicio.js` | creado | |
| `README.md` | modificado | línea de estructura de `public/` |

## Pruebas realizadas
| Prueba | Resultado esperado | Resultado obtenido |
|---|---|---|
| `npm run probar-auth` (modo normal, servidor nuevo en puerto 3100) | todo ✅ | ✅ **31 de 31** (las 28 de la T02 + 3 nuevas) |
| 10 logins fallidos simultáneos | 5 × 401 y 5 × 429 | ✅ 5 × 401, 5 × 429 |
| JSON mal formado en `/api/auth/login` | 400 y cuenta como intento | ✅ 400, `intentosRestantes: 4` |
| JSON mal formado en `POST /api/productos` | 400 (no 500) | ✅ 400 |
| `node --check` de los 6 módulos JS del frontend | sin errores de sintaxis | ✅ |
| Rutas estáticas `/`, `/admin/`, `/atencion/`, css y js | 200; `/app.js` y `/styles.css` 404 | ✅ |
| Ids usados por los JS existen en su HTML | todos | ✅ |
| **Pruebas en navegador** (lista de la tarea) | — | ⏳ **no hechas**: quedan a mano (ver abajo) |

**Pendientes a mano (T04)**, con un admin y un atención temporales (`npm run crear-usuario`) que se borran al final:
1. Login admin → `/admin/`; catálogo igual que antes (filtros, chips, crear/editar/eliminar un producto de prueba).
2. Login atención → `/atencion/`; escribir `/admin/` → vuelve con toast "No tienes permiso para esa vista". Admin sí abre `/atencion/`.
3. Sin sesión, `/admin/` y `/atencion/` → `/`.
4. 5 contraseñas mal → intentos restantes; 6.º → cuenta regresiva y botón deshabilitado; al terminar se habilita.
5. Cerrar sesión → "Cerraste sesión"; "atrás" pide login.
6. `SESION_MODO_PRUEBA=true`: alerta a los 10 s; −/+ de 5 en 5 entre 5 y 60; Extender → toast y alerta 10 s después; sin responder → aviso difuminado; la siguiente sin responder → cierra sesión; tope de 60 min → solo "Cerrar sesión".
7. Consola sin errores; ancho 375 px y escritorio.

## Desviaciones (cambios que no estaban en la tarea)
- `logout` y `extender` también leen su JSON por ruta (consecuencia de montar `/api/auth` antes del `express.json()` global).
- La alerta en modo **real** abre 2 s antes de `alertaEn` (dura 30 s igual) para que la extensión automática llegue al servidor antes de que `expira` se cumpla; si no, el `/extender` llegaría con la sesión ya vencida y daría 401.
- Si en la alerta ya se usó la extensión automática, el texto agrega "Si no respondes, la sesión se cerrará." (refuerza RN12).
- El bloqueo del login se guarda en `sessionStorage` (`loginBloqueadoHasta`) para que la cuenta regresiva siga si se recarga la página.
- "+ Nuevo producto" se movió del encabezado a la barra del catálogo (el encabezado ahora es el común).
- README: actualizada la línea de `public/`.

## Problemas encontrados
- Había un servidor viejo (`node server.js`, PID 10928) en el puerto 3000 y **no tuve permiso para detenerlo**. Probé el código nuevo en el puerto 3100 (`$env:PORT='3100'`) y apagué ese servidor al terminar. **Alejandro debe reiniciar su servidor del puerto 3000** para que tome el código nuevo.
- La prueba de 10 simultáneos deja la IP bloqueada ~60 s al final de `probar-auth` (lo avisa en consola).
- No hay herramienta de navegador en esta sesión → pruebas de interfaz pendientes.

## Dudas para Cowork
- ¿Se aceptan las desviaciones del margen de 2 s y del bloqueo guardado en `sessionStorage`?
