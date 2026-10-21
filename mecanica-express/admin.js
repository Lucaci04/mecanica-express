(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const SESSION = 'me-admin';
  // The password is checked by the server (ADMIN_PIN); the page only keeps it for this tab.
  let pin = '';
  try { pin = sessionStorage.getItem(SESSION) || ''; } catch (e) { pin = ''; }
  let bookings = [];
  const api = async (method, url, data) => {
    const r = await fetch(url, { method, cache: 'no-store', headers: { 'x-admin-pin': pin, ...(data ? { 'content-type': 'application/json' } : {}) }, body: data ? JSON.stringify(data) : undefined });
    if (r.status === 401) { logout('Parolă greșită.'); throw new Error('401'); }
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  };
  const fail = () => alert('Nu s-a putut salva. Verifică internetul și încearcă din nou.');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = iso(new Date());
  const tomorrow = iso(new Date(Date.now() + 864e5));
  const fmtDay = new Intl.DateTimeFormat('ro-RO', { weekday: 'short', day: 'numeric', month: 'short' });
  const dayText = k => { if (!k) return ''; const [y, m, d] = k.split('-').map(Number); return k === today ? 'Azi' : k === tomorrow ? 'Mâine' : fmtDay.format(new Date(y, m - 1, d)); };
  // Confirmation email, ready to send from the service's own mail app
  const mailto = b => {
    const when = `${dayText(b.date).toLowerCase()}, ora ${b.time}`;
    const body = `Bună ziua, ${b.nume.split(' ')[0]}!\n\nVă confirmăm programarea la Mecanica Express: ${when}.\nAdresa: Str. Exemplului nr. 13, Constanța.\nPentru modificări ne puteți suna la 0700 001 201.\n\nVă așteptăm!\nMecanica Express`;
    return `mailto:${b.email}?subject=${encodeURIComponent('Confirmare programare Mecanica Express')}&body=${encodeURIComponent(body)}`;
  };
  const STATUS = { noua: 'Nouă', confirmata: 'Confirmată', finalizata: 'Finalizată', anulata: 'Anulată' };

  // Password gate: loading the bookings is the password check.
  async function load() {
    bookings = await api('GET', '/api/bookings');
    render();
  }
  async function open() {
    try { await load(); } catch (e) { return; }
    try { sessionStorage.setItem(SESSION, pin); } catch (e) { /* private mode */ }
    $('#gate').hidden = true; $('#app').hidden = false;
    fillContent();
  }
  function logout(msg) {
    pin = '';
    try { sessionStorage.removeItem(SESSION); } catch (e) { /* private mode */ }
    $('#app').hidden = true; $('#gate').hidden = false;
    $('#gate-err').textContent = msg || '';
    $('#gate-err').hidden = !msg;
  }
  $('#gate-form').addEventListener('submit', e => {
    e.preventDefault();
    pin = $('#gate-in').value.trim();
    open().catch(() => { $('#gate-err').textContent = 'Nu mă pot conecta. Încearcă din nou.'; $('#gate-err').hidden = false; });
  });
  $('#logout').addEventListener('click', () => logout());
  $('#reload').addEventListener('click', () => load().catch(() => {}));
  // New bookings show up on their own
  setInterval(() => { if (pin && !$('#app').hidden && !document.hidden) load().catch(() => {}); }, 30000);

  // Tabs
  $$('[role=tab]').forEach(t => t.addEventListener('click', () => {
    $$('[role=tab]').forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); $('#' + x.getAttribute('aria-controls')).hidden = !on; });
  }));

  // Bookings
  const FILTERS = [['viitoare', 'Următoare'], ['noua', 'Noi'], ['azi', 'Azi'], ['maine', 'Mâine'], ['toate', 'Toate'], ['anulata', 'Anulate']];
  let filter = 'viitoare';
  const match = b => ({
    viitoare: b.date >= today && b.status !== 'anulata' && b.status !== 'finalizata',
    noua: b.status === 'noua',
    azi: b.date === today && b.status !== 'anulata',
    maine: b.date === tomorrow && b.status !== 'anulata',
    toate: true,
    anulata: b.status === 'anulata'
  })[filter];

  function render() {
    const all = bookings;
    const live = all.filter(b => b.status !== 'anulata');
    $('#stats').innerHTML = [
      [all.filter(b => b.status === 'noua').length, 'de confirmat'],
      [live.filter(b => b.date === today).length, 'azi'],
      [live.filter(b => b.date >= today && b.status !== 'finalizata').length, 'următoare']
    ].map(([n, l]) => `<div class="pn-stat"><b>${n}</b><span>${l}</span></div>`).join('');
    $('#filters').innerHTML = FILTERS.map(([k, l]) => `<button type="button" data-f="${k}" aria-pressed="${k === filter}">${l}</button>`).join('');
    const list = all.filter(match).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    $('#list').innerHTML = list.length ? list.map(b => {
      const car = [b.marca, b.model, b.an, b.combustibil].filter(Boolean).join(', ');
      const rows = [
        ['Servicii', (b.services || []).join(', ')],
        ['Mașina', `${car}${b.nr ? ' · ' + b.nr : ''}${b.km ? ' · ' + b.km + ' km' : ''}`],
        b.vin ? ['VIN', b.vin] : null,
        (b.symptoms || []).length || b.detalii ? ['Observații', [(b.symptoms || []).join(', '), b.detalii].filter(Boolean).join('. ')] : null,
        b.telefon ? ['Telefon', b.telefon] : null,
        b.email ? ['Email', b.email] : null,
        ['Primită', `${new Date(b.created).toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${b.canal || ''}${b.demo ? ' · exemplu' : ''}`]
      ].filter(Boolean);
      const acts = [
        b.status === 'noua' ? `<button class="btn btn-primary" type="button" data-act="confirm" data-id="${b.id}">Confirmă</button>` : '',
        b.telefon ? `<a class="btn btn-outline" href="tel:${esc(b.telefon.replace(/[^\d+]/g, ''))}">Sună</a>` : '',
        b.email ? `<a class="btn btn-outline" href="${esc(mailto(b))}">Scrie email</a>` : '',
        b.status === 'confirmata' ? `<button class="btn btn-outline" type="button" data-act="finalizata" data-id="${b.id}">Finalizată</button>` : '',
        b.status !== 'anulata' && b.status !== 'finalizata' ? `<button class="btn btn-quiet" type="button" data-act="anulata" data-id="${b.id}">Anulează</button>` : '',
        b.status === 'anulata' || b.status === 'finalizata' ? `<button class="btn btn-quiet" type="button" data-act="delete" data-id="${b.id}">Șterge</button>` : ''
      ].join('');
      return `<li class="bk-card" data-status="${b.status}"><div class="bk-head"><div><p class="bk-when">${esc(dayText(b.date))}, ${esc(b.time)}</p><p class="bk-who">${esc(b.nume)}${b.vehicul === 'Autoutilitară' ? ' · autoutilitară' : ''}</p></div><span class="pill ${b.status}">${STATUS[b.status]}</span></div><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl><div class="bk-acts">${acts}</div></li>`;
    }).join('') : `<li class="pn-empty">Nicio programare aici.${all.length ? '' : ' Fă o programare de pe site sau apasă „Adaugă programări de exemplu”.'}</li>`;
  }

  $('#filters').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) { filter = b.dataset.f; render(); } });
  $('#list').addEventListener('click', async e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const item = bookings.find(x => x.id === b.dataset.id);
    if (!item) return;
    const act = b.dataset.act;
    if (act === 'delete') {
      if (!confirm(`Ștergi programarea lui ${item.nume}?`)) return;
      try { await api('DELETE', `/api/bookings?id=${encodeURIComponent(item.id)}`); bookings = bookings.filter(x => x !== item); render(); } catch (er) { if (er.message !== '401') fail(); }
      return;
    }
    if (act === 'anulata' && !confirm(`Anulezi programarea lui ${item.nume}?`)) return;
    const status = act === 'confirm' ? 'confirmata' : act;
    b.disabled = true;
    try { Object.assign(item, await api('PATCH', '/api/bookings', { id: item.id, status })); render(); } catch (er) { b.disabled = false; if (er.message !== '401') fail(); }
  });

  // Spreadsheet export
  $('#csv').addEventListener('click', () => {
    const cols = ['date', 'time', 'status', 'nume', 'telefon', 'email', 'vehicul', 'marca', 'model', 'an', 'nr', 'vin', 'km', 'combustibil', 'services', 'symptoms', 'canal', 'created'];
    const cell = v => `"${String(Array.isArray(v) ? v.join(', ') : v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [cols.join(';'), ...bookings.map(b => cols.map(c => cell(b[c])).join(';'))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `programari-${today}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  // Sample bookings so the panel can be shown before anyone books
  $('#demo-data').addEventListener('click', async () => {
    const samples = [
      { date: today, time: '09:30', nume: 'Andrei Popescu', telefon: '0722 111 222', marca: 'Volkswagen', model: 'Passat', an: '2016', combustibil: 'Motorină', km: '212 000', services: ['Revizie / schimb ulei și filtre'], symptoms: ['A venit revizia'] },
      { date: tomorrow, time: '10:00', status: 'noua', nume: 'Maria Ionescu', telefon: '0733 444 555', email: 'maria.ionescu@example.com', marca: 'Dacia', model: 'Duster', an: '2019', combustibil: 'Benzină', nr: 'CT 19 MRI', services: ['Sistem frânare'], symptoms: ['Zgomot la frânare', 'Vibrații în volan sau pedală'] },
      { date: tomorrow, time: '14:30', status: 'noua', nume: 'SC Transport SRL', telefon: '0744 666 777', vehicul: 'Autoutilitară', marca: 'Ford', model: 'Transit', an: '2018', combustibil: 'Motorină', services: ['Turbo', 'EGR'], symptoms: ['Pierdere de putere', 'Fum la evacuare'] }
    ].map(b => ({ canal: 'Site', vehicul: 'Autoturism', demo: true, ...b }));
    try {
      const made = await Promise.all(samples.map(b => api('POST', '/api/bookings', b)));
      // Samples arrive as new; the first one shows a confirmed booking
      await api('PATCH', '/api/bookings', { id: made[0].id, status: 'confirmata' });
      filter = 'viitoare'; await load();
    } catch (er) { if (er.message !== '401') fail(); }
  });

  // Site content
  const form = $('#content-form');
  // Offers: any work, any price. Price types: fixed, "from", percent off, or free text.
  const DEFAULT_OFFERS = [
    { name: 'Schimb ulei și filtru ulei', type: 'from', value: '250', until: '' },
    { name: 'Plăcuțe și discuri de frână, față', type: 'from', value: '300', until: '' },
    { name: 'Plăcuțe și discuri de frână, față și spate', type: 'from', value: '600', until: '' }
  ];
  const TYPES = [['from', 'De la … LEI'], ['fixed', 'Preț fix LEI'], ['percent', 'Reducere %'], ['text', 'Text liber']];
  const priceText = o => ({ from: `de la ${o.value} LEI`, fixed: `${o.value} LEI`, percent: `-${o.value}%`, text: o.value })[o.type] || o.value;
  const offerRow = o => `<li class="of-row">
      <label class="of-name">Lucrare<input data-k="name" value="${esc(o.name)}" placeholder="Ex.: Încărcare freon A/C"></label>
      <label>Tip preț<select data-k="type">${TYPES.map(([k, l]) => `<option value="${k}"${k === o.type ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>Valoare<input data-k="value" value="${esc(o.value)}" placeholder="250"></label>
      <label>Valabilă până la<input data-k="until" type="date" value="${esc(o.until)}"></label>
      <div class="of-foot"><span class="of-prev"></span><button class="of-del" type="button">Șterge</button></div>
    </li>`;
  const rowData = li => Object.fromEntries($$('[data-k]', li).map(i => [i.dataset.k, i.value.trim()]));
  const preview = li => { const o = rowData(li); $('.of-prev', li).textContent = o.value ? `Pe site: ${priceText(o)}` : ''; };
  const offersEl = $('#offers');
  const drawOffers = list => { offersEl.innerHTML = list.map(offerRow).join(''); $$('.of-row', offersEl).forEach(preview); };
  $('#add-offer').addEventListener('click', () => { offersEl.insertAdjacentHTML('beforeend', offerRow({ name: '', type: 'from', value: '', until: '' })); const li = offersEl.lastElementChild; preview(li); $('input', li).focus(); });
  offersEl.addEventListener('input', e => { const li = e.target.closest('.of-row'); if (li) preview(li); });
  offersEl.addEventListener('click', e => { if (e.target.closest('.of-del')) e.target.closest('.of-row').remove(); });

  async function fillContent() {
    let c = {};
    try { c = await api('GET', '/api/content'); } catch (e) { return; }
    $$(':scope > .field input', form).forEach(i => { i.value = c[i.name] || ''; });
    drawOffers(Array.isArray(c.offers) ? c.offers : DEFAULT_OFFERS);
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const c = {};
    $$(':scope > .field input', form).forEach(i => { if (i.value.trim()) c[i.name] = i.value.trim(); });
    c.offers = $$('.of-row', offersEl).map(rowData).filter(o => o.name && o.value).map(o => ({ ...o, price: priceText(o) }));
    try { await api('PUT', '/api/content', c); } catch (er) { if (er.message !== '401') fail(); return; }
    $('#saved').textContent = 'Salvat. Se vede pe site pentru toți vizitatorii.';
    setTimeout(() => { $('#saved').textContent = ''; }, 4000);
  });

  if (pin) open().catch(() => logout());
})();
