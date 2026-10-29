# TAREA_01 — Reestructurar el proyecto

**Objetivo:** dejar el repo con la estructura de `_CLAUDE/ARQUITECTURA.md` **sin cambiar ningún comportamiento**: la página de productos y sus 10 endpoints deben funcionar igual que antes.
**Decisiones que aplica:** D01, D02, D03.

## Antes de empezar
- Lee `_CLAUDE/ARQUITECTURA.md` (estructura y convenciones).
- Lee `frontend-productos/server.js`, `frontend-productos/scripts/*.js` y `frontend-productos/README.md`.
- Trabaja desde la carpeta `CAFETERIA/` (raíz del repo).

## Pasos
0. **Línea base:** con el servidor actual (`frontend-productos`, `npm start`) guarda las respuestas de los GET de los criterios de aceptación en un archivo temporal, para comparar después. Bórralo al final.
1. **Mover carpetas** (no copiar):
   - Todo el contenido de `frontend-productos/` → `app/` (incluidos `.env`, `.env.example`, `public/`, `scripts/`, `utils/`, `respaldos/` si existe). `node_modules/` puede moverse o reinstalarse con `npm install`.
   - `clientes.json`, `productos.json`, `pedidos.json` → `datos/`.
   - `modelo_bd_cafeteria1.drawio` → `docs/`; `GUIA_DE_ESTUDIO.md` → `docs/`.
   - `frontend-productos/CLAUDE.md` → **eliminar** (su contenido ya está en `/CLAUDE.md` y `_CLAUDE/`). Antes, revisa si tiene algo que no esté en `_CLAUDE/` y, si es así, agrégalo a `_CLAUDE/MEMORY.md` o `DECISIONES.md` y menciónalo en el informe.
   - `frontend-productos/README.md` → `README.md` en la raíz, actualizando rutas y comandos (`cd app`, `npm install`, `npm start`).
   - Borra la carpeta `frontend-productos/` vacía.
2. **Separar `server.js` en capas** dentro de `app/src/` (ver árbol en `ARQUITECTURA.md`), moviendo el código tal cual:
   - `src/config/env.js` → lee `MONGODB_URI`, `DB_NAME`, `PORT` (con los mismos valores por defecto).
   - `src/config/db.js` → `conectar()`, devuelve/expone la colección `productos` y crea los 3 índices actuales.
   - `src/utils/texto.js` (mover `utils/texto.js`), `src/utils/ids.js` (`idValido`, `escapeRegex`).
   - `src/validators/producto.validator.js` → `validarProducto` sin cambios.
   - `src/controllers/productos.controller.js` → un handler por endpoint (`listar`, `categorias`, `obtener`, `crear`, `editar`, `eliminar`).
   - `src/routes/productos.routes.js` → `express.Router()` montado en `/api/productos`. **Ojo:** `/categorias` debe ir antes de `/:id`, igual que ahora.
   - `src/middlewares/errores.js` → el manejador de errores 500 actual + un 404 JSON solo para rutas `/api/*` que no existan.
   - `src/app.js` → crea Express, `express.json()`, `express.static(public)`, monta rutas y errores; exporta `app`.
   - `server.js` → solo: `conectar()` y `app.listen()`, con los mismos mensajes de consola y de error que hoy.
   - Actualiza los `require` de `scripts/*.js` (`../utils/texto` → `../src/utils/texto`) y la ruta de los JSON en `scripts/normalizar-archivos-importacion.js` (ahora están en `../../datos/`).
3. `app/package.json`: cambia `name` a `"cafe-central"` y la descripción a "Sistema Café Central (API + frontend) con MongoDB". Mantén los scripts `start` y `dev`.
4. **`.gitignore` en la raíz** con: `node_modules/`, `.env`, `respaldos/`, `*.log`, `.DS_Store`, `Thumbs.db`. Borra `app/.gitignore` si queda duplicado.
5. **Git:** `git init` en `CAFETERIA/`, rama `main`, verifica con `git status` que **`.env` no aparece**, y haz un commit: `chore: reestructura del proyecto (app/, datos/, docs/, _CLAUDE/)`. **No** agregues remoto ni hagas push.

## Fuera de alcance (no hacer)
- Nada de login, usuarios, rate limit ni dependencias nuevas (eso es T02).
- No cambiar el HTML/CSS/JS de `public/` (solo si una ruta se rompió por el movimiento).
- No modificar datos de la BD.

## Criterios de aceptación (probar todos con el servidor corriendo)
- [ ] `cd app; npm install; npm start` arranca y muestra el mismo mensaje de conexión (productos: 6 documentos).
- [ ] `GET /api/productos` → 200 con 6 productos.
- [ ] `GET /api/productos?categoria=Bebidas`, `?disponibilidad=false`, `?ingrediente=leche`, `?q=latte` → mismos resultados que antes.
- [ ] `GET /api/productos/categorias` → 200 (no lo confunde con `/:id`).
- [ ] `GET /api/productos/123` → 400; un ObjectId válido inexistente → 404; `GET /api/noexiste` → 404 JSON.
- [ ] Crear un producto de prueba (`POST`), editarlo (`PATCH`) y **eliminarlo** (`DELETE`) → 201 / 200 / 204. La BD queda igual que al inicio.
- [ ] `node scripts/normalizar-archivos-importacion.js` encuentra los JSON en `datos/` (si tiene modo `--dry-run`, úsalo).
- [ ] `http://localhost:3000` muestra la página de productos y funciona igual.
- [ ] `git status` limpio después del commit y `.env` no está en el repo (`git ls-files | findstr .env` solo muestra `.env.example`).

## Al terminar
Informe en `_CLAUDE/informes/INFORME_01.md` (usa la plantilla), actualiza `_CLAUDE/ESTADO.md` (T01 ✅, siguiente T02) y agrega 1 línea a `_CLAUDE/BITACORA.md`.
