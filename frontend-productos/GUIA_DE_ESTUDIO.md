# Guía de estudio · App de productos de Café Central

Esta guía explica, parte por parte, cómo está construida la aplicación de la colección `productos`: qué hace cada archivo, por qué está escrito así y cómo viaja un dato desde la pantalla hasta MongoDB y de regreso.

**Cómo usarla:** léela en orden la primera vez. Las secciones 1 a 3 dan el panorama y los conceptos, la 4 cubre la base de datos, la 5 el backend, la 6 el frontend y la 7 une todo con un recorrido completo. Al final hay preguntas de repaso y un glosario.

---

## Índice

1. [Panorama general](#1-panorama-general)
2. [Estructura de archivos](#2-estructura-de-archivos)
3. [Conceptos previos](#3-conceptos-previos)
4. [La base de datos](#4-la-base-de-datos)
5. [El backend: server.js](#5-el-backend-serverjs)
6. [El frontend: carpeta public](#6-el-frontend-carpeta-public)
7. [Recorrido completo de una operación](#7-recorrido-completo-de-una-operación)
8. [Relación con los requerimientos](#8-relación-con-los-requerimientos)
9. [Cómo ejecutar y probar](#9-cómo-ejecutar-y-probar)
10. [Errores comunes](#10-errores-comunes)
11. [Limitaciones y mejoras posibles](#11-limitaciones-y-mejoras-posibles)
12. [Preguntas de repaso](#12-preguntas-de-repaso)
13. [Glosario](#13-glosario)

---

## 1. Panorama general

La app tiene **tres piezas** que se comunican en cadena:

```
┌──────────────────────┐   HTTP + JSON    ┌──────────────────────┐   Driver MongoDB   ┌──────────────────────┐
│      NAVEGADOR       │ ───────────────► │   SERVIDOR NODE.JS   │ ─────────────────► │       MONGODB        │
│  (frontend: public/) │ ◄─────────────── │  (backend: server.js)│ ◄───────────────── │  base CAFETERIA      │
│  HTML + CSS + JS     │                  │  Express = API REST  │                    │  colección productos │
└──────────────────────┘                  └──────────────────────┘                    └──────────────────────┘
     Lo que ves y usas                      Valida y traduce las                         Donde viven los
                                            peticiones a consultas                       documentos
```

- **Frontend (cliente):** la pantalla. Muestra los productos y captura lo que el usuario hace. **Nunca habla directo con MongoDB.**
- **Backend (servidor / API):** recibe peticiones HTTP del navegador, valida los datos, ejecuta la operación en MongoDB y responde con JSON.
- **Base de datos:** MongoDB local (`mongodb://localhost:27017`), base `CAFETERIA`, colección `productos`.

### ¿Por qué no conectar el navegador directo a MongoDB?

1. **Seguridad:** la cadena de conexión quedaría expuesta a cualquiera que abra el código de la página, y cualquiera podría borrar la base.
2. **Técnica:** el navegador solo habla HTTP; MongoDB usa su propio protocolo por TCP.
3. **Control:** el servidor es el lugar donde se aplican las reglas de negocio (precio mayor a 0, nombre obligatorio, etc.). Lo que valida el navegador se puede saltar; lo que valida el servidor no.

Las dos primeras piezas corren en **el mismo proceso de Node**: Express entrega los archivos de `public/` (la página) y también atiende las rutas `/api/...` (los datos). Por eso basta un `npm start` y una sola dirección: `http://localhost:3000`.

---

## 2. Estructura de archivos

```
frontend-productos/
├── server.js          ← Backend: servidor Express + API REST + conexión a MongoDB
├── package.json       ← Datos del proyecto, dependencias y scripts (npm start)
├── package-lock.json  ← Versiones exactas instaladas (lo genera npm, no se edita a mano)
├── .env.example       ← Plantilla de configuración (sí se versiona)
├── .env               ← Configuración real de tu máquina (NO se versiona)
├── .gitignore         ← Qué no subir a git: node_modules/ y .env
├── README.md          ← Instrucciones rápidas
├── CLAUDE.md          ← Contexto del proyecto para Claude Code
├── GUIA_DE_ESTUDIO.md ← Este documento
├── node_modules/      ← Librerías descargadas por npm install (no se versiona)
└── public/            ← Frontend: todo lo que se manda al navegador
    ├── index.html     ← Estructura de la pantalla
    ├── styles.css     ← Apariencia
    └── app.js         ← Comportamiento: pide datos a la API y pinta la pantalla
```

### package.json

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.5",
    "express": "^4.21.2",
    "mongodb": "^6.12.0"
  }
}
```

| Parte | Qué significa |
|---|---|
| `scripts.start` | `npm start` ejecuta `node server.js`. |
| `scripts.dev` | `npm run dev` reinicia el servidor solo cada vez que guardas un archivo (útil mientras desarrollas). |
| `dotenv` | Lee el archivo `.env` y carga sus valores en `process.env`. |
| `express` | Framework para crear el servidor HTTP y definir rutas. |
| `mongodb` | Driver oficial: la librería que sabe hablar con MongoDB desde Node. |
| `^16.4.5` | "Cualquier versión 16.x.x igual o mayor a 16.4.5". El `^` permite actualizaciones menores, no cambios de versión mayor. |

Solo hay 3 dependencias a propósito: nada de frameworks de frontend ni librerías extra, para que todo el código sea legible.

### .env y .env.example

```
MONGODB_URI=mongodb://localhost:27017
DB_NAME=CAFETERIA
PORT=3000
```

- **Por qué existe:** la configuración cambia según la máquina (otro puerto, Atlas en lugar de local, otra base). Sacarla del código evita editar `server.js` en cada computadora.
- **Por qué `.env` no se sube a git:** en proyectos reales ahí van contraseñas. Se sube `.env.example` como plantilla y cada quien crea su `.env`.
- **Ojo:** MongoDB distingue mayúsculas. `CAFETERIA` y `cafeteria` serían **dos bases distintas**. Si `DB_NAME` está mal escrito, la app se conecta sin error pero muestra la lista vacía.

---

## 3. Conceptos previos

### 3.1 Cliente-servidor y HTTP

El navegador (cliente) manda una **petición** y el servidor devuelve una **respuesta**. Cada petición HTTP tiene:

- **Método:** qué quieres hacer (`GET`, `POST`, `PATCH`, `DELETE`).
- **URL / ruta:** sobre qué recurso (`/api/productos/650a...0001`).
- **Query string (opcional):** parámetros después de `?`, por ejemplo `?categoria=Postres&disponibilidad=true`.
- **Cuerpo (body, opcional):** los datos enviados, aquí en JSON.
- **Encabezados:** metadatos, por ejemplo `Content-Type: application/json`.

La respuesta trae un **código de estado** y normalmente un cuerpo JSON.

### 3.2 API REST

REST es una convención para diseñar la API: las URLs nombran **recursos** (sustantivos) y el **método HTTP** indica la acción.

| Acción (CRUD) | Método | Ruta | Equivalente en MongoDB |
|---|---|---|---|
| Create (crear) | `POST` | `/api/productos` | `insertOne` |
| Read (leer todos) | `GET` | `/api/productos` | `find` |
| Read (leer uno) | `GET` | `/api/productos/:id` | `findOne` |
| Update (actualizar) | `PATCH` | `/api/productos/:id` | `updateOne` / `findOneAndUpdate` con `$set` |
| Delete (eliminar) | `DELETE` | `/api/productos/:id` | `deleteOne` |

**PATCH vs PUT:** `PUT` reemplaza el recurso completo; `PATCH` modifica solo los campos enviados. Usamos `PATCH` porque, por ejemplo, el interruptor de disponibilidad manda únicamente `{ "disponibilidad": false }`.

### 3.3 Códigos de estado que usa la app

| Código | Nombre | Cuándo lo devuelve la app |
|---|---|---|
| 200 | OK | Consulta o edición exitosa. |
| 201 | Created | Producto creado. |
| 204 | No Content | Producto eliminado (no hay nada que devolver). |
| 400 | Bad Request | Datos inválidos o id mal formado. |
| 404 | Not Found | El id tiene formato válido pero no existe. |
| 500 | Internal Server Error | Falló algo inesperado (por ejemplo, se cayó MongoDB). |

### 3.4 JSON

Formato de texto para intercambiar datos. Es lo que viaja entre navegador y servidor:

```json
{ "nombre": "Capuchino", "precio": 45, "ingredientes": ["café espresso", "leche"], "disponibilidad": true }
```

MongoDB guarda internamente **BSON** (JSON binario con más tipos, como `ObjectId` y `Date`). El driver convierte entre ambos automáticamente. Cuando un `ObjectId` sale por la API, se convierte en texto: `"650a2f2a2a2a2a2a2a2a0001"`.

### 3.5 Asincronía: async / await

Hablar con la base o con el servidor tarda. JavaScript no se queda "congelado" esperando: esas operaciones regresan una **Promesa** (un valor que llegará después). `await` pausa **solo esa función** hasta que llegue el resultado, sin bloquear el resto del programa. Solo se puede usar `await` dentro de funciones marcadas como `async`.

```js
const lista = await productos.find(filtro).toArray(); // espera la respuesta de MongoDB
```

Si la promesa falla, `await` lanza un error que se atrapa con `try { ... } catch (e) { ... }`.

---

## 4. La base de datos

### 4.1 El documento producto

```json
{
  "_id": ObjectId("650a2f2a2a2a2a2a2a2a0001"),
  "nombre": "Capuchino",
  "categoria": "Bebidas calientes",
  "precio": 45,
  "descripcion": "Espresso con leche vaporizada y espuma cremosa",
  "ingredientes": ["café espresso", "leche", "espuma de leche"],
  "disponibilidad": true
}
```

| Campo | Tipo BSON | Obligatorio en la app | Notas |
|---|---|---|---|
| `_id` | ObjectId | Automático | Lo genera MongoDB al insertar. |
| `nombre` | String | Sí | Se guarda sin espacios al inicio o al final. |
| `categoria` | String | Sí | Texto libre; las opciones del filtro salen de los valores existentes. |
| `precio` | Number | Sí, mayor a 0 | Se redondea a 2 decimales. |
| `descripcion` | String | No | Si no se captura, se guarda `""`. |
| `ingredientes` | Array de String | No | Si no se captura, se guarda `[]`. |
| `disponibilidad` | Boolean | Sí | `true` / `false`, no el texto `"true"`. |

### 4.2 Esquema flexible (RNF3)

MongoDB no obliga a que todos los documentos tengan los mismos campos. Si mañana se agrega `"tamaño": "grande"` a un producto desde Compass, **la app no lo borra al editar**, porque la edición usa `$set` (sección 5.7). Esto cumple el RNF3: agregar campos sin modificar los documentos ya guardados.

### 4.3 Índices (RNF1)

Al arrancar, el servidor ejecuta:

```js
await productos.createIndex({ categoria: 1 });
await productos.createIndex({ disponibilidad: 1 });
await productos.createIndex({ ingredientes: 1 });
```

- Un **índice** es como el índice alfabético de un libro: permite encontrar documentos sin revisar la colección completa.
- `1` significa orden ascendente.
- El índice sobre `ingredientes` es un **índice multillave**: como el campo es un arreglo, MongoDB crea una entrada por cada ingrediente.
- `createIndex` es **idempotente**: si el índice ya existe, no hace nada. Por eso se puede llamar cada vez que arranca el servidor.
- Se ven en Compass → `CAFETERIA` → `productos` → pestaña *Indexes*.

Con 5 documentos la diferencia no se nota. Los índices están ahí por buena práctica y porque así se justifica el RNF1 cuando el catálogo crezca.

### 4.4 Relación con las otras colecciones

`pedidos` guarda una copia de `nombre` y `precio_unitario` de cada producto (dato histórico, RNF4) y además `producto_id` como referencia. Por eso **editar o eliminar un producto no altera los pedidos anteriores**: el pedido ya tiene su propia copia.

---

## 5. El backend: server.js

El archivo tiene 5 bloques: configuración, utilidades, validación, rutas de la API y arranque.

### 5.1 Configuración inicial

```js
require('dotenv').config();
const path = require('path');
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'CAFETERIA';
const PORT = process.env.PORT || 3000;
```

- `require(...)` importa módulos (sistema CommonJS de Node).
- `require('dotenv').config()` va **primero** para que `process.env` ya tenga los valores de `.env` cuando se lean en las líneas siguientes.
- `{ MongoClient, ObjectId }` es **desestructuración**: saca esas dos piezas del módulo `mongodb`.
- `process.env.X || 'valor'` usa el valor del `.env` y, si no existe, uno por defecto.

```js
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let productos; // referencia a la colección
```

- `app` es el servidor.
- `app.use(...)` registra un **middleware**: una función por la que pasan todas las peticiones antes de llegar a las rutas.
  - `express.json()` convierte el cuerpo JSON de la petición en un objeto de JavaScript disponible en `req.body`. Sin él, `req.body` sería `undefined`.
  - `express.static(...)` sirve los archivos de `public/` tal cual. Si pides `/`, entrega `public/index.html`; si pides `/app.js`, entrega `public/app.js`.
- `__dirname` es la carpeta donde está `server.js`; `path.join` arma la ruta correctamente en Windows y en Linux.
- `productos` se declara vacío y se llena al conectar (sección 5.9). Todas las rutas la usan.

### 5.2 Utilidades

```js
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

Los filtros por nombre e ingrediente usan expresiones regulares. Caracteres como `.` `*` `(` tienen significado especial en una regex; si el usuario escribe `café (grande)`, los paréntesis romperían la búsqueda o cambiarían su significado. Esta función antepone `\` a cada carácter especial para que se busque **literalmente**. También evita que alguien mande una regex maliciosa muy costosa.

```js
function idValido(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}
```

Un `ObjectId` son 24 caracteres hexadecimales. Si llega un id como `abc`, `new ObjectId('abc')` lanzaría un error. Esta función lo revisa antes, para responder **400** con un mensaje claro en lugar de un 500. La segunda parte (`String(...) === id`) es una verificación estricta: convierte el id a ObjectId y de regreso a texto, y exige que quede idéntico. Por ejemplo, `isValid` acepta el hexadecimal en mayúsculas (`650A2F...`), pero un ObjectId siempre se escribe en minúsculas, así que esta comprobación lo rechaza.

### 5.3 Validación: validarProducto

```js
function validarProducto(body, parcial = false) {
  const errores = [];
  const datos = {};
  ...
  return { errores, datos };
}
```

Recibe el cuerpo de la petición y devuelve dos cosas:

- `errores`: lista de mensajes; si tiene algo, la ruta responde 400.
- `datos`: un objeto **limpio**, solo con los 6 campos permitidos y ya normalizados.

**El parámetro `parcial`:**

- `false` (al crear, `POST`): valida **todos** los campos; los obligatorios deben venir.
- `true` (al editar, `PATCH`): valida **solo los que vienen** en el cuerpo. Así se puede mandar solo `{ disponibilidad: false }`.

Esto se logra con la condición que abre cada bloque:

```js
if (!parcial || body.nombre !== undefined) { ... }
// "valida el nombre si NO es parcial, o si sí vino el nombre"
```

**Reglas por campo:**

| Campo | Regla | Código clave |
|---|---|---|
| `nombre`, `categoria` | Texto no vacío tras quitar espacios. | `typeof body.nombre === 'string' ? body.nombre.trim() : ''` |
| `precio` | Número finito mayor a 0, redondeado a 2 decimales. | `Number(body.precio)`, `Number.isFinite(v) && v > 0`, `Math.round(v * 100) / 100` |
| `descripcion` | Opcional; si no es texto, queda `""`. | |
| `ingredientes` | Acepta arreglo o texto separado por comas; limpia espacios y quita vacíos. | `lista.split(',')`, `.map(trim)`, `.filter(Boolean)` |
| `disponibilidad` | Debe ser booleano real. | `typeof body.disponibilidad !== 'boolean'` |

**Por qué el objeto `datos` limpio es importante:** si se insertara `req.body` directo, alguien podría mandar campos arbitrarios (`"_id"`, `"hackeado": true`, operadores de MongoDB) y se guardarían tal cual. Al copiar solo los campos conocidos, la base recibe exactamente lo esperado. Es una **lista blanca** de campos.

**Por qué se valida en el servidor aunque el frontend ya valide:** la validación del navegador es para comodidad del usuario (mensajes inmediatos); cualquiera puede saltársela mandando la petición con Postman o `Invoke-RestMethod`. La del servidor es la que protege los datos.

**Normalización sin acentos (`quitarAcentos`):** `nombre`, `categoria`, `descripcion` e `ingredientes` pasan además por `quitarAcentos(...)`, importada de `utils/texto.js`, antes de guardarse:

```js
else datos.nombre = quitarAcentos(v);
```

```js
// utils/texto.js
function quitarAcentos(str) {
  if (typeof str !== 'string') return str;
  return str
    .normalize('NFD')
    .replace(/([nN])̃|[̀-ͯ]/g, (coincidencia, letraN) => (letraN ? coincidencia : ''))
    .normalize('NFC');
}
```

- `normalize('NFD')` (forma de descomposición) separa cada letra acentuada en **letra base + marca combinante**: "é" se vuelve "e" + `́` (acento agudo). Las marcas combinantes ocupan el rango `̀`-`ͯ`.
- El `replace` con dos alternativas en la regex decide qué quitar: si la marca es la tilde `̃` y va justo después de `n` o `N` (eso es lo que forma la **ñ**: "n" + `̃`), se **conserva** tal cual; cualquier otra marca en ese rango se **elimina**.
- `normalize('NFC')` (forma de composición) vuelve a unir letra base + marca en un solo carácter donde haya quedado alguna (la ñ), y deja las demás letras ya sin acento.
- Por eso el catálogo se guarda sin acentos en las vocales pero conservando la ñ/Ñ, y por qué en la base ya no aparecen "café", "jamón" ni "Bebidas frías": ahora son "cafe", "jamon" y "Bebidas frias".

### 5.4 GET /api/productos: listar y filtrar

```js
app.get('/api/productos', async (req, res, next) => {
  try {
    const { categoria, disponibilidad, ingrediente, q } = req.query;
    const filtro = {};
    if (categoria) filtro.categoria = quitarAcentos(categoria);
    if (disponibilidad === 'true' || disponibilidad === 'false') {
      filtro.disponibilidad = disponibilidad === 'true';
    }
    if (ingrediente) {
      const valores = ingrediente.split(',').map((v) => quitarAcentos(v.trim())).filter(Boolean);
      if (valores.length) {
        filtro.ingredientes = { $all: valores.map((v) => new RegExp(escapeRegex(v), 'i')) };
      }
    }
    if (q) filtro.nombre = { $regex: escapeRegex(quitarAcentos(q.trim())), $options: 'i' };

    const lista = await productos.find(filtro).sort({ categoria: 1, nombre: 1 }).toArray();
    res.json(lista);
  } catch (e) { next(e); }
});
```

**Anatomía de una ruta en Express:**

- `app.get(ruta, manejador)`: responde a peticiones `GET` en esa ruta.
- El manejador recibe `req` (la petición), `res` (la respuesta) y `next` (pasar al siguiente middleware; aquí se usa para mandar errores al manejador de la sección 5.8).
- `req.query` contiene los parámetros del query string. En `?categoria=Postres&disponibilidad=false`, `req.query` es `{ categoria: 'Postres', disponibilidad: 'false' }`. **Siempre llegan como texto**, por eso `disponibilidad` se convierte a booleano comparándolo con `'true'`.
- `res.json(x)` responde con código 200 y `x` convertido a JSON.

**Cómo se arma el filtro:** empieza vacío (`{}` significa "todos") y se le agrega una condición por cada filtro que venga. Las condiciones se combinan con **Y lógico**. Ejemplo:

```
GET /api/productos?categoria=Bebidas calientes&ingrediente=leche
```

produce este filtro, equivalente en mongosh:

```js
db.productos.find({
  categoria: "Bebidas calientes",
  ingredientes: { $regex: "leche", $options: "i" }
}).sort({ categoria: 1, nombre: 1 })
```

- `$regex` busca un patrón dentro del texto: `"leche"` coincide con `"leche"` y también con `"espuma de leche"`.
- `$options: 'i'` ignora mayúsculas y minúsculas.
- **Regex sobre un arreglo:** en `ingredientes`, MongoDB aplica la condición a **cada elemento** y el documento coincide si **al menos uno** cumple. No hace falta `$elemMatch` para este caso.
- `.sort({ categoria: 1, nombre: 1 })` ordena por categoría y, dentro de cada una, por nombre.
- `.toArray()` convierte el cursor (el resultado que MongoDB entrega por partes) en un arreglo completo.

**Varios ingredientes a la vez y el operador `$all`:**

```
GET /api/productos?ingrediente=leche,chocolate
```

`ingrediente` se separa por comas, cada valor se limpia (`trim`), se normaliza (`quitarAcentos`) y se escapa (`escapeRegex`) antes de convertirlo en una expresión regular insensible a mayúsculas. El filtro queda así:

```js
db.productos.find({
  ingredientes: { $all: [/leche/i, /chocolate/i] }
})
```

- `$all` exige que el arreglo `ingredientes` contenga **todos** los valores de la lista (cada uno puede estar en cualquier posición), a diferencia de `$regex` suelto, que solo pide que **alguno** coincida.
- Aquí cada elemento de la lista de `$all` es una expresión regular (no texto exacto), así que "chocolate" también encontraría "chocolate amargo" si existiera.
- Con un solo ingrediente (`?ingrediente=leche`), `$all` recibe un arreglo de un solo elemento y se comporta igual que antes.
- Normalizar con `quitarAcentos` antes de armar la regex es lo que hace que `?ingrediente=cafe` y `?ingrediente=café` devuelvan lo mismo: en la base ya no hay acentos guardados, así que hay que quitarlos también de lo que escribe quien busca.

### 5.5 GET /api/productos/categorias

```js
app.get('/api/productos/categorias', async (req, res, next) => {
  const cats = await productos.distinct('categoria');
  res.json(cats.filter(Boolean).sort((a, b) => a.localeCompare(b, 'es')));
});
```

- `distinct('categoria')` devuelve los valores **únicos** del campo (equivale a `db.productos.distinct("categoria")`).
- `filter(Boolean)` quita valores vacíos o nulos.
- `localeCompare(b, 'es')` ordena alfabéticamente respetando acentos del español.

Así, las opciones del filtro de categoría **siempre reflejan lo que hay en la base**: si creas un producto con una categoría nueva, aparece sola en el filtro.

**Importante: el orden de las rutas.** Esta ruta está declarada **antes** de `/api/productos/:id`. Express revisa las rutas en el orden en que se declaran; si `/:id` estuviera primero, la petición a `/api/productos/categorias` la tomaría esa ruta con `id = "categorias"` y respondería 400 "Id no válido".

### 5.6 GET /api/productos/:id y POST /api/productos

```js
app.get('/api/productos/:id', async (req, res, next) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
  const doc = await productos.findOne({ _id: new ObjectId(req.params.id) });
  if (!doc) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json(doc);
});
```

- `:id` es un **parámetro de ruta**; su valor llega en `req.params.id`.
- **`new ObjectId(...)` es obligatorio:** en la base `_id` es de tipo ObjectId, no texto. Buscar `{ _id: "650a..." }` (texto) no encontraría nada.
- `res.status(404).json(...)` cambia el código antes de responder. El `return` detiene la función para no responder dos veces.

```js
app.post('/api/productos', async (req, res, next) => {
  const { errores, datos } = validarProducto(req.body);
  if (errores.length) return res.status(400).json({ error: errores.join(' ') });
  const r = await productos.insertOne(datos);
  res.status(201).json({ _id: r.insertedId, ...datos });
});
```

- `insertOne` inserta y regresa el `_id` generado en `r.insertedId`.
- `{ _id: r.insertedId, ...datos }` usa el **operador spread** (`...`) para armar un objeto nuevo con el `_id` más todos los campos de `datos`.
- Responde **201 Created**.

### 5.7 PATCH y DELETE

```js
app.patch('/api/productos/:id', async (req, res, next) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
  const { errores, datos } = validarProducto(req.body, true);   // parcial
  if (errores.length) return res.status(400).json({ error: errores.join(' ') });
  if (!Object.keys(datos).length) return res.status(400).json({ error: 'No hay cambios.' });
  const doc = await productos.findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: datos },
    { returnDocument: 'after' }
  );
  if (!doc) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json(doc);
});
```

- **`$set`** modifica solo los campos indicados y deja intactos los demás. Sin `$set`, se usaría `replaceOne` y el documento completo se sustituiría, perdiendo cualquier campo extra (esto rompería el RNF3).
- `findOneAndUpdate` busca, actualiza y **devuelve el documento** en una sola operación. Con `returnDocument: 'after'` devuelve la versión **ya actualizada** (por defecto devolvería la anterior). El frontend usa ese resultado, por ejemplo, para mostrar "Capuchino: no disponible".
- `Object.keys(datos).length` cuenta cuántos campos válidos llegaron; si ninguno, no tiene caso ir a la base.

Equivalente en mongosh de apagar la disponibilidad:

```js
db.productos.findOneAndUpdate(
  { _id: ObjectId("650a2f2a2a2a2a2a2a2a0001") },
  { $set: { disponibilidad: false } },
  { returnDocument: "after" }
)
```

```js
app.delete('/api/productos/:id', async (req, res, next) => {
  if (!idValido(req.params.id)) return res.status(400).json({ error: 'Id no valido.' });
  const r = await productos.deleteOne({ _id: new ObjectId(req.params.id) });
  if (!r.deletedCount) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.status(204).end();
});
```

- `deleteOne` regresa `deletedCount` (0 o 1). Si es 0, el id no existía → 404.
- `204 No Content` + `.end()`: éxito sin cuerpo.

### 5.8 Manejo de errores

```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error en el servidor o en la base de datos.' });
});
```

Un middleware con **4 parámetros** es, para Express, un manejador de errores. Todas las rutas tienen `try { ... } catch (e) { next(e); }`: si algo falla (por ejemplo, MongoDB se detuvo), el error llega aquí. Se imprime el detalle en la terminal (para el desarrollador) y el navegador recibe un mensaje genérico (no conviene mostrar detalles internos al usuario).

### 5.9 Arranque

```js
async function iniciar() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(DB_NAME);
  productos = db.collection('productos');
  // índices (sección 4.3)
  const total = await productos.countDocuments();
  console.log(`Conectado a MongoDB -> base "${DB_NAME}", coleccion "productos" (${total} documentos)`);
  app.listen(PORT, () => console.log(`Abre http://localhost:${PORT}`));
}

iniciar().catch((e) => {
  console.error('No se pudo conectar a MongoDB:', e.message);
  process.exit(1);
});
```

**Orden deliberado:** primero se conecta a MongoDB y **después** se abre el puerto con `app.listen`. Así el servidor nunca atiende peticiones sin tener base de datos.

- `serverSelectionTimeoutMS: 5000`: si MongoDB no responde en 5 segundos, falla en lugar de quedarse esperando indefinidamente.
- Se crea **un solo cliente** para toda la vida del servidor. El driver mantiene internamente un **pool de conexiones** que se reutilizan; abrir y cerrar una conexión por cada petición sería lento.
- `client.db()` y `db.collection()` no crean nada en la base; solo preparan la referencia. Si la base o la colección no existen, MongoDB las crea con el primer `insert`.
- `countDocuments()` sirve como comprobación: si ves `(0 documentos)`, probablemente `DB_NAME` está mal escrito.
- `process.exit(1)` termina el programa con código de error si no hubo conexión.

---

## 6. El frontend: carpeta public

### 6.1 index.html: la estructura

La página tiene estas zonas:

```
┌─────────────────────────────────────────────────────────┐
│ header.topbar   ☕ Café Central        [+ Nuevo producto] │
├─────────────────────────────────────────────────────────┤
│ #aviso          (oculto; aparece si falla la conexión)   │
│ section.filtros [nombre][categoría][disponib.][ingred.]  │
│ #resumen        "5 producto(s) · 4 disponible(s) · ..."  │
│ section#lista   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │
│   (tarjetas)    │      │ │      │ │      │ │      │      │
│                 └──────┘ └──────┘ └──────┘ └──────┘      │
└─────────────────────────────────────────────────────────┘
  dialog#modalProducto   formulario crear / editar
  dialog#modalEliminar   confirmación de borrado
  div#toast              mensajes breves abajo al centro
```

Elementos a notar:

- **`<dialog>`:** elemento nativo de HTML para ventanas modales. Se abre con `.showModal()` (oscurece el fondo y bloquea lo de atrás) y se cierra con `.close()`. Evita programar una modal desde cero.
- **`<form ... novalidate>`:** desactiva los globos de validación del navegador para mostrar nuestros propios mensajes en `#errorForm`.
- **`<datalist id="listaCategorias">`:** conectado al campo categoría con `list="listaCategorias"`. Da sugerencias de las categorías existentes, pero permite escribir una nueva.
- **`<input type="hidden" id="pId">`:** guarda el id del producto en edición. Vacío = crear; con valor = editar. Un solo formulario sirve para ambos casos.
- **`<input type="number" min="0.5" step="0.5">`:** teclado numérico en móviles y flechas para subir o bajar el precio.
- **Atributos `aria-*` y `role`:** accesibilidad para lectores de pantalla. `aria-live="polite"` en la lista avisa cuando cambia su contenido; `role="alert"` en el aviso de error.
- **`<script src="app.js">` al final del `body`:** se carga cuando todo el HTML ya existe, así `document.querySelector` encuentra los elementos.
- El favicon ☕ está incrustado como SVG en la etiqueta `<link rel="icon">` para no necesitar un archivo aparte.

Las tarjetas **no están en el HTML**: `app.js` las genera con los datos que llegan de la API.

### 6.2 styles.css: la apariencia

**Variables CSS** (`:root`): la paleta se define una sola vez y se reutiliza.

```css
:root {
  --cafe: #4b2e1f;
  --crema: #f7f1e8;
  --verde: #2f7d4f;
  --rojo: #b3362f;
  --radio: 12px;
}
.topbar { background: var(--cafe); }
```

Cambiar `--cafe` cambia el color en todos los lugares donde se usa.

**`* { box-sizing: border-box; }`:** el ancho de un elemento incluye su padding y su borde. Evita que los campos "se salgan" de su contenedor.

**Dos sistemas de maquetación:**

- **Flexbox** (`display: flex`): acomoda elementos en **una dimensión** (fila o columna). Se usa en el encabezado, el pie de cada tarjeta y los botones.
- **Grid** (`display: grid`): acomoda en **dos dimensiones**. Se usa en:
  - Los filtros: `grid-template-columns: 2fr 1.3fr 1.2fr 1.5fr auto;` → 5 columnas proporcionales (`fr` = fracción del espacio libre).
  - Las tarjetas: `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));` → "caben tantas columnas como sea posible, cada una de mínimo 260px". Con esto la cuadrícula se adapta sola al ancho de la pantalla sin media queries.

**El interruptor (switch) sin JavaScript:**

```css
.estado input { display: none; }                         /* se oculta el checkbox real */
.switch { width: 38px; height: 22px; border-radius: 999px; background: #cfc4b6; }
.switch::after { /* el círculo blanco */ }
input:checked + .switch { background: var(--verde); }
input:checked + .switch::after { transform: translateX(16px); }
```

El checkbox real está oculto, pero sigue funcionando porque está dentro de un `<label>`: al hacer clic en el label se marca o desmarca. El selector `input:checked + .switch` significa "el `.switch` que está justo después de un input marcado"; así el color y la posición del círculo cambian con puro CSS. `::after` es un **pseudoelemento**: un elemento extra dibujado por CSS.

**Otros detalles:**

- `.tarjeta.agotado { opacity: 0.75; }`: los productos no disponibles se ven atenuados.
- `.oculto { display: none !important; }`: clase que JS pone o quita para mostrar u ocultar el aviso.
- `.toast` usa `position: fixed` (queda fija en la ventana aunque hagas scroll) y `transition` para aparecer suavemente.
- `position: sticky` en el encabezado: se queda pegado arriba al hacer scroll.
- **Media queries** (`@media (max-width: 860px)`, `(max-width: 520px)`): reacomodan los filtros en 2 columnas y luego en 1 en pantallas angostas (diseño responsivo).

### 6.3 app.js: el comportamiento

Es el archivo más largo del frontend. Se organiza en 8 bloques.

#### a) Referencias y estado

```js
const API = '/api/productos';
const $ = (sel) => document.querySelector(sel);
const lista = $('#lista');
const filtros = { nombre: $('#fNombre'), categoria: $('#fCategoria'), ... };
let ingredientesForm = [];
let idPorEliminar = null;
const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
```

- `API` es una ruta relativa: como la página y la API salen del mismo servidor, no hace falta escribir `http://localhost:3000`.
- `$` es un atajo propio para `document.querySelector` (buscar un elemento por selector CSS).
- `ingredientesForm` e `idPorEliminar` son el **estado**: datos que la pantalla necesita recordar mientras el usuario trabaja.
- `Intl.NumberFormat` es la API de internacionalización del navegador: `moneda.format(45)` → `"$45.00"`.

#### b) Utilidades

**`escapar(txt)`: protección contra XSS**

```js
function escapar(txt) {
  const d = document.createElement('div');
  d.textContent = txt ?? '';
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
```

Las tarjetas se construyen como texto HTML. Si un producto se llamara `<img src=x onerror="alert(1)">` y se insertara tal cual, el navegador **ejecutaría** ese código: eso es un ataque **XSS (Cross-Site Scripting)**. El truco: asignar el texto con `textContent` (que nunca interpreta HTML) y leerlo con `innerHTML`, que ya viene convertido: `<` → `&lt;`, `>` → `&gt;`, `&` → `&amp;`. Todo dato que viene de la base pasa por `escapar` antes de pintarse. `txt ?? ''` usa `''` si `txt` es `null` o `undefined`.

**Por qué además se reemplazan `"` y `'`:** `innerHTML` no convierte las comillas, pero `escapar` se usa también **dentro de atributos** HTML, por ejemplo `data-ingrediente="${escapar(i)}"` o `value="${escapar(c)}"`. Si un ingrediente se llamara `leche" onmouseover="alert(1)`, la comilla cerraría el atributo antes de tiempo y el resto se interpretaría como HTML/JS nuevo. Por eso, después de escapar con `innerHTML`, se reemplaza manualmente `"` por `&quot;` y `'` por `&#39;`, para que la cadena sea segura tanto dentro de texto como dentro de un atributo entre comillas dobles o simples.

**`toast(msg, esError)`:** muestra un mensaje breve y lo oculta a los 2.6 segundos. Guarda el temporizador en `toast._t` para reiniciarlo si llega otro mensaje antes de que termine.

**`mostrarAviso(msg)`:** muestra la franja roja con botón *Reintentar* cuando no se pueden cargar los datos (servidor apagado, MongoDB caído). Cumple la parte del caso de uso "si se pierde la conexión, el sistema avisa y permite reintentar".

**`pedir(url, opciones)`: el envoltorio de fetch**

```js
async function pedir(url, opciones = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opciones });
  } catch {
    throw new Error('No hay conexión con el servidor. Verifica que esté corriendo (npm start).');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
```

`fetch` es la función del navegador para hacer peticiones HTTP. Detalles que maneja `pedir`:

1. **`fetch` solo falla si no hubo respuesta** (servidor apagado, sin red). Ese caso se atrapa y se cambia por un mensaje entendible.
2. **Un 400 o 404 no hace fallar a `fetch`**: la respuesta llega "bien", solo que con `res.ok = false`. Por eso se revisa `res.ok` a mano y se lanza el mensaje `error` que mandó el servidor (por ejemplo, "El precio debe ser un numero mayor a 0.").
3. Un **204** no trae cuerpo; intentar `res.json()` fallaría, así que se regresa `null` antes.
4. El encabezado `Content-Type: application/json` le dice a Express que el cuerpo es JSON, para que `express.json()` lo convierta.

Con esta función, el resto del código solo escribe `await pedir(...)` y un `try/catch`.

**`debounce(fn, ms)`**

```js
function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
```

Al escribir "capuchino" en el buscador se disparan 9 eventos `input`. Sin debounce serían 9 peticiones al servidor. Con debounce, cada tecla **reinicia** un temporizador de 300 ms, y la función solo se ejecuta cuando el usuario deja de escribir. Es un ejemplo de **closure**: la variable `t` sobrevive entre llamadas porque la función devuelta la "recuerda".

#### c) Carga de datos

```js
async function cargarCategorias() { ... }   // GET /api/productos/categorias → llena <select> y <datalist>
async function cargarProductos()  { ... }   // GET /api/productos?filtros → llama a pintar()
async function cargarTodo()       { ... }   // las dos anteriores, en orden
```

`cargarProductos` arma el query string con **`URLSearchParams`**, que codifica caracteres especiales automáticamente (espacios, acentos, `&`):

```js
const params = new URLSearchParams();
if (filtros.categoria.value) params.set('categoria', filtros.categoria.value);
// "Bebidas frías" → categoria=Bebidas+fr%C3%ADas
const productos = await pedir(`${API}?${params}`);
```

Solo se agregan los filtros que tienen valor, igual que en el servidor.

`cargarCategorias` conserva la categoría que estaba seleccionada al reconstruir el `<select>` (si todavía existe), para que el filtro no se "reinicie" tras crear o editar.

#### d) Render: pintar(productos)

```js
lista.innerHTML = productos.map((p) => `
  <article class="tarjeta ${p.disponibilidad ? '' : 'agotado'}" data-id="${p._id}">
    ...
    <h3>${escapar(p.nombre)}</h3>
    <div class="precio">${moneda.format(p.precio ?? 0)}</div>
    ...
  </article>`).join('');
```

- **Template literals** (texto entre comillas invertidas `` ` ``) permiten insertar valores con `${...}` y escribir varias líneas.
- `.map()` convierte cada producto en un pedazo de HTML y `.join('')` los une en un solo texto que se asigna a `innerHTML`.
- **Operador ternario** `condición ? a : b` decide clases y textos, por ejemplo `'Disponible'` o `'No disponible'`.
- `data-id="${p._id}"`: los atributos `data-*` guardan datos propios en el HTML. Después se leen con `elemento.dataset.id`. Así cada tarjeta "sabe" qué producto representa.
- Si no hay resultados, se muestra un mensaje en lugar de la cuadrícula vacía.
- El resumen se calcula filtrando `p.disponibilidad` en el arreglo recibido.

Al final se guarda un diccionario `id → producto`:

```js
lista._productos = Object.fromEntries(productos.map((p) => [p._id, p]));
```

Cuando el usuario presiona *Editar*, los datos se toman de aquí sin pedirlos otra vez al servidor.

**Estrategia de render:** cada cambio vuelve a pedir la lista y **repinta todo**. Es la forma más simple y siempre muestra lo que realmente hay en la base. Con miles de productos convendría paginar; con un catálogo de cafetería no hace falta.

#### e) Delegación de eventos en las tarjetas

En lugar de poner un `addEventListener` a cada botón de cada tarjeta (que además se perderían cada vez que se repinta la lista), hay **un solo** listener en el contenedor `#lista`:

```js
lista.addEventListener('click', (ev) => {
  const chip = ev.target.closest('.chip[data-ingrediente]');
  if (chip) { filtros.ingrediente.value = chip.dataset.ingrediente; cargarProductos(); return; }

  const btn = ev.target.closest('button[data-accion]');
  if (!btn) return;
  const id = btn.closest('.tarjeta').dataset.id;
  const prod = lista._productos[id];
  if (btn.dataset.accion === 'editar') abrirFormulario(prod);
  if (btn.dataset.accion === 'eliminar') { ... modalEliminar.showModal(); }
});
```

Esto funciona por el **burbujeo de eventos**: un clic en un botón "sube" por todos sus contenedores hasta llegar a `#lista`. `ev.target` es el elemento exacto donde se hizo clic, y `closest(selector)` busca hacia arriba el ancestro más cercano que cumpla el selector. Así se sabe qué botón fue y de qué tarjeta.

**El interruptor de disponibilidad** usa el evento `change`, con **actualización optimista**:

```js
lista.addEventListener('change', async (ev) => {
  if (ev.target.dataset.accion !== 'toggle') return;
  const valor = ev.target.checked;          // el switch ya cambió visualmente
  try {
    const p = await pedir(`${API}/${id}`, { method: 'PATCH', body: JSON.stringify({ disponibilidad: valor }) });
    toast(`${p.nombre}: ${valor ? 'disponible' : 'no disponible'}`);
    cargarProductos();
  } catch (e) {
    ev.target.checked = !valor;             // si falló, se regresa a como estaba
    toast(e.message, true);
  }
});
```

- `JSON.stringify` convierte el objeto a texto JSON para mandarlo en el cuerpo.
- Si la petición falla, el switch vuelve a su estado anterior para no mostrar algo que no se guardó.

#### f) Eliminar

Al presionar *Eliminar* se guarda el id en `idPorEliminar` y se abre `#modalEliminar`. Solo al confirmar se manda `DELETE`. Se usa un `<dialog>` propio en lugar de `confirm()` del navegador para que se vea igual que el resto de la app.

#### g) Formulario crear / editar

**Un solo formulario para dos acciones.** `abrirFormulario(prod)`:

- Sin argumento → título "Nuevo producto", campos vacíos, disponible marcado por defecto.
- Con producto → título "Editar producto" y campos llenos. Se usa **encadenamiento opcional** `prod?.nombre`: si `prod` es `null`, devuelve `undefined` en lugar de lanzar error.
- `ingredientesForm = [...(prod?.ingredientes || [])]` hace una **copia** del arreglo (spread). Si no se copiara, quitar un chip modificaría el producto original guardado en `lista._productos` aunque se presione *Cancelar*.

**Campo de ingredientes con chips (componente reutilizable `crearCampoChips`):**

La lógica de chips (agregar con Enter o coma, quitar con `×` o Backspace, sin duplicados) se usa en **dos lugares**: el formulario de crear/editar y el filtro de ingrediente de la barra de filtros. En vez de repetirla, vive en una sola fábrica:

```js
function crearCampoChips(contenedor, input, arreglo, alCambiar = () => {}) {
  function pintar() { /* redibuja los <span class="chip"> a partir de arreglo */ }
  function agregar(texto) { /* separa por comas, limpia, evita duplicados, pinta y avisa */ }
  input.addEventListener('keydown', (ev) => { /* Enter/",": agregar; Backspace vacio: quitar el ultimo */ });
  function limpiar() { arreglo.length = 0; pintar(); }
  pintar();
  return { pintar, agregar, limpiar };
}
```

- Recibe el **contenedor** (el `div.chips-input`), el **input** de texto, el **arreglo** que guarda los valores y un callback `alCambiar` que se ejecuta cada vez que el arreglo cambia (agregar o quitar un chip).
- `arreglo` es la fuente de verdad; el HTML solo la refleja. Por eso `pintar()` siempre borra los `.chip` existentes y los vuelve a crear a partir de `arreglo`.
- Cada instancia trabaja sobre su propio arreglo y su propio callback:

  ```js
  const campoChipsForm   = crearCampoChips($('#chipsIngredientes'), $('#pIngrediente'), ingredientesForm);
  const campoChipsFiltro = crearCampoChips($('#fIngredienteChips'), $('#fIngrediente'), ingredientesFiltro, cargarProductos);
  ```

  El del formulario no necesita recargar nada al cambiar (se guarda hasta el `submit`); el del filtro sí, así que su `alCambiar` es `cargarProductos`.
- **Por qué `ingredientesForm.length = 0; ingredientesForm.push(...)` y no `ingredientesForm = [...]`:** la fábrica "captura" el arreglo por referencia dentro de sus funciones (`pintar`, `agregar`). Si `abrirFormulario` reasignara `ingredientesForm` a un arreglo nuevo, la fábrica seguiría apuntando al arreglo viejo y dejaría de funcionar. Vaciar y volver a llenar el mismo arreglo conserva la referencia.

**Envío del formulario:**

```js
form.addEventListener('submit', async (ev) => {
  ev.preventDefault();                      // evita que la página se recargue
  // 1. si quedó texto escrito en ingredientes sin Enter, se agrega
  // 2. se arma el objeto datos
  // 3. validación en el navegador → mensajes en #errorForm
  // 4. id vacío → POST /api/productos ; id con valor → PATCH /api/productos/:id
  // 5. éxito → cerrar modal, toast, cargarTodo()
  // 6. error del servidor → se muestra en #errorForm (la modal sigue abierta con lo capturado)
});
```

- `ev.preventDefault()` detiene el comportamiento normal de un formulario (enviar y recargar la página).
- `parseFloat` convierte el precio de texto a número antes de enviarlo.
- El botón *Guardar* se deshabilita mientras se espera la respuesta (`btn.disabled = true`) para evitar doble clic y productos duplicados. `finally` lo vuelve a habilitar pase lo que pase.
- Si el servidor rechaza los datos, **la modal no se cierra**: el usuario no pierde lo que capturó.
- Después de guardar se llama `cargarTodo()` (y no solo `cargarProductos()`) porque la categoría pudo ser nueva y hay que actualizar el filtro.

#### h) Filtros e inicio

```js
const campoChipsFiltro = crearCampoChips($('#fIngredienteChips'), $('#fIngrediente'), ingredientesFiltro, cargarProductos);

const recargar = debounce(cargarProductos, 300);
filtros.nombre.addEventListener('input', recargar);        // al escribir, con debounce
filtros.categoria.addEventListener('change', cargarProductos);   // al elegir, inmediato
filtros.disponibilidad.addEventListener('change', cargarProductos);
$('#btnLimpiar').onclick = () => {
  Object.values(filtros).forEach((f) => (f.value = ''));
  campoChipsFiltro.limpiar();
  cargarProductos();
};

cargarTodo();   // primera carga al abrir la página
```

- `input` se dispara con cada tecla; `change` cuando el valor de un `<select>` cambia.
- Los filtros **se combinan**: puedes elegir categoría y además agregar uno o varios chips de ingrediente.
- El ingrediente ya no es un `<input>` suelto: es un campo de chips (mismo componente que el formulario, sección g). Cada vez que se agrega o quita un chip, `alCambiar` dispara `cargarProductos()`, que arma `ingrediente=leche,cafe` con `ingredientesFiltro.join(',')` — así el backend recibe varios valores y exige (`$all`) que el producto tenga todos.
- `#btnLimpiar` ahora también llama a `campoChipsFiltro.limpiar()` para vaciar los chips, además de los `<input>`/`<select>` normales.
- Al hacer clic en el chip de un ingrediente dentro de una tarjeta (sección e), ya no se **reemplaza** el filtro: se llama a `campoChipsFiltro.agregar(...)`, que **agrega** ese ingrediente a los chips existentes sin borrar los que ya estaban.

---

## 7. Recorrido completo de una operación

**Caso: el usuario crea "Té chai", categoría "Bebidas calientes", precio 40, ingredientes té negro y canela.**

```
NAVEGADOR (app.js)                     SERVIDOR (server.js)                    MONGODB
──────────────────                     ────────────────────                    ───────
1. Clic en "+ Nuevo producto"
   abrirFormulario() → showModal()
2. Llena campos; Enter crea chips
   ingredientesForm = ["té negro","canela"]
3. Clic en Guardar → evento submit
   preventDefault, valida en navegador ✓
4. pedir('/api/productos', {
     method:'POST',
     body: '{"nombre":"Té chai",...}' })
            ──── POST /api/productos ────►
                                        5. express.json() → req.body
                                        6. validarProducto(req.body) ✓
                                           datos limpio y normalizado
                                        7. productos.insertOne(datos)
                                                                   ──────►
                                                                        8. Genera _id,
                                                                           guarda documento
                                                                   ◄──────
                                           r.insertedId
                                        9. res.status(201).json({_id, ...datos})
            ◄──── 201 + JSON ───────────
10. pedir() revisa res.ok ✓
11. modal.close(), toast("Producto registrado")
12. cargarTodo():
    GET /api/productos/categorias ──►   distinct('categoria')  ──────► ◄──────
    GET /api/productos ─────────────►   find({}).sort(...)     ──────► ◄──────
13. pintar(lista) → aparece la tarjeta "Té chai"
```

**Si el precio fuera -5:** en el paso 3 la validación del navegador lo detiene y muestra el mensaje. Si alguien se la salta y manda la petición directo, en el paso 6 el servidor responde **400** con `{ "error": "El precio debe ser un numero mayor a 0." }`, `pedir()` lanza ese mensaje y se ve en la modal, que sigue abierta.

**Si MongoDB está apagado:** en el paso 7 el driver lanza un error, el `catch` lo manda con `next(e)` al manejador de errores, que responde **500**. El navegador muestra "Error en el servidor o en la base de datos."

**Si el servidor Node está apagado:** en el paso 4 `fetch` no obtiene respuesta y `pedir()` lanza "No hay conexión con el servidor. Verifica que esté corriendo (npm start)."

---

## 8. Relación con los requerimientos

| Requerimiento | Cómo se cumple |
|---|---|
| **RF4** Registrar productos con nombre, categoría, precio, descripción, ingredientes y disponibilidad | Formulario "Nuevo producto" → `POST /api/productos` con `validarProducto`. |
| **RF5** Consultar y editar el catálogo, marcar disponible o no disponible | Lista de tarjetas, botón *Editar* → `PATCH`, interruptor → `PATCH { disponibilidad }`. |
| **RF6** Filtrar por categoría, disponibilidad o ingrediente | Barra de filtros → query string → filtro dinámico en `find()`. Extra: búsqueda por nombre. |
| **RNF1** Respuesta en menos de 2 segundos | Índices en `categoria`, `disponibilidad` e `ingredientes`; una sola conexión reutilizada (pool). |
| **RNF3** Agregar campos sin modificar documentos guardados | Esquema flexible de MongoDB + edición con `$set` (no reemplaza el documento). |
| **RNF7** Captura sencilla | Un solo formulario, categorías sugeridas, chips de ingredientes, mensajes claros en español. |
| **RNF9** Funcionar en los equipos del laboratorio | Solo requiere Node y MongoDB; configuración en `.env`; diseño responsivo. |
| **RNF10** Código documentado | Comentarios en el código, README, CLAUDE.md y esta guía. |
| Caso de uso: "si se pierde la conexión, avisa y permite reintentar" | `mostrarAviso` con botón *Reintentar*; la modal no se cierra si falla el guardado. |

**Fuera del alcance acordado:** RF14 y RNF6 (login y roles), RF12 y RF13 (reportes). Por eso **cualquiera que abra la página puede editar el catálogo**.

---

## 9. Cómo ejecutar y probar

### Arrancar

```powershell
cd ...\ACTIVIDADES\CAFETERIA\frontend-productos
npm install            # solo la primera vez
copy .env.example .env # solo la primera vez
npm start
```

Mensajes esperados en la terminal:

```
Conectado a MongoDB -> base "CAFETERIA", coleccion "productos" (5 documentos)
Abre http://localhost:3000
```

Para detener el servidor: `Ctrl + C` en la terminal.

### Probar la API sin el frontend (PowerShell)

```powershell
$B = "http://localhost:3000/api/productos"

# Listar todos
Invoke-RestMethod $B

# Filtros
Invoke-RestMethod "${B}?categoria=Postres"
Invoke-RestMethod "${B}?disponibilidad=false"
Invoke-RestMethod "${B}?ingrediente=leche"
Invoke-RestMethod "${B}?q=latte"

# Categorías
Invoke-RestMethod "$B/categorias"

# Crear
$nuevo = Invoke-RestMethod $B -Method Post -ContentType "application/json" `
  -Body '{"nombre":"Prueba","categoria":"Postres","precio":30,"disponibilidad":true}'
$nuevo._id

# Editar solo el precio
Invoke-RestMethod "$B/$($nuevo._id)" -Method Patch -ContentType "application/json" -Body '{"precio":35}'

# Eliminar
Invoke-RestMethod "$B/$($nuevo._id)" -Method Delete

# Ver un error de validación (responde 400)
Invoke-RestMethod $B -Method Post -ContentType "application/json" -Body '{"nombre":"","precio":-1}'
```

### Ver las peticiones desde el navegador

Presiona `F12` → pestaña **Network (Red)** → filtra por **Fetch/XHR**. Cada acción en la página muestra la petición, su método, el código de estado y el JSON de ida y vuelta. Es la mejor forma de ver cómo se comunican el frontend y la API.

### Comprobar en Compass

Después de crear, editar o eliminar, abre `CAFETERIA` → `productos` y presiona *Refresh*: el cambio se ve directamente en la base.

---

## 10. Errores comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `No se pudo conectar a MongoDB: connect ECONNREFUSED 127.0.0.1:27017` | El servicio de MongoDB está detenido. | En PowerShell como administrador: `Start-Service MongoDB`, o abrir *Servicios* de Windows e iniciar MongoDB. |
| La página carga pero dice "0 producto(s)" | `DB_NAME` mal escrito (mayúsculas) o la colección tiene otro nombre. | Revisar `.env`; el mensaje de arranque dice cuántos documentos encontró. |
| `Error: listen EADDRINUSE :::3000` | Ya hay otro servidor usando el puerto 3000 (quizá otra terminal con `npm start`). | Cerrar la otra terminal o cambiar `PORT` en `.env`. |
| `Cannot find module 'express'` | No se ejecutó `npm install`. | `npm install` dentro de la carpeta del proyecto. |
| Franja roja "No hay conexión con el servidor" | Se detuvo `npm start` o se cerró la terminal. | Volver a ejecutar `npm start` y presionar *Reintentar*. |
| Cambié `app.js` o `styles.css` y no se ve el cambio | Caché del navegador. | `Ctrl + F5`. Los archivos de `public/` no requieren reiniciar el servidor. |
| Cambié `server.js` y no se ve el cambio | El servidor sigue corriendo la versión anterior. | Reiniciar (`Ctrl + C`, `npm start`) o usar `npm run dev`. |

---

## 11. Limitaciones y mejoras posibles

Conviene conocerlas por si la profesora pregunta:

1. **Sin autenticación:** cualquiera con acceso a la página puede editar o borrar productos (RF14 y RNF6 quedaron fuera del alcance).
2. **Eliminación física:** `DELETE` borra el documento. Los pedidos no se afectan porque guardan su copia de nombre y precio, pero la referencia `producto_id` queda apuntando a un documento que ya no existe. Alternativa: **borrado lógico** (un campo `activo: false`).
3. **Nombres duplicados:** nada impide crear dos productos con el mismo nombre. Se resolvería con un índice único: `createIndex({ nombre: 1 }, { unique: true })`.
4. **Sin paginación:** se traen todos los productos en cada consulta. Suficiente para un catálogo pequeño; para miles usaríamos `.skip()` / `.limit()`.
5. ~~`escapar` no escapa comillas dobles~~ **(corregido):** ahora también reemplaza `"` por `&quot;` y `'` por `&#39;`, porque se usa dentro de atributos (`data-ingrediente="..."`, `value="..."`).
6. **Validación sin `$jsonSchema`:** las reglas viven en el servidor Node. MongoDB también permite definir un validador en la propia colección para que la base rechace documentos inválidos aunque se inserten desde Compass.
7. **Búsqueda con regex sin ancla:** `$regex: "leche"` sin `^` no aprovecha del todo el índice. Con pocos datos no importa; para búsquedas grandes se usaría un índice de texto (`$text`).

---

## 12. Preguntas de repaso

Intenta responder antes de abrir la respuesta.

<details>
<summary>1. ¿Por qué el navegador no se conecta directamente a MongoDB?</summary>

Por seguridad (la cadena de conexión quedaría expuesta y cualquiera podría modificar la base), porque el navegador solo habla HTTP y porque las reglas de validación deben aplicarse en un lugar que el usuario no pueda saltarse: el servidor.
</details>

<details>
<summary>2. ¿Qué hace <code>express.json()</code> y qué pasaría sin él?</summary>

Convierte el cuerpo JSON de la petición en un objeto disponible en `req.body`. Sin él, `req.body` sería `undefined` y `validarProducto` marcaría todos los campos como faltantes.
</details>

<details>
<summary>3. ¿Por qué hay que convertir el id con <code>new ObjectId(id)</code> antes de buscar?</summary>

Porque en la base `_id` es de tipo ObjectId, no texto. `{ _id: "650a..." }` compararía un string contra un ObjectId y no encontraría nada.
</details>

<details>
<summary>4. ¿Qué diferencia hay entre editar con <code>$set</code> y reemplazar el documento?</summary>

`$set` cambia solo los campos indicados y conserva el resto. Reemplazar (`replaceOne`) sustituye el documento completo, así que se perderían los campos que no se enviaran, incluidos campos extra agregados después (rompería el RNF3).
</details>

<details>
<summary>5. ¿Por qué la ruta <code>/api/productos/categorias</code> debe declararse antes que <code>/api/productos/:id</code>?</summary>

Express evalúa las rutas en orden. Si `/:id` estuviera primero, tomaría "categorias" como si fuera un id y respondería 400.
</details>

<details>
<summary>6. Si el frontend ya valida el precio, ¿por qué el servidor lo vuelve a validar?</summary>

Porque la validación del navegador se puede saltar mandando la petición directamente (Postman, PowerShell, la consola del navegador). La validación del frontend es por comodidad; la del servidor es la que protege la integridad de los datos.
</details>

<details>
<summary>7. ¿Cómo funciona el filtro por ingrediente si <code>ingredientes</code> es un arreglo?</summary>

MongoDB aplica la condición `$regex` a cada elemento del arreglo; el documento coincide si al menos uno cumple. Con `$options: 'i'` no importan las mayúsculas.
</details>

<details>
<summary>8. ¿Para qué sirve <code>escapeRegex</code>?</summary>

Para que los caracteres especiales de regex que escriba el usuario (`.`, `*`, `(`, etc.) se busquen como texto literal y no cambien el significado de la búsqueda ni generen errores.
</details>

<details>
<summary>9. ¿Qué es XSS y cómo lo evita la app?</summary>

Es inyectar código (HTML o JavaScript) mediante datos que después se muestran en una página. La app pasa todo dato por `escapar()`, que convierte `<`, `>` y `&` en entidades HTML, así el navegador los muestra como texto y no los ejecuta.
</details>

<details>
<summary>10. ¿Por qué <code>pedir()</code> revisa <code>res.ok</code> si ya usa try/catch?</summary>

Porque `fetch` solo falla cuando no hay respuesta. Un 400 o un 404 son respuestas válidas para `fetch`; hay que revisar `res.ok` para detectarlas y lanzar el mensaje de error del servidor.
</details>

<details>
<summary>11. ¿Qué problema resuelve <code>debounce</code>?</summary>

Evita mandar una petición por cada tecla. Espera 300 ms sin que se escriba para hacer una sola búsqueda.
</details>

<details>
<summary>12. ¿Qué es la delegación de eventos y por qué se usa en la lista?</summary>

Poner un solo listener en el contenedor y averiguar con `ev.target.closest(...)` qué elemento se presionó. Se usa porque las tarjetas se regeneran en cada carga; los listeners individuales se perderían y habría que volver a asignarlos.
</details>

<details>
<summary>13. ¿Qué códigos HTTP devuelve la API al crear, al eliminar y cuando el id no existe?</summary>

201 al crear, 204 al eliminar y 404 cuando el id tiene formato válido pero no existe (400 si el formato es inválido).
</details>

<details>
<summary>14. ¿Por qué el servidor se conecta a MongoDB antes de ejecutar <code>app.listen</code>?</summary>

Para no aceptar peticiones sin tener base de datos disponible; si la conexión falla, el programa termina con un mensaje claro en lugar de responder errores.
</details>

<details>
<summary>15. ¿Por qué editar o eliminar un producto no altera los pedidos anteriores?</summary>

Porque cada pedido guarda su propia copia del nombre y del precio unitario (dato histórico embebido, RNF4); no depende del documento actual del producto.
</details>

<details>
<summary>16. ¿Qué hace <code>createIndex</code> si el índice ya existe?</summary>

Nada; es idempotente. Por eso se puede ejecutar cada vez que arranca el servidor.
</details>

---

## 13. Glosario

| Término | Significado |
|---|---|
| **API** | Interfaz que un programa expone para que otros lo usen; aquí, las rutas `/api/productos`. |
| **async / await** | Sintaxis para esperar el resultado de operaciones lentas sin bloquear el programa. |
| **Backend** | Parte que corre en el servidor: lógica, validación y acceso a datos. |
| **BSON** | Formato binario en que MongoDB guarda los documentos; amplía JSON con tipos como ObjectId y Date. |
| **Burbujeo (bubbling)** | Un evento sube desde el elemento donde ocurrió hasta sus contenedores. |
| **Closure** | Función que recuerda variables del lugar donde fue creada. |
| **CRUD** | Create, Read, Update, Delete: las cuatro operaciones básicas sobre datos. |
| **Cursor** | Resultado de `find()` que entrega los documentos por partes; `toArray()` los junta. |
| **Debounce** | Técnica para ejecutar una función solo cuando deja de llamarse por cierto tiempo. |
| **Driver** | Librería que permite a un lenguaje comunicarse con una base de datos. |
| **Endpoint** | Combinación de método y ruta que atiende la API, por ejemplo `PATCH /api/productos/:id`. |
| **Express** | Framework de Node.js para servidores web y APIs. |
| **fetch** | Función del navegador para hacer peticiones HTTP. |
| **Frontend** | Parte que corre en el navegador: la interfaz. |
| **Idempotente** | Que ejecutarlo varias veces produce el mismo resultado que una sola vez. |
| **Índice** | Estructura que acelera búsquedas sobre uno o más campos. |
| **Middleware** | Función por la que pasan las peticiones en Express antes de llegar a las rutas. |
| **Node.js** | Entorno para ejecutar JavaScript fuera del navegador. |
| **npm** | Gestor de paquetes de Node; instala dependencias y ejecuta scripts. |
| **ObjectId** | Identificador único de 12 bytes (24 caracteres hex) que genera MongoDB. |
| **Pool de conexiones** | Conjunto de conexiones abiertas que el driver reutiliza entre peticiones. |
| **Query string** | Parámetros de la URL después de `?`. |
| **REST** | Estilo de diseño de APIs basado en recursos y métodos HTTP. |
| **Regex** | Expresión regular: patrón para buscar texto. |
| **Spread (`...`)** | Operador que expande los elementos de un arreglo o las propiedades de un objeto. |
| **Template literal** | Texto entre comillas invertidas que permite `${expresiones}` y varias líneas. |
| **XSS** | Ataque que inyecta código en una página mediante datos que se muestran sin escapar. |
