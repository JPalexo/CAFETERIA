# Requerimientos y reglas de negocio — Café Central

> Confirmados con Alejandro el 2026-10-26 (ronda de recolección en Cowork).
> RF = requerimiento funcional · RN = regla de negocio · RNF = no funcional.
> Los RF4–RF6 (catálogo de productos) ya estaban implementados; aquí se listan los nuevos.

## 1. Roles
| Rol | Quién es | Acceso |
|---|---|---|
| `admin` | Administrador del negocio | Todo: panel de administración **y** vista de atención. |
| `atencion` | Meseros / cajeros | Solo la vista de atención (tomar y gestionar pedidos). |

- RN1. Solo existen esos dos roles.
- RN2. No hay registro libre: las cuentas del personal las crea el administrador.
- RN3. El primer administrador se crea con un script (`npm run crear-admin`), con la contraseña que el alumno pone en su `.env`.

## 2. Inicio de sesión y Rate Limiting (práctica)
- RF-L1. Pantalla de login (usuario + contraseña). Al entrar, redirige según el rol: `admin` → panel de administración, `atencion` → vista de atención.
- RF-L2. `POST /api/auth/login` acepta **máximo 5 intentos fallidos por minuto por IP**.
- RN4. Cuenta como intento **solo un intento fallido** (credenciales incorrectas o datos incompletos). Un login correcto no gasta intento y reinicia el contador de esa IP.
- RN5. La ventana de 1 minuto empieza con el **primer intento fallido**; al pasar el minuto el contador se reinicia solo (TTL).
- RF-L3. Si la IP ya tiene 5 intentos fallidos, la petición se rechaza **de inmediato** (sin consultar la BD) con **HTTP 429** y un JSON descriptivo que incluye los segundos que faltan.
- RN6. El mensaje de error del login es el mismo si el usuario no existe, si está desactivado o si la contraseña es incorrecta.
- RF-L4. Botón "Cerrar sesión" en todas las vistas.
- RN7. Un usuario desactivado no puede entrar, y si tenía sesión abierta se cierra.

## 3. Duración de la sesión y alerta de cierre
- RN8. La sesión dura **8 horas** (un turno).
- RF-S1. **30 segundos antes** de que termine la sesión aparece una **alerta** (modal) que dura 30 s con una cuenta regresiva visible.
- RF-S2. La alerta tiene:
  - Un selector de tiempo extra con botones **−** y **+** y el contador en medio. Empieza en **5 min**, cambia de **5 en 5** hasta **60 min** (o hasta lo que quede disponible).
  - Botón **"Extender sesión"** y botón **"Cerrar sesión"**.
- RN9. El tiempo extra máximo es **1 hora en total** por sesión (la suma de todas las extensiones, incluida la automática).
- RN10. Cada vez que se acaba el tiempo (el original o una extensión), vuelve a salir la alerta mientras quede tiempo extra disponible.
- RN11. Si nadie responde la alerta en sus 30 s, la sesión se **extiende 5 minutos automáticamente una sola vez**, y se muestra un **aviso centrado con el fondo difuminado**: "Tu sesión se extendió 5 minutos. En el siguiente aviso, si no respondes, la sesión se cerrará."
- RN12. Después de usar la extensión automática, si la siguiente alerta tampoco se responde, la sesión **se cierra**.
- RN13. Si ya no queda tiempo extra (60 min usados), la alerta solo avisa que la sesión se cerrará y muestra el botón "Cerrar sesión".
- RF-S3. **Modo prueba** (variable `SESION_MODO_PRUEBA=true` en `.env`) — solo para demostrarle la alerta a la profesora; se quitará después (cambio pedido el 2026-10-29):
  - La alerta sale **una sola vez por sesión**, 10 segundos después de iniciar sesión (si se cambia de vista o se recarga antes de verla, sale 10 s después de cargar).
  - Es un **cascarón**: "Extender sesión" y "Cerrar sesión" **solo cierran la alerta**; no cambian ni cierran la sesión. Los botones − / + sí se mueven para mostrarlos.
  - Si nadie responde en 30 s, se muestra el aviso centrado con fondo difuminado de la extensión automática; "Entendido" lo cierra y no pasa nada más.
  - No afecta el resto de la app (el botón "Cerrar sesión" del encabezado sigue funcionando normal).
  - Con `SESION_MODO_PRUEBA=false` funciona el comportamiento real de 8 h.

## 4. Vista de Atención
- RF-A1. **Crear pedido**: elegir productos **disponibles** (RF9) y cantidades; subtotal y total se calculan solos.
- RF-A2. Cliente del pedido: **cliente registrado** (se busca por nombre o correo) o **Público en general**.
- RN14. Cliente registrado = **5 % de descuento** sobre el total, aplicado **al crear** el pedido. El pedido guarda subtotal, descuento y total.
- RN15. Público en general = sin descuento.
- RF-A3. **Ver pedidos del día** (fecha local de México) con filtro por estado.
- RF-A4. **Cambiar estado**: Recibido → En preparacion → Listo → Entregado (solo hacia adelante, un paso a la vez).
- RF-A5. **Cancelar**: el rol `atencion` solo puede cancelar pedidos en **Recibido**.
- RN16. El administrador puede cancelar pedidos en Recibido, En preparacion o Listo (nunca uno Entregado).
- RN17. Cada pedido guarda quién lo atendió (usuario que lo creó).

## 5. Recibos
- RF-R1. El recibo se genera **al crear el pedido** y se muestra listo para imprimir o guardar como PDF desde el navegador. Se puede volver a abrir desde la lista de pedidos.
- RF-R2. **Recibo de público en general** (simple): logo/nombre del café, folio (`numero_pedido`), fecha y hora, productos (cantidad, precio, subtotal) y total.
- RF-R3. **Recibo de cliente registrado** (personalizado, diseño distinto y más llamativo):
  - Saludo con su nombre ("¡Gracias por tu visita, Ana!").
  - Línea de ahorro: "Ahorraste $X con tu 5 % de cliente registrado".
  - "Te atendió: <nombre del usuario>".
  - Colores / encabezado especial que lo distingan del recibo común.
- RN18. No se registra el método de pago ni el cambio; el recibo solo muestra el total.

## 6. Panel de Administración
- RF-D1. **Catálogo de productos**: el CRUD actual (crear, editar, eliminar, disponibilidad, filtros), ahora solo para `admin`.
- RF-D2. **Usuarios del personal**: alta, editar nombre, cambiar rol, desactivar/reactivar y restablecer contraseña.
- RN19. Un admin no puede desactivarse ni quitarse el rol a sí mismo, y siempre debe quedar al menos un admin activo.
- RN20. Contraseña mínima de 8 caracteres.
- RF-D3. **Clientes**: alta y edición (estructura actual de `clientes`; `correo` único).
- RN21. Un cliente con pedidos no se puede eliminar (se conserva el historial).
- RF-D4. **Todos los pedidos**: historial completo con filtros por fecha y estado, y acceso a su recibo.

## 7. No funcionales
- RNF-1. Las rutas de la API se protegen en el **servidor** (sesión y rol), no solo ocultando botones.
- RNF-2. Contraseñas guardadas con hash (bcrypt).
- RNF-3. Sesiones y contadores de intentos en caché en memoria (`node-cache`), como caso de uso de BD clave-valor.
- RNF-4. Interfaz en español, responsiva, sin frameworks.
