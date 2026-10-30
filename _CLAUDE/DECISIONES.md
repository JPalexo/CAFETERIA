# Decisiones técnicas y mejoras

> Lo técnico lo decide Claude (Cowork) y se anota aquí con su porqué. Lo de negocio está en `REQUERIMIENTOS.md`.
> Formato: D## · decisión · por qué. Las mejoras que propuso Claude a la idea original van marcadas con ⭐.

## Organización del proyecto
| # | Decisión | Por qué |
|---|---|---|
| D01 | La raíz del repo es `ACTIVIDADES/CAFETERIA/`. El código pasa de `frontend-productos/` a `app/`; los JSON de importación a `datos/`; diagramas y guía a `docs/`. | Ya no es solo "frontend de productos": es la app completa. Separar código, datos y documentación hace el repo más limpio. |
| D02 | `_CLAUDE/` guarda la memoria del proyecto (estado, bitácora, requerimientos, decisiones, tareas e informes) y un `CLAUDE.md` corto en la raíz apunta a ella. | Claude Code carga automático el `CLAUDE.md` de la raíz; lo demás se abre solo cuando hace falta. Al clonar el repo en otra PC se recupera todo el contexto. |
| D03 | Arquitectura por capas sencilla: `routes → controllers → (db / cache)` + `middlewares` + `validators` (ver `ARQUITECTURA.md`). | Es el estándar más común en Express y fácil de explicar en clase. Hoy todo vive en un `server.js` de 170 líneas que crecería demasiado. |
| D04 | Frontend sin frameworks, una carpeta por vista: `public/` (login), `public/admin/`, `public/atencion/`, y `public/js/comun/` para lo compartido. | Vistas separadas por rol como pidió el alumno, sin repetir código (sesión, alerta, fetch). |

## Login y seguridad
| # | Decisión | Por qué |
|---|---|---|
| D05 | Nueva colección `usuarios`: `usuario` (único, minúsculas), `nombre`, `rol` (`admin`/`atencion`), `password_hash`, `activo`, `fecha_registro`. | No se mezcla al personal con `clientes` y no se toca la estructura de las colecciones existentes. |
| D06 | Contraseñas con **bcryptjs** (10 rondas). | Nunca se guardan en texto plano. `bcryptjs` no necesita compilar nada en Windows. |
| D07 ⭐ | **Sesiones en `node-cache`**: clave = token aleatorio (`crypto.randomBytes(32)`), valor = `{ usuarioId, nombre, rol, inicio, expira, extraUsadoMin, autoExtensionUsada }`. | Es otro caso de uso clave-valor del PDF (gestión de sesiones), así la práctica muestra dos usos de la caché. Limitación: si se reinicia el servidor hay que volver a entrar (aceptable en un proyecto escolar). |
| D08 | El token viaja en el encabezado `Authorization: Bearer <token>` y el frontend lo guarda en `sessionStorage`. | Fácil de probar en Bruno y de explicar. `sessionStorage` se borra al cerrar la pestaña. |
| D09 | Middlewares `requiereSesion` y `requiereRol(...roles)` protegen la API. Las páginas también revisan el rol, pero la seguridad real está en el servidor. | Si solo se ocultan botones, cualquiera podría llamar la API desde Bruno/Postman. |
| D10 | Mismo mensaje de error en el login para usuario inexistente, desactivado o contraseña incorrecta (401). | No dar pistas a un atacante de qué usuarios existen. |
| D11 | Primer admin con `scripts/crear-admin.js`, que lee `ADMIN_USUARIO`, `ADMIN_NOMBRE` y `ADMIN_PASSWORD` del `.env`. | Claude nunca escribe ni ve contraseñas reales; el alumno las pone en su `.env`. |

## Rate Limiting (práctica)
| # | Decisión | Por qué |
|---|---|---|
| D12 | Middleware propio `middlewares/rateLimiter.js` con `node-cache`, aplicado **solo** a `POST /api/auth/login`. Clave: `login_fallidos_<ip>`. | Es lo que pide la práctica; aplicarlo a todo afectaría el uso normal. |
| D13 ⭐ | **Corrección al código del PDF:** allá cada `set()` reinicia el TTL a 60 s, así que mientras sigan llegando intentos el bloqueo nunca se levanta (no es "5 por minuto"). Aquí la ventana se fija en el primer fallo y los siguientes `set()` conservan el TTL restante. | Cumplir de verdad "5 intentos por minuto". Se explica en el reporte como hallazgo. |
| D14 ⭐ | Se cuentan **solo intentos fallidos** (RN4): el middleware revisa el límite antes de la BD y el controlador suma el fallo (`registrarFallo`) o limpia el contador (`limpiar`) si entra bien. | Un mesero que entra bien no se bloquea. Igual detiene la fuerza bruta. |
| D15 ⭐ | La respuesta 429 lleva el encabezado estándar `Retry-After` y en el JSON `error`, `intentosPermitidos` y `retryAfterSeconds`. | Buena práctica HTTP; el login muestra "Espera N segundos" con cuenta regresiva. |
| D16 | IP con `req.ip`. No se activa `trust proxy`. | En local no hay proxy; activarlo sin uno permitiría falsificar la IP con `X-Forwarded-For`. |
| D17 | Límite y ventana configurables en `.env` (`LOGIN_MAX_INTENTOS=5`, `LOGIN_VENTANA_SEG=60`). | Cambiarlos sin tocar código. |
| D18 | Nota para el reporte: en varios servidores (clúster) `node-cache` no sirve porque cada instancia tiene su propia memoria; se usaría **Redis** (`INCR` + `EXPIRE`). | Lo pide la nota técnica del PDF. |

