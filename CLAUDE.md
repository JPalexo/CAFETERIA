# Café Central — punto de entrada para Claude

Sistema escolar de una cafetería (EE Bases de Datos No Convencionales, UV). Node.js + Express + MongoDB (base `CAFETERIA`).
Equipo: Alejandro Bermúdez Báez y José Luis Estrada Torres.

## Antes de trabajar
1. Lee `_CLAUDE/ESTADO.md` (qué sigue).
2. Si te pidieron una tarea ("haz la TAREA_0X"), abre `_CLAUDE/tareas/TAREA_0X_*.md` y síguela al pie de la letra.
3. Abre los demás archivos de `_CLAUDE/` solo si la tarea lo pide o los necesitas:

| Archivo | Para qué |
|---|---|
| `_CLAUDE/MEMORY.md` | Equipo, preferencias, forma de trabajo Cowork → Code. |
| `_CLAUDE/REQUERIMIENTOS.md` | Requerimientos y reglas de negocio confirmadas (RF / RN). |
| `_CLAUDE/DECISIONES.md` | Decisiones técnicas y mejoras, con su porqué. |
| `_CLAUDE/ARQUITECTURA.md` | Estructura de carpetas, capas, convenciones de código y de la API. |
| `_CLAUDE/BITACORA.md` | Historial: una línea por tarea terminada. |

## Reglas
- Español en UI, mensajes, comentarios y documentación. Datos en la BD **sin acentos** (la ñ sí se conserva).
- No cambiar la estructura de los documentos ya existentes en `clientes`, `productos` y `pedidos`; los campos nuevos solo se agregan en documentos nuevos (ver `DECISIONES.md`).
- Editar con `$set` (no `replaceOne`).
- **Nunca** escribir, leer ni mostrar contraseñas reales ni el contenido de `.env`. Solo `.env.example` con valores de ejemplo.
- Windows + PowerShell. Probar con el servidor corriendo antes de dar algo por terminado.
- No agregar frameworks (nada de React, Nest, etc.). Dependencias nuevas solo si la tarea las nombra.

## Al terminar una tarea
1. Crear `_CLAUDE/informes/INFORME_0X.md` con la plantilla `_CLAUDE/informes/_PLANTILLA_INFORME.md`.
2. Actualizar `_CLAUDE/ESTADO.md` y agregar 1 línea a `_CLAUDE/BITACORA.md`.
3. Si hiciste un cambio que no estaba en la tarea, anótalo en el informe (sección "Desviaciones").
4. **No hagas `git commit` ni `git push`** (aunque la tarea lo diga). Deja los cambios sin confirmar; Cowork revisa el informe y le pasa a Alejandro los comandos de git ya armados.
