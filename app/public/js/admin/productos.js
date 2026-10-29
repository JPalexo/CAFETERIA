// Panel de administracion: catalogo de productos (crear, editar, eliminar, disponibilidad y filtros).
// Es el app.js original, ahora con sesion: solo para admin (RF-D1).
import { api } from '../comun/api.js';
import { iniciarPagina } from '../comun/sesion.js';
import { $, escapar, dinero, toast } from '../comun/ui.js';

const API = '/api/productos';

const lista = $('#lista');
const resumen = $('#resumen');
const aviso = $('#aviso');

const filtros = {
  nombre: $('#fNombre'),
  categoria: $('#fCategoria'),
  disponibilidad: $('#fDisponibilidad'),
};

const modal = $('#modalProducto');
const form = $('#formProducto');
const modalEliminar = $('#modalEliminar');

const ingredientesForm = [];
const ingredientesFiltro = [];
let idPorEliminar = null;

// ---------- Utilidades ----------
function mostrarAviso(msg) {
  aviso.innerHTML = `<span>${escapar(msg)}</span><button class="btn btn-secundario" id="btnReintentar">Reintentar</button>`;
  aviso.classList.remove('oculto');
  $('#btnReintentar').onclick = () => { aviso.classList.add('oculto'); cargarTodo(); };
}

// api() agrega el token; aqui solo interesan los datos
const pedir = async (url, opciones) => (await api(url, opciones)).datos;

function debounce(fn, ms = 300) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Campo de "chips": un contenedor con un input de texto que va agregando
// valores a un arreglo. Enter o coma agrega, × quita, Backspace con el
// campo vacío quita el último. Sin duplicados (sin distinguir mayúsculas).
// Se reutiliza tanto en el formulario de producto como en el filtro de ingrediente.
function crearCampoChips(contenedor, input, arreglo, alCambiar = () => {}) {
  function pintar() {
    contenedor.querySelectorAll('.chip').forEach((c) => c.remove());
    arreglo.forEach((valor, idx) => {
      const span = document.createElement('span');
      span.className = 'chip';
      span.innerHTML = `${escapar(valor)} <button type="button" aria-label="Quitar ${escapar(valor)}">×</button>`;
      span.querySelector('button').onclick = () => { arreglo.splice(idx, 1); pintar(); alCambiar(); };
      contenedor.insertBefore(span, input);
    });
  }

  function agregar(texto) {
    let huboCambio = false;
    texto.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
      if (!arreglo.some((i) => i.toLowerCase() === t.toLowerCase())) {
        arreglo.push(t);
        huboCambio = true;
      }
    });
    if (huboCambio) { pintar(); alCambiar(); }
  }

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      agregar(ev.target.value);
      ev.target.value = '';
    } else if (ev.key === 'Backspace' && !ev.target.value && arreglo.length) {
      arreglo.pop();
      pintar();
      alCambiar();
    }
  });

  function limpiar() {
    arreglo.length = 0;
    pintar();
  }

  pintar();
  return { pintar, agregar, limpiar };
}

// ---------- Carga de datos ----------
async function cargarCategorias() {
  const cats = await pedir(`${API}/categorias`);
  const actual = filtros.categoria.value;
  filtros.categoria.innerHTML = '<option value="">Todas</option>' +
    cats.map((c) => `<option value="${escapar(c)}">${escapar(c)}</option>`).join('');
  if (cats.includes(actual)) filtros.categoria.value = actual;
  $('#listaCategorias').innerHTML = cats.map((c) => `<option value="${escapar(c)}">`).join('');
}

async function cargarProductos() {
  const params = new URLSearchParams();
  if (filtros.nombre.value.trim()) params.set('q', filtros.nombre.value.trim());
  if (filtros.categoria.value) params.set('categoria', filtros.categoria.value);
  if (filtros.disponibilidad.value) params.set('disponibilidad', filtros.disponibilidad.value);
  if (ingredientesFiltro.length) params.set('ingrediente', ingredientesFiltro.join(','));

  try {
    const productos = await pedir(`${API}?${params}`);
    aviso.classList.add('oculto');
    pintar(productos);
  } catch (e) {
    mostrarAviso(e.message);
  }
}

async function cargarTodo() {
  try {
    await cargarCategorias();
  } catch (e) {
    mostrarAviso(e.message);
    return;
  }
  cargarProductos();
}

// ---------- Render ----------
function pintar(productos) {
  const disp = productos.filter((p) => p.disponibilidad).length;
  resumen.textContent = `${productos.length} producto(s) · ${disp} disponible(s) · ${productos.length - disp} no disponible(s)`;

  if (!productos.length) {
    lista.innerHTML = '<div class="vacio">No se encontraron productos con esos filtros.</div>';
    return;
  }

  lista.innerHTML = productos.map((p) => `
    <article class="tarjeta ${p.disponibilidad ? '' : 'agotado'}" data-id="${p._id}">
      <div class="tarjeta-top">
        <div>
          <div class="categoria">${escapar(p.categoria)}</div>
          <h3>${escapar(p.nombre)}</h3>
        </div>
        <div class="precio">${dinero(p.precio)}</div>
      </div>
      ${p.descripcion ? `<p class="descripcion">${escapar(p.descripcion)}</p>` : ''}
      <div class="ingredientes">
        ${(p.ingredientes || []).map((i) =>
          `<span class="chip" data-ingrediente="${escapar(i)}" title="Filtrar por ${escapar(i)}">${escapar(i)}</span>`).join('')}
      </div>
      <div class="tarjeta-pie">
        <label class="estado" title="Cambiar disponibilidad">
          <input type="checkbox" data-accion="toggle" ${p.disponibilidad ? 'checked' : ''} />
          <span class="switch"></span>
          <span class="${p.disponibilidad ? 'txt-si' : 'txt-no'}">${p.disponibilidad ? 'Disponible' : 'No disponible'}</span>
        </label>
        <div class="botones">
          <button class="btn-icono" data-accion="editar">Editar</button>
          <button class="btn-icono eliminar" data-accion="eliminar">Eliminar</button>
        </div>
      </div>
    </article>`).join('');

  // guardar los datos para editar sin volver a pedirlos
  lista._productos = Object.fromEntries(productos.map((p) => [p._id, p]));
}

