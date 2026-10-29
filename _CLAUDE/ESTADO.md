# Estado actual

_Última actualización: 2026-10-29 (Cowork)_

## Siguiente paso
➡️ **T04 — Pruebas en navegador + Bruno y evidencias** (Cowork, en la PC de Alejandro; **preguntar antes de empezar**). Servidor de pruebas en el puerto **3100** por ahora.

## Plan por etapas
| Tarea | Contenido | Quién | Estado |
|---|---|---|---|
| T01 | Reestructura a `app/ datos/ docs/`, separar `server.js` en capas, `git init` | Code | ✅ 2026-10-29 |
| T02 | Backend de autenticación: `usuarios`, bcrypt, `crear-admin`, sesiones en node-cache, **rate limiter 5/min → 429**, proteger API | Code | ✅ 2026-10-29 (28/28 pruebas) |
| T03 | Frontend: login, redirección por rol, alerta de sesión, panel admin + arreglo D29 | Code | ✅ código 2026-10-29 (31/31 automáticas); pruebas de navegador pasan a T04 |
| T04 | Pruebas en navegador (lista del INFORME_03) + Bruno + capturas + entregable (formato por confirmar) | Cowork + Alejandro | ⏳ siguiente — **entrega de la práctica** |
| T05 | Admin: usuarios del personal y clientes | Code | pendiente |
| T06 | Atención: nuevo pedido (descuento 5 %), pedidos del día, estados y cancelación | Code | pendiente |
| T07 | Recibos (común y personalizado) + historial de pedidos para admin | Code | pendiente |

## Pendientes / dudas
- **Formato de entrega por confirmar:** Alejandro no sabe aún si se pide PDF. Preguntar antes de armar el entregable.
- **Matrícula de José Luis Estrada Torres:** pedírsela a Alejandro justo antes de redactar el documento.
- **Push a GitHub:** `origin` = `JPalexo/CAFETERIA`; el contenido anterior quedó en la rama `respaldo-repo-anterior`. Alejandro hace `git push` al terminar cada tarea (Claude no tiene permiso de escritura).
- Alejandro debe agregar a `app/.env` las variables del INFORME_02 y correr `npm run crear-admin`.
- Avisos del INFORME_01: `npm audit` reporta vulnerabilidades (sin atender); `datos/productos.json` tiene 5 productos y la BD 6 (normal, uno se agregó desde la app).
