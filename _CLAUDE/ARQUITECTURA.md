# Arquitectura — Café Central

## Estructura objetivo
```
CAFETERIA/                      ← raíz del repo
├── CLAUDE.md                   ← punto de entrada para Claude Code
├── README.md                   ← cómo instalar y correr (para el equipo)
├── .gitignore
├── _CLAUDE/                    ← memoria del proyecto (estado, tareas, informes…)
├── datos/                      ← clientes.json, productos.json, pedidos.json (importación)
├── docs/                       ← diagramas (.drawio, .png) y GUIA_DE_ESTUDIO.md
└── app/
    ├── package.json
    ├── .env.example
    ├── server.js               ← solo arranca: conecta BD y hace listen
    ├── src/
    │   ├── app.js              ← crea Express, middlewares globales, monta rutas
    │   ├── config/
    │   │   ├── env.js          ← lee y valida variables de .env
    │   │   └── db.js           ← conexión MongoDB, colecciones e índices
    │   ├── cache/
    │   │   ├── intentosLogin.js← node-cache del rate limit
    │   │   └── sesiones.js     ← node-cache de sesiones
    │   ├── middlewares/
    │   │   ├── rateLimiter.js
    │   │   ├── autenticacion.js← requiereSesion, requiereRol
    │   │   └── errores.js      ← 404 de API y manejador de errores
    │   ├── routes/             ← *.routes.js: solo URL → controlador + middlewares
    │   ├── controllers/        ← *.controller.js: lógica de cada endpoint
    │   ├── validators/         ← validarProducto, validarUsuario, validarPedido…
    │   └── utils/              ← texto.js (quitarAcentos), ids.js, fechas.js
    ├── public/
    │   ├── index.html          ← login
    │   ├── admin/              ← index.html (panel), productos, usuarios, clientes, pedidos
    │   ├── atencion/           ← index.html (pedidos del día / nuevo pedido)
    │   ├── recibo.html
    │   ├── css/                ← base.css (variables, componentes) + uno por vista
    │   └── js/
    │       ├── comun/          ← api.js (fetch con token), sesion.js (alerta), ui.js
    │       ├── admin/
    │       └── atencion/
    ├── scripts/                ← crear-admin.js, respaldo.js, quitar-acentos.js…
    └── pruebas/bruno/          ← colección de Bruno
```

## Convenciones
- **CommonJS** (`require`), igual que el código actual.
- Nombres en español, `camelCase` en JS, archivos `nombre.tipo.js` en routes/controllers (`productos.routes.js`).
- Controladores `async (req, res, next)` con `try/catch → next(e)`.
- Respuestas de error siempre `{ "error": "mensaje" }` con su código HTTP (400, 401, 403, 404, 409, 429, 500).
- Cada archivo empieza con un comentario corto de para qué sirve.

## API (prefijo `/api`)
| Recurso | Rutas | Acceso |
|---|---|---|
| auth | `POST /auth/login` (rate limit), `POST /auth/logout`, `GET /auth/sesion`, `POST /auth/extender` | público / con sesión |
| productos | `GET /productos`, `GET /productos/categorias`, `GET /productos/:id` | sesión (cualquier rol) |
| productos | `POST`, `PATCH /:id`, `DELETE /:id` | admin |
| usuarios | `GET`, `POST`, `PATCH /:id`, `POST /:id/password` | admin |
| clientes | `GET` (con `?q=`) | sesión |
| clientes | `POST`, `PATCH /:id`, `DELETE /:id` | admin |
| pedidos | `GET /hoy`, `POST`, `GET /:id`, `PATCH /:id/estado`, `PATCH /:id/cancelar` | sesión (reglas por rol) |
| pedidos | `GET` (historial con filtros) | admin |

## Variables de `.env`
`MONGODB_URI`, `DB_NAME`, `PORT`, `LOGIN_MAX_INTENTOS`, `LOGIN_VENTANA_SEG`, `SESION_HORAS`, `SESION_MODO_PRUEBA`, `ADMIN_USUARIO`, `ADMIN_NOMBRE`, `ADMIN_PASSWORD`.
