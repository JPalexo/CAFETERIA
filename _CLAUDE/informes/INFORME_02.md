# INFORME_02 — Backend de autenticación y Rate Limiting

**Fecha:** 2026-10-29 · **Resultado:** ✅ completa

## Qué se hizo
- Colección `usuarios` (índice único en `usuario`) y `usuario.validator.js` (3–30 caracteres `[a-z0-9._]`, nombre sin acentos, rol `admin`/`atencion`, contraseña de mínimo 8).
- **Rate limit** propio con `node-cache` (`src/cache/intentosLogin.js` + `src/middlewares/rateLimiter.js`), solo en `POST /api/auth/login`: 5 fallos por IP en una ventana **fija** de 60 s → 429 con `Retry-After`, sin consultar la BD. Solo cuentan los fallos; un login correcto reinicia el contador.
- **Sesiones** en `node-cache` (`src/cache/sesiones.js`): token aleatorio de 32 bytes, 8 h, extensiones de 5 en 5 hasta 60 min, extensión automática única y modo prueba (`simulado: true`, `alertaEn = inicio + 10 s`).
- Middlewares `requiereSesion` y `requiereRol`; rutas `/api/auth/login|logout|sesion|extender`.
- API de productos protegida: consultar con cualquier sesión, crear/editar/borrar solo admin.
- Scripts `npm run crear-admin`, `npm run crear-usuario` y `npm run probar-auth`.
- Dependencias nuevas: `bcryptjs` (3.0.3) y `node-cache` (5.1.2).

## Archivos creados / modificados / movidos
| Archivo | Acción | Nota |
|---|---|---|
| `app/src/config/env.js` | modificado | variables de login, sesión y admin |
| `app/src/config/db.js` | modificado | colección `usuarios` + índice único |
| `app/src/validators/usuario.validator.js` | creado | |
| `app/src/cache/intentosLogin.js`, `sesiones.js` | creado | |
| `app/src/middlewares/rateLimiter.js`, `autenticacion.js` | creado | |
| `app/src/controllers/auth.controller.js`, `app/src/routes/auth.routes.js` | creado | |
| `app/src/routes/productos.routes.js` | modificado | `requiereSesion` / `requiereRol('admin')` |
| `app/src/app.js` | modificado | monta `/api/auth` |
| `app/scripts/crear-admin.js`, `crear-usuario.js`, `usuarios-comun.js` | creado | |
| `app/pruebas/probar-auth.js` | creado | |
| `app/package.json`, `package-lock.json` | modificado | dependencias y scripts |
| `app/.env.example` | modificado | variables nuevas con valores de ejemplo |
| `README.md` | modificado | endpoints con acceso, crear admin, pruebas |

