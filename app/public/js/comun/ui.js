// Utilidades de interfaz compartidas: $, escapar(), dinero() y toasts.

export const $ = (sel) => document.querySelector(sel);

export function escapar(txt) {
  const d = document.createElement('div');
  d.textContent = txt ?? '';
  return d.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
export const dinero = (n) => moneda.format(n ?? 0);

// Toast abajo al centro. Crea el elemento si la pagina no lo tiene.
let temporizadorToast;
export function toast(msg, esError = false) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.toggle('error', esError);
  t.classList.add('visible');
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => t.classList.remove('visible'), 2600);
}
