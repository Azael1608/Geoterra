/* ══════════════════════════════════════════
   Geoterra — App Logic
   ══════════════════════════════════════════ */

/* ── Auth ── */
const CREDENTIALS = { user: 'admin', pass: 'geo2024' };

function doLogin() {
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pass').value;
  const err = document.getElementById('login-error');
  if (u === CREDENTIALS.user && p === CREDENTIALS.pass) {
    err.classList.add('hidden');
    document.getElementById('screen-login').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    initApp();
  } else {
    err.classList.remove('hidden');
  }
}

document.getElementById('inp-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

function doLogout() {
  document.getElementById('screen-app').classList.remove('active');
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('inp-pass').value = '';
}

/* ── Navigation ── */
function showSection(name, el) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  if (el) el.classList.add('active');
  if (name === 'historial') renderHistorial();
  if (name === 'tarifas') renderTarifas();
}

/* ── Default Tarifas (stored in localStorage) ── */
const DEFAULT_TARIFAS = {
  deslinde:        2500,
  levantamiento:   3500,
  plano:           1800,
  plano_catastral: 2200,
  trazo:           2000,
  km:              50,
  vert_extra:      150,
  // Porcentajes de topografía (0–100 representan 0%–100%)
  pct_topo_plano:      0,
  pct_topo_ondulado:   20,
  pct_topo_lomerio:    40,
  pct_topo_montanoso:  70,
  // Porcentajes de condición
  pct_cond_medido:     0,
  pct_cond_sin_datos:  15,
  pct_cond_conflicto:  30,
  // Porcentajes de urgencia
  pct_urg_normal:      0,
  pct_urg_urgente:     25,
  pct_urg_express:     50,
  // IVA
  iva: 16,
  // Porcentajes de equipo
  pct_equipo_cinta:          0,
  pct_equipo_nivel:          0,
  pct_equipo_estacion_total: 3,
  pct_equipo_gnss_rtk:       5,
  pct_equipo_dron_gnss:      6,
};

const SERVICIO_LABELS = {
  deslinde:        'Deslinde de terreno',
  levantamiento:   'Levantamiento topográfico',
  plano:           'Elaboración de plano',
  plano_catastral: 'Plano catastral / municipal',
  trazo:           'Trazo y nivelación',
};

const TOPO_LABELS = {
  plano:     'Plano / Regular',
  ondulado:  'Ondulado / Semiplano',
  lomerio:   'Lomerío',
  montanoso: 'Montañoso / Accidentado',
};

const COND_LABELS = {
  medido:    'Terreno medido / Con datos',
  sin_datos: 'Sin datos previos',
  conflicto: 'Con conflicto de linderos',
};

const URG_LABELS = {
  normal:   'Normal',
  urgente:  'Urgente — 48h',
  express:  'Express — 24h',
};

const EQUIPO_LABELS = {
  cinta:          'Cinta, plomada y brújula',
  nivel:          'Nivel fijo',
  estacion_total: 'Estación total',
  gnss_rtk:       'Estación GNSS RTK',
  dron_gnss:      'Dron GNSS RTK',
};

function getTarifas() {
  try {
    const stored = JSON.parse(localStorage.getItem('gt_tarifas'));
    // Merge con defaults para que nuevas claves siempre tengan valor
    return stored ? { ...DEFAULT_TARIFAS, ...stored } : { ...DEFAULT_TARIFAS };
  } catch { return { ...DEFAULT_TARIFAS }; }
}

function saveTarifasLS(t) {
  localStorage.setItem('gt_tarifas', JSON.stringify(t));
}

/* ── Helpers para obtener porcentajes como decimales ── */
function getTopoPct(topo, t) {
  const key = 'pct_topo_' + topo;
  return (t[key] !== undefined ? t[key] : 0) / 100;
}
function getCondPct(cond, t) {
  const key = 'pct_cond_' + cond;
  return (t[key] !== undefined ? t[key] : 0) / 100;
}
function getUrgPct(urg, t) {
  const key = 'pct_urg_' + urg;
  return (t[key] !== undefined ? t[key] : 0) / 100;
}
function getEquipoPct(equipo, t) {
  const key = 'pct_equipo_' + equipo;
  return (t[key] !== undefined ? t[key] : 0) / 100;
}

