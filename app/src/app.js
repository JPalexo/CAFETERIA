// Crea la app de Express: middlewares globales, archivos estaticos, rutas y errores.
const path = require('path');
const express = require('express');
const authRoutes = require('./routes/auth.routes');
const productosRoutes = require('./routes/productos.routes');
const { noEncontradoApi, manejarErrores } = require('./middlewares/errores');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);

app.use('/api', noEncontradoApi);
app.use(manejarErrores);

module.exports = app;
