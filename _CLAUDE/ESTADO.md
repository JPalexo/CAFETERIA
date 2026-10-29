# Estado actual

_Última actualización: 2026-10-29 (Code)_

## Siguiente paso
➡️ **TAREA_02 — Backend de autenticación y Rate Limiting** (`tareas/TAREA_02_auth_rate_limit.md`).

## Plan por etapas
| Tarea | Contenido | Quién | Estado |
|---|---|---|---|
| T01 | Reestructura a `app/ datos/ docs/`, separar `server.js` en capas, `git init` | Code | ✅ 2026-10-29 |
| T02 | Backend de autenticación: `usuarios`, bcrypt, `crear-admin`, sesiones en node-cache, **rate limiter 5/min → 429**, proteger API | Code | ⏳ siguiente |
| T03 | Frontend: login, redirección por rol, alerta de sesión (modo prueba), panel admin con el catálogo actual | Code | pendiente |
| T04 | Pruebas en Bruno + capturas + entregable de la práctica (formato por confirmar) | Cowork + Alejandro | pendiente — **entrega de la práctica** |
| T05 | Admin: usuarios del personal y clientes | Code | pendiente |
| T06 | Atención: nuevo pedido (descuento 5 %), pedidos del día, estados y cancelación | Code | pendiente |
| T07 | Recibos (común y personalizado) + historial de pedidos para admin | Code | pendiente |

## Pendientes / dudas
- **Formato de entrega por confirmar:** Alejandro no sabe aún si se pide PDF. Preguntar antes de armar el entregable.
- **Matrícula de José Luis Estrada Torres:** pedírsela a Alejandro justo antes de redactar el documento.
- **Push a GitHub:** remoto `origin` = `JPalexo/CAFETERIA` ya configurado. Lo que había antes en GitHub está en la rama local `respaldo-repo-anterior`. El push lo hace Alejandro (Claude no tiene permiso de escritura en el repo).
- Avisos del INFORME_01: `npm audit` reporta vulnerabilidades (sin atender); `datos/productos.json` tiene 5 productos y la BD 6 (normal, uno se agregó desde la app).