/* ── Calculator ── */
function updateCalc() {
  const t = getTarifas();
  const tipo   = document.getElementById('s-tipo').value;
  const topo   = document.getElementById('p-topo').value;
  const cond   = document.getElementById('p-cond').value;
  const urg    = document.getElementById('p-urg').value;
  const equipo = document.getElementById('p-equipo').value;
  const sup    = parseFloat(document.getElementById('p-sup').value) || 0;
  const dist   = parseFloat(document.getElementById('p-dist').value) || 0;
  const vert   = parseInt(document.getElementById('p-vert').value) || 4;

  const base       = tipo ? (t[tipo] || 0) : 0;
  const topoPct    = getTopoPct(topo, t);
  const condPct    = getCondPct(cond, t);
  const urgPct     = getUrgPct(urg, t);
  const equipoPct  = getEquipoPct(equipo, t);

  const adjTopo    = base * topoPct;
  const adjCond    = base * condPct;
  const adjUrg     = base * urgPct;
  const adjEquipo  = base * equipoPct;
  const costDist   = dist * (t.km || 0);
  const vertExtra  = Math.max(0, vert - 4) * (t.vert_extra || 0);

  const subtotal   = base + adjTopo + adjCond + adjUrg + adjEquipo + costDist + vertExtra;
  const ivaPct     = (t.iva !== undefined ? t.iva : 16) / 100;
  const iva        = subtotal * ivaPct;
  const total      = subtotal + iva;

  const fmt = v => '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = p => (p * 100 % 1 === 0) ? (p * 100).toFixed(0) + '%' : (p * 100).toFixed(1) + '%';

  document.getElementById('b-base').textContent   = fmt(base);
  document.getElementById('b-topo').textContent   = fmt(adjTopo);
  document.getElementById('b-cond').textContent   = fmt(adjCond);
  document.getElementById('b-urg').textContent    = fmt(adjUrg);
  document.getElementById('b-equipo').textContent = fmt(adjEquipo);
  document.getElementById('b-dist').textContent   = fmt(costDist);
  document.getElementById('b-vert').textContent   = fmt(vertExtra);
  document.getElementById('b-sub').textContent    = fmt(subtotal);
  document.getElementById('b-iva').textContent    = fmt(iva);
  document.getElementById('b-total').textContent  = fmt(total);

  document.getElementById('lbl-topo').textContent   = `Ajuste por topografía (${fmtPct(topoPct)})`;
  document.getElementById('lbl-cond').textContent   = `Ajuste por condición (${fmtPct(condPct)})`;
  document.getElementById('lbl-urg').textContent    = `Recargo por urgencia (${fmtPct(urgPct)})`;
  document.getElementById('lbl-equipo').textContent = `Equipo: ${EQUIPO_LABELS[equipo] || equipo} (${fmtPct(equipoPct)})`;
  document.getElementById('lbl-iva').textContent    = `IVA (${(t.iva !== undefined ? t.iva : 16)}%)`;

  return { base, adjTopo, adjCond, adjUrg, adjEquipo, costDist, vertExtra, subtotal, iva, total,
           topoPct, condPct, urgPct, equipoPct, ivaPct };
}

/* ── Quote Counter ── */
function nextQuoteId() {
  const hist = getHistorial();
  const n = hist.length + 1;
  return 'COT-' + String(n).padStart(3, '0');
}

/* ── Save Quote ── */
function guardarCotizacion() {
  const tipo = document.getElementById('s-tipo').value;
  const nombre = document.getElementById('c-nombre').value.trim();
  if (!tipo) { showToast('Selecciona un tipo de servicio', 'error'); return; }
  if (!nombre) { showToast('Ingresa el nombre del cliente', 'error'); return; }

  const nums = updateCalc();
  const t = getTarifas();
  const quote = {
    id:     nextQuoteId(),
    fecha:  new Date().toLocaleDateString('es-MX'),
    cliente: {
      nombre,
      tel:   document.getElementById('c-tel').value.trim(),
      email: document.getElementById('c-email').value.trim(),
      rfc:   document.getElementById('c-rfc').value.trim(),
    },
    servicio: {
      tipo,
      label: SERVICIO_LABELS[tipo],
      desc:  document.getElementById('s-desc').value.trim(),
      ubic:  document.getElementById('s-ubic').value.trim(),
    },
    params: {
      sup:    parseFloat(document.getElementById('p-sup').value) || 0,
      dist:   parseFloat(document.getElementById('p-dist').value) || 0,
      topo:   document.getElementById('p-topo').value,
      cond:   document.getElementById('p-cond').value,
      vert:   parseInt(document.getElementById('p-vert').value) || 4,
      urg:    document.getElementById('p-urg').value,
      equipo: document.getElementById('p-equipo').value,
    },
    pcts: {
      topo:   nums.topoPct,
      cond:   nums.condPct,
      urg:    nums.urgPct,
      equipo: nums.equipoPct,
      iva:    nums.ivaPct,
    },
    nums,
    notas: document.getElementById('q-notas').value.trim(),
  };

  const hist = getHistorial();
  hist.unshift(quote);
  saveHistorial(hist);
  showToast(`Cotización ${quote.id} guardada correctamente`, 'success');
  resetForm();
  document.getElementById('quote-number').textContent = nextQuoteId();
}

