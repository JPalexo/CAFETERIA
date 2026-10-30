# INFORME_04 — Pruebas en navegador + Bruno y entregable de la práctica

**Fecha:** 2026-10-29 · **Hecho por:** Cowork · **Resultado:** ✅ completa

## Qué se hizo
- Pruebas manuales pendientes del INFORME_03 en el navegador integrado (servidor en puerto 3100, `SESION_MODO_PRUEBA=true`).
- Colección de Bruno en `app/pruebas/bruno/` (3 carpetas, 13 peticiones con tests automáticos). Contraseña como variable **secreta** (no se guarda en los archivos; verificado con grep).
- `crear-admin` acepta `--restablecer` (solo cambia la contraseña con `$set`) — `scripts/usuarios-comun.js`, `scripts/crear-admin.js`.
- Credenciales de prueba en `CREDENCIALES_PRUEBA.local.md` (raíz), ignorado por git (`*.local.md` en `.gitignore`).
- 15 capturas en `docs/evidencias/T04/`.
- Entregable: `ACTIVIDADES/PRACTICA_RATE_LIMITING_Alejandro_Bermudez.pdf` (8 págs., portada UV con los dos alumnos) + `PRACTICA_RATE_LIMITING_fuente.html`.

## Pruebas realizadas
| Prueba | Resultado |
|---|---|
| Sin sesión `/admin/` y `/atencion/` → `/` | ✅ |
| 5 fallidos → "Te quedan N"; 5.º avisa bloqueo; 6.º → 429 con cuenta regresiva y formulario deshabilitado | ✅ (5×401 + 1×429 en la red) |
| Recargar durante el bloqueo mantiene la cuenta; al terminar "Ya puedes intentar de nuevo" | ✅ |
| `mesero1` → `/atencion/`; `/admin/` → regresa con toast "sin permiso" | ✅ |
| Admin → `/admin/` (catálogo y filtro por ingrediente OK) y puede abrir `/atencion/` | ✅ |
| Alerta modo prueba (D34): sale una vez a los 10 s, −/+ de 5 en 5, sin respuesta → aviso difuminado, no se repite, no llama a `/extender` | ✅ |
| Cerrar sesión → "Cerraste sesión"; "atrás" → login | ✅ |
| Ancho 375 px sin scroll horizontal; consola sin errores de JS (solo los 401/429 esperados) | ✅ |
| Bruno `1 Sesion y permisos` | ✅ 5/5 |
| Bruno `2 Rate limit` (401×5 con 4..0 restantes, 429 + Retry-After + JSON, 429 con contraseña correcta) | ✅ 7/7 |
| Bruno `3 Despues de 60 s` (401 y restantes 4) | ✅ 1/1 |

## Desviaciones
- No se probó crear/editar/eliminar productos en el navegador como admin (ya lo cubre `probar-auth.js` y el catálogo no cambió en la T03).

## Pendientes
- Commit/push (comandos entregados por Cowork).
- Compartir el PDF/repo con José Luis.
