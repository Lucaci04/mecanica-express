(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const STORE = 'me-programare';
  // Announcement and offers come from the admin panel (admin.html) through /api/content.
  const applyContent = content => {
    if (content.announce) { const a = $('#announce'); if (a) { a.textContent = content.announce; a.hidden = false; } }
    $$('[data-edit]').forEach(el => { if (content[el.dataset.edit]) el.textContent = content[el.dataset.edit]; });
    // Offers written in the admin panel; expired ones drop off by themselves
    if (Array.isArray(content.offers)) {
      const list = $('.offer-list'), box = $('.offers'), now = new Date().toISOString().slice(0, 10);
      const live = content.offers.filter(o => !o.until || o.until >= now);
      const esc0 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const until = d => { const [y, m, dd] = d.split('-'); return ` <small>până la ${dd}.${m}</small>`; };
      if (list) list.innerHTML = live.map(o => `<li><span>${esc0(o.name)}${o.until ? until(o.until) : ''}</span><strong>${esc0(o.price)}</strong></li>`).join('');
      if (box && !live.length) box.hidden = true;
    }
  };
  fetch('/api/content', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(applyContent).catch(() => { /* opened from disk: keep the built-in text */ });

  // Phone menu
  const menuBtn = $('.menu-btn'), nav = $('#nav');
  if (menuBtn && nav) {
    const setMenu = open => { nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); };
    menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });
    document.addEventListener('click', e => { if (nav.classList.contains('open') && !e.target.closest('.top')) setMenu(false); });
  }

  // Phones see six services first
  const more = $('.svc-more'), svcList = $('#svc-list');
  if (more && svcList) more.addEventListener('click', () => {
    const open = !svcList.classList.contains('open');
    svcList.classList.toggle('open', open);
    more.setAttribute('aria-expanded', String(open));
    more.textContent = open ? 'Arată mai puține' : 'Vezi toate cele 12 servicii';
    if (!open) svcList.scrollIntoView({ block: 'start' });
  });

  /* ---------- Service details ---------- */
  const WHEN = ['ai observat un zgomot, un martor aprins sau ceva ce nu era înainte', 'mașina merge altfel decât de obicei', 'la ultima revizie ți s-a spus că piesa e uzată', 'a venit termenul din cartea de service'];
  const Q_DEVIZ = ['Știu prețul înainte să începeți?', 'Da. După verificare îți spunem ce trebuie făcut, ce piese folosim și cât durează. Lucrul începe doar după ce accepți devizul.'];
  const Q_CONST = ['Pot veni doar ca să vedeți ce are mașina?', 'Sigur. Dacă nu e clar de unde vine problema, o verificare separată te scutește de reparații puse la noroc.'];
  const RATE = 'Autoturism 240 LEI/oră · Autoutilitară 290 LEI/oră';
  const SVC = {
    diag: { lead: 'Când se aprinde un martor, motorul merge neregulat sau mașina nu mai trage ca înainte, începem cu diagnoza. Uneori problema nu se vede cu ochiul liber.',
      when: ['Check Engine sau alt martor aprins pe bord', 'motorul răspunde greu la accelerație', 'vibrații, mers sacadat sau pornire grea', 'consum mai mare ori simptome care vin și pleacă'],
      inc: ['Citim erorile din calculator și le explicăm', 'Urmărim parametrii motorului în timp real', 'Test de frânare pe stand și verificare generală', 'Căutăm scurgeri, jocuri și piese uzate', 'Raport cu ce am găsit și ce recomandăm'],
      price: 'Verificare: autoturism 140 LEI · autoutilitară 190 LEI. Nu o plătești dacă reparația și piesele sunt de la noi.',
      faq: [['Diagnoza înseamnă doar să conectați testerul?', 'Nu. Erorile arată doar unde să căutăm. Le punem cap la cap cu ce simți la volan și cu valorile măsurate.'], ['Ce fac dacă problema apare doar uneori?', 'Notează când apare: la rece, la cald, la viteză mare. Cu aceste detalii și cu o probă pe traseu o găsim mai ușor.']] },
    revizie: { lead: 'La revizie schimbăm uleiul și filtrele potrivite motorului tău și ne uităm peste mașină, ca să prindem din timp ce urmează să cedeze.',
      when: ['ai ajuns la kilometrii sau la data din cartea de service', 'uleiul e închis la culoare sau lipsește', 'filtrele n-au mai fost schimbate de mult', 'pleci la drum lung și vrei liniște'],
      inc: ['Ulei de motor', 'Filtre de ulei, aer, habitaclu și combustibil', 'Ulei de cutie, manuală sau automată', 'Lichid de frână și antigel', 'Verificăm nivelurile și scurgerile', 'Ne uităm la frâne, direcție și suspensie'],
      price: RATE + '. Ofertă: schimb de ulei și filtru de ulei de la 230 LEI (manoperă, autoturisme).',
      faq: [['Ce intră într-o revizie?', 'Depinde de mașină și de kilometri. De obicei uleiul, filtrele și o verificare generală, iar restul îți spunem înainte să facem ceva.'], Q_DEVIZ] },
    frane: { lead: 'Frânele nu se amână. Dacă scârțâie, vibrează sau pedala e moale, vino să le măsurăm și îți spunem exact ce trebuie schimbat.',
      when: ['frânele scârțâie sau se aude metal pe metal', 'volanul ori pedala vibrează la frânare', 'pedala coboară mai mult ca de obicei', 'mașina fuge într-o parte când frânezi'],
      inc: ['Măsurăm plăcuțele și discurile, test pe stand', 'Plăcuțe, discuri, saboți și tamburi', 'Etrieri clasici sau electrici', 'Frână de mână mecanică sau electrică', 'Aerisim instalația și deblocăm etrierii'],
      price: RATE + '. Ofertă: plăcuțe și discuri pe o punte de la 280 LEI, pe ambele punți de la 560 LEI (manoperă, autoturisme).',
      faq: [['Cât de des verific frânele?', 'La fiecare revizie și oricând simți ceva diferit la pedală sau auzi zgomote.'], ['Discurile și plăcuțele trebuie schimbate mereu împreună?', 'Nu neapărat. Măsurăm grosimea discurilor și decidem după cifre, nu după obicei.']] },
    suspensie: { lead: 'Suspensia și direcția țin mașina stabilă pe drum. Găsim exact ce bate sau ce are joc și nu schimbăm piese la grămadă.',
      when: ['bocănituri pe denivelări', 'mașina nu ține linia dreaptă', 'joc în volan', 'cauciucurile se tocesc inegal'],
      inc: ['Verificăm jocurile din direcție și suspensie', 'Bielete, capete de bară, brațe și bucșe', 'Amortizoare, flanșe, arcuri', 'Rulmenți de roată, planetare și burdufuri', 'Caseta de direcție', 'Amortizoarele de la capotă și portbagaj'],
      price: RATE, faq: [Q_DEVIZ, Q_CONST] },
    distributie: { lead: 'Distribuția ține motorul sincronizat. Unele motoare au curea, altele lanț, iar intervalul de schimb diferă de la un model la altul. Dacă se rupe, reparația costă de multe ori mai mult.',
      when: ['ai atins intervalul din cartea de service', 'se aude un zgomot din fața motorului', 'vezi urme de ulei sau antigel în zonă', 'nu știi când s-a schimbat ultima dată'],
      inc: ['Distribuție cu curea sau cu lanț', 'Role, întinzătoare și pinioane', 'Pompa de apă, la motoarele unde e acționată de distribuție', 'Simeringuri de arbore și de ax cu came', 'Calare și reglaj după schimb'],
      price: RATE,
      faq: [['Schimbați și pompa de apă?', 'Dacă la motorul tău pompa e acționată de cureaua de distribuție, de obicei merită schimbată atunci, ca să nu demontăm totul de două ori.'], ['Contează dacă nu știu când s-a schimbat?', 'Da. Fără dovezi, cel mai sigur e să o verificăm și să stabilim împreună când o schimbăm.']] },
    ambreiaj: { lead: 'Când ambreiajul patinează, vibrează la plecare sau treptele intră greu, căutăm cauza reală, ca să nu schimbi piese degeaba.',
      when: ['turația crește, dar mașina nu accelerează pe măsură', 'trepidații când pleci de pe loc', 'miros de ars după o pantă', 'pedala sau schimbătorul se simt altfel'],
      inc: ['Kit de ambreiaj și volantă simplă sau dublă', 'Rulment de presiune și cilindri', 'Comandă hidraulică sau pe cablu, cu reglaj', 'Diagnoză pentru patinare și vibrații', 'Demontare și montare cutie manuală sau automată', 'Verificare tampoane și etanșări, probă la final'],
      price: RATE,
      faq: [['Când trebuie schimbat ambreiajul?', 'Când uzura e confirmată la verificare. La unele mașini se verifică și volanta, și partea hidraulică.'], ['Volanta trebuie schimbată mereu odată cu ambreiajul?', 'Nu. O măsurăm și o schimbăm doar dacă e uzată sau dacă producătorul o cere.']] },
    ac: { lead: 'Dacă aerul nu mai răcește, miroase urât sau geamurile se aburesc greu, verificăm întâi instalația și abia apoi încărcăm freon.',
      when: ['aerul condiționat răcește slab', 'miros neplăcut din ventilație', 'compresorul face zgomot', 'freonul se termină repede după încărcare'],
      inc: ['Verificăm etanșeitatea instalației A/C', 'Încărcare sau completare cu freon R134a', 'Diagnoză și căutare scurgeri', 'Schimb compresor A/C', 'Curățare sau schimb calorifer de încălzire'],
      price: 'Verificare instalație A/C: 90 LEI · Freon R134a: 38 LEI / 100 g · Manoperă: ' + RATE.toLowerCase(),
      faq: [['Ajunge doar să încarc freon?', 'Nu întotdeauna. Dacă instalația pierde, găsim întâi scurgerea, altfel plătești încărcarea de mai multe ori.'], ['Când verific aerul condiționat?', 'Primăvara, înainte de căldură, sau imediat ce observi că răcește mai slab.']] },
    turbo: { lead: 'Mașina a pierdut din putere, scoate fum sau consumă ulei? Aflăm întâi de ce s-a stricat turbina, ca una nouă să nu pățească la fel. Tot atunci verificăm și EGR-ul.',
      when: ['putere scăzută sau fum mult la accelerare', 'martor de motor ori mers neregulat', 'scade nivelul uleiului', 'pornește greu'],
      inc: ['Verificăm turbina, actuatorul și geometria variabilă', 'Conducte de ulei, admisie și intercooler', 'Schimbăm turbina după deviz', 'Curățăm sau schimbăm EGR-ul și admisia', 'Injectoare: demontare, montare, șaibe și garnituri', 'Pompa de combustibil'],
      price: RATE, faq: [Q_DEVIZ, Q_CONST] },
    pornire: { lead: 'Pornește greu sau bateria se descarcă peste noapte? Măsurăm tot circuitul de pornire și încărcare înainte să schimbăm ceva.',
      when: ['mașina pornește greu sau deloc', 'martorul de baterie rămâne aprins', 'bateria se descarcă repede', 'se aude un clinchet la pornire'],
      inc: ['Testăm alternatorul și electromotorul', 'Măsurăm încărcarea și tensiunea', 'Testăm bateria și o schimbăm dacă e cazul', 'Cabluri, conexiuni, curea și role', 'Probă de pornire la final'],
      price: RATE, faq: [Q_DEVIZ, Q_CONST] },
    racire: { lead: 'Temperatura urcă, pierzi antigel sau caloriferul nu încălzește? Verificăm tot circuitul de răcire, pentru că defectul poate fi în mai multe locuri.',
      when: ['acul temperaturii urcă', 'scade antigelul sau apare ulei în vasul de expansiune', 'în habitaclu nu se face cald', 'martor de temperatură aprins'],
      inc: ['Verificăm circuitul de răcire', 'Radiator: demontare, spălare, montare', 'Antigel nou și aerisire', 'Caloriferul de încălzire', 'Remediem scurgerile de ulei și lichide', 'Probă de presiune și temperatură'],
      price: RATE, faq: [Q_DEVIZ, Q_CONST] },
    bujii: { lead: 'Rateurile, mersul neregulat sau pornirea grea pot veni de la aprindere. Verificăm bujiile, bobinele și fișele, apoi probăm motorul.',
      when: ['motorul are rateuri', 'pornește greu, mai ales dimineața', 'consumă mai mult', 'a venit termenul pentru bujii'],
      inc: ['Bujii la motoarele pe benzină', 'Bujii incandescente la diesel', 'Bobine de inducție', 'Fișe de bujii', 'Diagnoză pentru rateuri și pornire grea', 'Probă de funcționare'],
      price: RATE, faq: [Q_DEVIZ, Q_CONST] },
    grea: { lead: 'La problemele grele de motor desfacem chiulasa sau motorul, după ce măsurăm compresia, ascultăm zgomotele și vedem cât ulei consumă.',
      when: ['zgomote din interiorul motorului', 'consum mare de ulei', 'compresie mică pe unul sau mai mulți cilindri', 'suspiciune de garnitură de chiulasă arsă'],
      inc: ['Garnituri de motor și de chiulasă', 'Demontare și montare chiulasă', 'Supape, ghiduri și simeringuri de supapă', 'Ax cu came și tacheți', 'Segmenți, cuzineți, biele și arbore cotit', 'Pompa de ulei și circuitul de ungere'],
      price: 'Autoturism 290 LEI/oră · Autoutilitară 340 LEI/oră', faq: [Q_DEVIZ, Q_CONST] }
  };
  const sheet = $('#svc-sheet');
  if (sheet) {
    const list = a => `<ul class="sheet-list">${a.map(x => `<li>${x}</li>`).join('')}</ul>`;
    $$('[data-svc]').forEach(btn => btn.addEventListener('click', () => {
      const d = SVC[btn.dataset.svc], card = btn.closest('.svc-item');
      if (!d || !sheet.showModal) return;
      const title = $('h3', card).textContent;
      $('#sheet-body').innerHTML = `<span class="sheet-ico">${$('.ico', card).outerHTML}</span><h2 id="sheet-title">${title}</h2><p class="sheet-lead">${d.lead}</p>`
        + `<h3>Când e momentul să vii?</h3>${list(d.when)}<h3>Ce include</h3>${list(d.inc)}`
        + `<p class="sheet-price"><strong>Tarif manoperă</strong>${d.price}</p>`
        + `<h3>Întrebări frecvente</h3>${d.faq.map(([q, a]) => `<details class="faq-item"><summary>${q}<span class="faq-ico" aria-hidden="true"></span></summary><p>${a}</p></details>`).join('')}`;
      $('#sheet-book').dataset.book = $('.svc-book', card).dataset.book;
      sheet.showModal(); sheet._opener = btn;
      $('#sheet-body').scrollTop = 0;
    }));
    $('#sheet-book').addEventListener('click', () => { sheet._opener = null; sheet.close(); });
  }

  /* ---------- Booking ---------- */
  const form = $('#bk');
  // Every option of the original booking form, grouped so it reads fast on a phone
  const SERVICE_GROUPS = [
    ['Verificare', ['Constatare uzuri / defecțiuni', 'Diagnoză computerizată']],
    ['Întreținere', ['Revizie / schimb ulei și filtre']],
    ['Frâne, direcție, suspensie', ['Sistem frânare', 'Articulații direcție', 'Suspensii / amortizoare', 'Planetare', 'Rulmenți']],
    ['Motor', ['Distribuție', 'Turbo', 'Injectoare', 'EGR', 'Admisie', 'Evacuare', 'Bujii / aprindere', 'Mecanică grea motor']],
    ['Transmisie', ['Ambreiaj', 'Cutie de viteze']],
    ['Climatizare și răcire', ['Aer condiționat', 'Sistem răcire motor', 'Eliminare scurgeri']],
    ['Electric', ['Alternator', 'Electromotor', 'Baterie']],
    ['Altele', ['Altceva']]
  ];
  const SYMPTOMS = ['Martor aprins pe bord', 'Zgomot la frânare', 'Vibrații în volan sau pedală', 'Trage într-o parte', 'Bătăi pe denivelări', 'Pierdere de putere', 'Fum la evacuare', 'Consumă ulei', 'Scurgeri sub mașină', 'Se încălzește motorul', 'Pornește greu', 'Ambreiajul patinează', 'Schimbă greu vitezele', 'A/C nu răcește', 'Miros neobișnuit', 'Merge neregulat / rateuri', 'A venit revizia', 'Plec la drum lung'];
  const STEP_NAMES = ['Serviciu', 'Zi și oră', 'Mașina și datele tale', 'Trimite'];
  const fmtDay = new Intl.DateTimeFormat('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' });
  const strip = s => s.replace(/\.$/, '');
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  if (form) {
    const steps = $$('.bk-step', form);
    const bars = $$('.bk-progress li', form);
    const live = $('#bk-live');
    const next = $('#bk-next'), back = $('#bk-back');
    const done = $('#bk-done');
    let step = 1;
    let state = { services: [], date: '', time: '' };

    // Service chips
    let n = 0;
    $('#bk-services').innerHTML = SERVICE_GROUPS.map(([g, list]) => `<div class="chip-group" role="group" aria-label="${esc(g)}"><p class="chip-label">${esc(g)}</p><div class="chips">${list.map(s => `<label class="chip"><input type="checkbox" name="serviciu" value="${esc(s)}" id="svc-${n++}"><span>${esc(s)}</span></label>`).join('')}</div></div>`).join('');
    $('#bk-symptoms').innerHTML = SYMPTOMS.map(s => `<label class="chip"><input type="checkbox" name="simptom" value="${esc(s)}"><span>${esc(s)}</span></label>`).join('');

    // Years
    const yearSel = $('#bk-an');
    const thisYear = new Date().getFullYear();
    yearSel.innerHTML = '<option value="">Alege anul</option>' + Array.from({ length: thisYear - 1989 }, (_, i) => `<option>${thisYear - i}</option>`).join('') + '<option value="înainte de 1990">înainte de 1990</option>';

    // Opening hours: Mon–Fri 08:30–17:30, Sat 09:00–13:00, Sun closed. Slots leave time for the car to be received.
    const slotsFor = d => {
      const wd = d.getDay();
      if (wd === 0) return [];
      const [from, to] = wd === 6 ? [9 * 60, 12 * 60] : [8 * 60 + 30, 16 * 60 + 30];
      const out = [];
      const now = new Date(), sameDay = iso(d) === iso(now);
      const min = now.getHours() * 60 + now.getMinutes() + 60;
      for (let m = from; m <= to; m += 30) if (!sameDay || m >= min) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
      return out;
    };
    const daysEl = $('#bk-days'), slotsEl = $('#bk-slots');
    const days = [];
    for (let i = 0, d = new Date(); days.length < 24 && i < 40; i++) {
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
      if (slotsFor(day).length) days.push(day);
    }
    const dayShort = new Intl.DateTimeFormat('ro-RO', { weekday: 'short' }), monShort = new Intl.DateTimeFormat('ro-RO', { month: 'short' });
    const todayIso = iso(new Date()), tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    daysEl.innerHTML = days.map(d => {
      const k = iso(d);
      const top = k === todayIso ? 'azi' : k === iso(tmr) ? 'mâine' : strip(dayShort.format(d));
      return `<label class="day"><input type="radio" name="zi" value="${k}" aria-label="${esc(fmtDay.format(d))}"><span><small>${top}</small><b>${d.getDate()}</b><i>${strip(monShort.format(d))}</i></span></label>`;
    }).join('');
    const renderSlots = () => {
      if (!state.date) { slotsEl.innerHTML = '<p class="slots-empty">Alege mai întâi ziua.</p>'; return; }
      const [y, m, dd] = state.date.split('-').map(Number);
      const list = slotsFor(new Date(y, m - 1, dd));
      if (!list.includes(state.time)) state.time = '';
      const group = (label, arr) => arr.length ? `<div class="slot-group"><p>${label}</p><div class="slot-grid">${arr.map(t => `<label class="slot"><input type="radio" name="ora" value="${t}"${t === state.time ? ' checked' : ''}><span>${t}</span></label>`).join('')}</div></div>` : '';
      slotsEl.innerHTML = group('Dimineața', list.filter(t => t < '12:00')) + group('După‑amiaza', list.filter(t => t >= '12:00'));
    };
    daysEl.addEventListener('change', e => { state.date = e.target.value; renderSlots(); save(); hideErr(2); });
    slotsEl.addEventListener('change', e => { state.time = e.target.value; save(); hideErr(2); });
    $$('[data-days]').forEach(b => b.addEventListener('click', () => daysEl.scrollBy({ left: +b.dataset.days * daysEl.clientWidth * .8, behavior: 'smooth' })));

    // Field helpers
    const val = n => (form.elements[n] && form.elements[n].value || '').trim();
    const radio = n => { const r = $(`input[name="${n}"]:checked`, form); return r ? r.value : ''; };
    const checkedServices = () => $$('input[name="serviciu"]:checked', form).map(i => i.value);
    const checkedSymptoms = () => $$('input[name="simptom"]:checked', form).map(i => i.value);
    const notes = () => [checkedSymptoms().join(', '), val('detalii')].filter(Boolean).join('. ');
    const phoneOk = p => { const c = p.replace(/[\s().\/-]/g, ''); return /^(\+40|0040|40|0)[237]\d{8}$/.test(c) || /^\+\d{9,15}$/.test(c); };
    const errOf = n => $('.bk-err', steps[n - 1]);
    const hideErr = n => { const e = errOf(n); if (e) e.hidden = true; };
    $('#bk-nr').addEventListener('input', e => { const i = e.target, p = i.selectionStart; i.value = i.value.toUpperCase(); i.setSelectionRange(p, p); });
    // VIN: 17 characters, never I, O or Q
    $('#bk-vin').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''); });
    $('#bk-km').addEventListener('input', e => { const n = e.target.value.replace(/\D/g, '').slice(0, 7); e.target.value = n.replace(/\B(?=(\d{3})+(?!\d))/g, ' '); });

    // Draft: what the visitor typed stays in their browser, so a reload or a call does not lose it.
    const FIELDS = ['detalii', 'marca', 'model', 'an', 'nr', 'vin', 'km', 'nume', 'telefon', 'email'];
    const save = () => {
      const d = { services: checkedServices(), symptoms: checkedSymptoms(), vehicul: radio('vehicul'), combustibil: radio('combustibil'), date: state.date, time: state.time };
      FIELDS.forEach(f => { d[f] = val(f); });
      try { localStorage.setItem(STORE, JSON.stringify(d)); } catch (e) { /* storage unavailable */ }
    };
    const restore = () => {
      let d = null;
      try { d = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { d = null; }
      if (!d) return;
      (d.services || []).forEach(s => { const i = $$('input[name="serviciu"]', form).find(x => x.value === s); if (i) i.checked = true; });
      (d.symptoms || []).forEach(s => { const i = $$('input[name="simptom"]', form).find(x => x.value === s); if (i) i.checked = true; });
      ['vehicul', 'combustibil'].forEach(n => { const i = d[n] && $(`input[name="${n}"][value="${CSS.escape(d[n])}"]`, form); if (i) i.checked = true; });
      FIELDS.forEach(f => { if (d[f] && form.elements[f]) form.elements[f].value = d[f]; });
      const dayInput = d.date && $(`input[name="zi"][value="${d.date}"]`, form);
      if (dayInput) { dayInput.checked = true; state.date = d.date; state.time = d.time || ''; renderSlots(); }
    };
    form.addEventListener('input', e => { if (e.target.name !== 'zi' && e.target.name !== 'ora') save(); if (e.target.matches('[aria-invalid]')) e.target.removeAttribute('aria-invalid'); });
    form.addEventListener('change', e => { if (e.target.name === 'serviciu') hideErr(1); if (e.target.name === 'acord') hideErr(4); save(); });

    // Validation per step
    const validate = n => {
      const e = errOf(n);
      let ok = true, first = null;
      if (n === 1) { ok = checkedServices().length > 0; first = $('input[name="serviciu"]', form); }
      if (n === 2) { ok = !!(state.date && state.time); first = state.date ? $('input[name="ora"]', form) : $('input[name="zi"]', form); if (e) e.textContent = state.date ? 'Alege ora.' : 'Alege ziua și ora.'; }
      if (n === 3) {
        const bad = [];
        ['marca', 'model', 'nume'].forEach(f => { if (!val(f)) bad.push(f); });
        // A colleague confirms by phone or email, so at least one of them is needed
        const tel = val('telefon'), em = val('email');
        const noContact = !tel && !em;
        if (noContact || (tel && !phoneOk(tel))) bad.push('telefon');
        if (noContact || (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))) bad.push('email');
        if (val('vin') && val('vin').length !== 17) bad.push('vin');
        ['marca', 'model', 'vin', 'nume', 'telefon', 'email'].forEach(f => form.elements[f].setAttribute('aria-invalid', String(bad.includes(f))));
        ok = !bad.length;
        const only = f => bad.length === 1 && bad[0] === f;
        if (e) e.textContent = noContact && bad.length === 2 ? 'Lasă un număr de telefon sau o adresă de email, ca să te putem contacta.' : bad.includes('telefon') && tel ? 'Verifică numărul de telefon (ex.: 0722 123 456).' : only('email') ? 'Verifică adresa de email.' : only('vin') ? `Seria de șasiu are 17 caractere (ai scris ${val('vin').length}).` : noContact ? 'Completează marca, modelul, numele și un telefon sau email.' : 'Completează marca, modelul și numele.';
        first = bad.length ? form.elements[bad[0]] : null;
      }
      if (n === 4) { ok = $('#bk-acord').checked; first = $('#bk-acord'); }
      if (e) e.hidden = ok;
      if (!ok && first) first.focus({ preventScroll: false });
      return ok;
    };

    const show = (n, focus = true) => {
      step = n;
      steps.forEach((s, i) => { s.hidden = i !== n - 1; });
      bars.forEach((b, i) => { b.classList.toggle('on', i === n - 1); b.classList.toggle('done', i < n - 1); });
      back.hidden = n === 1;
      form.classList.toggle('is-final', n === 4);
      next.firstChild.textContent = n === 3 ? 'Vezi rezumatul' : 'Continuă';
      if (n === 4) renderSummary();
      if (n === 2 && state.date) { const c = $('input[name="zi"]:checked', form); if (c) c.parentElement.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      live.textContent = `Pasul ${n} din 4: ${STEP_NAMES[n - 1]}`;
      $('#bk-stepname').textContent = `Pasul ${n} din 4 · ${STEP_NAMES[n - 1]}`;
      if (focus) {
        const top = form.getBoundingClientRect().top;
        if (top < 70 || top > innerHeight * .5) form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
        $('.bk-title', steps[n - 1]).focus({ preventScroll: true });
      }
    };
    form.addEventListener('submit', e => { e.preventDefault(); if (step < 4 && validate(step)) show(step + 1); });
    back.addEventListener('click', () => show(Math.max(1, step - 1)));

    const whenText = () => {
      if (!state.date) return '';
      const [y, m, d] = state.date.split('-').map(Number);
      const s = fmtDay.format(new Date(y, m - 1, d));
      return `${s.charAt(0).toUpperCase() + s.slice(1)}, ora ${state.time}`;
    };
    const carText = () => [val('marca'), val('model'), val('an'), radio('combustibil')].filter(Boolean).join(', ');

    function renderSummary() {
      const rows = [
        ['Servicii', checkedServices().join(', '), 1],
        ['Programare', whenText(), 2],
        ['Mașina', `${carText()}${val('nr') ? ' · ' + val('nr') : ''}${val('km') ? ' · ' + val('km') + ' km' : ''} (${radio('vehicul')})`, 3],
        ['Contact', [val('nume'), val('telefon'), val('email')].filter(Boolean).join(' · '), 3]
      ];
      if (val('vin')) rows.splice(3, 0, ['Serie șasiu', val('vin'), 3]);
      if (notes()) rows.push(['Observații', notes(), 3]);
      $('#bk-sum').innerHTML = rows.map(([k, v, s]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd><button type="button" data-goto="${s}">Modifică</button></div>`).join('');
      // Published labour rates, as a guide.
      const van = radio('vehicul') === 'Autoutilitară';
      const sv = checkedServices();
      const lines = [[`Constatare / diagnoză`, van ? '200 LEI' : '150 LEI']];
      if (sv.includes('Mecanică grea motor')) lines.push(['Manoperă mecanică grea', van ? '350 LEI/oră' : '300 LEI/oră']);
      if (sv.some(s => !['Mecanică grea motor', 'Constatare uzuri / defecțiuni', 'Diagnoză computerizată', 'Altceva'].includes(s))) lines.push(['Manoperă mecanică', van ? '300 LEI/oră' : '250 LEI/oră']);
      if (!van && sv.includes('Revizie / schimb ulei și filtre')) lines.push(['Ofertă: schimb ulei și filtru', 'de la 250 LEI']);
      if (!van && sv.includes('Sistem frânare')) lines.push(['Ofertă: plăcuțe și discuri față', 'de la 300 LEI']);
      if (sv.includes('Aer condiționat')) lines.push(['Testare instalație A/C', '100 LEI']);
      $('#bk-est').innerHTML = `<strong>Tarife orientative</strong>${lines.map(([a, b]) => `<p><span>${a}</span><span>${b}</span></p>`).join('')}<span class="est-note">Verificarea nu se plătește dacă repari la noi cu piese de la noi. Costul final se stabilește prin deviz, după constatare.</span>`;
    }
    $('#bk-sum').addEventListener('click', e => { const b = e.target.closest('[data-goto]'); if (b) show(+b.dataset.goto); });

    // The request goes straight to the service; a colleague confirms by phone or email.
    const sendBtn = $('#bk-send'), sendErr = $('#bk-send-err');
    sendBtn.addEventListener('click', async () => {
      if (!validate(4)) return;
      sendErr.hidden = true;
      sendBtn.disabled = true;
      try {
        const r = await fetch('/api/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
          canal: 'Site', services: checkedServices(), symptoms: checkedSymptoms(), date: state.date, time: state.time,
          vehicul: radio('vehicul'), combustibil: radio('combustibil'), marca: val('marca'), model: val('model'), an: val('an'), nr: val('nr'), vin: val('vin'), km: val('km'),
          nume: val('nume'), telefon: val('telefon'), email: val('email') }) });
        if (!r.ok) throw new Error(String(r.status));
      } catch (er) {
        sendErr.hidden = false;
        sendBtn.disabled = false;
        return;
      }
      sendBtn.disabled = false;
      const how = val('telefon') && val('email') ? 'te sună sau îți scrie pe email' : val('telefon') ? `te sună la ${val('telefon')}` : `îți scrie la ${val('email')}`;
      $('#bk-done-text').textContent = `Mulțumim, ${val('nume').split(' ')[0]}! Am primit cererea pentru ${whenText().toLowerCase()}. Un coleg din service ${how} ca să confirme programarea.`;
      steps.forEach(s => { s.hidden = true; });
      form.classList.add('is-done');
      done.hidden = false;
      done.focus({ preventScroll: true });
      live.textContent = 'Cererea de programare a fost trimisă.';
    });

    // Calendar file for the requested slot
    $('#bk-ics').addEventListener('click', () => {
      const [y, m, d] = state.date.split('-').map(Number);
      const [hh, mm] = state.time.split(':').map(Number);
      const t = (h, mi) => `${y}${pad(m)}${pad(d)}T${pad(h)}${pad(mi)}00`;
      const endM = hh * 60 + mm + 60;
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ServiceRapidDemo//Programare//RO', 'BEGIN:VEVENT',
        `UID:${Date.now()}@https://mecanica-express.example/`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
        `DTSTART:${t(hh, mm)}`, `DTEND:${t(Math.floor(endM / 60), endM % 60)}`,
        `SUMMARY:Service auto - Mecanica Express`,
        `DESCRIPTION:${checkedServices().join(', ')} (de confirmat cu service-ul). Tel. 0700 001 201`,
        'LOCATION:Str. Exemplului nr. 13\\, 900000 Constanța', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
      a.download = 'programare-quick-service-auto.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    $('#bk-again').addEventListener('click', () => {
      $$('input[name="serviciu"], input[name="simptom"]', form).forEach(i => { i.checked = false; });
      $('#bk-acord').checked = false;
      state.date = ''; state.time = '';
      $$('input[name="zi"]', form).forEach(i => { i.checked = false; });
      renderSlots(); save();
      form.classList.remove('is-done');
      done.hidden = true;
      show(1);
    });

    // "Programează" buttons elsewhere preselect the service
    $$('[data-book], #sheet-book').forEach(b => b.addEventListener('click', () => {
      const want = (b.dataset.book || '').split('|');
      const picked = $$('input[name="serviciu"]', form).filter(x => want.includes(x.value));
      picked.forEach(i => { i.checked = true; });
      if (picked.length) { save(); hideErr(1); }
      if (form.classList.contains('is-done')) $('#bk-again').click();
      if (b.tagName === 'BUTTON') { show(1, false); $('#programare').scrollIntoView({ behavior: 'smooth' }); }
      else show(1, false);
    }));

    restore();
    show(1, false);
  }

  // The Google map loads only on request.
  $$('[data-load-map]').forEach(btn => btn.addEventListener('click', () => {
    const map = $('#map');
    const frame = document.createElement('iframe');
    frame.title = 'Harta: Mecanica Express, Str. Exemplului nr. 13, Constanța';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'no-referrer-when-downgrade';
    frame.src = 'https://www.google.com/maps/search/?api=1&query=Constan%C8%9Ba' + encodeURIComponent('MECANICA EXPRESS, Str. Exemplului nr. 13, 900000 Constanța') + '&z=16&hl=ro&output=embed';
    map.replaceChildren(frame);
  }));

  // Dialogs
  $$('[data-dialog]').forEach(btn => btn.addEventListener('click', () => {
    const d = document.getElementById(btn.dataset.dialog);
    if (d && d.showModal) { d.showModal(); d._opener = btn; }
  }));
  $$('dialog').forEach(d => {
    $('[data-close]', d).addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
    d.addEventListener('close', () => d._opener && d._opener.focus());
  });

  // Sections rise into view once
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  // Reviews: two bands that drift endlessly in opposite directions; hover, focus or a touch holds them.
  const track = $('#reviews-track'), marquee = $('#rv-marquee');
  if (track && marquee) {
    const items = $$('.review', track);
    items.forEach(li => $$('.review-avatar img', li).forEach(img => img.addEventListener('error', () => img.remove())));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(hover: hover) and (pointer: fine)').matches && items.length > 3) {
      const half = Math.ceil(items.length / 2);
      const groups = [items.slice(0, half), items.slice(half)];
      const rows = groups.map((g, k) => {
        const row = document.createElement('div');
        row.className = 'rv-row' + (k ? ' rev' : '');
        const ul = document.createElement('ul');
        ul.className = 'rv-track';
        ul.setAttribute('aria-label', k ? 'Recenzii de 5 stele de pe Google, continuare' : 'Recenzii de 5 stele de pe Google');
        g.forEach(li => ul.appendChild(li));
        // A copy of the band makes the loop seamless; screen readers and keyboards skip it.
        g.forEach(li => { const c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); $$('a,button', c).forEach(x => x.tabIndex = -1); $$('.review-avatar img', c).forEach(img => img.addEventListener('error', () => img.remove())); ul.appendChild(c); });
        row.appendChild(ul);
        // Touch: hold while the finger is down, and a moment after.
        let t = 0;
        row.addEventListener('touchstart', () => { clearTimeout(t); row.classList.add('held'); }, { passive: true });
        row.addEventListener('touchend', () => { t = setTimeout(() => row.classList.remove('held'), 2500); }, { passive: true });
        return row;
      });
      track.replaceWith(...rows);
      // Same reading speed on every screen: about 38 px per second.
      const pace = () => rows.forEach(r => { const ul = r.firstChild; ul.style.setProperty('--dur', (ul.scrollWidth / 2 / 38).toFixed(1) + 's'); });
      pace();
      addEventListener('resize', () => { clearTimeout(pace.t); pace.t = setTimeout(pace, 200); });
      // Rest off screen and in background tabs.
      if ('IntersectionObserver' in window) new IntersectionObserver(es => rows.forEach(r => { r.firstChild.style.animationPlayState = es[0].isIntersecting ? '' : 'paused'; })).observe(marquee);
    }
  }

  // Phone call bar: only after the hero's button has left the screen, and never over the booking form.
  const bar = $('.callbar'), heroCta = $('.hero-actions'), booking = $('#programare');
  if (bar && heroCta) {
    let raf = 0;
    const upd = () => {
      raf = 0;
      const pastHero = heroCta.getBoundingClientRect().bottom < 0;
      const r = booking ? booking.getBoundingClientRect() : null;
      const inBooking = r ? r.top < innerHeight * .85 && r.bottom > 0 : false;
      bar.classList.toggle('is-on', pastHero && !inBooking);
    };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(upd); }, { passive: true });
    addEventListener('resize', upd);
    upd();
  }
})();
