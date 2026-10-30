# Estado actual

_Última actualización: 2026-10-29 (Cowork)_

## Siguiente paso
➡️ **Práctica Rate Limiting entregable listo** (`ACTIVIDADES/PRACTICA_RATE_LIMITING_Alejandro_Bermudez.pdf`). Siguiente del proyecto: **T05 — Admin: usuarios y clientes** (Cowork debe escribir la tarea cuando Alejandro lo pida).

## Plan por etapas
| Tarea | Contenido | Quién | Estado |
|---|---|---|---|
| T01 | Reestructura a `app/ datos/ docs/`, separar `server.js` en capas, `git init` | Code | ✅ 2026-10-29 |
| T02 | Backend de autenticación: `usuarios`, bcrypt, `crear-admin`, sesiones en node-cache, **rate limiter 5/min → 429**, proteger API | Code | ✅ 2026-10-29 (28/28 pruebas) |
| T03 | Frontend: login, redirección por rol, alerta de sesión, panel admin + arreglo D29 | Code | ✅ código 2026-10-29 (31/31 automáticas); pruebas de navegador pasan a T04 |
| T04 | Pruebas en navegador + Bruno (13/13) + capturas + PDF de la práctica | Cowork + Alejandro | ✅ 2026-10-29 |
| T05 | Admin: usuarios del personal y clientes | Code | pendiente |
| T06 | Atención: nuevo pedido (descuento 5 %), pedidos del día, estados y cancelación | Code | pendiente |
| T07 | Recibos (común y personalizado) + historial de pedidos para admin | Code | pendiente |

## Pendientes / dudas
- **Push a GitHub:** `origin` = `JPalexo/CAFETERIA`; el contenido anterior quedó en la rama `respaldo-repo-anterior`. Alejandro hace `git push` al terminar cada tarea (Claude no tiene permiso de escritura).
- Usuarios de prueba: `admin` y `mesero1` (contraseñas en `CREDENCIALES_PRUEBA.local.md`, ignorado por git).
- Servidor de pruebas en el puerto 3100; el del 3000 tiene código viejo.
- Avisos del INFORME_01: `npm audit` reporta vulnerabilidades (sin atender); `datos/productos.json` tiene 5 productos y la BD 6 (normal, uno se agregó desde la app).
