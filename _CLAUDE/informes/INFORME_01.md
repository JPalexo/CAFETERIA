# INFORME_01 — Reestructurar el proyecto

**Fecha:** 2026-10-29 · **Resultado:** ✅ completa

## Qué se hizo
- Se movió todo `frontend-productos/` a `app/`, los JSON de importación a `datos/` y el `.drawio` + `GUIA_DE_ESTUDIO.md` a `docs/`. Se borró `frontend-productos/`.
- `server.js` se separó en capas dentro de `app/src/` (config, utils, validators, controllers, routes, middlewares, app.js) moviendo el código tal cual. `server.js` solo conecta y hace `listen`, con los mismos mensajes.
- Nuevo 404 JSON (`{ "error": "Ruta no encontrada." }`) para rutas `/api/*` que no existen (antes devolvía la página HTML de Express).
- `README.md` en la raíz con rutas y comandos nuevos (`cd app`, `npm install`, `npm start`) y la nueva estructura.
- `package.json`: `name` = `cafe-central`, nueva descripción. `.gitignore` en la raíz.
- `git init` (rama `main`) y commit `chore: reestructura del proyecto (app/, datos/, docs/, _CLAUDE/)`. Sin remoto ni push.

## Archivos creados / modificados / movidos
| Archivo | Acción | Nota |
|---|---|---|
| `frontend-productos/*` → `app/` | movido | incluye `.env`, `.env.example`, `public/`, `scripts/`, `respaldos/`, `node_modules/` |
| `clientes.json`, `productos.json`, `pedidos.json` → `datos/` | movido | |
| `modelo_bd_cafeteria1.drawio`, `GUIA_DE_ESTUDIO.md` → `docs/` | movido | |
| `frontend-productos/README.md` → `README.md` | movido y actualizado | |
| `frontend-productos/CLAUDE.md`, `frontend-productos/.gitignore` | eliminado | lo que faltaba se pasó a `_CLAUDE/MEMORY.md` |
| `app/utils/texto.js` → `app/src/utils/texto.js` | movido | solo cambió el comentario de la 1.ª línea |
| `app/src/config/env.js`, `db.js` | creado | `db.js` exporta `conectar()` y el objeto `colecciones` |
| `app/src/utils/ids.js` | creado | `idValido`, `escapeRegex` |
| `app/src/validators/producto.validator.js` | creado | `validarProducto` sin cambios |
| `app/src/controllers/productos.controller.js` | creado | `listar`, `categorias`, `obtener`, `crear`, `editar`, `eliminar` |
| `app/src/routes/productos.routes.js` | creado | `/categorias` antes de `/:id` |
| `app/src/middlewares/errores.js` | creado | `noEncontradoApi` (404) y `manejarErrores` (500) |
| `app/src/app.js` | creado | |
| `app/server.js` | reescrito | solo arranque |
| `app/scripts/*.js` | modificado | `require('../src/utils/texto')`; el normalizador ahora lee `../../datos/` |
| `app/package.json`, `app/package-lock.json` | modificado | nombre `cafe-central` |
| `.gitignore` | creado | |
| `_CLAUDE/MEMORY.md` | modificado | esquema de colecciones, regla sin acentos y nota de RF9 (venían del CLAUDE.md borrado) |

## Pruebas realizadas
Se guardaron las respuestas de los GET con el servidor viejo y se compararon con `diff` contra el nuevo.

| Prueba | Resultado esperado | Resultado obtenido |
|---|---|---|
| `cd app; npm install; npm start` | mismo mensaje, 6 documentos | ✅ `Conectado a MongoDB -> base "CAFETERIA", coleccion "productos" (6 documentos)` |
| `GET /api/productos` | 200, 6 productos | ✅ idéntico a la línea base |
| `?categoria=Bebidas`, `?disponibilidad=false`, `?ingrediente=leche`, `?q=latte` | iguales que antes | ✅ idénticos (`categoria=Bebidas` da `[]` antes y después: las categorías reales son "Bebidas calientes"/"Bebidas frias") |
| `GET /api/productos/categorias` | 200 | ✅ 200, 4 categorías |
| `GET /api/productos/123` | 400 | ✅ 400 |
| `GET /api/productos/000000000000000000000000` | 404 | ✅ 404 |
| `GET /api/noexiste` | 404 JSON | ✅ 404 `application/json` (antes 404 HTML) |
| POST / PATCH / DELETE producto de prueba | 201 / 200 / 204 | ✅ 201 / 200 / 204; la lista final es igual a la inicial |
| `node scripts/normalizar-archivos-importacion.js` | encuentra los JSON en `datos/` | ✅ (no tiene `--dry-run`; se corrió después del commit y `git status` siguió limpio, o sea no cambió nada) |
| `http://localhost:3000` | página de productos | ✅ `/`, `/app.js`, `/styles.css` → 200 y la API responde igual. No se revisó visualmente en el navegador. |
| `git status` / `git ls-files` | limpio, sin `.env` | ✅ solo `app/.env.example` (y `app/src/config/env.js`, que es código) |

## Desviaciones (cambios que no estaban en la tarea)
- No se pudo renombrar `frontend-productos` a `app` de un jalón (Windows/OneDrive tenía la carpeta bloqueada); se movió su contenido y luego se borró la carpeta vacía. Mismo resultado.
- También se actualizó el `name` en `package-lock.json` para que coincida con `package.json`.
- El informe, `ESTADO.md` y `BITACORA.md` se agregaron en un segundo commit (`docs: informe de la TAREA_01`), porque el criterio pedía `git status` limpio justo después del primer commit.

## Problemas encontrados
- `npm install` avisa de vulnerabilidades en dependencias (`npm audit`). No se tocó nada (fuera de alcance).
- `datos/productos.json` tiene 5 documentos y la BD tiene 6 (alguien agregó uno desde la app). No se cambió nada.

## Dudas para Cowork
- Sigue pendiente: ¿subir a `JPalexo/CAFETERIA` (reemplazando su contenido) o crear un repo nuevo?
