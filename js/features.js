/* Alto Urbano: momentos, comparador, kit de decants y Círculo.
   Usa la API que expone app.js en window.AU. */
(() => {
const AU = window.AU;
const {$, $$, P, byId, clp, decant, TIME, REDUCED, FINE} = AU;

/* a real bottle flies from where it was picked to where it lands (kit slot, compare bar) */
function fly(src, fromEl, toEl){
  if (REDUCED || !fromEl || !toEl) return Promise.resolve();
  const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
  if (!a.height || !b.height) return Promise.resolve();
  const img = new Image();
  img.src = src; img.className = 'flyer'; img.alt = '';
  Object.assign(img.style, {left:a.left + 'px', top:a.top + 'px', height:a.height + 'px'});
  document.body.appendChild(img);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const s = Math.min(1, b.height * .8 / a.height);
  return new Promise(done => gsap.timeline({onComplete:() => { img.remove(); done(); }})
    .to(img, {x:dx * .5, y:dy * .5 - 90, scale:(1 + s) / 2, rotation:-8, duration:.38, ease:'power2.out'})
    .to(img, {x:dx, y:dy, scale:s, rotation:0, duration:.38, ease:'power2.in'}));
}

/* =====================================================================
   FAMILIAS — por ingrediente, con foto real
   ===================================================================== */
if ($('#scentsGrid')) {
  const scentsGrid = $('#scentsGrid');
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  /* every family ranks the collection by what each perfume is really made of (its notes);
     the bottles shown are handed out in turns so no perfume appears on two cards */
  const FAMS = window.AU_SCENTS.map(f => {
    const ranked = P.map(p => ({p, ...window.AU_scentScore(p, f)})).filter(r => r.score >= 3).sort((a, b) => b.score - a.score);
    const freq = {};
    ranked.forEach(r => r.notes.forEach(n => { freq[n] = (freq[n] || 0) + 1; }));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n);
    return {f, ranked, top, show:[]};
  });
  const usedScent = new Set();
  for (let round = 0; round < 4; round++) FAMS.forEach(F => {
    const r = F.ranked.find(x => !usedScent.has(x.p.id)); if (r) { usedScent.add(r.p.id); F.show.push(r.p); }
  });
  scentsGrid.innerHTML = FAMS.map(({f, ranked, top, show}) => {
    const list = ranked.map(r => r.p);
    const names = top.map((t, i) => i ? t : cap(t));
    const label = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}` : (names[0] || '');
    return `<button class="scent" data-scent="${f.id}" data-hover>
      <span class="sc-head"><small>Fragancias</small><b>${f.title}</b></span>
      <span class="sc-photo" aria-hidden="true"><img src="${f.img}" alt="" loading="lazy"></span>
      <span class="sc-info">
        <span class="sc-bottles" aria-hidden="true">${show.map(p => `<img src="${p.cut}" alt="" title="${p.name}">`).join('')}</span>
        <span class="sc-notes">${label}</span>
        <span class="sc-count">${list.length} perfumes · Ver todos</span>
      </span>
    </button>`;
  }).join('');
  scentsGrid.addEventListener('click', e => {
    const b = e.target.closest('[data-scent]'); if (!b) return;
    AU.setScent(b.dataset.scent);
  });
}

/* =====================================================================
   MOMENTOS — explorar por ocasión
   ===================================================================== */
if ($('#momentsGrid')) {
  const momentsGrid = $('#momentsGrid');
  /* three different bottles per occasion, never repeated between cards; best sellers and other houses first */
  const usedMoment = new Set();
  const MOMS = window.AU_MOMENTS.map(m => ({m, list:P.filter(p => (p.moments || []).includes(m.id)), show:[]}));
  const pref = p => (p.badge ? 2 : 0) + (p.hero ? 1 : 0);
  for (let round = 0; round < 3; round++) MOMS.forEach(M => {
    const houses = new Set(M.show.map(p => p.house));
    const pool = M.list.filter(p => !usedMoment.has(p.id)).sort((a, b) => (houses.has(a.house) - houses.has(b.house)) || pref(b) - pref(a));
    if (pool[0]) { usedMoment.add(pool[0].id); M.show.push(pool[0]); }
  });
  momentsGrid.innerHTML = MOMS.map(({m, list, show}) => {
    const from = Math.min(...list.map(p => decant(p, 5)));
    return `<button class="moment m-${m.tone}" data-moment="${m.id}" data-hover>
      <span class="m-glow" aria-hidden="true"></span>
      <span class="m-bottles" aria-hidden="true">${show.map((p, k) => { const off = k - (show.length - 1) / 2;
        return `<img src="${p.cut}" alt="" loading="lazy" style="--k:${off};z-index:${10 - Math.abs(off) * 2}">`; }).join('')}</span>
      <span class="m-ledge" aria-hidden="true"></span>
      <span class="m-copy"><b>${m.title}</b><span>${m.text}</span><small>${list.length} perfumes · decant desde ${clp(from)}</small></span>
    </button>`;
  }).join('');
  momentsGrid.addEventListener('click', e => {
    const b = e.target.closest('[data-moment]'); if (!b) return;
    AU.setMoment(b.dataset.moment);
  });
}

/* adelanto del comparador: tres perfumes con lo esencial a la vista */
const teaserGrid = $('#teaserGrid');
if (teaserGrid) {
  const PROJ = {5:'Muy alta', 4:'Notable', 3:'Moderada'};
  teaserGrid.innerHTML = ['erbapura', 'amberoudgold', 'gosroyale'].map(byId).map(p => `<article class="t-card">
    <div class="t-img" data-open-id="${p.id}"><img src="${p.cut}" alt="${p.house} ${p.name}" loading="lazy"></div>
    <p class="t-house">${p.house}</p><h3>${p.name}</h3>
    <p class="t-price">${clp(p.price)} <small>${p.ml} ml · decant 5 ml ${clp(decant(p, 5))}</small></p>
    <dl class="t-specs">
      <div><dt>Familia olfativa</dt><dd>${p.accords.slice(0, 2).map(a => a[0]).join(' · ')}</dd></div>
      <div><dt>Proyección</dt><dd>${PROJ[p.sillage] || 'Moderada'}</dd></div>
      <div><dt>Temporada</dt><dd>${p.seasons.slice(0, 2).join(' · ')}</dd></div>
    </dl>
    <button class="t-cmp" data-compare="${p.id}" aria-pressed="false">+ Comparar</button>
  </article>`).join('');
  teaserGrid.addEventListener('click', e => { const o = e.target.closest('[data-open-id]'); if (o) AU.openModal(o.dataset.openId); });
}

/* =====================================================================
   COMPARADOR — hasta 3 perfumes lado a lado
   ===================================================================== */
const MAX = 3, cmp = [];
const cmpBar = $('#cmpBar'), cmpSlots = $('#cmpSlots'), cmpOpen = $('#cmpOpen');
const cmpPanel = $('#cmpPanel'), cmpTable = $('#cmpTable'), cmpFoot = $('#cmpFoot');
/* scent profile from the main accords (0–100, the strongest accord in each group) */
const DIMS = [
  ['Dulce', ['Dulce', 'Avainillado', 'Caramelo', 'Miel', 'Cacao']],
  ['Frutal', ['Frutal']],
  ['Fresco', ['Cítrico', 'Verde', 'Aromático', 'Fresco especiado', 'Lavanda']],
  ['Amaderado', ['Amaderado', 'Tabaco', 'Cuero', 'Incienso']],
  ['Ámbar y especias', ['Ámbar', 'Especiado', 'Cálido especiado']],
];
const dim = (p, keys) => Math.max(0, ...p.accords.filter(([a]) => keys.includes(a)).map(([, v]) => v));
const perMl = p => Math.round(p.price / p.ml / 10) * 10;
/* index of the single best value, or -1 when there is a tie */
const bestOf = (vals, better = 'max') => {
  const best = better === 'max' ? Math.max(...vals) : Math.min(...vals);
  return vals.filter(v => v === best).length === 1 && best > 0 ? vals.indexOf(best) : -1;
};

function syncCompare(){
  $$('[data-compare]').forEach(b => {
    const on = cmp.includes(b.dataset.compare);
    b.setAttribute('aria-pressed', on);
    b.textContent = on ? '✓ Comparando' : '+ Comparar';
  });
  cmpSlots.innerHTML = Array.from({length:MAX}, (_, i) => {
    const p = byId(cmp[i]);
    return p ? `<button class="cmp-slot" data-cmp-remove="${p.id}" aria-label="Quitar ${p.name} de la comparación"><img src="${p.cut}" alt=""><i aria-hidden="true">×</i></button>`
             : '<span class="cmp-slot empty" aria-hidden="true"></span>';
  }).join('');
  cmpOpen.disabled = cmp.length < 2;
  cmpOpen.textContent = cmp.length < 2 ? 'Elige 1 más' : `Comparar ${cmp.length}`;
  const show = cmp.length > 0;
  cmpBar.classList.toggle('show', show);
  cmpBar.inert = !show;
  document.documentElement.classList.toggle('cmp-on', show);
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-compare]');
  if (t) {
    const id = t.dataset.compare, i = cmp.indexOf(id);
    if (i >= 0) { cmp.splice(i, 1); syncCompare(); return; }
    if (cmp.length >= MAX) { AU.showToast('Puedes comparar hasta 3 perfumes. Quita uno para sumar otro.'); return; }
    cmp.push(id); syncCompare();
    const holder = t.closest('.card, .t-card'), src = holder && $('.stage img, .stage .bottle, .t-img img', holder);
    const slot = $$('.cmp-slot', cmpSlots)[cmp.length - 1];
    if (slot) { gsap.set(slot.firstElementChild, {autoAlpha:0}); fly(byId(id).cut, src, slot).then(() => gsap.to(slot.firstElementChild, {autoAlpha:1, duration:.2})); }
    return;
  }
  const r = e.target.closest('[data-cmp-remove]');
  if (r) { cmp.splice(cmp.indexOf(r.dataset.cmpRemove), 1); syncCompare(); }
});
$('#cmpClear').onclick = () => { cmp.length = 0; syncCompare(); };
cmpOpen.onclick = () => openCompare();

function openCompare(){
  if (cmp.length < 2) return;
  const cols = cmp.map(byId), n = cols.length;
  const verdicts = [
    ['Más intenso', bestOf(cols.map(p => p.longevity + p.sillage))],
    ['Más fresco', bestOf(cols.map(p => dim(p, DIMS[2][1])))],
    ['Más dulce', bestOf(cols.map(p => dim(p, DIMS[0][1])))],
    ['Mejor precio por ml', bestOf(cols.map(perMl), 'min')],
  ];
  const row = (label, cells, best = -1) => `<tr role="row"><th scope="row" role="rowheader">${label}</th>${cells.map((c, i) =>
    `<td role="cell"${i === best ? ' class="best"' : ''}>${c}${i === best ? '<span class="sr-only"> (el mejor de la comparación)</span>' : ''}</td>`).join('')}</tr>`;
  const group = label => `<tr class="grp" role="row"><th scope="colgroup" role="rowheader" colspan="${n + 1}">${label}</th></tr>`;
  const barRow = (label, vals, fmt = v => v) => {
    const best = bestOf(vals);
    return `<tr class="bar-row" role="row"><th scope="row" role="rowheader">${label}</th>${vals.map((v, i) => `<td role="cell"${i === best ? ' class="best"' : ''}>
      <span class="cbar" title="${label}: ${fmt(v)}"><i data-w="${v}"></i></span><span class="cval">${fmt(v)}</span>${i === best ? '<span class="sr-only"> (el más alto)</span>' : ''}</td>`).join('')}</tr>`;
  };
  cmpTable.innerHTML = `<table class="cmp-table" role="table" style="--n:${n}">
    <caption class="sr-only">Comparación entre ${cols.map(p => p.name).join(', ')}</caption>
    <thead role="rowgroup"><tr role="row"><td aria-hidden="true"></td>${cols.map((p, i) => `<th scope="col" role="columnheader"><div class="cmp-prod">
      <div class="cmp-img"><img src="${p.cut}" alt=""></div>
      <span class="house">${p.house}</span><b>${p.name}</b>
      <span class="verdicts">${verdicts.filter(v => v[1] === i).map(v => `<em>${v[0]}</em>`).join('')}</span>
    </div></th>`).join('')}</tr></thead>
    <tbody role="rowgroup">
      ${row('Frasco', cols.map(p => `${clp(p.price)} <small>${p.ml} ml</small>`))}
      ${row('Precio por ml', cols.map(p => clp(perMl(p))), bestOf(cols.map(perMl), 'min'))}
      ${row('Decant 5 ml', cols.map(p => clp(decant(p, 5))))}
      ${row('Concentración', cols.map(p => p.conc))}
      ${group('Perfil olfativo')}
      ${DIMS.map(([label, keys]) => barRow(label, cols.map(p => dim(p, keys)))).join('')}
      ${barRow('Duración', cols.map(p => p.longevity * 20), v => `${v / 20} de 5`)}
      ${barRow('Estela', cols.map(p => p.sillage * 20), v => `${v / 20} de 5`)}
      ${group('Cuándo usarlo')}
      ${row('Momento', cols.map(p => TIME[p.time]))}
      ${row('Estaciones', cols.map(p => p.seasons.join(', ')))}
      ${group('Notas')}
      ${row('Salida', cols.map(p => p.top.join(', ')))}
      ${row('Corazón', cols.map(p => p.heart.join(', ')))}
      ${row('Fondo', cols.map(p => p.base.join(', ')))}
      <tr class="cmp-actions" role="row"><th scope="row" role="rowheader"><span class="sr-only">Agregar al carrito</span></th>${cols.map(p =>
        `<td role="cell"><button class="btn small ghost" data-cmp-add="${p.id}">Agregar decant 5 ml</button></td>`).join('')}</tr>
    </tbody></table>`;
  if (n === 3) {
    const {full, price} = AU.kitPrice(cmp, 5);
    cmpFoot.innerHTML = `<p>Llévate los tres en un kit de decants de 5 ml: <s>${clp(full)}</s> <b>${clp(price)}</b></p>
      <button class="btn" data-cmp-kit>Agregar kit al carrito</button>`;
  } else {
    cmpFoot.innerHTML = '<p>Suma un tercer perfume y llévate los tres en un kit de decants con 15 % de descuento.</p>';
  }
  document.documentElement.classList.add('cmp-open');
  cmpPanel.setAttribute('aria-hidden', 'false');
  window.lenis && lenis.stop();
  const bars = $$('.cbar i', cmpTable);
  if (REDUCED) bars.forEach(b => b.style.width = b.dataset.w + '%');
  else bars.forEach((b, i) => gsap.fromTo(b, {width:'0%'}, {width:b.dataset.w + '%', duration:.9, ease:'expo.out', delay:.15 + (i % n) * .06}));
  $('#cmpClose').focus();
}
function closeCompare(){
  if (!document.documentElement.classList.contains('cmp-open')) return;
  document.documentElement.classList.remove('cmp-open');
  cmpPanel.setAttribute('aria-hidden', 'true');
  window.lenis && lenis.start();
  cmpOpen.focus();
}
$('#cmpClose').onclick = closeCompare;
$('#scrim').addEventListener('click', closeCompare);
addEventListener('keydown', e => { if (e.key === 'Escape') closeCompare(); });
cmpPanel.addEventListener('click', e => {
  if (e.target === cmpPanel) return closeCompare();
  const add = e.target.closest('[data-cmp-add]');
  if (add) return AU.addToCart(add.dataset.cmpAdd, 'd5');
  if (e.target.closest('[data-cmp-kit]')) { AU.addKit([...cmp], 5); closeCompare(); }
});
syncCompare();

/* =====================================================================
   KIT — arma tu kit de 3 decants
   ===================================================================== */
if ($('#kitPick')) {
  const kit = {ids:[], ml:5, cat:'disenador'};
  const kitPick = $('#kitPick'), kitSlots = $('#kitSlots'), kitTotal = $('#kitTotal'), kitAdd = $('#kitAdd');
  /* one category at a time, in a single sliding row: the picker no longer takes the whole page */
  const KIT_TABS = [...Object.entries(window.AU_CATEGORIES || {}), ['pz', 'Lorenzo Pazzaglia']]
    .map(([k, v]) => [k, v, P.filter(p => k === 'pz' ? p.house === 'Lorenzo Pazzaglia' : p.cat === k)]).filter(t => t[2].length);
  function renderPick(){
    const pool = (KIT_TABS.find(t => t[0] === kit.cat) || KIT_TABS[0])[2];
    kitPick.innerHTML = `<div class="kit-tabs" role="group" aria-label="Categoría">${KIT_TABS.map(([k, v, l]) => `<button type="button" class="ktab" data-kit-cat="${k}" aria-pressed="${k === kit.cat}">${v}<sup>${l.length}</sup></button>`).join('')}</div>
      <div class="kit-strip-wrap"><button type="button" class="kit-arrow prev" aria-label="Ver anteriores">‹</button>
      <div class="kit-strip">${pool.map(p => `<button class="kit-tile" data-kit="${p.id}" aria-pressed="${kit.ids.includes(p.id)}" data-hover>
        <img src="${p.cut}" alt="" loading="lazy"><b>${p.name}</b><small>${p.house}</small><span>${clp(decant(p, kit.ml))}</span>
      </button>`).join('')}</div>
      <button type="button" class="kit-arrow next" aria-label="Ver más">›</button></div>`;
    AU.scrollRow($('.kit-tabs', kitPick));
    syncArrows();
  }
  /* arrows only where there is somewhere to go */
  function syncArrows(){
    const st = $('.kit-strip', kitPick); if (!st) return;
    $('.kit-arrow.prev', kitPick).disabled = st.scrollLeft < 4;
    $('.kit-arrow.next', kitPick).disabled = st.scrollLeft + st.clientWidth > st.scrollWidth - 4;
  }
  kitPick.addEventListener('scroll', syncArrows, true);
  addEventListener('resize', syncArrows);
  function renderKit(){
    kitSlots.innerHTML = Array.from({length:3}, (_, i) => {
      const p = byId(kit.ids[i]);
      return p ? `<button class="kit-slot filled" data-kit-remove="${p.id}" aria-label="Quitar ${p.name} del kit"><img src="${p.cut}" alt=""><span>${p.name}</span><small>${kit.ml} ml</small></button>`
               : '<span class="kit-slot"><span>Elige un perfume</span></span>';
    }).join('');
    $$('.kit-tile', kitPick).forEach(t => t.setAttribute('aria-pressed', kit.ids.includes(t.dataset.kit)));
    const n = kit.ids.length;
    if (n === 3) {
      const {full, price} = AU.kitPrice(kit.ids, kit.ml);
      kitTotal.innerHTML = `3 decants de ${kit.ml} ml <s>${clp(full)}</s> <b>${clp(price)}</b><small>Ahorras ${clp(full - price)}</small>`;
      kitAdd.disabled = false; kitAdd.textContent = `Agregar kit · ${clp(price)}`;
    } else {
      kitTotal.textContent = `${n} de 3 perfumes elegidos`;
      kitAdd.disabled = true; kitAdd.textContent = n === 2 ? 'Elige 1 perfume más' : `Elige ${3 - n} perfumes más`;
    }
    $('#kitBox').classList.toggle('full', n === 3);
  }
  async function addToKit(id, fromEl){
    if (kit.ids.includes(id) || kit.ids.length >= 3) return;
    const slot = $$('.kit-slot', kitSlots)[kit.ids.length];
    kit.ids.push(id);
    const tile = $(`.kit-tile[data-kit="${id}"]`, kitPick); if (tile) tile.setAttribute('aria-pressed', 'true');
    await fly(byId(id).cut, fromEl, slot);
    renderKit();
    if (kit.ids.length === 3 && !REDUCED) gsap.fromTo('#kitBox', {scale:1}, {scale:1.02, duration:.18, yoyo:true, repeat:1, ease:'power2.out'});
  }
  kitPick.addEventListener('click', e => {
    const tab = e.target.closest('[data-kit-cat]');
    if (tab) { kit.cat = tab.dataset.kitCat; renderPick(); if (!REDUCED) gsap.from('.kit-tile', {y:20, autoAlpha:0, duration:.5, stagger:.04, ease:'expo.out'}); return; }
    const arrow = e.target.closest('.kit-arrow');
    if (arrow) { const st = $('.kit-strip', kitPick); st.scrollBy({left:(arrow.classList.contains('next') ? 1 : -1) * st.clientWidth, behavior:REDUCED ? 'auto' : 'smooth'}); return; }
    const t = e.target.closest('[data-kit]'); if (!t) return;
    const id = t.dataset.kit;
    if (kit.ids.includes(id)) { kit.ids.splice(kit.ids.indexOf(id), 1); renderKit(); return; }
    if (kit.ids.length >= 3) { AU.showToast('Tu kit ya tiene 3 perfumes. Quita uno para cambiarlo.'); return; }
    addToKit(id, $('img', t));
  });
  kitSlots.addEventListener('click', e => {
    const s = e.target.closest('[data-kit-remove]'); if (!s) return;
    kit.ids.splice(kit.ids.indexOf(s.dataset.kitRemove), 1); renderKit();
  });
  $('.kit-size').addEventListener('click', e => {
    const b = e.target.closest('[data-kit-size]'); if (!b) return;
    kit.ml = +b.dataset.kitSize;
    $$('[data-kit-size]').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderPick(); renderKit();
  });
  $('#kitRandom').onclick = async () => {
    kit.ids = []; renderKit();
    const pool = $$('.kit-tile', kitPick).map(t => t.dataset.kit).sort(() => Math.random() - .5).slice(0, 3);
    for (const id of pool) await addToKit(id, $(`.kit-tile[data-kit="${id}"] img`, kitPick));
  };
  kitAdd.onclick = () => { if (kit.ids.length === 3) AU.addKit([...kit.ids], kit.ml); };
  renderPick(); renderKit();
}

/* =====================================================================
   CÍRCULO — membresía con tarjeta personalizada
   ===================================================================== */
if ($('#memberCard')) {
  const card = $('#memberCard'), cardName = $('#mcName'), nameIn = $('#cName');
  nameIn.addEventListener('input', () => { cardName.textContent = nameIn.value.trim() || 'Tu nombre'; });
  if (FINE && !REDUCED) {
    const rx = gsap.quickTo(card, 'rotationX', {duration:.8, ease:'power3'}), ry = gsap.quickTo(card, 'rotationY', {duration:.8, ease:'power3'});
    const wrap = card.parentElement;
    wrap.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
      ry((x - .5) * 16); rx((.5 - y) * 12);
    });
    wrap.addEventListener('pointerleave', () => { rx(0); ry(0); });
  }
  /* prototipo: no envía datos; conectar aquí la herramienta de correo de la tienda */
  $('#circleForm').addEventListener('submit', e => {
    e.preventDefault();
    const msg = $('#circleMsg'), name = nameIn.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($('#cEmail').value.trim())) { msg.textContent = 'Revisa tu correo: falta la @ o el dominio.'; return; }
    msg.textContent = `${name ? name + ', ya' : 'Ya'} eres parte del Círculo. Te escribiremos antes de la próxima preventa.`;
    card.classList.add('welcomed');
    if (!REDUCED) gsap.fromTo(card, {'--sx':'130%'}, {'--sx':'-40%', duration:1.3, ease:'power2.inOut'});
  });
}

/* =====================================================================
   FOOTER — firma monumental: las letras suben y se doran bajo el cursor
   ===================================================================== */
if ($('#footWord')) {
  const word = $('#footWord');
  $$('span', word).forEach(sp => { sp.innerHTML = [...sp.textContent].map(c => c === ' ' ? ' ' : `<span class="ch">${c}</span>`).join(''); });
  if (!REDUCED) {
    [$$('.fw-outline .ch', word), $$('.fw-fill .ch', word)].forEach(chars =>
      gsap.from(chars, {yPercent:100, opacity:0, duration:1.2, stagger:.05, ease:'expo.out', scrollTrigger:{trigger:word, start:'top 96%', once:true}}));
  }
  if (FINE) {
    word.closest('footer').addEventListener('pointermove', e => {
      const r = word.getBoundingClientRect();
      word.style.setProperty('--fx', e.clientX - r.left + 'px'); word.style.setProperty('--fy', e.clientY - r.top + 'px');
    });
  } else if (!REDUCED) {
    gsap.set(word, {'--fx':'10%', '--fy':'55%'});
    gsap.to(word, {'--fx':'90%', duration:5, ease:'sine.inOut', yoyo:true, repeat:-1});
  }
}

/* =====================================================================
   MANIFIESTO — la frase se enciende palabra a palabra al bajar
   ===================================================================== */
const man = $('.man-text');
if (man) {
  const HL = /^(piel\.?|probarlo)$/i;
  man.setAttribute('aria-label', man.textContent);
  man.innerHTML = man.textContent.trim().split(/\s+/).map(w => `<span class="w${HL.test(w) ? ' hl' : ''}" aria-hidden="true">${w}</span>`).join(' ');
  const words = $$('.w', man);
  if (REDUCED) gsap.set(words, {opacity:1});
  else {
    gsap.to(words, {opacity:1, stagger:.08, ease:'none', scrollTrigger:{trigger:man, start:'top 78%', end:'bottom 42%', scrub:.6}});
    gsap.from('.man-crest', {y:30, opacity:0, duration:1.4, ease:'expo.out', scrollTrigger:{trigger:'.manifesto', start:'top 75%', once:true}});
    gsap.from('.man-facts li', {y:30, opacity:0, duration:1.1, stagger:.12, ease:'expo.out', scrollTrigger:{trigger:'.man-facts', start:'top 88%', once:true}});
    gsap.from('.man-frame i', {scale:0, opacity:0, duration:1.2, stagger:.1, ease:'expo.out', scrollTrigger:{trigger:'.manifesto', start:'top 70%', once:true}});
  }
}

/* product cases rise in sequence as each row enters */
if (!REDUCED) $$('.best-row, #grid').forEach(row => {
  gsap.from($$('.card', row), {y:60, opacity:0, duration:1.2, stagger:.09, ease:'expo.out', scrollTrigger:{trigger:row, start:'top 85%', once:true}, clearProps:'opacity,transform'});
});

/* =====================================================================
   SALAS BLANCAS — el blanco se abre desde el negro como una puerta de galería
   y se vuelve a cerrar al salir; entre dos salas blancas seguidas no hay corte
   ===================================================================== */
const whites = $$('.room-white');
const isWhite = el => !!el && el.classList.contains('room-white');
const clamp01 = v => Math.max(0, Math.min(1, v));
const navOn = new Set();
whites.forEach(sec => {
  const bg = document.createElement('div');
  bg.className = 'wbg'; bg.setAttribute('aria-hidden', 'true');
  sec.prepend(bg);
  const openTop = !isWhite(sec.previousElementSibling), openBottom = !isWhite(sec.nextElementSibling);
  const side = () => innerWidth < 560 ? 4 : 6, round = () => innerWidth < 560 ? 26 : 48;
  const paint = () => {
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    const a = openTop ? clamp01((vh - r.top) / (vh * .7)) : 1;
    const b = openBottom ? clamp01(r.bottom / (vh * .7)) : 1;
    const e = 1 - Math.pow(1 - Math.min(a, b), 3);
    bg.style.clipPath = e >= 1 ? 'none' : `inset(0 ${((1 - e) * side()).toFixed(2)}% 0 ${((1 - e) * side()).toFixed(2)}% round ${((1 - e) * round()).toFixed(1)}px)`;
  };
  if (REDUCED) bg.style.clipPath = 'none';
  else ScrollTrigger.create({trigger:sec, start:'top bottom', end:'bottom top', onUpdate:paint, onRefresh:paint});
  /* the nav follows: white glass while a white room sits under it */
  ScrollTrigger.create({trigger:sec, start:'top 70px', end:'bottom 70px', onToggle:self => {
    self.isActive ? navOn.add(sec) : navOn.delete(sec);
    document.documentElement.classList.toggle('nav-light', navOn.size > 0);
  }});
  if (FINE) {
    sec.addEventListener('pointermove', e => {
      const r = sec.getBoundingClientRect();
      bg.style.setProperty('--lx', e.clientX - r.left + 'px'); bg.style.setProperty('--ly', e.clientY - r.top + 'px');
      sec.classList.add('lit');
    });
    sec.addEventListener('pointerleave', () => sec.classList.remove('lit'));
  }
});

/* promesas: franja compacta que corre sola (los items se duplican para el bucle) */
const promise = $('.promise-grid');
if (promise) {
  const items = [...promise.children];
  [1, 2, 3].forEach(() => items.forEach(it => { const c = it.cloneNode(true); c.setAttribute('aria-hidden', 'true'); promise.appendChild(c); }));
}

ScrollTrigger.refresh();
/* pinned sections measure again once every image has its real size */
addEventListener('load', () => ScrollTrigger.refresh());
/* anything that changes the page height above a pinned section (catalog filters, quiz result, carousels)
   would leave the pins measured at the old positions: re-measure once the layout settles */
const mainEl = $('main');
let lastH = mainEl.offsetHeight, reT;
new ResizeObserver(() => {
  if (Math.abs(mainEl.offsetHeight - lastH) < 2) return;
  clearTimeout(reT);
  reT = setTimeout(() => { ScrollTrigger.refresh(); lastH = mainEl.offsetHeight; }, 300);
}).observe(mainEl);
})();
