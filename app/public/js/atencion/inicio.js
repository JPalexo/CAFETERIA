// Vista de atencion (base): encabezado con sesion y catalogo de solo lectura de los productos
// disponibles. La toma de pedidos llega en la TAREA_06.
import { api } from '../comun/api.js';
import { iniciarPagina } from '../comun/sesion.js';
import { $, escapar, dinero } from '../comun/ui.js';

const lista = $('#lista');
const aviso = $('#aviso');

async function cargarProductos() {
  try {
    const { datos: productos } = await api('/api/productos?disponibilidad=true');
    aviso.classList.add('oculto');
    if (!productos.length) {
      lista.innerHTML = '<div class="vacio">No hay productos disponibles por ahora.</div>';
      return;
    }
    lista.innerHTML = productos.map((p) => `
      <article class="tarjeta solo-lectura">
        <div class="tarjeta-top">
          <div>
            <div class="categoria">${escapar(p.categoria)}</div>
            <h3>${escapar(p.nombre)}</h3>
          </div>
          <div class="precio">${dinero(p.precio)}</div>
        </div>
      </article>`).join('');
  } catch (e) {
    aviso.innerHTML = `<span>${escapar(e.message)}</span><button class="btn btn-secundario" id="btnReintentar">Reintentar</button>`;
    aviso.classList.remove('oculto');
    $('#btnReintentar').onclick = cargarProductos;
  }
}

await iniciarPagina({ roles: ['admin', 'atencion'], titulo: 'Vista de atención' });
cargarProductos();
