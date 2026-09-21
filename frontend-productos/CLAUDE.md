# Café Central · Mini proyecto (Bases de Datos No Convencionales)

## Contexto
Sistema escolar para una cafetería con MongoDB. Base `CAFETERIA` con 3 colecciones que ya tiene todo el grupo
(fueron importadas desde `../clientes.json`, `../productos.json`, `../pedidos.json`):

- **productos**: `_id` ObjectId, `nombre` string, `categoria` string, `precio` number, `descripcion` string,
  `ingredientes` array de strings, `disponibilidad` boolean.
- **clientes**: `_id`, `nombre`, `apellido`, `correo` (único), `telefono`, `direccion` {calle, num_ext, colonia, ciudad, codigo_postal}, `fecha_registro` Date.
- **pedidos**: `_id`, `numero_pedido` int, `cliente_id` ObjectId (ref), `fecha` Date, `productos` [{producto_id, nombre, cantidad, precio_unitario, subtotal}], `total`, `estado`.

**No cambiar la estructura de estas colecciones ni sus documentos existentes** sin que se pida explícitamente.

**Datos sin acentos:** los strings de las 3 colecciones se guardan sin acentos en las vocales (á é í ó ú ü → a e i o u u).
La **ñ/Ñ se conserva**. La API (`server.js`) normaliza de la misma forma lo que se guarda (`validarProducto`) y lo que se
filtra (`q`, `categoria`, `ingrediente`), usando `quitarAcentos` de `utils/texto.js`, para que "café" y "cafe" den el mismo
resultado. Ver `scripts/quitar-acentos.js` (con `--dry-run`) y `scripts/respaldo.js` para el respaldo y la migración que ya
se aplicó, y `scripts/normalizar-archivos-importacion.js` para los archivos `../clientes.json`, `../productos.json` y
`../pedidos.json`.

## Etapa actual
Solo el **frontend de la colección productos** conectado a la DB real: listar, crear, editar, eliminar,
cambiar disponibilidad y filtrar por nombre, categoría, disponibilidad e ingrediente.

## Stack
Node.js + Express + driver oficial `mongodb`; frontend HTML/CSS/JS plano en `public/`, servido por el mismo servidor.
Configuración en `.env` (`MONGODB_URI`, `DB_NAME=CAFETERIA`, `PORT=3000`). Nada de frameworks extra.

## Alcance acordado (se omiten del documento de requerimientos)
- RF14 y RNF6: sin login ni roles (no existe colección `usuarios`).
- RF12 y RF13: sin reportes por ahora.
- RF9 no se corrige en los datos de ejemplo (el pedido 1003 tiene un producto no disponible; se deja así).

## Reglas de trabajo
- Español en UI, mensajes y comentarios.
- Editar con `$set` para no borrar campos extra de un documento.
- Entorno: Windows (PowerShell). Probar con el servidor corriendo antes de dar algo por terminado.
- Al terminar cada tarea, entregar un resumen corto: qué se cambió, qué se probó y cualquier problema.