// ---------- Acciones de las tarjetas ----------
lista.addEventListener('click', (ev) => {
  const chip = ev.target.closest('.chip[data-ingrediente]');
  if (chip) {
    campoChipsFiltro.agregar(chip.dataset.ingrediente);
    return;
  }
  const btn = ev.target.closest('button[data-accion]');
  if (!btn) return;
  const id = btn.closest('.tarjeta').dataset.id;
  const prod = lista._productos[id];
  if (btn.dataset.accion === 'editar') abrirFormulario(prod);
  if (btn.dataset.accion === 'eliminar') {
    idPorEliminar = id;
    $('#nombreEliminar').textContent = prod.nombre;
    modalEliminar.showModal();
  }
});

lista.addEventListener('change', async (ev) => {
  if (ev.target.dataset.accion !== 'toggle') return;
  const id = ev.target.closest('.tarjeta').dataset.id;
  const valor = ev.target.checked;
  try {
    const p = await pedir(`${API}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ disponibilidad: valor }),
    });
    toast(`${p.nombre}: ${valor ? 'disponible' : 'no disponible'}`);
    cargarProductos();
  } catch (e) {
    ev.target.checked = !valor;
    toast(e.message, true);
  }
});

// ---------- Eliminar ----------
$('#btnNoEliminar').onclick = () => modalEliminar.close();
$('#btnSiEliminar').onclick = async () => {
  try {
    await pedir(`${API}/${idPorEliminar}`, { method: 'DELETE' });
    modalEliminar.close();
    toast('Producto eliminado');
    cargarTodo();
  } catch (e) {
    toast(e.message, true);
  }
};

// ---------- Formulario crear / editar ----------
const campoChipsForm = crearCampoChips($('#chipsIngredientes'), $('#pIngrediente'), ingredientesForm);

function abrirFormulario(prod = null) {
  form.reset();
  $('#errorForm').textContent = '';
  $('#tituloModal').textContent = prod ? 'Editar producto' : 'Nuevo producto';
  $('#pId').value = prod?._id || '';
  $('#pNombre').value = prod?.nombre || '';
  $('#pCategoria').value = prod?.categoria || '';
  $('#pPrecio').value = prod?.precio ?? '';
  $('#pDescripcion').value = prod?.descripcion || '';
  $('#pDisponible').checked = prod ? !!prod.disponibilidad : true;
  ingredientesForm.length = 0;
  ingredientesForm.push(...(prod?.ingredientes || []));
  $('#pIngrediente').value = '';
  campoChipsForm.pintar();
  modal.showModal();
  $('#pNombre').focus();
}

$('#btnNuevo').onclick = () => abrirFormulario();
$('#btnCancelar').onclick = () => modal.close();

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  // si quedó texto sin confirmar en ingredientes, se agrega
  const pendiente = $('#pIngrediente').value;
  if (pendiente.trim()) { campoChipsForm.agregar(pendiente); $('#pIngrediente').value = ''; }

  const datos = {
    nombre: $('#pNombre').value.trim(),
    categoria: $('#pCategoria').value.trim(),
    precio: parseFloat($('#pPrecio').value),
    descripcion: $('#pDescripcion').value.trim(),
    ingredientes: ingredientesForm,
    disponibilidad: $('#pDisponible').checked,
  };

  const errores = [];
  if (!datos.nombre) errores.push('El nombre es obligatorio.');
  if (!datos.categoria) errores.push('La categoría es obligatoria.');
  if (!Number.isFinite(datos.precio) || datos.precio <= 0) errores.push('El precio debe ser mayor a 0.');
  if (errores.length) { $('#errorForm').textContent = errores.join(' '); return; }

  const id = $('#pId').value;
  const btn = $('#btnGuardar');
  btn.disabled = true;
  try {
    await pedir(id ? `${API}/${id}` : API, {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(datos),
    });
    modal.close();
    toast(id ? 'Producto actualizado' : 'Producto registrado');
    cargarTodo();
  } catch (e) {
    $('#errorForm').textContent = e.message;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Filtros ----------
const campoChipsFiltro = crearCampoChips($('#fIngredienteChips'), $('#fIngrediente'), ingredientesFiltro, cargarProductos);

const recargar = debounce(cargarProductos, 300);
filtros.nombre.addEventListener('input', recargar);
filtros.categoria.addEventListener('change', cargarProductos);
filtros.disponibilidad.addEventListener('change', cargarProductos);
$('#btnLimpiar').onclick = () => {
  Object.values(filtros).forEach((f) => (f.value = ''));
  campoChipsFiltro.limpiar();
  cargarProductos();
};

await iniciarPagina({ roles: ['admin'], titulo: 'Panel de administración' });
cargarTodo();
