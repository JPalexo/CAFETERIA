# Colección de Bruno — Rate Limiting

1. En Bruno: **Open Collection** → esta carpeta (`app/pruebas/bruno`).
2. Entorno **local** → en `password` escribe la contraseña de `mesero1` (es secreta: Bruno no la guarda en estos archivos).
3. Corre las carpetas **en orden** con *Run*:
   - `1 Sesion y permisos`: login correcto (guarda el `token`), rutas protegidas y 403 por rol.
   - `2 Rate limit`: 5 intentos fallidos → 401, el 6.º → 429, y bloqueado incluso con la contraseña correcta.
   - Espera **60 s** desde el primer intento fallido.
   - `3 Despues de 60 s`: se puede volver a intentar (401, no 429).
