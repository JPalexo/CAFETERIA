# Café Central

Sistema escolar de una cafetería (EE Bases de Datos No Convencionales, UV) con Node.js + Express + MongoDB (base `CAFETERIA`).
Por ahora incluye el CRUD de la colección `productos` con filtros por nombre, categoría, disponibilidad e ingrediente (RF4, RF5, RF6).

**Nota sobre acentos:** los datos de las 3 colecciones (`clientes`, `productos`, `pedidos`) se guardan sin acentos en las vocales
(á é í ó ú ü → a e i o u u). La **ñ/Ñ se conserva**. El servidor normaliza de la misma forma lo que se guarda y lo que se busca,
así que "café" y "cafe" en el buscador o al crear un producto dan el mismo resultado.

## Requisitos
- Node.js 18 o superior
- MongoDB corriendo (la misma conexión "MAIN" de Compass)

## Cómo correrlo
```bash
cd app
npm install
copy .env.example .env      # en Windows (en Mac/Linux: cp)
npm start
```
Abrir http://localhost:3000

Si "MAIN" no es `mongodb://localhost:27017`, copia la cadena desde Compass (… > Copy connection string) y pégala en `MONGODB_URI` del archivo `app/.env`.

## Estructura
```
_CLAUDE/                    Memoria del proyecto (estado, tareas, informes, decisiones)
datos/                      clientes.json, productos.json, pedidos.json (para importar en Compass)
docs/                       Diagrama del modelo (.drawio) y guía de estudio
app/
  server.js                 Arranque: conecta a MongoDB y hace listen
  src/app.js                Crea Express, monta rutas y manejo de errores
  src/config/               env.js (variables de .env) y db.js (conexión e índices)
  src/routes/               productos.routes.js (URL -> controlador)
  src/controllers/          productos.controller.js (lógica de cada endpoint)
  src/validators/           producto.validator.js
  src/middlewares/          errores.js (404 de API y errores 500)
  src/utils/                texto.js (quitarAcentos / normalizarValor) e ids.js
  scripts/                  Scripts de mantenimiento de la base (ver abajo)
  public/                   Frontend (index.html, styles.css, app.js)
```

## Endpoints
| Método | Ruta | Uso |
|---|---|---|
| GET | /api/productos?q=&categoria=&disponibilidad=&ingrediente= | Listar y filtrar |
| GET | /api/productos/categorias | Categorías existentes |
| GET | /api/productos/:id | Un producto |
| POST | /api/productos | Registrar |
| PATCH | /api/productos/:id | Editar / cambiar disponibilidad |
| DELETE | /api/productos/:id | Eliminar |

Notas:
- La edición usa `$set`, así que no borra campos extra que tenga un documento (RNF3). Al arrancar se crean índices en `categoria`, `disponibilidad` e `ingredientes` (RNF1).
- El filtro `ingrediente` acepta varios valores separados por coma (`?ingrediente=leche,cafe`): el producto debe tener **todos** los ingredientes indicados (`$all`).
- Al crear/editar un producto y al filtrar por `q`, `categoria` o `ingrediente`, el texto se normaliza (sin acentos) antes de guardarse o consultarse.
- Una ruta `/api/...` que no existe responde 404 con `{ "error": "Ruta no encontrada." }`.

## Scripts de mantenimiento (carpeta `app/scripts/`, se corren desde `app/`)
| Script | Uso | Qué hace |
|---|---|---|
| `node scripts/respaldo.js` | Antes de cualquier cambio masivo a la base | Exporta `clientes`, `productos` y `pedidos` a `app/respaldos/AAAA-MM-DD_HHMM/<coleccion>.json` en formato EJSON (`relaxed:false`), conservando `ObjectId` y `Date`. La carpeta `respaldos/` no se sube a git. |
| `node scripts/quitar-acentos.js --dry-run` | Para revisar qué cambiaría | Recorre las 3 colecciones y muestra los cambios sin escribir nada. |
| `node scripts/quitar-acentos.js` | Para aplicar | Quita acentos de vocales en todos los strings (documentos embebidos y arreglos incluidos); la ñ/Ñ se conserva. Solo actualiza los documentos y campos de primer nivel que cambiaron. |
| `node scripts/normalizar-archivos-importacion.js` | Cuando se editan los datos de ejemplo | Aplica la misma normalización a `datos/clientes.json`, `datos/productos.json` y `datos/pedidos.json`, conservando el formato Extended JSON (`$oid`, `$date`) e indentación de 2 espacios. |