function resetForm() {
  ['c-nombre','c-tel','c-email','c-rfc','s-tipo','s-desc','s-ubic','q-notas'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('p-sup').value  = '';
  document.getElementById('p-dist').value = '0';
  document.getElementById('p-vert').value = '4';
  document.getElementById('p-topo').value   = 'plano';
  document.getElementById('p-cond').value   = 'medido';
  document.getElementById('p-urg').value    = 'normal';
  document.getElementById('p-equipo').value = 'cinta';
  updateCalc();
}

/* ── Historial Storage ── */
function getHistorial() {
  try { return JSON.parse(localStorage.getItem('gt_historial')) || []; }
  catch { return []; }
}
function saveHistorial(h) { localStorage.setItem('gt_historial', JSON.stringify(h)); }

function renderHistorial(filter = '') {
  let hist = getHistorial();
  if (filter) {
    const q = filter.toLowerCase();
    hist = hist.filter(c =>
      c.cliente.nombre.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }
  const empty = document.getElementById('historial-empty');
  const wrap  = document.getElementById('historial-table-wrap');
  const tbody = document.getElementById('historial-body');

  if (hist.length === 0) {
    empty.classList.remove('hidden');
    wrap.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  wrap.classList.remove('hidden');

  const fmt = v => '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  tbody.innerHTML = hist.map(q => `
    <tr>
      <td class="id-cell">${q.id}</td>
      <td>${q.fecha}</td>
      <td>${q.cliente.nombre}</td>
      <td>${q.servicio.label}</td>
      <td class="total-cell">${fmt(q.nums.total)}</td>
      <td>
        <button class="act-btn" onclick="abrirDetalle('${q.id}')">Ver</button>
        <button class="act-btn danger" onclick="eliminarCotizacion('${q.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function filtrarHistorial() {
  renderHistorial(document.getElementById('search-hist').value);
}

function eliminarCotizacion(id) {
  if (!confirm(`¿Eliminar la cotización ${id}?`)) return;
  const hist = getHistorial().filter(c => c.id !== id);
  saveHistorial(hist);
  renderHistorial(document.getElementById('search-hist').value);
  showToast('Cotización eliminada');
}

/* ── Detail Modal ── */
let currentQuote = null;

function abrirDetalle(id) {
  const q = getHistorial().find(c => c.id === id);
  if (!q) return;
  currentQuote = q;
  document.getElementById('modal-title').textContent = q.id + ' — ' + q.cliente.nombre;
  const fmt = v => '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = p => {
    if (!p && p !== 0) return '—';
    const val = p * 100;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + '%';
  };

  // Soporte retrocompatible: si la cotización fue guardada antes del cambio, leer pcts del objeto nums
  const pcts = q.pcts || {
    topo: q.nums.adjTopo / (q.nums.base || 1),
    cond: q.nums.adjCond / (q.nums.base || 1),
    urg:  q.nums.adjUrg  / (q.nums.base || 1),
    iva:  0.16,
  };

  document.getElementById('modal-content').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Cliente</div>
      <div class="detail-row"><span>Nombre</span><span>${q.cliente.nombre}</span></div>
      ${q.cliente.tel   ? `<div class="detail-row"><span>Teléfono</span><span>${q.cliente.tel}</span></div>`  : ''}
      ${q.cliente.email ? `<div class="detail-row"><span>Correo</span><span>${q.cliente.email}</span></div>` : ''}
      ${q.cliente.rfc   ? `<div class="detail-row"><span>RFC / CURP</span><span>${q.cliente.rfc}</span></div>` : ''}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Servicio</div>
      <div class="detail-row"><span>Tipo</span><span>${q.servicio.label}</span></div>
      ${q.servicio.desc ? `<div class="detail-row"><span>Descripción</span><span>${q.servicio.desc}</span></div>` : ''}
      ${q.servicio.ubic ? `<div class="detail-row"><span>Ubicación</span><span>${q.servicio.ubic}</span></div>` : ''}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Parámetros del terreno</div>
      <div class="detail-row"><span>Superficie</span><span>${q.params.sup} ha</span></div>
      <div class="detail-row"><span>Distancia</span><span>${q.params.dist} km</span></div>
      <div class="detail-row"><span>Topografía</span><span>${TOPO_LABELS[q.params.topo]}</span></div>
      <div class="detail-row"><span>Condición</span><span>${COND_LABELS[q.params.cond]}</span></div>
      <div class="detail-row"><span>Vértices</span><span>${q.params.vert}</span></div>
      <div class="detail-row"><span>Urgencia</span><span>${URG_LABELS[q.params.urg]}</span></div>
      <div class="detail-row"><span>Equipo topográfico</span><span>${EQUIPO_LABELS[q.params.equipo] || q.params.equipo || '—'}</span></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Desglose de precio</div>
      <div class="detail-row"><span>Precio base</span><span>${fmt(q.nums.base)}</span></div>
      <div class="detail-row"><span>Ajuste topografía (${fmtPct(pcts.topo)})</span><span>${fmt(q.nums.adjTopo)}</span></div>
      <div class="detail-row"><span>Ajuste condición (${fmtPct(pcts.cond)})</span><span>${fmt(q.nums.adjCond)}</span></div>
      <div class="detail-row"><span>Ajuste urgencia (${fmtPct(pcts.urg)})</span><span>${fmt(q.nums.adjUrg)}</span></div>
      <div class="detail-row"><span>Equipo: ${EQUIPO_LABELS[q.params.equipo] || '—'} (${fmtPct(pcts.equipo || 0)})</span><span>${fmt(q.nums.adjEquipo || 0)}</span></div>
      <div class="detail-row"><span>Distancia</span><span>${fmt(q.nums.costDist)}</span></div>
      <div class="detail-row"><span>Vértices adicionales</span><span>${fmt(q.nums.vertExtra)}</span></div>
      <div class="detail-row" style="font-weight:600;color:var(--text)"><span>Subtotal</span><span>${fmt(q.nums.subtotal)}</span></div>
      <div class="detail-row"><span>IVA (${fmtPct(pcts.iva)})</span><span>${fmt(q.nums.iva)}</span></div>
      <div class="detail-total"><span>TOTAL</span><span>${fmt(q.nums.total)}</span></div>
    </div>
    ${q.notas ? `<div class="detail-section"><div class="detail-section-title">Notas</div><p style="font-size:0.85rem;color:var(--text-muted);line-height:1.6">${q.notas}</p></div>` : ''}
  `;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

function closeModal(e) {
  if (!e || e.target === document.getElementById('modal-overlay')) {
    document.getElementById('modal-overlay').classList.add('hidden');
  }
}

/* ── Export PDF ── */
function exportPDF() {
  if (!currentQuote) return;
  const q = currentQuote;
  const fmt = v => '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pcts = q.pcts || { topo: 0, cond: 0, urg: 0, iva: 0.16 };
  const fmtPct = p => {
    if (!p && p !== 0) return '0%';
    const val = p * 100;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + '%';
  };

  const content = `
    <html><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; color: #222; font-size: 13px; margin: 40px; }
      h1 { font-size: 22px; color: #1a1a2e; margin-bottom: 4px; }
      .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
      .id-badge { background: #f0e9d2; color: #8B5E0A; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; display: inline-block; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
      th { background: #1a1a2e; color: #fff; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
      td { padding: 7px 10px; border-bottom: 1px solid #eee; }
      tr:nth-child(even) td { background: #fafafa; }
      .total-row td { background: #f0e9d2 !important; font-weight: bold; font-size: 15px; color: #8B5E0A; }
      .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 16px 0 6px; }
      .notas { background: #f9f9f9; border-left: 3px solid #D4A843; padding: 8px 12px; font-size: 12px; color: #555; margin-top: 12px; }
      .footer { margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
    </style></head><body>
    <h1>Geoterra — Cotización</h1>
    <div class="subtitle">Servicios de Topografía y Geomática</div>
    <div class="id-badge">${q.id} · ${q.fecha}</div>

    <div class="section-title">Datos del Cliente</div>
    <table><tr><td><b>Nombre:</b> ${q.cliente.nombre}</td>
    <td><b>Teléfono:</b> ${q.cliente.tel || '—'}</td></tr>
    <tr><td><b>Correo:</b> ${q.cliente.email || '—'}</td>
    <td><b>RFC/CURP:</b> ${q.cliente.rfc || '—'}</td></tr></table>

    <div class="section-title">Servicio</div>
    <table><tr><td><b>Tipo:</b> ${q.servicio.label}</td>
    <td><b>Ubicación:</b> ${q.servicio.ubic || '—'}</td></tr>
    ${q.servicio.desc ? `<tr><td colspan="2"><b>Descripción:</b> ${q.servicio.desc}</td></tr>` : ''}
    </table>

    <div class="section-title">Parámetros</div>
    <table><tr><th>Parámetro</th><th>Valor</th></tr>
    <tr><td>Superficie</td><td>${q.params.sup} ha</td></tr>
    <tr><td>Distancia</td><td>${q.params.dist} km</td></tr>
    <tr><td>Topografía</td><td>${TOPO_LABELS[q.params.topo]}</td></tr>
    <tr><td>Condición del terreno</td><td>${COND_LABELS[q.params.cond]}</td></tr>
    <tr><td>Vértices / linderos</td><td>${q.params.vert}</td></tr>
    <tr><td>Urgencia</td><td>${URG_LABELS[q.params.urg]}</td></tr>
    <tr><td>Equipo topográfico</td><td>${EQUIPO_LABELS[q.params.equipo] || '—'}</td></tr>
    </table>

    <div class="section-title">Desglose de Precio</div>
    <table><tr><th>Concepto</th><th>Monto</th></tr>
    <tr><td>Precio base del servicio</td><td>${fmt(q.nums.base)}</td></tr>
    <tr><td>Ajuste por topografía (${fmtPct(pcts.topo)})</td><td>${fmt(q.nums.adjTopo)}</td></tr>
    <tr><td>Ajuste por condición (${fmtPct(pcts.cond)})</td><td>${fmt(q.nums.adjCond)}</td></tr>
    <tr><td>Ajuste por urgencia (${fmtPct(pcts.urg)})</td><td>${fmt(q.nums.adjUrg)}</td></tr>
    <tr><td>Equipo: ${EQUIPO_LABELS[q.params.equipo] || '—'} (${fmtPct(pcts.equipo || 0)})</td><td>${fmt(q.nums.adjEquipo || 0)}</td></tr>
    <tr><td>Costo por distancia</td><td>${fmt(q.nums.costDist)}</td></tr>
    <tr><td>Vértices adicionales</td><td>${fmt(q.nums.vertExtra)}</td></tr>
    <tr><td><b>Subtotal</b></td><td><b>${fmt(q.nums.subtotal)}</b></td></tr>
    <tr><td>IVA (${fmtPct(pcts.iva)})</td><td>${fmt(q.nums.iva)}</td></tr>
    <tr class="total-row"><td>TOTAL</td><td>${fmt(q.nums.total)}</td></tr>
    </table>

    ${q.notas ? `<div class="notas"><b>Notas:</b> ${q.notas}</div>` : ''}
    <div class="footer">Cotización generada con Geoterra · ${q.fecha}</div>
    </body></html>
  `;

  const w = window.open('', '_blank');
  w.document.write(content);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

/* ── Export Excel (CSV) ── */
function exportExcel() {
  if (!currentQuote) return;
  const q = currentQuote;
  const fmt = v => v.toFixed(2);
  const pcts = q.pcts || { topo: 0, cond: 0, urg: 0, iva: 0.16 };
  const fmtPct = p => ((p || 0) * 100).toFixed(1) + '%';

  const rows = [
    ['Geoterra — Cotización', '', '', ''],
    ['ID', q.id, 'Fecha', q.fecha],
    ['', '', '', ''],
    ['CLIENTE', '', '', ''],
    ['Nombre', q.cliente.nombre, 'Teléfono', q.cliente.tel],
    ['Correo', q.cliente.email, 'RFC/CURP', q.cliente.rfc],
    ['', '', '', ''],
    ['SERVICIO', '', '', ''],
    ['Tipo', q.servicio.label, 'Ubicación', q.servicio.ubic],
    ['Descripción', q.servicio.desc, '', ''],
    ['', '', '', ''],
    ['PARÁMETROS', '', '', ''],
    ['Superficie (ha)', q.params.sup, 'Distancia (km)', q.params.dist],
    ['Topografía', TOPO_LABELS[q.params.topo], 'Condición', COND_LABELS[q.params.cond]],
    ['Vértices', q.params.vert, 'Urgencia', URG_LABELS[q.params.urg]],
    ['Equipo topográfico', EQUIPO_LABELS[q.params.equipo] || '—', '', ''],
    ['', '', '', ''],
    ['DESGLOSE', '', '', ''],
    ['Concepto', 'Monto (MXN)', 'Porcentaje', ''],
    ['Precio base', fmt(q.nums.base), '', ''],
    [`Ajuste topografía (${fmtPct(pcts.topo)})`, fmt(q.nums.adjTopo), fmtPct(pcts.topo), ''],
    [`Ajuste condición (${fmtPct(pcts.cond)})`, fmt(q.nums.adjCond), fmtPct(pcts.cond), ''],
    [`Ajuste urgencia (${fmtPct(pcts.urg)})`, fmt(q.nums.adjUrg), fmtPct(pcts.urg), ''],
    [`Equipo: ${EQUIPO_LABELS[q.params.equipo] || '—'} (${fmtPct(pcts.equipo || 0)})`, fmt(q.nums.adjEquipo || 0), fmtPct(pcts.equipo || 0), ''],
    ['Distancia', fmt(q.nums.costDist), '', ''],
    ['Vértices adicionales', fmt(q.nums.vertExtra), '', ''],
    ['Subtotal', fmt(q.nums.subtotal), '', ''],
    [`IVA (${fmtPct(pcts.iva)})`, fmt(q.nums.iva), fmtPct(pcts.iva), ''],
    ['TOTAL', fmt(q.nums.total), '', ''],
    ['', '', '', ''],
    ['Notas', q.notas, '', ''],
  ];

  const csv = rows.map(r => r.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `${q.id}_cotizacion.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Archivo CSV descargado', 'success');
}

/* ── Generar Factura / Presupuesto formal ── */
function generarFactura() {
  if (!currentQuote) return;
  const q = currentQuote;
  const fmt = v => '$' + v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pcts = q.pcts || { topo: 0, cond: 0, urg: 0, iva: 0.16 };
  const fmtPct = p => {
    if (!p && p !== 0) return '0%';
    const val = p * 100;
    return (val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)) + '%';
  };

  const content = `
    <html><head><meta charset="UTF-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@700&family=Nunito:wght@400;600&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Nunito', Arial, sans-serif; color: #1a1a2e; font-size: 13px; }
      .page { max-width: 740px; margin: 0 auto; padding: 40px; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #D4A843; padding-bottom: 20px; }
      .brand h1 { font-family: 'Rajdhani', sans-serif; font-size: 28px; color: #1a1a2e; letter-spacing: 3px; }
      .brand p { color: #888; font-size: 11px; letter-spacing: 1px; margin-top: 2px; }
      .doc-info { text-align: right; }
      .doc-type { font-family: 'Rajdhani', sans-serif; font-size: 18px; color: #D4A843; letter-spacing: 2px; }
      .doc-id { font-size: 20px; font-weight: 700; color: #1a1a2e; }
      .doc-date { color: #888; font-size: 11px; margin-top: 4px; }
      .section { margin-bottom: 24px; }
      .section-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #D4A843; font-weight: 600; margin-bottom: 8px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; }
      .info-item { display: flex; flex-direction: column; }
      .info-key { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
      .info-val { font-size: 13px; color: #1a1a2e; font-weight: 600; }
      table { width: 100%; border-collapse: collapse; }
      thead tr { background: #1a1a2e; }
      thead th { color: #D4A843; padding: 9px 12px; text-align: left; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; }
      tbody td { padding: 9px 12px; border-bottom: 1px solid #eee; color: #333; }
      tbody tr:nth-child(even) td { background: #fafafa; }
      .total-section { margin-top: 16px; border-top: 2px solid #1a1a2e; }
      .total-row { display: flex; justify-content: space-between; padding: 7px 12px; font-size: 13px; }
      .total-row:last-child { background: #1a1a2e; color: #D4A843; font-family: 'Rajdhani', sans-serif; font-size: 20px; letter-spacing: 1px; padding: 12px; margin-top: 4px; border-radius: 0 0 4px 4px; }
      .subtotal-row { color: #555; }
      .iva-row { color: #777; font-size: 12px; }
      .notas { background: #fffbf0; border-left: 3px solid #D4A843; padding: 10px 14px; font-size: 12px; color: #555; margin-top: 16px; border-radius: 0 4px 4px 0; }
      .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
      .footer-note { font-size: 11px; color: #aaa; }
      .validity { font-size: 11px; color: #888; text-align: right; }
      .validity strong { color: #D4A843; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    <div class="page">
      <div class="header">
        <div class="brand">
          <h1>GEOTERRA</h1>
          <p>SERVICIOS DE TOPOGRAFÍA Y GEOMÁTICA</p>
        </div>
        <div class="doc-info">
          <div class="doc-type">PRESUPUESTO / FACTURA</div>
          <div class="doc-id">${q.id}</div>
          <div class="doc-date">Fecha: ${q.fecha}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-label">Datos del cliente</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-key">Nombre / Razón Social</span><span class="info-val">${q.cliente.nombre}</span></div>
          <div class="info-item"><span class="info-key">Teléfono</span><span class="info-val">${q.cliente.tel || '—'}</span></div>
          <div class="info-item"><span class="info-key">Correo electrónico</span><span class="info-val">${q.cliente.email || '—'}</span></div>
          <div class="info-item"><span class="info-key">RFC / CURP</span><span class="info-val">${q.cliente.rfc || '—'}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-label">Detalle del servicio</div>
        <table>
          <thead><tr>
            <th>Concepto</th><th>Descripción</th><th style="text-align:right">Monto</th>
          </tr></thead>
          <tbody>
            <tr><td>Precio base</td><td>${q.servicio.label}${q.servicio.desc ? ' — ' + q.servicio.desc : ''}<br><small style="color:#888">${q.servicio.ubic || ''}</small></td><td style="text-align:right">${fmt(q.nums.base)}</td></tr>
            ${q.nums.adjTopo > 0 ? `<tr><td>Ajuste topografía (${fmtPct(pcts.topo)})</td><td>${TOPO_LABELS[q.params.topo]}</td><td style="text-align:right">${fmt(q.nums.adjTopo)}</td></tr>` : ''}
            ${q.nums.adjCond > 0 ? `<tr><td>Ajuste condición (${fmtPct(pcts.cond)})</td><td>${COND_LABELS[q.params.cond]}</td><td style="text-align:right">${fmt(q.nums.adjCond)}</td></tr>` : ''}
            ${q.nums.adjUrg  > 0 ? `<tr><td>Ajuste urgencia (${fmtPct(pcts.urg)})</td><td>${URG_LABELS[q.params.urg]}</td><td style="text-align:right">${fmt(q.nums.adjUrg)}</td></tr>` : ''}
            ${(q.nums.adjEquipo || 0) > 0 ? `<tr><td>Equipo: ${EQUIPO_LABELS[q.params.equipo] || '—'} (${fmtPct(pcts.equipo || 0)})</td><td>${EQUIPO_LABELS[q.params.equipo] || '—'}</td><td style="text-align:right">${fmt(q.nums.adjEquipo || 0)}</td></tr>` : ''}
            ${q.nums.costDist  > 0 ? `<tr><td>Costo por distancia</td><td>${q.params.dist} km × ${fmt(getTarifas().km)} c/km</td><td style="text-align:right">${fmt(q.nums.costDist)}</td></tr>` : ''}
            ${q.nums.vertExtra > 0 ? `<tr><td>Vértices adicionales</td><td>${Math.max(0, q.params.vert - 4)} vértices extra</td><td style="text-align:right">${fmt(q.nums.vertExtra)}</td></tr>` : ''}
          </tbody>
        </table>
        <div class="total-section">
          <div class="total-row subtotal-row"><span>Subtotal</span><span>${fmt(q.nums.subtotal)}</span></div>
          <div class="total-row iva-row"><span>IVA (${fmtPct(pcts.iva)})</span><span>${fmt(q.nums.iva)}</span></div>
          <div class="total-row"><span>TOTAL</span><span>${fmt(q.nums.total)}</span></div>
        </div>
      </div>

      ${q.notas ? `<div class="notas"><strong>Notas y condiciones:</strong> ${q.notas}</div>` : ''}

      <div class="footer">
        <div class="footer-note">
          Este documento es una cotización formal. Válida con firma y sello del prestador de servicios.
        </div>
        <div class="validity">Vigencia: <strong>30 días</strong> a partir de la fecha de emisión.</div>
      </div>
    </div>
    </body></html>
  `;

  const w = window.open('', '_blank');
  w.document.write(content);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}

/* ── Tarifas Screen ── */
function renderTarifas() {
  const t = getTarifas();

  // Precios base
  const grid = document.getElementById('tariff-grid');
  grid.innerHTML = Object.keys(SERVICIO_LABELS).map(k => `
    <div class="tariff-item">
      <label>${SERVICIO_LABELS[k]}</label>
      <input id="t-${k}" type="number" class="field" min="0" step="100" value="${t[k] || 0}" />
    </div>
  `).join('');

  document.getElementById('t-km').value   = t.km || 0;
  document.getElementById('t-vert').value = t.vert_extra || 0;

  // Porcentajes de topografía
  document.getElementById('pct-topo-plano').value     = t.pct_topo_plano     !== undefined ? t.pct_topo_plano     : 0;
  document.getElementById('pct-topo-ondulado').value  = t.pct_topo_ondulado  !== undefined ? t.pct_topo_ondulado  : 20;
  document.getElementById('pct-topo-lomerio').value   = t.pct_topo_lomerio   !== undefined ? t.pct_topo_lomerio   : 40;
  document.getElementById('pct-topo-montanoso').value = t.pct_topo_montanoso !== undefined ? t.pct_topo_montanoso : 70;

  // Porcentajes de condición
  document.getElementById('pct-cond-medido').value    = t.pct_cond_medido    !== undefined ? t.pct_cond_medido    : 0;
  document.getElementById('pct-cond-sin_datos').value = t.pct_cond_sin_datos !== undefined ? t.pct_cond_sin_datos : 15;
  document.getElementById('pct-cond-conflicto').value = t.pct_cond_conflicto !== undefined ? t.pct_cond_conflicto : 30;

  // Porcentajes de urgencia
  document.getElementById('pct-urg-normal').value     = t.pct_urg_normal  !== undefined ? t.pct_urg_normal  : 0;
  document.getElementById('pct-urg-urgente').value    = t.pct_urg_urgente !== undefined ? t.pct_urg_urgente : 25;
  document.getElementById('pct-urg-express').value    = t.pct_urg_express !== undefined ? t.pct_urg_express : 50;

  // IVA
  document.getElementById('t-iva').value = t.iva !== undefined ? t.iva : 16;

  // Porcentajes de equipo
  document.getElementById('pct-equipo-cinta').value          = t.pct_equipo_cinta          !== undefined ? t.pct_equipo_cinta          : 0;
  document.getElementById('pct-equipo-nivel').value          = t.pct_equipo_nivel          !== undefined ? t.pct_equipo_nivel          : 0;
  document.getElementById('pct-equipo-estacion_total').value = t.pct_equipo_estacion_total !== undefined ? t.pct_equipo_estacion_total : 3;
  document.getElementById('pct-equipo-gnss_rtk').value       = t.pct_equipo_gnss_rtk       !== undefined ? t.pct_equipo_gnss_rtk       : 5;
  document.getElementById('pct-equipo-dron_gnss').value      = t.pct_equipo_dron_gnss      !== undefined ? t.pct_equipo_dron_gnss      : 6;
}

function guardarTarifas() {
  const t = { ...getTarifas() };

  // Precios base
  Object.keys(SERVICIO_LABELS).forEach(k => {
    const el = document.getElementById('t-' + k);
    if (el) t[k] = parseFloat(el.value) || 0;
  });
  t.km         = parseFloat(document.getElementById('t-km').value)   || 0;
  t.vert_extra = parseFloat(document.getElementById('t-vert').value) || 0;

  // Porcentajes de topografía
  t.pct_topo_plano     = parseFloat(document.getElementById('pct-topo-plano').value)     || 0;
  t.pct_topo_ondulado  = parseFloat(document.getElementById('pct-topo-ondulado').value)  || 0;
  t.pct_topo_lomerio   = parseFloat(document.getElementById('pct-topo-lomerio').value)   || 0;
  t.pct_topo_montanoso = parseFloat(document.getElementById('pct-topo-montanoso').value) || 0;

  // Porcentajes de condición
  t.pct_cond_medido    = parseFloat(document.getElementById('pct-cond-medido').value)    || 0;
  t.pct_cond_sin_datos = parseFloat(document.getElementById('pct-cond-sin_datos').value) || 0;
  t.pct_cond_conflicto = parseFloat(document.getElementById('pct-cond-conflicto').value) || 0;

  // Porcentajes de urgencia
  t.pct_urg_normal  = parseFloat(document.getElementById('pct-urg-normal').value)  || 0;
  t.pct_urg_urgente = parseFloat(document.getElementById('pct-urg-urgente').value) || 0;
  t.pct_urg_express = parseFloat(document.getElementById('pct-urg-express').value) || 0;

  // IVA
  t.iva = parseFloat(document.getElementById('t-iva').value) ?? 16;

  // Porcentajes de equipo
  t.pct_equipo_cinta          = parseFloat(document.getElementById('pct-equipo-cinta').value)          || 0;
  t.pct_equipo_nivel          = parseFloat(document.getElementById('pct-equipo-nivel').value)          || 0;
  t.pct_equipo_estacion_total = parseFloat(document.getElementById('pct-equipo-estacion_total').value) || 0;
  t.pct_equipo_gnss_rtk       = parseFloat(document.getElementById('pct-equipo-gnss_rtk').value)       || 0;
  t.pct_equipo_dron_gnss      = parseFloat(document.getElementById('pct-equipo-dron_gnss').value)      || 0;

  saveTarifasLS(t);
  showToast('Tarifas y porcentajes guardados correctamente', 'success');
  // Refrescar la calculadora con los nuevos valores
  updateCalc();
}

/* ── Toast ── */
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ── Sync barra de navegación inferior ── */
function syncBottomNav(name) {
  document.querySelectorAll('.bn-item:not(.bn-logout)').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('bn-' + name);
  if (btn) btn.classList.add('active');

  // Mostrar/ocultar quote-id del header móvil solo en "nueva"
  const mqn = document.getElementById('mobile-quote-number');
  if (mqn) mqn.style.display = (name === 'nueva') ? '' : 'none';
}

/* ── Init ── */
function initApp() {
  updateCalc();
  const qid = nextQuoteId();
  document.getElementById('quote-number').textContent = qid;
  const mqn = document.getElementById('mobile-quote-number');
  if (mqn) mqn.textContent = qid;
}

// Mantener sincronizado el quote-id del header móvil al guardar
const _origGuardar = guardarCotizacion;
// Parchamos después de que la función esté definida mediante un wrapper al final del archivo.

/* ── Sincronizar quote-id del header móvil al actualizar número ── */
(function patchQuoteId() {
  const orig = guardarCotizacion;
  // Sobrescribimos para que al guardar también actualice el badge móvil
  window.guardarCotizacion = function() {
    orig();
    const qid = document.getElementById('quote-number').textContent;
    const mqn = document.getElementById('mobile-quote-number');
    if (mqn) mqn.textContent = qid;
  };
})();
