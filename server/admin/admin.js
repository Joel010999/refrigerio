const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, { method = 'GET', body, form } = {}) {
  const res = await fetch(`/api/admin${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (body ? JSON.stringify(body) : undefined),
  });
  if (res.status === 401 && path !== '/login') { showLogin(); throw new Error('Sesión vencida'); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error al guardar');
  return data;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ---------- Session ---------- */

function showLogin() {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
}

async function showApp() {
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  await Promise.all([loadProducts(), loadSlides(), loadSettings()]);
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.hidden = true;
  try {
    await api('/login', { method: 'POST', body: { password: e.target.password.value } });
    e.target.reset();
    await showApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' });
  showLogin();
});

/* ---------- Tabs ---------- */

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => t.classList.toggle('is-active', t === tab));
  $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
  if (tab.dataset.tab === 'stats') loadStats();
}));

/* ---------- Editor schema ---------- */

const SCHEMAS = {
  products: {
    label: 'equipo',
    fields: [
      ['title', 'Nombre', 'text', { required: true, placeholder: 'Split 3.000' }],
      [['capacity', 'Frigorías', 'text', { placeholder: '3.000' }], ['tag', 'Etiqueta', 'text', { placeholder: 'Living' }]],
      ['description', 'Descripción corta', 'text', { placeholder: 'Livings y ambientes de hasta ~25 m²' }],
      ['specs', 'Características (una por línea)', 'textarea', { rows: 4 }],
      ['price', 'Precio (opcional)', 'text', { placeholder: 'Ej: $899.000 o "desde $899.000". Vacío = "precio por WhatsApp"' }],
      ['image_url', 'Foto (opcional)', 'image'],
      ['wa_message', 'Mensaje de WhatsApp propio (opcional)', 'textarea', { rows: 2, placeholder: 'Vacío = se usa el mensaje automático de la pestaña WhatsApp' }],
      [['sort', 'Orden', 'number'], ['active', 'Visible en la web', 'checkbox']],
    ],
  },
  slides: {
    label: 'placa',
    fields: [
      [['tag', 'Etiqueta', 'text', { placeholder: 'Promo de temporada' }], ['link_label', 'Texto del botón', 'text', { placeholder: 'Consultar promo' }]],
      ['title', 'Título', 'text', { required: true }],
      ['image_url', 'Imagen', 'image'],
      ['wa_message', 'Mensaje de WhatsApp del botón', 'textarea', { rows: 2, placeholder: 'Si lo completás, el botón abre WhatsApp con este mensaje' }],
      ['link_url', 'O link a una sección / página', 'text', { placeholder: '#equipos' }],
      [['sort', 'Orden', 'number'], ['active', 'Visible en la web', 'checkbox']],
    ],
  },
};

const state = { products: [], slides: [], settings: {} };

function fieldHtml([name, label, type, opts = {}]) {
  const attrs = `name="${name}" ${opts.required ? 'required' : ''} placeholder="${esc(opts.placeholder || '')}"`;
  if (type === 'textarea') return `<label>${label}<textarea ${attrs} rows="${opts.rows || 3}"></textarea></label>`;
  if (type === 'checkbox') return `<label class="check"><input type="checkbox" name="${name}"> ${label}</label>`;
  if (type === 'image') {
    return `<label>${label}
      <div class="image-field">
        <div class="thumb" data-preview>Sin foto</div>
        <div class="form-grid">
          <input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${name}">
          <input type="hidden" name="${name}">
          <button type="button" class="btn btn-ghost" data-clear-image>Quitar foto</button>
        </div>
      </div></label>`;
  }
  return `<label>${label}<input type="${type}" ${attrs}></label>`;
}

function setPreview(form, url) {
  const box = $('[data-preview]', form);
  if (!box) return;
  box.outerHTML = url
    ? `<img data-preview class="thumb" src="${esc(url)}" alt="">`
    : '<div class="thumb" data-preview>Sin foto</div>';
}

let editing = null;

function openEditor(kind, item = null) {
  const schema = SCHEMAS[kind];
  editing = { kind, id: item?.id ?? null };
  $('#editor-title').textContent = item ? `Editar ${schema.label}` : `Nuevo ${schema.label}`;
  $('#editor-fields').innerHTML = schema.fields
    .map(f => Array.isArray(f[0]) ? `<div class="two">${f.map(fieldHtml).join('')}</div>` : fieldHtml(f))
    .join('');
  $('#editor-error').hidden = true;
  $('#editor-delete').hidden = !item;

  const form = $('#editor-form');
  const values = item || {
    active: true,
    sort: state[kind].length,
    specs: kind === 'products' ? ['BGH, Philco o TCL', 'Inverter u On/Off', 'Combo con instalación incluida', '1 año de garantía'] : undefined,
  };
  for (const el of form.elements) {
    if (!el.name || !(el.name in values)) continue;
    const v = values[el.name];
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = Array.isArray(v) ? v.join('\n') : (v ?? '');
  }
  setPreview(form, form.elements.image_url?.value);
  $('#editor').showModal();
}

$('#editor-fields').addEventListener('change', async (e) => {
  const input = e.target.closest('[data-upload]');
  if (!input || !input.files[0]) return;
  const form = $('#editor-form');
  const fd = new FormData();
  fd.append('file', input.files[0]);
  try {
    const { url } = await api('/media', { method: 'POST', form: fd });
    form.elements[input.dataset.upload].value = url;
    setPreview(form, url);
  } catch (ex) {
    toast(ex.message);
  }
  input.value = '';
});

$('#editor-fields').addEventListener('click', (e) => {
  if (!e.target.closest('[data-clear-image]')) return;
  const form = $('#editor-form');
  form.elements.image_url.value = '';
  setPreview(form, '');
});

$('#editor-cancel').addEventListener('click', () => $('#editor').close());

$('#editor-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const data = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    data[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  const btn = form.querySelector('[type=submit]');
  btn.disabled = true;
  try {
    const { kind, id } = editing;
    await api(id ? `/${kind}/${id}` : `/${kind}`, { method: id ? 'PUT' : 'POST', body: data });
    $('#editor').close();
    toast('Guardado. Ya se ve en la web.');
    await (kind === 'products' ? loadProducts() : loadSlides());
  } catch (ex) {
    $('#editor-error').textContent = ex.message;
    $('#editor-error').hidden = false;
  } finally {
    btn.disabled = false;
  }
});

$('#editor-delete').addEventListener('click', async () => {
  const { kind, id } = editing;
  if (!confirm(`¿Eliminar este ${SCHEMAS[kind].label}? Si solo querés ocultarlo, destildá "Visible en la web".`)) return;
  await api(`/${kind}/${id}`, { method: 'DELETE' });
  $('#editor').close();
  toast('Eliminado');
  await (kind === 'products' ? loadProducts() : loadSlides());
});

$$('[data-new]').forEach(btn => btn.addEventListener('click', () => openEditor(btn.dataset.new)));

/* ---------- Lists ---------- */

function rowHtml(kind, item, title, sub) {
  const thumb = item.image_url
    ? `<img class="thumb" src="${esc(item.image_url)}" alt="">`
    : '<div class="thumb">Sin foto</div>';
  return `<div class="row ${item.active ? '' : 'is-off'}">
    ${thumb}
    <div><div class="row-title">${esc(title)}</div><div class="row-sub">${esc(sub)}</div></div>
    <div class="row-actions">
      <span class="pill ${item.active ? '' : 'off'}">${item.active ? 'Visible' : 'Oculto'}</span>
      <button class="btn btn-ghost" data-edit="${kind}" data-id="${item.id}">Editar</button>
    </div>
  </div>`;
}

function renderList(kind) {
  const list = $(`#${kind}-list`);
  const items = state[kind];
  if (!items.length) {
    list.innerHTML = `<div class="empty">Todavía no hay ${kind === 'products' ? 'equipos' : 'placas'} cargados.</div>`;
    return;
  }
  list.innerHTML = items.map(item => kind === 'products'
    ? rowHtml(kind, item, item.title, [item.tag, item.price || 'Precio por WhatsApp'].filter(Boolean).join(' · '))
    : rowHtml(kind, item, item.title, [item.tag, item.wa_message ? 'Botón → WhatsApp' : item.link_url].filter(Boolean).join(' · '))
  ).join('');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-edit]');
  if (!btn) return;
  const kind = btn.dataset.edit;
  openEditor(kind, state[kind].find(i => i.id === Number(btn.dataset.id)));
});