| D29 ⭐ | **Contar el intento antes de verificar** (`reservar(ip)` en el middleware) y limpiar si el login es correcto. Se detectó en la revisión de la T02: con peticiones simultáneas todas pasaban la consulta antes de que se registrara el primer fallo. | Node ejecuta el `get`+`set` de node-cache de forma síncrona, así que reservar en el middleware hace el conteo exacto aunque lleguen 100 peticiones a la vez. |

## Sesión y alerta
| # | Decisión | Por qué |
|---|---|---|
| D19 | El servidor es quien manda en el tiempo: `GET /api/auth/sesion` devuelve `expira`, `extraDisponibleMin`, `autoExtensionUsada` y `modoPrueba`; `POST /api/auth/extender { minutos, automatica }` valida múltiplos de 5 y el tope de 60 min. | Si el frontend decidiera solo, se podría alargar la sesión sin límite desde la consola del navegador. |
| D20 | La alerta se programa para `expira − 30 s` (o a los 10 s del login en modo prueba) en `public/js/comun/sesion.js`, compartido por admin y atención. | Una sola implementación para las dos vistas. |
| D21 | En modo prueba el servidor responde a `/extender` sin cambiar `expira` (devuelve `simulado: true`). | Cumple RF-S3: se ve el flujo completo sin alterar el tiempo real. |

| ~~D30~~ | En modo prueba el **cliente simula** el ciclo completo (alerta cada 10 s, contadores de extensión en memoria) porque el servidor no cambia el tiempo real (D21). Cerrar sesión sí es real. | Poder ver en 1 minuto todo el flujo (extender, aviso automático, cierre, tope de 60 min) sin esperar 8 horas.  **Reemplazada por D34.** |
| D31 | (T03, aceptada) En modo real la alerta abre **2 s antes** de `alertaEn` (sigue durando 30 s). | Que la extensión automática llegue al servidor antes de que venza la sesión; si no, daría 401. |
| D32 | (T03, aceptada) El bloqueo del login se recuerda en `sessionStorage` para que la cuenta regresiva siga si se recarga la página. | Solo es para mostrarlo bien; quien bloquea de verdad es el servidor. |
| D33 | (T03) En `/api/auth/login`, `express.json()` va **después** del rate limiter, y `errores.js` convierte el JSON mal formado en 400. | Así un JSON roto también cuenta como intento y no cae en 500. |
| D34 | (2026-10-29, pedido de Alejandro) **Modo prueba = cascarón:** la alerta sale una vez por sesión (marca en `sessionStorage` con el token), sus botones solo la cierran y, sin respuesta, muestra el aviso difuminado. No llama a `/api/auth/extender`. Cambio hecho por Cowork en `public/js/comun/sesion.js`. | Con D30 la alerta se repetía cada 10 s tras "Extender" y "Cerrar sesión" cerraba de verdad; solo se necesita para mostrarla en clase y no debe estorbar al usar la app. |

## Pedidos y recibos
| # | Decisión | Por qué |
|---|---|---|
| D22 | Los pedidos **nuevos** agregan campos: `cliente_id` (ObjectId o `null` para público en general), `cliente_nombre` (copia), `subtotal`, `descuento_pct`, `descuento`, `total`, `atendido_por { usuario_id, nombre }`, `historial_estados [{ estado, fecha, usuario }]`. Los 5 pedidos existentes no se modifican. | Esquema flexible de MongoDB (RNF3). La copia del nombre sigue la idea del dato histórico (RNF4). |
| D23 ⭐ | `historial_estados` registra cada cambio de estado con fecha y usuario. | Resuelve el pendiente del RF10 (historial de fechas de cambio de estado) que estaba sin confirmar. |
| D24 | El servidor recalcula precios y totales con los datos de la BD; ignora precios que mande el frontend. | Nadie puede mandar un pedido con precios alterados. |
| D25 | `numero_pedido` = mayor existente + 1 (con índice único). | Folio consecutivo y legible para el recibo. |
| D26 | Recibo = página `recibo.html?id=...` con dos diseños (común / cliente registrado) y estilos `@media print`. | Imprimir o "Guardar como PDF" desde el navegador, sin librerías extra. |
| D27 | "Pedidos del día" usa la zona horaria `America/Mexico_City`. | Evita que los pedidos de la noche salgan en el día siguiente por la hora UTC. |

## Pruebas
| # | Decisión | Por qué |
|---|---|---|
| D35 | (T04) `npm run crear-admin -- --restablecer` cambia solo la contraseña del admin (`$set`). Credenciales de prueba en `CREDENCIALES_PRUEBA.local.md`, ignorado por git (pedido de Alejandro). | Sin API de usuarios aún (T05) no había forma de cambiar la contraseña del admin. |
| D28 | Colección de **Bruno** en `app/pruebas/bruno/` (login correcto, 5 fallidos, 6.º → 429, reinicio tras 60 s, rutas protegidas). | Bruno guarda las peticiones como archivos: quedan en el repo para el compañero. |
