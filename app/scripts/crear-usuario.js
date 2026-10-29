// Crea un usuario del personal. La contrasena se lee de la variable de entorno NUEVO_USUARIO_PASSWORD.
// Uso (PowerShell):
//   $env:NUEVO_USUARIO_PASSWORD = "..."
//   npm run crear-usuario -- --usuario mesero1 --nombre "Ana Lopez" --rol atencion
const { crearUsuario } = require('./usuarios-comun');

// Lee "--campo valor" de la linea de comandos.
function argumento(nombre) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const password = process.env.NUEVO_USUARIO_PASSWORD;
if (!password) {
  console.error('ERROR: define la variable NUEVO_USUARIO_PASSWORD antes de correr el script (minimo 8 caracteres).');
  process.exit(1);
}

crearUsuario({ usuario: argumento('usuario'), nombre: argumento('nombre'), rol: argumento('rol'), password })
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exit(1);
  });