async function loadProducts() { state.products = await api('/products'); renderList('products'); }
async function loadSlides() { state.slides = await api('/slides'); renderList('slides'); }

/* ---------- Settings ---------- */

function updateWaTest() {
  const num = $('#settings-form').elements.whatsapp_number.value.replace(/\D/g, '');
  $('#wa-test').href = `https://wa.me/${num}?text=${encodeURIComponent('Prueba del panel de Climatizar.com')}`;
}

async function loadSettings() {
  state.settings = await api('/settings');
  const form = $('#settings-form');
  for (const el of form.elements) if (el.name) el.value = state.settings[el.name] ?? '';
  updateWaTest();
}

$('#settings-form').elements.whatsapp_number.addEventListener('input', updateWaTest);

$('#settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    state.settings = await api('/settings', { method: 'PUT', body: data });
    toast('Guardado. Todos los botones usan el número nuevo.');
  } catch (ex) {
    toast(ex.message);
  }
});

/* ---------- Stats ---------- */

const SOURCE_LABELS = {
  producto: 'Botón de un equipo', carrusel: 'Carrusel', calculadora: 'Calculadora de frigorías',
  formulario: 'Formulario de presupuesto', contacto: 'Otros botones de contacto',
};

async function loadStats() {
  const { totals, bySource, byProduct } = await api('/stats');
  $('#stats-totals').innerHTML = [['Últimas 24 h', totals.day], ['Últimos 7 días', totals.week], ['Últimos 30 días', totals.month]]
    .map(([l, v]) => `<div class="stat"><span class="muted">${l}</span><strong>${v}</strong></div>`).join('');
  $('#stats-products').innerHTML = byProduct.map(r => `<tr><td>${esc(r.title)}</td><td>${r.clicks}</td></tr>`).join('')
    || '<tr><td>Sin datos todavía</td><td></td></tr>';
  $('#stats-sources').innerHTML = bySource.map(r => `<tr><td>${esc(SOURCE_LABELS[r.source] || r.source)}</td><td>${r.clicks}</td></tr>`).join('')
    || '<tr><td>Sin datos todavía</td><td></td></tr>';
}

/* ---------- Boot ---------- */

api('/me').then(({ authenticated }) => (authenticated ? showApp() : showLogin())).catch(showLogin);