## Pruebas realizadas
Salida de `npm run probar-auth` con `SESION_MODO_PRUEBA=false`:
```
✅ Login admin → 200, token, redirigirA /admin/  (status 200)
✅ Login atencion → 200, redirigirA /atencion/  (status 200)
✅ GET /api/productos sin token → 401  (status 401)
✅ GET /api/productos con atencion → 200  (status 200)
✅ GET /api/productos con token inventado → 401  (status 401)
✅ POST /api/productos con atencion → 403  (status 403)
✅ POST /api/productos con admin → 201  (status 201)
✅ DELETE del producto de prueba con admin → 204  (status 204)
✅ GET /api/auth/sesion → expira = inicio + 8 h
✅ GET /api/auth/sesion → extraDisponibleMin 60
✅ GET /api/auth/sesion → alertaEn = expira − 30 s
✅ /extender 7 min → 400  (status 400)
✅ /extender 0 min → 400  (status 400)
✅ /extender 20 + 40 → 200 y extraDisponibleMin 0  (status 200/200)
✅ /extender 5 min sin tiempo disponible → 400  (status 400)
✅ /extender automatica dos veces → 200 y la 2.ª 400  (status 200/400)
✅ Logout → 200 y el mismo token da 401  (status 200/401)
✅ crear-admin sin ADMIN_PASSWORD → error claro  (ERROR: falta ADMIN_PASSWORD en el archivo .env (minimo 8 caracteres).)
✅ Body vacio → 400 y cuenta como intento  (status 400, restantes 4)
✅ Usuario desactivado con contrasena correcta → 401 con el mismo mensaje  (status 401: "Usuario o contrasena incorrectos.")
✅ 3 fallos + login correcto → 200  (status 200)
✅ Tras el login correcto el contador se reinicia: 5 fallos → 401 con 4,3,2,1,0  (restantes 4,3,2,1,0)
✅ 6.º intento → 429 con Retry-After, error, intentosPermitidos, retryAfterSeconds  (status 429, Retry-After 60)
   429 → {"error":"Demasiados intentos fallidos de inicio de sesion. Intenta de nuevo en 60 segundos.","intentosPermitidos":5,"retryAfterSeconds":60}
✅ Bloqueado, con la contrasena correcta → 429  (status 429)
   esperando 15 s e intentando de nuevo durante el bloqueo…
✅ Seguir intentando no alarga el bloqueo (retryAfter baja)  (retryAfter 60 → 45)
   esperando 47 s a que termine la ventana del primer fallo…
✅ Ventana fija: a los ~60 s del primer fallo se puede intentar (401, no 429)  (status 401 a los 62 s)
✅ Al final no queda ningun usuario prueba_* ni producto de prueba  (quedan 0)
✅ .env sigue fuera del repo
28 de 28 pruebas correctas.
```
Salida con el servidor arrancado con `SESION_MODO_PRUEBA=true` en la terminal:
```
Servidor en SESION_MODO_PRUEBA=true: solo se prueban los criterios del modo prueba.
✅ Modo prueba: alertaEn = inicio + 10 s  (alertaEn - inicio = 10000 ms)
✅ Modo prueba: /extender responde simulado: true  (status 200)
✅ Modo prueba: expira no cambia
✅ Al final no queda ningun usuario prueba_* ni producto de prueba  (quedan 0)
✅ .env sigue fuera del repo
5 de 5 pruebas correctas.
```
También se probó `crear-usuario` con datos inválidos y sin `NUEVO_USUARIO_PASSWORD`: muestra los errores y sale con código 1 sin tocar la BD.

## Para Alejandro: agregar a tu `app/.env`
```
LOGIN_MAX_INTENTOS=5
LOGIN_VENTANA_SEG=60
SESION_HORAS=8
SESION_MODO_PRUEBA=false
ADMIN_USUARIO=admin
ADMIN_NOMBRE=Administrador
ADMIN_PASSWORD=<tu contraseña, mínimo 8 caracteres>
```
Después, desde `app/`: `npm run crear-admin`. Si cambias `.env` con el servidor encendido, reinícialo.

## Desviaciones (cambios que no estaban en la tarea)
- `scripts/usuarios-comun.js`: función compartida por `crear-admin` y `crear-usuario` para no repetir la validación y el guardado.
- `probar-auth.js` revisa `modoPrueba` en la respuesta del login: con el servidor en modo prueba solo corre esas pruebas. También prueba `crear-admin` sin contraseña (pasándole `ADMIN_PASSWORD` vacía) y que `.env` no esté en el repo.
- Para "usuario desactivado" se desactiva al usuario temporal de atención durante la prueba (no se crea un tercero).
- README actualizado con los endpoints protegidos, cómo crear el admin y cómo correr las pruebas.

## Problemas encontrados
- Había un `node server.js` (con el código viejo) corriendo en el puerto 3000 desde las 2:14 p. m. No lo detuve; las pruebas se corrieron en el puerto 3100 (`PORT=3100` en la terminal, sin tocar `.env`). Hay que reiniciarlo para que tome los cambios.
- **Esperado:** la página de productos (`public/`) ya no carga datos porque todavía no tiene login (401). Se arregla en la T03.
- Las sesiones viven en memoria: al reiniciar el servidor hay que volver a iniciar sesión (D07).

## Dudas para Cowork
- Ninguna nueva. Sigue pendiente lo del repo remoto.
