# Memoria del proyecto

## Equipo
- Alejandro Bermúdez Báez — S24028195 (dueño del repo, GitHub: JPalexo)
- José Luis Estrada Torres — S23004707
- Docente: María Dolores González Martínez — EE Bases de Datos No Convencionales, 7.º semestre, Ing. de Software, UV (Facultad de Negocios y Tecnologías, Ixtaczoquitlán).

## Forma de trabajo (Cowork orquesta, Code ejecuta)
1. **Cowork** (chat de Claude) recolecta requerimientos, toma decisiones de diseño y escribe las tareas en `_CLAUDE/tareas/TAREA_0X_<nombre>.md`.
2. Alejandro abre Claude Code en VS Code (en la carpeta `CAFETERIA/`) y le dice: **"haz la TAREA_0X"**.
3. **Code** implementa, prueba y deja `_CLAUDE/informes/INFORME_0X.md` + actualiza `ESTADO.md` y `BITACORA.md`.
4. Cowork lee el informe, revisa y escribe la siguiente tarea. Así no se pierde contexto entre chats ni entre equipos.
5. **Git:** Code no hace commits. Cowork, al revisar cada informe, le entrega a Alejandro los comandos completos (`git add` por archivos/carpetas + `git commit` con mensaje descriptivo estilo Conventional Commits en español + `git push`) para que él los revise y los corra en PowerShell.
- Las dudas que surjan en Code se anotan en el informe (sección "Dudas para Cowork"); Code no decide reglas de negocio por su cuenta.

## Preferencias
- Español, breve y directo.
- Redacción de entregables (PDF, README, informes para la escuela): tono de **estudiante / desarrollador junior**, claro y sencillo, sin sonar a texto corporativo ni exagerado.
- Preguntar antes de decidir algo ambiguo de negocio. Lo técnico lo decide Claude y lo anota en `DECISIONES.md`.
- Pruebas de API con **Bruno** (instalado en la PC de Alejandro). Avisar antes de hacer pruebas en su PC.

## Datos de ejemplo
- Ciudades: Orizaba, Córdoba, Fortín, Xalapa.
- Las 3 colecciones se importaron desde `datos/clientes.json`, `datos/productos.json` y `datos/pedidos.json` (todo el grupo las tiene).
- **productos**: `_id`, `nombre`, `categoria`, `precio` number, `descripcion`, `ingredientes` [string], `disponibilidad` boolean.
- **clientes**: `_id`, `nombre`, `apellido`, `correo` (único), `telefono`, `direccion` {calle, num_ext, colonia, ciudad, codigo_postal}, `fecha_registro` Date.
- **pedidos**: `_id`, `numero_pedido` int, `cliente_id` ObjectId (ref), `fecha` Date, `productos` [{producto_id, nombre, cantidad, precio_unitario, subtotal}], `total`, `estado`.
- Sin acentos: la API normaliza con `quitarAcentos` (`app/src/utils/texto.js`) lo que guarda y lo que filtra (`q`, `categoria`, `ingrediente`). La migración ya se aplicó con `scripts/quitar-acentos.js` (tras `scripts/respaldo.js`).
- RF9 no se corrige en los datos de ejemplo: el pedido 1003 tiene un producto no disponible y se deja así.
