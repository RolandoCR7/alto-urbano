/* Alto Urbano: UI de la tienda (sin dependencias propias; usa GSAP, ScrollTrigger y Lenis por CDN) */
(() => {
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer:fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const P = window.AU_PRODUCTS, FAM = window.AU_FAMILIES, ACC = window.AU_ACCORD_COLORS;
const byId = id => P.find(p => p.id === id);
const clp = n => '$' + n.toLocaleString('es-CL');
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const FREE_SHIP = 80000;
const GENDER = {hombre:'Masculino', mujer:'Femenino', unisex:'Unisex'};
const TIME = {'día':'De día', noche:'De noche', ambos:'Día y noche'};

gsap.registerPlugin(ScrollTrigger);

/* ---------- prices ---------- */
const decant = (p, ml) => Math.ceil((p.price / p.ml * ml * 1.15 + 2000) / 1000) * 1000 - 10;
const sizesOf = p => [
  {key:'d5', label:'Decant', ml:5, price:decant(p, 5)},
  {key:'d10', label:'Decant', ml:10, price:decant(p, 10)},
  {key:'full', label:'Frasco', ml:p.ml, price:p.price},
];
const sizeLabel = s => `${s.label} ${s.ml} ml`;

/* ---------- CSS bottle ---------- */
const bottleHTML = p => {
  if (p.cut || p.img) return `<img class="pimg" src="${p.cut || p.img}" alt="${p.house} ${p.name}" loading="lazy">`;
  const b = p.bottle;
  return `<div class="bottle ${b.shape} ${b.glass ? 'g-' + b.glass : ''}" style="--liquid:${b.liquid}">
    <div class="neck"></div><div class="cap ${b.cap} ${b.capShape}"></div><div class="glass"></div><div class="label">${p.short}</div></div>`;
};
const meter = (n, label) => `<span class="meter" role="img" aria-label="${label}: ${n} de 5">${[1,2,3,4,5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;

/* ---------- text splitting ---------- */
function splitInto(el, text){
  el.setAttribute('aria-label', text);
  el.innerHTML = text.split(' ').map(w =>
    `<span class="split-word" aria-hidden="true">${[...w].map(c => `<span class="mask" style="display:inline-block"><span class="split-char">${c}</span></span>`).join('')}</span>`
  ).join(' ');
  return $$('.split-char', el);
}

/* ---------- toast ---------- */
const toast = $('#toast'); let toastT;
function showToast(html){
  toast.innerHTML = html; toast.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 3400);
}
toast.addEventListener('click', e => { if (e.target.closest('[data-open-cart]')) { toast.classList.remove('show'); setCart(true); } });

/* =====================================================================
   MIST — atomización con partículas (canvas 2D sobre toda la página)
   ===================================================================== */
const Mist = (() => {
  const cv = $('#mist'), ctx = cv.getContext('2d'), parts = [];
  let W = 0, H = 0, dirty = false;
  const size = () => { const d = Math.min(devicePixelRatio, 2); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
  size(); addEventListener('resize', size);
  const sprite = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.5)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); return c; })();
  const cache = {};
  const tint = hex => cache[hex] || (cache[hex] = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.drawImage(sprite, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = .55; g.fillStyle = hex; g.fillRect(0, 0, 128, 128); return c; })());
  /* a real atomiser: a narrow, faint cone of mist that thins out fast, plus fine droplets catching the light.
     The plume is painted normally (never additive) so it can't burn out to a white blob. */
  function spray(x, y, {dir = -1, color = '#fff6e0', scale = 1} = {}){
    if (REDUCED) return;
    const img = tint(color);
    for (let i = 0; i < 46; i++) {                // the plume
      const a = (Math.random() - .5) * .34 - .04, sp = (240 + Math.random() * 560) * scale;
      parts.push({x, y, vx:Math.cos(a) * sp * dir, vy:Math.sin(a) * sp, life:0, max:.9 + Math.random() * 1.1,
        s0:3 * scale, s1:(26 + Math.random() * 62) * scale, a:.02 + Math.random() * .04, img, delay:Math.random() * .25, drag:3.8, g:-12, add:false});
    }
    for (let i = 0; i < 150; i++) {               // droplets
      const a = (Math.random() - .5) * .28 - .03, sp = (420 + Math.random() * 900) * scale;
      parts.push({x, y, vx:Math.cos(a) * sp * dir, vy:Math.sin(a) * sp, life:0, max:.3 + Math.random() * .6,
        s0:.7, s1:1.6 + Math.random(), a:.28 + Math.random() * .35, img:sprite, delay:Math.random() * .22, drag:2.4, g:140, add:true});
    }
  }
  gsap.ticker.add((t, dtms) => {
    if (!parts.length) { if (dirty) { ctx.clearRect(0, 0, W, H); dirty = false; } return; }
    const dt = Math.min(dtms / 1000, .05);
    ctx.clearRect(0, 0, W, H); dirty = true;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; }
      const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy = p.vy * k + p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const u = p.life / p.max, sz = p.s0 + (p.s1 - p.s0) * (1 - Math.pow(1 - u, 2.4));
      ctx.globalCompositeOperation = p.add ? 'lighter' : 'source-over';
      ctx.globalAlpha = Math.max(0, p.a * (u < .15 ? u / .15 : 1 - (u - .15) / .85));
      ctx.drawImage(p.img, p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  });
  return {spray};
})();

/* a real bottle in two layers: the cap lifts off, the pump underneath sprays */
const rbHTML = p => {
  const c = p.capCut, pw = Math.min(c.w * .46, .2), ph = Math.min(.068, c.y * .62);
  return `<div class="rb" data-id="${p.id}" style="--ar:${p.ar};--cap:${c.y};--cx:${c.x};--pumpw:${pw.toFixed(3)};--pumph:${ph.toFixed(3)}">
    <img class="rb-body" src="${p.cut}" alt="${p.house} ${p.name}" draggable="false">
    <span class="rb-pump ${p.pump}" aria-hidden="true"><i class="rb-stem"></i><i class="rb-head"></i></span>
    <img class="rb-cap" src="${p.cut}" alt="" draggable="false">
  </div>`;
};
const rbBusy = new WeakSet();
function openAndSpray(rb, p, {dir = -1, presses = 2} = {}){
  if (!rb || !p || REDUCED || rbBusy.has(rb)) return;
  const r = rb.getBoundingClientRect(); if (r.height < 60 || r.bottom < 0 || r.top > innerHeight) return;
  rbBusy.add(rb);
  const cap = $('.rb-cap', rb), head = $('.rb-head', rb), c = p.capCut;
  const press = () => {
    gsap.fromTo(head, {yPercent:0}, {yPercent:16, duration:.07, yoyo:true, repeat:1, ease:'power1.inOut'});
    const h = head.getBoundingClientRect(), br = rb.getBoundingClientRect();
    Mist.spray(dir < 0 ? h.left + h.width * .14 : h.right - h.width * .14, h.top + h.height * .52,
      {dir, color:p.mist, scale:Math.max(.45, Math.min(1.2, br.height / 520))});
  };
  gsap.set(cap, {transformOrigin:`${c.x * 100}% ${c.y * 50}%`});
  const tl = gsap.timeline({onComplete:() => rbBusy.delete(rb)});
  tl.to(cap, {yPercent:-6, duration:.35, ease:'power2.out'})                                   // lift
    .to(cap, {xPercent:dir * -32, yPercent:-2, rotation:dir * -18, duration:.6, ease:'power3.inOut'}); // set aside
  for (let i = 0; i < presses; i++) tl.add(press, i ? '+=.55' : '+=.15');
  tl.to(cap, {xPercent:0, yPercent:-6, rotation:0, duration:.6, ease:'power3.inOut'}, '+=1.1')  // bring it back
    .to(cap, {yPercent:0, duration:.32, ease:'power2.in'})
    .to(rb, {y:2, duration:.06, yoyo:true, repeat:1, ease:'power1.inOut'});
}

/* =====================================================================
   HERO — "La Ronda": los frascos reales en órbita (fotos, no 3D dibujado)
   ===================================================================== */
/* the hero only exists on the home page; other pages get no-op hooks */
let heroApi = {sync(){}, restart(){}, enter(){}};
const rStage = $('#rStage'), rCopy = $('#rCopy');
if (rStage) (() => {
const R = P.filter(p => p.hero).length ? P.filter(p => p.hero) : P;   // the hero ring: a curated set of real bottles
const N = R.length, STEP = Math.PI * 2 / N;
const rHouse = $('#rHouse'), rName = $('#rName'), rText = $('#rText'), rNotes = $('#rNotes');
rStage.insertAdjacentHTML('afterbegin', R.map((p, i) => `
  <div class="r-item" data-i="${i}" style="--ar:${p.ar}">
    ${rbHTML(p)}
    <img class="r-refl" src="${p.cut}" alt="" aria-hidden="true" draggable="false">
  </div>`).join(''));
const items = $$('.r-item', rStage);

const ronda = {pos:0, front:-1};
const mod = (a, n) => ((a % n) + n) % n;
let geo = {rx:300, ry:40};
const measure = () => { const w = rStage.clientWidth, h = rStage.clientHeight; geo = {rx:w * (w < 600 ? .42 : .46), ry:h * .09}; };
measure(); new ResizeObserver(measure).observe(rStage);

/* place every bottle on the ellipse: front = big, lit and sharp; back = small, dim and out of focus */
let laidPos = NaN, laidRx = 0, rondaOnScreen = true;
new IntersectionObserver(([e]) => { rondaOnScreen = e.isIntersecting; }).observe(rStage);
function layoutRonda(){
  /* only touch the DOM when the ring actually moved and is visible */
  if (!rondaOnScreen || (ronda.pos === laidPos && geo.rx === laidRx)) return;
  laidPos = ronda.pos; laidRx = geo.rx;
  items.forEach((el, i) => {
    const th = (i - ronda.pos) * STEP, z = Math.cos(th), t = (z + 1) / 2;
    const x = Math.sin(th) * geo.rx, y = -(1 - z) * geo.ry;
    const s = .3 + .7 * Math.pow(t, 2.6);
    el.style.transform = `translate(-50%,-100%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
    el.style.zIndex = Math.round(t * 100);
    const blur = (1 - t) * 5, light = .3 + .7 * t;
    el.style.filter = t > .97 ? 'none' : `blur(${blur.toFixed(2)}px) brightness(${light.toFixed(2)})`;
    el.classList.toggle('is-front', t > .97);
  });
}
gsap.ticker.add(layoutRonda);

function fillCopy(p){
  rHouse.textContent = p.house;
  rText.textContent = p.blurb;
  rNotes.innerHTML = p.accords.slice(0, 4).map(([a]) => `<li>${a}</li>`).join('');
  return splitInto(rName, p.name);
}
function setFront(i, animate = true){
  if (i === ronda.front) return;
  ronda.front = i;
  const p = R[i];
  window.AU_CURRENT = p;
  renderNotes(p);
  if (!animate || REDUCED) { fillCopy(p); return; }
  gsap.timeline()
    .to($$('.split-char', rName), {yPercent:-110, duration:.35, stagger:.008, ease:'power3.in'})
    .to([rHouse, rText, rNotes], {autoAlpha:0, y:-8, duration:.25, stagger:.03}, 0)
    .add(() => {
      const chars = fillCopy(p);
      gsap.set(chars, {yPercent:110});
      gsap.to(chars, {yPercent:0, duration:.85, stagger:.018, ease:'expo.out'});
      gsap.fromTo([rHouse, rText, rNotes], {autoAlpha:0, y:12}, {autoAlpha:1, y:0, duration:.6, stagger:.05, ease:'expo.out', delay:.1});
    });
}
const frontBottle = () => $('.rb', items[ronda.front]);

/* composition: when a bottle settles in front, its real notes appear around it,
   pointing to where each stage lives (top notes up by the cap, base notes down low) */
const rComp = $('#rComp');
const COMP = [['Salida', 'Lo primero que sientes', 'top', 'r'], ['Corazón', 'Aparece a los 30 minutos', 'heart', 'l'], ['Fondo', 'Lo que queda en tu piel', 'base', 'r']];
function showComp(){
  const p = R[ronda.front], rb = frontBottle(); if (!rb) return;
  const sr = rStage.getBoundingClientRect(), br = rb.getBoundingClientRect();
  const mob = sr.width < 600, gap = mob ? 10 : 26, n = mob ? 2 : 3;
  const ys = [br.top - sr.top + br.height * Math.max(.12, p.capCut.y * .9), br.top - sr.top + br.height * .5, br.top - sr.top + br.height * .84];
  rComp.classList.toggle('strip', mob);
  rStage.classList.add('comp-on');
  if (mob) rComp.innerHTML = COMP.map(([t, , key]) => `<div class="rc"><small>${t}</small><b>${p[key].slice(0, 2).join(' · ')}</b></div>`).join('');
  else rComp.innerHTML = COMP.map(([t, sub, key, side], k) => {
    const pos = side === 'r' ? `left:${(br.right - sr.left + gap).toFixed(0)}px` : `right:${(sr.right - br.left + gap).toFixed(0)}px`;
    return `<div class="rc rc-${side}" style="top:${ys[k].toFixed(0)}px;${pos}"><i aria-hidden="true"></i>
      <small>${t}</small><b>${p[key].slice(0, n).join(' · ')}</b>${mob ? '' : `<span>${sub}</span>`}</div>`;
  }).join('');
  /* a label that would leave the stage on the left moves to the right side of the bottle */
  if (!mob) $$('.rc-l', rComp).forEach(el => {
    if (el.getBoundingClientRect().left < sr.left + 6) {
      el.classList.replace('rc-l', 'rc-r'); el.style.right = ''; el.style.left = (br.right - sr.left + gap).toFixed(0) + 'px';
    }
  });
  rComp.setAttribute('aria-label', `De qué está hecho ${p.name}: ` + COMP.map(([t, , key]) => `${t}: ${p[key].join(', ')}`).join('. '));
  if (REDUCED) return;
  $$('.rc', rComp).forEach((el, k) => {
    gsap.fromTo(el, {autoAlpha:0, x:mob ? 0 : el.classList.contains('rc-r') ? -14 : 14, y:mob ? 10 : 0}, {autoAlpha:1, x:0, y:0, duration:.9, ease:'expo.out', delay:.08 + k * .16});
    if (!mob) gsap.fromTo($('i', el), {scaleX:0}, {scaleX:1, duration:.7, ease:'expo.out', delay:k * .16});
  });
}
function hideComp(){ rStage.classList.remove('comp-on'); const els = $$('.rc', rComp); if (els.length) gsap.to(els, {autoAlpha:0, duration:.2, overwrite:true}); }
addEventListener('resize', () => { if (rComp.children.length) showComp(); });
let spin;
function goTo(i){
  let d = mod(i - ronda.pos, N); if (d > N / 2) d -= N;
  if (spin) spin.kill();
  if (d) hideComp();
  setFront(mod(i, N));
  spin = gsap.to(ronda, {pos:ronda.pos + d, duration:REDUCED ? 0 : Math.min(1.6, .7 + Math.abs(d) * .22), ease:'expo.inOut',
    onComplete:() => { ronda.pos = Math.round(ronda.pos); layoutRonda(); showComp(); }});
  restartAutoplay();
}

/* autoplay: one turn every 6.5 s while the hero is on screen and nobody is touching it */
let autoplay, heroInView = true, heroHover = false;
function restartAutoplay(){
  if (autoplay) autoplay.kill();
  if (REDUCED) return;
  autoplay = gsap.delayedCall(6.5, () => goTo(ronda.front + 1));
  syncAutoplay();
}
function syncAutoplay(){ if (autoplay) (heroInView && !heroHover && !document.documentElement.classList.contains('modal-open')) ? autoplay.resume() : autoplay.pause(); }
ScrollTrigger.create({trigger:'.hero', start:'top top', end:'bottom 30%', onToggle:self => { heroInView = self.isActive; syncAutoplay(); }});
[rCopy, rStage].forEach(el => { el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { heroHover = true; syncAutoplay(); } });
  el.addEventListener('pointerleave', () => { heroHover = false; syncAutoplay(); }); });
$('#rView').onclick = () => openModal(R[ronda.front].id);
$('#rAdd').onclick = () => addToCart(R[ronda.front].id, 'd5', $('img', frontBottle()));

/* drag to spin (mouse or finger); a short tap on a bottle brings it to the front or opens it */
(() => {
  let drag = null;
  rStage.addEventListener('pointerdown', e => {
    if (spin) spin.kill();
    drag = {x:e.clientX, pos:ronda.pos, moved:false, last:e.clientX, t:performance.now(), v:0};
    hideComp();
    rStage.setPointerCapture(e.pointerId);
  });
  rStage.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x; if (Math.abs(dx) > 6) drag.moved = true;
    const now = performance.now(); drag.v = (e.clientX - drag.last) / Math.max(1, now - drag.t); drag.last = e.clientX; drag.t = now;
    ronda.pos = drag.pos - dx / (geo.rx * 1.1);
    setFront(mod(Math.round(ronda.pos), N));
  });
  const end = e => {
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) {
      const hit = e.target.closest('.r-item');
      if (hit) { const i = +hit.dataset.i; if (i === ronda.front) openModal(R[i].id); else goTo(i); }
      else goTo(ronda.front);
      return;
    }
    goTo(Math.round(ronda.pos - d.v * 4));
  };
  rStage.addEventListener('pointerup', end);
  rStage.addEventListener('pointercancel', end);
})();
addEventListener('keydown', e => {
  if (!heroInView || document.documentElement.classList.contains('modal-open') || /input|select|textarea/i.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight') goTo(ronda.front + 1); else if (e.key === 'ArrowLeft') goTo(ronda.front - 1);
});
/* the copy and the bottles drift apart a little as you scroll out of the hero */
if (!REDUCED) gsap.timeline({scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:1}})
  .to(rStage, {yPercent:-6, ease:'none'}, 0).to(rCopy, {yPercent:-14, ease:'none'}, 0);

/* entrance after the intro: the ring assembles from the back, then the front bottle sprays */
function rondaEnter(){
  setFront(0, false);
  if (REDUCED) { gsap.set([rStage, rCopy], {autoAlpha:1}); requestAnimationFrame(showComp); return; }
  ronda.pos = -N / 2;
  gsap.set([rStage, rCopy], {autoAlpha:1});
  gsap.to(ronda, {pos:0, duration:2.2, ease:'expo.out', onComplete:() => { layoutRonda(); showComp(); }});
  gsap.fromTo($$('.split-char', rName), {yPercent:110}, {yPercent:0, duration:1.1, stagger:.025, ease:'expo.out', delay:.5});
  gsap.fromTo([rHouse, rText, rNotes, '.r-copy .hero-cta', '.r-ui'], {autoAlpha:0, y:16}, {autoAlpha:1, y:0, duration:.9, stagger:.07, ease:'expo.out', delay:.7});
}
heroApi = {sync:syncAutoplay, restart:restartAutoplay, enter:rondaEnter};
})();

/* ---------- houses marquee ---------- */
const houseNames = window.AU_HOUSES.map(h => h.name);
const houseMarquee = $('#houseMarquee');
if (houseMarquee) houseMarquee.innerHTML = [...houseNames, ...houseNames, ...houseNames, ...houseNames].map(n => `<span>${n}</span>`).join('');

/* =====================================================================
   NOTES — pinned, follows the featured fragrance
   ===================================================================== */
const notesSteps = $('#notesSteps'), bars = $$('.notes-progress i');
let noteIdx = 0;
function renderNotes(p){
  if (!notesSteps) return;
  $('#notesTitle').textContent = `Así evoluciona ${p.name} en tu piel`;
  const nv = $('#notesVisual'); if (nv) nv.innerHTML = '<div class="pedestal"></div>' + rbHTML(p);
  const step = (k, label, when, list, text) => `
    <article class="note ${k === noteIdx ? 'active' : ''}">
      <div class="note-time"><b>${label}</b><i>${when}</i></div>
      <h3>${list.slice(0, 2).join(' y ')}</h3>
      <ul>${list.map(n => `<li>${n}</li>`).join('')}</ul>
      <p>${text}</p>
    </article>`;
  notesSteps.innerHTML =
    step(0, 'Salida', 'los primeros 15 minutos', p.top, 'Lo primero que sientes al aplicarlo. Las notas más volátiles, las que enamoran en la tienda.') +
    step(1, 'Corazón', 'de la primera a la cuarta hora', p.heart, 'Cuando la salida se asienta aparece el verdadero carácter del perfume.') +
    step(2, 'Fondo', 'hasta el final del día', p.base, 'La estela que queda en tu ropa y la que otros recuerdan.');
}
function showNote(i){
  if (i === noteIdx) return;
  const notes = $$('.note', notesSteps), prev = notes[noteIdx], next = notes[i], dir = i > noteIdx ? 1 : -1;
  if (!prev || !next) { noteIdx = i; return; }
  noteIdx = i;
  if (REDUCED) { prev.classList.remove('active'); next.classList.add('active'); return; }
  gsap.to(prev, {autoAlpha:0, y:-30 * dir, duration:.4, ease:'power2.in', onComplete:() => prev.classList.remove('active')});
  next.classList.add('active');
  gsap.set(next, {autoAlpha:1, y:0});
  gsap.fromTo(next.children, {autoAlpha:0, y:34 * dir}, {autoAlpha:1, y:0, duration:.8, stagger:.07, ease:'expo.out', delay:.2});
}
if (notesSteps) {
  renderNotes(P[0]);
  if (!REDUCED) ScrollTrigger.create({trigger:'.notes', start:'top 75%', once:true,
    onEnter:() => gsap.from($$('.note', notesSteps), {y:40, autoAlpha:0, duration:1, stagger:.15, ease:'expo.out'})});
}

/* =====================================================================
   CATALOG — filters
   ===================================================================== */
const grid = $('#grid');
const cardHTML = (p, extra = '') => {
  const [d5] = sizesOf(p);
  return `<article class="card" data-id="${p.id}" data-hover>
    <button class="cmp-toggle" data-compare="${p.id}" aria-pressed="false">+ Comparar</button>
    <div class="stage vitrine" data-open role="button" tabindex="0" aria-label="Ver ficha de ${p.name}" style="--ar:${p.ar}">
      <span class="v-num" aria-hidden="true">N° ${String(P.indexOf(p) + 1).padStart(2, '0')}</span>
      <span class="v-spot" aria-hidden="true"></span>
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      ${bottleHTML(p)}
      <img class="v-refl" src="${p.cut || p.img}" alt="" aria-hidden="true" loading="lazy">
      <div class="peek"><b>Notas clave</b>${[...p.top.slice(0, 2), p.heart[0], ...p.base.slice(0, 2)].join(', ')}</div>
    </div>
    ${extra}
    <p class="house">${p.house}</p>
    <h3 data-open>${p.name}</h3>
    <p class="fam">${p.line ? `Línea ${p.line}` : FAM[p.family]} · ${GENDER[p.gender]}</p>
    <div class="card-foot">
      <div class="qa" role="group" aria-label="Tamaño de ${p.name}">${sizesOf(p).map((x, i) => `<button type="button" data-qs="${x.key}" data-price="${x.price}" aria-pressed="${i === 0}">${x.key === 'full' ? `${x.ml} ml` : `${x.ml} ml`}</button>`).join('')}</div>
      <div class="price"><small class="qa-label">Decant 5 ml</small><span class="qa-price">${clp(d5.price)}</span><small>Frasco ${p.ml} ml · ${clp(p.price)}</small></div>
      <button class="btn small" type="button" data-quick-add="${p.id}">Agregar al carrito</button>
    </div>
  </article>`;
};
/* los más pedidos: los perfumes con sello primero */
const bestRow = $('#bestRow');
if (bestRow) {
  const rank = p => { const i = ['Más vendido', 'Bestia', 'Nuevo ingreso', 'Precio top'].indexOf(p.badge); return i < 0 ? 9 : i; };
  bestRow.innerHTML = [...P].sort((a, b) => rank(a) - rank(b)).slice(0, 6).map(p => cardHTML(p)).join('');
  bindTilt(bestRow);
}

/* the full catalog lives on perfumes.html; from the home page every filter link opens it */
const goCatalog = params => { location.href = 'perfumes.html' + (params ? '?' + new URLSearchParams(params) : ''); };
let catalogApi = {
  setMoment:id => goCatalog({moment:id}),
  setScent:id => goCatalog({scent:id}),
  filterHouse:h => goCatalog({q:h}),
  focusSearch:() => goCatalog({buscar:1}),
};
if (grid) (() => {
grid.innerHTML = P.map(p => cardHTML(p)).join('') + `<div class="empty-state" hidden>No encontramos perfumes con esos filtros.<br><button class="btn small ghost" id="clearFilters">Ver todos los perfumes</button></div>`;
const cards = $$('.card', grid);

const filters = {family:'', q:'', gender:'', sort:'featured', moment:'', scent:'', cat:'', line:''};
const CATS = window.AU_CATEGORIES || {};
const catTabs = $('#catTabs');
const PZ_HOUSE = 'Lorenzo Pazzaglia';
const tabs = [['', 'Todos', P.length], ...Object.entries(CATS).map(([k, v]) => [k, v, P.filter(p => p.cat === k).length]).filter(t => t[2]), ['pz', PZ_HOUSE, P.filter(p => p.house === PZ_HOUSE).length]];
catTabs.innerHTML = tabs.map(([k, v, n]) => `<button class="ctab" data-cat="${k}" aria-pressed="${k === ''}">${v}<sup>${n}</sup></button>`).join('');
catTabs.addEventListener('click', e => {
  const b = e.target.closest('[data-cat]'); if (!b) return;
  filters.cat = b.dataset.cat; filters.line = ''; filters.family = '';
  $$('.ctab', catTabs).forEach(x => x.setAttribute('aria-pressed', x === b));
  renderChips(); applyFilters();
});
const chips = $('#famChips');
/* family chips; inside Lorenzo Pazzaglia they become the house's lines (marinos, tropicales, vainillas…) */
function renderChips(){
  const pz = filters.cat === 'pz';
  const pool = P.filter(p => !filters.cat || (pz ? p.house === PZ_HOUSE : p.cat === filters.cat));
  const list = pz ? [...new Set(pool.map(p => p.line).filter(Boolean))].map(l => [l, l]) : Object.keys(FAM).filter(k => pool.some(p => p.family === k)).map(k => [k, FAM[k]]);
  chips.setAttribute('aria-label', pz ? 'Filtrar por línea' : 'Filtrar por familia');
  chips.innerHTML = [['', pz ? 'Todas las líneas' : 'Todas las familias'], ...list].map(([k, v]) => `<button class="chip" data-f="${k}" aria-pressed="${k === (pz ? filters.line : filters.family)}">${v}</button>`).join('');
}
renderChips();
chips.addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  if (filters.cat === 'pz') filters.line = c.dataset.f; else filters.family = c.dataset.f;
  $$('.chip', chips).forEach(x => x.setAttribute('aria-pressed', x === c));
  applyFilters();
});
let qT;
$('#search').addEventListener('input', e => { clearTimeout(qT); qT = setTimeout(() => { filters.q = e.target.value; applyFilters(); }, 180); });
$('#gender').addEventListener('change', e => { filters.gender = e.target.value; syncHero(); applyFilters(); });
$('#sort').addEventListener('change', e => { filters.sort = e.target.value; applyFilters(); });
grid.addEventListener('click', e => { if (e.target.id === 'clearFilters') resetFilters(); });

function resetFilters(animate = true){
  Object.assign(filters, {family:'', q:'', gender:'', moment:'', scent:'', cat:'', line:''});
  $('#search').value = ''; $('#gender').value = '';
  $$('.ctab', catTabs).forEach(x => x.setAttribute('aria-pressed', x.dataset.cat === ''));
  renderChips();
  renderActive();
  applyFilters(animate);
}

/* moment filter (set from the Momentos section), shown as a removable pill */
const activeFilters = $('#activeFilters');
const scentOf = id => (window.AU_SCENTS || []).find(x => x.id === id);
function renderActive(){
  const m = (window.AU_MOMENTS || []).find(x => x.id === filters.moment), sc = scentOf(filters.scent);
  const pill = (label, key) => `<span class="af">${label}<button data-clear="${key}" aria-label="Quitar el filtro ${label}">×</button></span>`;
  activeFilters.hidden = !m && !sc;
  activeFilters.innerHTML = (m ? pill(m.title, 'moment') : '') + (sc ? pill(`Fragancias ${sc.title.toLowerCase()}`, 'scent') : '');
  syncHero();
}
/* perfumes.html: the big title says what is being shown (a family, an occasion or a gender), not always "Perfumes originales" */
const heroTitle = $('#catHeroTitle'), heroText = $('.cat-hero > p');
const HERO_DEFAULT = heroTitle && [heroTitle.innerHTML, heroText.textContent, document.title];
const GH = {mujer:['Perfumes <em>mujer</em>', 'Fragancias femeninas de perfil floral, frutal y dulce.'],
  hombre:['Perfumes <em>hombre</em>', 'Fragancias masculinas de perfil amaderado, aromático y especiado.'],
  unisex:['Perfumes <em>unisex</em>', 'Fragancias para todos: frescas, dulces, amaderadas y orientales.']};
function syncHero(){
  if (!heroTitle) return;
  const m = (window.AU_MOMENTS || []).find(x => x.id === filters.moment), sc = scentOf(filters.scent);
  const [title, text, doc] = sc ? [`Fragancias <em>${sc.title.toLowerCase()}</em>`, sc.text, `Fragancias ${sc.title.toLowerCase()}`]
    : m ? [`Perfumes <em>${m.title.replace(/^Para /, 'para ')}</em>`, m.text, `Perfumes ${m.title.toLowerCase()}`]
    : GH[filters.gender] ? [...GH[filters.gender], `Perfumes ${filters.gender}`]
    : HERO_DEFAULT;
  heroTitle.innerHTML = title; heroText.textContent = text;
  document.title = doc === HERO_DEFAULT[2] ? doc : `${doc} · Alto Urbano`;
}
function setMoment(id){ resetFilters(false); filters.moment = id; renderActive(); applyFilters(false); }
function setScent(id){ resetFilters(false); filters.scent = id; renderActive(); applyFilters(false); }
activeFilters.addEventListener('click', e => { const b = e.target.closest('[data-clear]'); if (b) { filters[b.dataset.clear] = ''; renderActive(); applyFilters(); } });

function applyFilters(animate = true){
  /* settle every card first: a filter applied while cards were still animating left some invisible or out of place */
  gsap.getTweensOf(cards).forEach(t => { if (!('rotationX' in t.vars || 'rotationY' in t.vars)) t.kill(); }); /* keep only the hover tilt */
  gsap.set(cards, {x:0, y:0, scale:1, clearProps:'opacity,visibility'});
  const q = norm(filters.q.trim());
  const matches = p =>
    (!filters.cat || (filters.cat === 'pz' ? p.house === PZ_HOUSE : p.cat === filters.cat)) &&
    (!filters.line || p.line === filters.line) &&
    (!filters.family || p.family === filters.family) &&
    window.AU_forGender(p, filters.gender) &&
    (!filters.moment || (p.moments || []).includes(filters.moment)) &&
    (!filters.scent || window.AU_scentScore(p, scentOf(filters.scent)).score >= 3) &&
    (!q || norm([p.name, p.house, FAM[p.family], ...p.top, ...p.heart, ...p.base, ...p.accords.map(a => a[0])].join(' ')).includes(q));
  const sorters = {
    featured:(a, b) => P.indexOf(a) - P.indexOf(b),
    'price-asc':(a, b) => a.price - b.price,
    'price-desc':(a, b) => b.price - a.price,
    sillage:(a, b) => (b.sillage + b.longevity) - (a.sillage + a.longevity),
  };
  const sorted = [...P].sort(sorters[filters.sort]);
  let n = 0;
  sorted.forEach(p => {
    const card = cards.find(c => c.dataset.id === p.id), ok = matches(p);
    card.hidden = !ok; if (ok) n++;
    grid.insertBefore(card, $('.empty-state', grid));
  });
  $('.empty-state', grid).hidden = n > 0;
  $('#resultCount').textContent = `${n} ${n === 1 ? 'perfume' : 'perfumes'}`;
  /* the new set rises in place: cards never leave the grid flow, so nothing can end up over the footer */
  const shown = cards.filter(c => !c.hidden);
  if (animate && !REDUCED && shown.length) gsap.fromTo(shown, {autoAlpha:0, y:18}, {autoAlpha:1, y:0, duration:.5, stagger:Math.min(.04, .35 / shown.length), ease:'expo.out', overwrite:false});
  ScrollTrigger.refresh();
}
applyFilters(false);
bindTilt(grid);
/* deep links from the home page: perfumes.html?cat=…&scent=…&moment=…&q=…&buscar=1 */
const qp = new URLSearchParams(location.search);
if (scentOf(qp.get('scent'))) setScent(qp.get('scent'));
else if (qp.get('moment')) setMoment(qp.get('moment'));
if (qp.get('cat')) { const t = $(`.ctab[data-cat="${qp.get('cat')}"]`, catTabs); if (t) t.click(); }
if (qp.get('gender')) {
  const g = qp.get('gender');
  $('#gender').value = filters.gender = g; syncHero(); applyFilters(false);
}
if (qp.get('q')) { $('#search').value = filters.q = qp.get('q'); applyFilters(false); }
if (qp.get('buscar')) setTimeout(() => $('#search').focus(), 300);
catalogApi = {
  setMoment:id => { setMoment(id); scrollToEl('#catalogo'); },
  setScent:id => { setScent(id); scrollToEl('#catalogo'); },
  filterHouse:h => { resetFilters(); $('#search').value = filters.q = h; applyFilters(false); scrollToEl('#catalogo'); },
  focusSearch:() => { scrollToEl('#catalogo'); setTimeout(() => $('#search').focus({preventScroll:true}), REDUCED ? 0 : 1200); },
};
})();

/* marcas destacadas: a tile per house, its monogram in gold; a real bottle rises on hover */
const brandsGrid = $('#brandsGrid');
if (brandsGrid) {
  const ORDER = ['Xerjoff', 'Lorenzo Pazzaglia', 'Creed', 'Maison Francis Kurkdjian', 'Parfums de Marly', 'Clive Christian', 'Roja Parfums',
    'Kilian Paris', 'Tom Ford', 'Initio Parfums Privés', 'Amouage', 'Dior', 'Chanel', 'Jean Paul Gaultier', 'Yves Saint Laurent', 'Versace',
    'Al Haramain', 'Afnan', 'Jo Milano Paris'];
  const houses = [...ORDER, ...new Set(P.map(p => p.house))].filter((h, i, a) => a.indexOf(h) === i && P.some(p => p.house === h));
  const mono = h => h.split(/\s+/).filter(w => /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map(w => w[0]).join('');
  /* real house logos (img/marcas), painted in gold through a mask; houses without one keep the monogram */
  const LOGO = {'Xerjoff':'xerjoff.svg', 'Lorenzo Pazzaglia':'pazzaglia.png', 'Creed':'creed.svg', 'Parfums de Marly':'marly.png',
    'Clive Christian':'clive.png', 'Roja Parfums':'roja.png', 'Tom Ford':'tomford.svg', 'Initio Parfums Privés':'initio.png', 'Amouage':'amouage.png',
    'Dior':'dior.svg', 'Chanel':'chanel.svg', 'Jean Paul Gaultier':'jpg.svg', 'Yves Saint Laurent':'ysl.svg', 'Versace':'versace.svg',
    'Lancôme':'lancome.svg', 'Carolina Herrera':'carolinaherrera.svg', 'Valentino':'valentino.svg', 'Al Haramain':'alharamain.png',
    'Afnan':'afnan.png', 'Jo Milano Paris':'jomilano.svg'};
  const tile = (h, dup) => { const list = P.filter(p => p.house === h);
    return `<button class="brand-tile" data-brand="${h}"${dup ? ' aria-hidden="true" tabindex="-1"' : ''} aria-label="Ver perfumes ${h}">
      ${LOGO[h] ? `<span class="bt-logo${/pazzaglia|clive/.test(LOGO[h]) ? ' emblem' : ''}" aria-hidden="true" style="-webkit-mask-image:url(img/marcas/${LOGO[h]});mask-image:url(img/marcas/${LOGO[h]})"></span>`
        : `<span class="bt-mono" aria-hidden="true">${mono(h)}</span><span class="bt-word">${h}</span>`}
      <span class="bt-meta">${list.length} ${list.length === 1 ? 'perfume' : 'perfumes'}</span>
      <img class="bt-bottle" src="${list[0].cut}" alt="" loading="lazy" draggable="false"></button>`; };
  brandsGrid.innerHTML = houses.map(h => tile(h)).join('') + houses.map(h => tile(h, true)).join('');
  brandsGrid.addEventListener('click', e => { const b = e.target.closest('[data-brand]'); if (b) catalogApi.filterHouse(b.dataset.brand); });
  autoCarousel(brandsGrid.parentElement, brandsGrid, 30);
}
/* colección por género: real bottles of each group on a soft tinted card */
const genGrid = $('#genGrid');
if (genGrid) {
  const G = [
    {g:'mujer', k:'Para ellas', t:'Perfumes Mujer', tone:'rose', ids:['jadore', 'lavieestbelle', 'delina']},
    {g:'hombre', k:'Para ellos', t:'Perfumes Hombre', tone:'sky', ids:['aventus', 'sauvageelixir', 'bleuparfum']},
    {g:'unisex', k:'Para todos', t:'Perfumes Unisex', tone:'sand', ids:['br540', 'erbapura', 'oudwood']},
  ];
  genGrid.innerHTML = G.map(c => { const n = P.filter(p => window.AU_forGender(p, c.g)).length;
    const bottles = c.ids.map(byId).filter(Boolean);
    return `<a class="gen-card g-${c.tone}" href="perfumes.html?gender=${c.g}" data-hover>
      <span class="gen-copy"><small>${c.k}</small><b>${c.t.replace(' ', '<br>')}</b><em>Ver ${n} perfumes</em></span>
      <span class="gen-bottles" aria-hidden="true">${bottles.map((p, i) => `<img src="${p.cut}" alt="" loading="lazy" style="--i:${i - 1}">`).join('')}</span>
    </a>`; }).join('');
}
$$('.link-more[href="perfumes.html"]').forEach(a => { a.textContent = a.textContent.replace('__N__', P.length); });

/* =====================================================================
   PRODUCT PAGE — producto.html?id=…: everything the perfume is made of
   ===================================================================== */
/* one icon per ingredient family, matched from the real note names */
const NOTE_ICONS = [
  [/mango/, '🥭'], [/pina/, '🍍'], [/coco/, '🥥'], [/naranja|mandarina|sanguina|pomelo/, '🍊'], [/bergamota|limon|lima|yuzu|citric|verbena/, '🍋'],
  [/manzana/, '🍏'], [/pera/, '🍐'], [/uva|vino/, '🍇'], [/grosella|frambuesa|cassis/, '🫐'], [/lichi|ruibarbo/, '🍒'], [/melon/, '🍈'],
  [/maracuya|frut|tropical/, '🍑'], [/datil/, '🌴'], [/ron|conac/, '🥃'], [/gin|enebro/, '🍸'], [/te verde|mate/, '🍵'],
  [/rosa/, '🌹'], [/jazmin|azahar|ylang|frangipani|flores blancas|magnolia|muguete|lirio/, '🌼'], [/peonia|violeta|geranio|heliotropo|floral/, '🌸'],
  [/lavanda/, '💐'], [/menta|albahaca|tomillo|romero|salvia|eucalipto|artemisa|oregano|mirto|verde|hierba/, '🌿'],
  [/vainilla/, '🍦'], [/caramelo|toffee|azucar|praline/, '🍮'], [/miel/, '🍯'], [/cacao|chocolate/, '🍫'], [/galleta/, '🍪'],
  [/leche|crema/, '🥛'], [/avellana|frutos secos|tonka|nuez/, '🌰'], [/pimienta/, '🌶️'], [/azafran/, '🌺'],
  [/canela|clavo|cardamomo|jengibre|especia/, '🍂'], [/tabaco/, '🍁'], [/oud|cedro|sandalo|vetiver|guayaco|palisandro|madera|roble|abedul|amberwood|abeto/, '🪵'],
  [/pachuli|musgo|alga/, '🍃'], [/cuero/, '👜'], [/incienso|olibano|mirra|benjui|opopanaco|cisto|elemi|resina/, '🕯️'],
  [/ambar|ambroxan/, '🔶'], [/almizcle|cashmeran/, '☁️'], [/sal|marin|ozon|acuatic/, '🌊'], [/metal|mineral/, '💎'],
];
const noteIcon = n => { const k = norm(n); const hit = NOTE_ICONS.find(([re]) => re.test(k)); return hit ? hit[1] : '✨'; };
const LEVEL = ['', 'Suave', 'Moderada', 'Buena', 'Alta', 'Muy alta'];
const FOR = {hombre:'hombres', mujer:'mujeres', unisex:'mujeres y hombres'};
const pdp = $('#pdp');
if (pdp) {
  const p = byId(new URLSearchParams(location.search).get('id')) || P[0];
  document.title = `${p.name} · ${p.house} · Alto Urbano`;
  const sizes = sizesOf(p);
  let size = 'full', qty = 1;
  const list = (a) => a.length > 1 ? `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}` : a[0];
  const desc = `${p.name} de ${p.house} es una fragancia para ${FOR[p.gender]}, en ${p.conc.toLowerCase()} de ${p.ml} ml. Las notas de salida son ${list(p.top).toLowerCase()}; las notas de corazón son ${list(p.heart).toLowerCase()}; y las notas de fondo son ${list(p.base).toLowerCase()}.`;
  /* real ingredient photo when we have it, a quiet icon otherwise */
  const NI = window.AU_NOTE_IMG || {};
  const noteVisual = n => NI[n.toLowerCase()] ? `<span class="ni photo" aria-hidden="true"><img src="${NI[n.toLowerCase()]}" alt="" loading="lazy"></span>` : `<span class="ni" aria-hidden="true">${noteIcon(n)}</span>`;
  const pyr = (title, notes) => `<div class="pyr-row"><h4>${title}</h4><ul>${notes.map(n => `<li>${noteVisual(n)}${n}</li>`).join('')}</ul></div>`;
  const cat = (window.AU_CATEGORIES || {})[p.cat] || '';
  pdp.innerHTML = `
    <nav class="crumbs" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><a href="perfumes.html">Perfumes</a><span>/</span><a href="perfumes.html?q=${encodeURIComponent(p.house)}">${p.house}</a><span>/</span><span aria-current="page">${p.name}</span></nav>
    <div class="pdp-grid">
      <div class="pdp-media">
        <div class="pdp-stage vitrine" id="pdpStage">
          <span class="v-spot" aria-hidden="true"></span>
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
          <img class="pimg" src="${p.cut}" alt="${p.house} ${p.name}">
          <img class="v-refl" src="${p.cut}" alt="" aria-hidden="true">
        </div>
        <p class="pdp-hint">Pasa el cursor para ver el detalle del frasco</p>
      </div>
      <div class="pdp-info">
        <p class="pdp-sku"><a href="perfumes.html?q=${encodeURIComponent(p.house)}">${p.house}</a>${cat ? ` · ${cat}` : ''}${p.line ? ` · Línea ${p.line}` : ''}</p>
        <h1>${p.name}</h1>
        <p class="pdp-sub">${p.conc} · ${p.ml} ml · ${GENDER[p.gender]}</p>
        <p class="pdp-price"><span id="pdpPrice"></span><small id="pdpPer"></small></p>
        <div class="pdp-sizes" role="group" aria-label="Tamaño">${sizes.map(s => `<button type="button" data-ps="${s.key}" aria-pressed="${s.key === size}"><b>${sizeLabel(s)}</b><span>${clp(s.price)}</span></button>`).join('')}</div>
        <p class="pdp-stock"><i aria-hidden="true"></i>Original y sellado · Envío a todo Chile</p>
        <div class="pdp-buy">
          <div class="pdp-qty"><button type="button" data-q="-1" aria-label="Quitar uno">−</button><span id="pdpQty">1</span><button type="button" data-q="1" aria-label="Agregar uno">+</button></div>
          <button class="btn" type="button" id="pdpAdd">Agregar al carrito</button>
        </div>
        <div class="pdp-share"><span>Compartir</span>
          <a href="https://wa.me/?text=${encodeURIComponent(`${p.house} ${p.name} en Alto Urbano: ${location.href}`)}" target="_blank" rel="noopener" aria-label="Compartir por WhatsApp">WhatsApp</a>
          <button type="button" id="pdpCopy">Copiar enlace</button>
        </div>
        <div class="pdp-block"><h3>Descripción</h3><p class="pdp-lead">${p.blurb}</p><p>${desc}</p><p>${p.story}</p></div>
        <div class="pdp-block"><h3>Acordes principales</h3>
          <div class="pdp-acc">${p.accords.map(([a, v]) => `<div class="acc-row"><span>${a}</span><span>${v}%</span><i><b style="--w:${v}%;--c:${ACC[a] || '#C9A44C'}"></b></i></div>`).join('')}</div></div>
        <div class="pdp-block"><h3>Pirámide olfativa</h3>${pyr('Notas de salida', p.top)}${pyr('Notas de corazón', p.heart)}${pyr('Notas de fondo', p.base)}</div>
        <div class="pdp-block"><h3>Detalles</h3>
          <table class="pdp-table"><tbody>
            <tr><th>Casa</th><td>${p.house}</td></tr>
            <tr><th>Concentración</th><td>${p.conc}</td></tr>
            <tr><th>Contenido</th><td>${p.ml} ml · decants de 5 y 10 ml</td></tr>
            <tr><th>Familia olfativa</th><td>${FAM[p.family]}</td></tr>
            ${cat ? `<tr><th>Categoría</th><td>${cat}</td></tr>` : ''}
            <tr><th>Género</th><td>${GENDER[p.gender]}</td></tr>
            <tr><th>Cuándo usarlo</th><td>${TIME[p.time]}</td></tr>
            <tr><th>Temporada</th><td>${p.seasons.join(', ')}</td></tr>
            <tr><th>Duración</th><td>${LEVEL[p.longevity]}</td></tr>
            <tr><th>Estela</th><td>${LEVEL[p.sillage]}</td></tr>
          </tbody></table></div>
      </div>
    </div>`;
  const syncPrice = () => {
    const s = sizes.find(x => x.key === size);
    $('#pdpPrice').textContent = clp(s.price * qty);
    $('#pdpPer').textContent = `${sizeLabel(s)}${qty > 1 ? ` · ${qty} unidades` : ''} · ${clp(Math.round(s.price / s.ml))} por ml`;
    $('#pdpQty').textContent = qty;
  };
  syncPrice();
  pdp.addEventListener('click', e => {
    const sz = e.target.closest('[data-ps]');
    if (sz) { size = sz.dataset.ps; $$('[data-ps]', pdp).forEach(b => b.setAttribute('aria-pressed', b === sz)); syncPrice(); return; }
    const q = e.target.closest('[data-q]');
    if (q) { qty = Math.max(1, Math.min(9, qty + +q.dataset.q)); syncPrice(); return; }
    if (e.target.closest('#pdpAdd')) { for (let i = 0; i < qty; i++) addToCart(p.id, size, i ? null : $('#pdpStage .pimg')); return; }
    if (e.target.closest('#pdpCopy')) {
      (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => showToast('Enlace copiado'), () => showToast('Copia la dirección desde la barra del navegador'));
    }
  });
  /* zoom: the real bottle follows the cursor at twice its size */
  const stage = $('#pdpStage'), img = $('.pimg', stage);
  if (FINE) {
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      img.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`;
      stage.classList.add('zoom');
    });
    stage.addEventListener('pointerleave', () => stage.classList.remove('zoom'));
  }
  /* accords fill in as they come into view */
  if (!REDUCED) gsap.from('.acc-row b', {scaleX:0, duration:1.1, stagger:.08, ease:'expo.out', scrollTrigger:{trigger:'.pdp-acc', start:'top 85%', once:true}});
  if (!REDUCED) gsap.from('.pdp-media, .pdp-info > *', {y:30, autoAlpha:0, duration:1, stagger:.05, ease:'expo.out', clearProps:'all'});
  /* related: same family or house first */
  const rel = P.filter(x => x.id !== p.id).map(x => ({x, s:(x.house === p.house ? 2 : 0) + (x.family === p.family ? 2 : 0) + (x.cat === p.cat ? 1 : 0)}))
    .sort((a, b) => b.s - a.s).slice(0, 6).map(r => r.x);
  const relatedRow = $('#relatedRow');
  if (relatedRow) { relatedRow.innerHTML = rel.map(x => cardHTML(x)).join(''); bindTilt(relatedRow); }
}

/* sello 100 % original: SVG con texto en círculo, uno por cada [data-seal] */
let sealN = 0;
const sealHTML = () => { const id = 'seal' + (++sealN);
  return `<svg class="seal" viewBox="0 0 200 200" role="img" aria-label="100 % original. Perfumes originales y sellados de fábrica">
    <defs><radialGradient id="${id}g" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#FFF1B8"/><stop offset=".35" stop-color="#E9C766"/><stop offset=".75" stop-color="#C9A037"/><stop offset="1" stop-color="#8C6B1F"/></radialGradient>
      <path id="${id}a" d="M100,100 m-75,0 a75,75 0 1,1 150,0 a75,75 0 1,1 -150,0"/></defs>
    <circle cx="100" cy="100" r="97" fill="url(#${id}g)"/>
    <circle cx="100" cy="100" r="90" fill="none" stroke="#5C4416" stroke-opacity=".35"/>
    <circle cx="100" cy="100" r="61" fill="none" stroke="#5C4416" stroke-opacity=".45"/>
    <g class="seal-ring"><text font-family="Jost, sans-serif" font-size="10.4" font-weight="600" letter-spacing="1.9" fill="#3E2E0E"><textPath href="#${id}a">PERFUMES 100% ORIGINALES · SELLADOS DE FÁBRICA · ALTO URBANO · DESDE 2012 ·</textPath></text></g>
    <text x="100" y="100" text-anchor="middle" font-family="Jost, sans-serif" font-size="29" font-weight="700" fill="#2B1F08">100%</text>
    <text x="100" y="125" text-anchor="middle" font-family="Cinzel, serif" font-size="21" font-weight="700" fill="#2B1F08">ORIGINAL</text>
    <text x="100" y="140" text-anchor="middle" font-family="Jost, sans-serif" font-size="7" fill="#3E2E0E">Perfumería de calidad garantizada</text>
  </svg>`; };
$$('[data-seal]').forEach(el => { el.innerHTML = sealHTML(); });

/* quick buy on every card: pick a size, add it, the real bottle flies to the cart */
document.addEventListener('click', e => {
  const qs = e.target.closest('[data-qs]');
  if (qs) {
    const card = qs.closest('.card'), p = byId(card.dataset.id), s = sizesOf(p).find(x => x.key === qs.dataset.qs);
    $$('[data-qs]', card).forEach(b => b.setAttribute('aria-pressed', b === qs));
    $('.qa-label', card).textContent = sizeLabel(s);
    $('.qa-price', card).textContent = clp(s.price);
    return;
  }
  const qa = e.target.closest('[data-quick-add]');
  if (qa) {
    const card = qa.closest('.card'), sel = $('[data-qs][aria-pressed="true"]', card);
    addToCart(qa.dataset.quickAdd, sel ? sel.dataset.qs : 'd5', $('.pimg', card));
    qa.classList.add('added'); qa.textContent = 'Agregado ✓';
    setTimeout(() => { qa.classList.remove('added'); qa.textContent = 'Agregar al carrito'; }, 1600);
  }
});

/* open product sheet from any card */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-open]'); if (!t) return;
  const card = t.closest('.card'); if (card) openModal(card.dataset.id);
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.stage[data-open]')) { e.preventDefault(); openModal(e.target.closest('.card').dataset.id); }
});

/* tilt + light on cards */
function bindTilt(root){
  if (!FINE || REDUCED) return;
  $$('.card', root).forEach(card => {
    if (card._tilt) return; card._tilt = true;
    const rx = gsap.quickTo(card, 'rotationX', {duration:.6, ease:'power3'}), ry = gsap.quickTo(card, 'rotationY', {duration:.6, ease:'power3'});
    gsap.set(card, {transformPerspective:900});
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
      ry((x - .5) * 10); rx((.5 - y) * 8);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/* =====================================================================
   PRODUCT SHEET (modal)
   ===================================================================== */
const modal = $('#modal'), panel = $('#modalPanel');
let lastFocus, modalSize = 'd5';
function lum(hex){ const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }
function openModal(id){
  /* every perfume has its own page with the full description */
  location.href = `producto.html?id=${encodeURIComponent(id)}`; return;
  const p = byId(id), sizes = sizesOf(p);
  modalSize = 'd5';
  lastFocus = document.activeElement;
  panel.innerHTML = `
    <button class="close" data-close aria-label="Cerrar ficha">×</button>
    <div class="m-visual vitrine">${bottleHTML(p)}</div>
    <div class="m-body">
      <p class="house">${p.house}</p>
      <h2 id="mName">${p.name}</h2>
      <p class="sub">${p.conc} · ${FAM[p.family]} · ${GENDER[p.gender]}</p>
      <p>${p.blurb}</p>
      <h4>Acordes principales</h4>
      <div class="accords">${p.accords.map(([a, v]) => { const c = ACC[a] || '#C9A44C'; return `<div class="accord" data-w="${v}" style="background:${c};color:${lum(c) > .55 ? '#1a140c' : '#F2EBDD'}">${a}</div>`; }).join('')}</div>
      <h4>Pirámide olfativa</h4>
      <dl class="pyr"><dt>Salida</dt><dd>${p.top.join(', ')}</dd><dt>Corazón</dt><dd>${p.heart.join(', ')}</dd><dt>Fondo</dt><dd>${p.base.join(', ')}</dd></dl>
      <h4>Rendimiento</h4>
      <div class="perf"><div>Duración ${meter(p.longevity, 'Duración')}</div><div>Estela ${meter(p.sillage, 'Estela')}</div></div>
      <div class="tags" style="margin-top:12px"><span>${TIME[p.time]}</span>${p.seasons.map(s => `<span>${s}</span>`).join('')}</div>
      <h4>Tamaño</h4>
      <div class="size-pick" role="group" aria-label="Elegir tamaño">${sizes.map(s => `<button data-size="${s.key}" aria-pressed="${s.key === modalSize}"><b>${sizeLabel(s)}</b><span>${clp(s.price)}</span></button>`).join('')}</div>
      <button class="btn" data-add="${p.id}"></button>
    </div>`;
  updateModalBtn(p);
  document.documentElement.classList.add('modal-open');
  modal.setAttribute('aria-hidden', 'false');
  window.lenis && lenis.stop(); heroApi.sync();
  if (!REDUCED) {
    gsap.fromTo($('.m-visual > *', panel), {y:40, rotation:-6, autoAlpha:0}, {y:0, rotation:0, autoAlpha:1, duration:1, ease:'expo.out', delay:.1});
    $$('.accord', panel).forEach((el, i) => gsap.to(el, {width:el.dataset.w + '%', duration:1, ease:'expo.out', delay:.25 + i * .07}));
  } else $$('.accord', panel).forEach(el => el.style.width = el.dataset.w + '%');
  panel.scrollTop = 0;
  $('[data-close]', panel).focus();
}
function updateModalBtn(p){
  const s = sizesOf(p).find(x => x.key === modalSize);
  $('[data-add]', panel).textContent = `Agregar ${sizeLabel(s)} · ${clp(s.price)}`;
}
function closeModal(){
  if (!document.documentElement.classList.contains('modal-open')) return;
  document.documentElement.classList.remove('modal-open');
  modal.setAttribute('aria-hidden', 'true');
  window.lenis && lenis.start(); heroApi.sync();
  lastFocus && lastFocus.focus && lastFocus.focus();
}
panel.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return closeModal();
  const sz = e.target.closest('[data-size]');
  if (sz) { modalSize = sz.dataset.size; $$('[data-size]', panel).forEach(b => b.setAttribute('aria-pressed', b === sz)); updateModalBtn(byId($('[data-add]', panel).dataset.add)); }
  const add = e.target.closest('[data-add]');
  if (add) { addToCart(add.dataset.add, modalSize, $('.m-visual img', panel)); closeModal(); }
});
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* =====================================================================
   CART — carrito, datos de envío y pedido por WhatsApp
   ===================================================================== */
let cart = {};
try { cart = JSON.parse(localStorage.getItem('au-cart-v2')) || {}; } catch (e) {}
const save = () => { try { localStorage.setItem('au-cart-v2', JSON.stringify(cart)); } catch (e) {} };
const countEl = $('#cartCount');
const KIT_OFF = .15;
const kitPrice = (ids, ml) => { const full = ids.reduce((sum, id) => sum + decant(byId(id), ml), 0); return {full, price:Math.ceil(full * (1 - KIT_OFF) / 100) * 100 - 10}; };
const lineOf = key => {
  if (key.startsWith('kit|')) {
    const [, ml, list] = key.split('|'), ids = list.split(',').filter(byId);
    return ids.length === 3 ? {kit:true, ids, ml:+ml, s:{price:kitPrice(ids, +ml).price}} : null;
  }
  const [id, sk] = key.split(':'); const p = byId(id); return p && {p, s:sizesOf(p).find(x => x.key === sk)};
};
const cartKeys = () => Object.keys(cart).filter(k => cart[k] > 0 && lineOf(k));
const cartTotal = () => cartKeys().reduce((s, k) => s + cart[k] * lineOf(k).s.price, 0);

function renderCart(bump){
  const keys = cartKeys();
  const count = keys.reduce((s, k) => s + cart[k], 0), total = cartTotal();
  countEl.textContent = count;
  if (bump && !REDUCED) gsap.fromTo(countEl, {scale:1.7}, {scale:1, duration:.7, ease:'elastic.out(1,.4)'});
  $('#lines').innerHTML = keys.length ? keys.map(k => {
    const L = lineOf(k);
    const qty = `<div class="qty"><button data-dec="${k}" aria-label="Quitar uno">−</button><span>${cart[k]}</span><button data-inc="${k}" aria-label="Agregar uno">+</button></div>`;
    if (L.kit) return `<li class="line-item"><div class="thumb kit-thumb">${L.ids.map(id => `<img src="${byId(id).cut}" alt="">`).join('')}</div>
      <div class="li-main"><b>Kit de descubrimiento</b><small>3 decants de ${L.ml} ml: ${L.ids.map(id => byId(id).name).join(', ')}</small>
      <div class="li-row">${qty}<span class="li-price">${clp(L.s.price * cart[k])}</span></div></div>
      <button class="li-remove" data-remove="${k}" aria-label="Eliminar kit">×</button></li>`;
    const {p, s} = L;
    return `<li class="line-item"><div class="thumb"><img src="${p.cut}" alt=""></div>
      <div class="li-main"><small class="li-house">${p.house}</small><b>${p.name}</b>
      <label class="sr-only" for="sz-${k}">Tamaño de ${p.name}</label>
      <select class="li-size" id="sz-${k}" data-resize="${k}">${sizesOf(p).map(x => `<option value="${x.key}"${x.key === s.key ? ' selected' : ''}>${sizeLabel(x)} · ${clp(x.price)}</option>`).join('')}</select>
      <div class="li-row">${qty}<span class="li-price">${clp(s.price * cart[k])}</span></div></div>
      <button class="li-remove" data-remove="${k}" aria-label="Eliminar ${p.name}">×</button></li>`;
  }).join('') : `<li class="empty"><b>Tu carrito está vacío</b>Un decant de 5 ml es la mejor forma de empezar.<button class="btn small" data-go-catalog>Ver perfumes</button></li>`;
  const left = FREE_SHIP - total;
  $('#subtotal').textContent = clp(total);
  $('#shipCost').textContent = total === 0 ? '—' : left > 0 ? 'Se coordina' : 'Gratis';
  $('#total').textContent = $('#total2').textContent = clp(total);
  $('#toCheckout').disabled = !keys.length;
  $('#ship').innerHTML = `${total === 0 ? `Envío gratis en compras sobre ${clp(FREE_SHIP)}` : left > 0 ? `Te faltan <b>${clp(left)}</b> para el envío gratis` : '<b>Tienes envío gratis</b>'}<div class="bar"><i style="width:${Math.min(100, total / FREE_SHIP * 100)}%"></i></div>`;
  renderUpsell(keys);
}
/* a small nudge: decants of best sellers not yet in the cart */
function renderUpsell(keys){
  const inCart = new Set(keys.filter(k => !k.startsWith('kit|')).map(k => k.split(':')[0]));
  const picks = P.filter(p => p.badge && !inCart.has(p.id)).slice(0, 3);
  $('#upsell').innerHTML = keys.length && picks.length ? `<p class="up-title">Completa tu pedido con un decant</p>
    <div class="up-row">${picks.map(p => `<button class="up" data-up="${p.id}"><img src="${p.cut}" alt=""><span><b>${p.name}</b><small>5 ml · ${clp(decant(p, 5))}</small></span><i aria-hidden="true">+</i></button>`).join('')}</div>` : '';
}
function flyToCart(src, from){
  const to = $('#cartBtn');
  if (REDUCED || !from || !src) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  if (!a.height) return;
  const img = new Image(); img.src = src; img.className = 'flyer'; img.alt = '';
  Object.assign(img.style, {left:a.left + 'px', top:a.top + 'px', height:a.height + 'px'});
  document.body.appendChild(img);
  gsap.timeline({onComplete:() => img.remove()})
    .to(img, {x:b.left + b.width / 2 - a.left - a.width / 2, duration:.9, ease:'power2.inOut'}, 0)
    .to(img, {y:b.top + b.height / 2 - a.top - a.height / 2, duration:.9, ease:'back.in(1.4)'}, 0)
    .to(img, {scale:.12, opacity:.6, duration:.9, ease:'power2.in'}, 0)
    .fromTo(to, {scale:1}, {scale:1.12, duration:.18, yoyo:true, repeat:1}, .82);
}
function addToCart(id, sizeKey, fromEl){
  const k = `${id}:${sizeKey}`;
  cart[k] = (cart[k] || 0) + 1; save(); renderCart(true);
  const {p, s} = lineOf(k);
  flyToCart(p.cut, fromEl);
  showToast(`Agregado: ${p.name} · ${sizeLabel(s)} <button data-open-cart>Ver carrito</button>`);
}
function addKit(ids, ml){
  const k = `kit|${ml}|${ids.join(',')}`;
  cart[k] = (cart[k] || 0) + 1; save(); renderCart(true);
  showToast(`Agregado: kit de 3 decants de ${ml} ml <button data-open-cart>Ver carrito</button>`);
}
renderCart();
$('#lines').addEventListener('click', e => {
  if (e.target.closest('[data-go-catalog]')) { setCart(false); if (grid) scrollToEl('#catalogo'); else goCatalog(); return; }
  const inc = e.target.dataset.inc, dec = e.target.dataset.dec, rm = e.target.dataset.remove;
  if (inc) cart[inc]++; else if (dec) cart[dec] = Math.max(0, cart[dec] - 1); else if (rm) cart[rm] = 0; else return;
  Object.keys(cart).forEach(k => { if (!cart[k]) delete cart[k]; });
  save(); renderCart(true);
});
$('#lines').addEventListener('change', e => {
  const k = e.target.dataset.resize; if (!k) return;
  const nk = `${k.split(':')[0]}:${e.target.value}`;
  cart[nk] = (cart[nk] || 0) + cart[k]; delete cart[k];
  save(); renderCart();
});
$('#upsell').addEventListener('click', e => { const b = e.target.closest('[data-up]'); if (b) addToCart(b.dataset.up, 'd5', $('img', b)); });

/* steps: cart → form → done */
const drawer = $('#drawer'), steps = $$('.dstep', drawer);
const STEP_TITLES = {cart:'Tu carrito', form:'Datos de entrega', done:'Pedido confirmado'};
function goStep(name){
  steps.forEach(s => { s.hidden = s.dataset.step !== name; });
  const idx = ['cart', 'form', 'done'].indexOf(name);
  $$('#steps li').forEach((li, i) => { li.classList.toggle('on', i <= idx); li.toggleAttribute('aria-current', i === idx); });
  $('#drawerTitle').textContent = STEP_TITLES[name];
  const cur = steps.find(s => s.dataset.step === name);
  if (!REDUCED) gsap.fromTo(cur, {autoAlpha:0, x:24}, {autoAlpha:1, x:0, duration:.5, ease:'expo.out'});
}
function setCart(open){
  document.documentElement.classList.toggle('cart-open', open);
  if (open) toast.classList.remove('show');
  drawer.setAttribute('aria-hidden', !open);
  if (window.lenis) open ? lenis.stop() : lenis.start();
  if (open && !$('[data-step="done"]').hidden && !cartKeys().length) goStep('cart');
  (open ? $('#closeCart') : $('#cartBtn')).focus();
}
$('#cartBtn').onclick = () => setCart(true);
$('#closeCart').onclick = () => setCart(false);
$('#scrim').onclick = () => { setCart(false); closeModal(); };
addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); if (document.documentElement.classList.contains('cart-open')) setCart(false); } });

const REGIONS = ['Región Metropolitana', 'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso', "O'Higgins", 'Maule', 'Ñuble', 'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'];
const form = $('#checkoutForm');
form.region.innerHTML = REGIONS.map(r => `<option>${r}</option>`).join('');
const syncAddr = () => { const home = form.entrega.value === 'Envío a domicilio'; $('#addrFields').hidden = !home; };
form.addEventListener('change', e => { if (e.target.name === 'entrega') syncAddr(); });
syncAddr();
$('#toCheckout').onclick = () => { if (cartKeys().length) goStep('form'); };
$('#backToCart').onclick = () => goStep('cart');
$('#keepShopping').onclick = () => { goStep('cart'); setCart(false); };

form.addEventListener('submit', e => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(form));
  const need = [['nombre', 'tu nombre'], ['telefono', 'un teléfono']];
  if (d.entrega === 'Envío a domicilio') need.push(['comuna', 'la comuna'], ['direccion', 'la dirección']);
  const miss = need.find(([k]) => !String(d[k] || '').trim());
  const msg = $('#formMsg');
  if (miss) { msg.textContent = `Falta ${miss[1]}.`; form[miss[0]].focus(); return; }
  if (d.telefono.replace(/\D/g, '').length < 8) { msg.textContent = 'Revisa el teléfono.'; form.telefono.focus(); return; }
  msg.textContent = '';
  const id = 'AU-' + Date.now().toString(36).slice(-6).toUpperCase();
  const keys = cartKeys(), total = cartTotal();
  const lines = keys.map(k => { const L = lineOf(k);
    return L.kit ? `${cart[k]} × Kit 3 decants ${L.ml} ml (${L.ids.map(i => byId(i).name).join(', ')}) · ${clp(L.s.price * cart[k])}`
                 : `${cart[k]} × ${L.p.house} ${L.p.name} · ${sizeLabel(L.s)} · ${clp(L.s.price * cart[k])}`; });
  $('#orderId').textContent = `Pedido ${id} · ${clp(total)}`;
  $('#orderSum').innerHTML = lines.map(l => `<li>${l}</li>`).join('');
  const text = [`Hola Nico, quiero hacer este pedido (${id}):`, '', ...lines, '', `Total: ${clp(total)}`,
    `Entrega: ${d.entrega}${d.entrega === 'Envío a domicilio' ? ` · ${d.direccion}, ${d.comuna}, ${d.region}` : ''}`,
    `Pago: ${d.pago}`, `Nombre: ${d.nombre} · ${d.telefono}${d.correo ? ' · ' + d.correo : ''}`, d.notas ? `Nota: ${d.notas}` : null].filter(l => l !== null).join('\n');
  const num = String((window.AU_CONTACT || {}).whatsapp || '').replace(/\D/g, '');
  $('#sendWa').href = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  goStep('done');
  if (!REDUCED) gsap.fromTo('.done-mark path', {strokeDashoffset:40}, {strokeDashoffset:0, duration:.8, ease:'power2.out', delay:.2});
});
/* once the order has gone out by WhatsApp, the cart empties */
$('#sendWa').addEventListener('click', () => { setTimeout(() => { cart = {}; save(); renderCart(); }, 400); });

/* =====================================================================
   HOUSES — horizontal scroll
   ===================================================================== */
/* an endless strip that drifts by itself, pauses under the mouse and can be dragged;
   it never takes over the page scroll */
function autoCarousel(viewport, strip, speed = 40){
  let x = 0, half = 0, hover = false, drag = null, vel = 0, moved = false;
  const sp = REDUCED ? 0 : speed;
  const measure = () => { half = strip.scrollWidth / 2; };
  measure(); new ResizeObserver(measure).observe(strip); addEventListener('load', measure);
  let onScreen = true;
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(viewport);
  gsap.ticker.add((t, dtms) => {
    if (!half || !onScreen) return;
    const dt = Math.min(dtms / 1000, .05);
    if (!drag) { x -= (hover ? 0 : sp) * dt + vel * dt; vel *= Math.exp(-4 * dt); }
    while (x <= -half) x += half; while (x > 0) x -= half;
    strip.style.transform = `translate3d(${x}px,0,0)`;
  });
  viewport.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
  viewport.addEventListener('pointerleave', () => { hover = false; });
  viewport.addEventListener('pointerdown', e => { drag = {x0:e.clientX, y0:e.clientY, start:x, last:e.clientX, t:performance.now(), id:e.pointerId}; moved = false; });
  viewport.addEventListener('pointermove', e => {
    if (!drag) return;
    if (!moved && Math.abs(e.clientX - drag.x0) > 8 && Math.abs(e.clientX - drag.x0) > Math.abs(e.clientY - drag.y0)) { moved = true; viewport.setPointerCapture(drag.id); }
    if (!moved) return;
    const now = performance.now();
    vel = -(e.clientX - drag.last) / Math.max(1, now - drag.t) * 1000; drag.last = e.clientX; drag.t = now;
    x = drag.start + (e.clientX - drag.x0);
  });
  const end = () => { drag = null; }; viewport.addEventListener('pointerup', end); viewport.addEventListener('pointercancel', end);
  /* a drag is not a click */
  viewport.addEventListener('click', e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
  return {nudge:dir => { vel = dir * 900; }};
}

const track = $('#housesTrack');
if (track) {
  const houseHTML = (h, dup) => {
    const list = P.filter(p => p.house === h.name), n = list.length;
    return `<article class="house-card"${dup ? ' aria-hidden="true"' : ''}>
      <span class="year">${h.year || h.mark}</span>
      <h3>${h.name}</h3>
      <p class="city">${h.city}</p>
      <p>${h.text}</p>
      <div class="hc-minis${n > 6 ? ' many' : ''}" role="list" aria-label="Perfumes de ${h.name}">${list.map(p => `<button class="hc-mini" role="listitem" data-open-id="${p.id}" style="--ar:${p.ar}" aria-label="Ver ${p.name}" title="${p.name}"${dup ? ' tabindex="-1"' : ''}>
        <img src="${p.cut}" alt="" draggable="false"><span>${p.name}</span></button>`).join('')}</div>
      <button class="link" data-house="${h.name}"${dup ? ' tabindex="-1"' : ''}>Ver ${n === 1 ? 'su perfume' : `sus ${n} perfumes`}</button>
    </article>`;
  };
  track.innerHTML = window.AU_HOUSES.map(h => houseHTML(h)).join('') + window.AU_HOUSES.map(h => houseHTML(h, true)).join('');
  track.addEventListener('click', e => {
    const m = e.target.closest('[data-open-id]'); if (m) { openModal(m.dataset.openId); return; }
    const b = e.target.closest('[data-house]'); if (b) catalogApi.filterHouse(b.dataset.house);
  });
  const hc = autoCarousel($('.houses-viewport'), track, 34);
  $$('[data-houses-nudge]').forEach(b => b.addEventListener('click', () => hc.nudge(+b.dataset.housesNudge)));
}

/* ---------- clients: auto carousel of real deliveries ---------- */
const clubChips = $('#clubChips');
if (clubChips) clubChips.innerHTML = (window.AU_CLUBS || []).map(c => `<span>${c}</span>`).join('');
const deliveryHTML = (c, dup) => `
  <figure class="delivery"${dup ? ' aria-hidden="true"' : ''}>
    <img src="${c.img}" alt="Entrega de Alto Urbano${c.club ? ' a jugador de ' + c.club : ''}${c.tag ? ' (' + c.tag + ')' : ''}" loading="lazy" draggable="false">
    <figcaption>
      ${c.club ? `<b>${c.club}</b>` : ''}
      ${c.tag ? `<span class="tag">${c.tag}</span>` : ''}
      <span class="note">${c.note}</span>
      ${c.place ? `<small>${c.place}</small>` : ''}
    </figcaption>
  </figure>`;
const carTrack = $('#clientsGrid'), car = $('#clientsCar');
const CL = window.AU_CLIENTS || [];
if (carTrack) {
  carTrack.innerHTML = CL.map(c => deliveryHTML(c)).join('') + CL.map(c => deliveryHTML(c, true)).join('');
  autoCarousel(car, carTrack, 42);
}

/* =====================================================================
   QUIZ
   ===================================================================== */
const Q = [
  {key:'time', q:'¿Cuándo lo vas a usar más?', opts:[
    ['día', 'De día', 'Oficina, universidad, panoramas al aire libre.'],
    ['noche', 'De noche', 'Cenas, salidas, ocasiones especiales.'],
    ['ambos', 'Todo el día', 'Un perfume firma para cualquier momento.']]},
  {key:'family', q:'¿Qué tipo de aroma te atrae?', opts:[
    ['fresco', 'Fresco y frutal', 'Cítricos, fruta jugosa, sensación limpia.'],
    ['dulce', 'Dulce y envolvente', 'Vainilla, miel, licor, tabaco dulce.'],
    ['amaderado', 'Amaderado u oud', 'Sándalo, cedro, maderas oscuras.'],
    ['ambar', 'Ámbar y especias', 'Azafrán, incienso, calidez oriental.'],
    ['floral', 'Floral', 'Rosa, peonía, jazmín con un toque frutal.']]},
  {key:'sillage', q:'¿Cuánto quieres que se note?', opts:[
    [3, 'Cerca de la piel', 'Solo lo siente quien se acerca.'],
    [4, 'Que se note al pasar', 'Deja estela sin invadir.'],
    [5, 'Que llene la sala', 'Presencia total. Te van a preguntar qué llevas.']]},
  {key:'gender', q:'¿Qué perfil prefieres?', opts:[
    ['hombre', 'Masculino', 'Composiciones pensadas para él.'],
    ['mujer', 'Femenino', 'Composiciones pensadas para ella.'],
    ['', 'Sin preferencia', 'Lo importante es cómo huele.']]},
];
const quiz = $('#quiz'), answers = {};
function renderQuiz(step){
  if (step >= Q.length) return renderQuizResult();
  const q = Q[step];
  const opts = q.key === 'family' ? q.opts.filter(o => P.some(p => p.family === o[0])) : q.opts;
  quiz.innerHTML = `<div class="q active"><div class="q-progress" aria-hidden="true">${Q.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div><p class="q-count">Pregunta ${step + 1} de ${Q.length}</p><h3>${q.q}</h3>
    <div class="q-opts">${opts.map(([v, t, d]) => `<button class="opt" data-v="${v}" data-hover><b>${t}</b><span>${d}</span></button>`).join('')}</div></div>`;
  if (!REDUCED) gsap.fromTo($$('.q > *', quiz), {autoAlpha:0, y:24}, {autoAlpha:1, y:0, duration:.6, stagger:.06, ease:'expo.out'});
  quiz.onclick = e => {
    const o = e.target.closest('.opt'); if (!o) return;
    answers[q.key] = q.key === 'sillage' ? +o.dataset.v : o.dataset.v;
    if (REDUCED) renderQuiz(step + 1);
    else gsap.to($('.q', quiz), {autoAlpha:0, y:-20, duration:.3, onComplete:() => renderQuiz(step + 1)});
  };
}
function score(p){
  let s = 0;
  s += p.time === answers.time ? 2 : p.time === 'ambos' ? 1.5 : answers.time === 'ambos' ? 1 : 0;
  s += p.family === answers.family ? 4 : 0;
  s += Math.max(0, 2 - Math.abs(p.sillage - answers.sillage));
  if (answers.gender) s += p.gender === answers.gender ? 1 : p.gender === 'unisex' ? .5 : -5;
  return s;
}
function renderQuizResult(){
  const top = P.map(p => ({p, s:score(p)})).sort((a, b) => b.s - a.s).slice(0, 3);
  quiz.innerHTML = `<div class="quiz-result"><h3>Tus tres perfumes para probar</h3>
    <div class="grid">${top.map(({p, s}) => cardHTML(p, `<p class="match">Coincidencia ${Math.round(Math.max(55, Math.min(98, s / 9 * 100)))} %</p>`)).join('')}</div>
    <button class="restart" id="restart">Hacer el test otra vez</button></div>`;
  bindTilt(quiz);
  if (!REDUCED) gsap.fromTo($$('.quiz-result .card', quiz), {autoAlpha:0, y:40, rotationX:-12}, {autoAlpha:1, y:0, rotationX:0, duration:.9, stagger:.12, ease:'expo.out'});
  quiz.onclick = e => { if (e.target.id === 'restart') renderQuiz(0); };
  ScrollTrigger.refresh();
}
if (quiz) renderQuiz(0);

/* =====================================================================
   CHROME: nav, newsletter, headings, smooth scroll
   ===================================================================== */
const nav = $('#nav');
const onScroll = () => { const y = scrollY; nav.classList.toggle('scrolled', y > 40); document.documentElement.classList.toggle('bar-hidden', y > 40); };
addEventListener('scroll', onScroll, {passive:true});

if (!REDUCED) $$('.section-head h2, .quiz-box h2, .decant h2, .circle-copy h2').forEach(h => {
  gsap.fromTo(h, {clipPath:'inset(0 0 100% 0)', y:30}, {clipPath:'inset(0 0 0% 0)', y:0, duration:1.1, ease:'expo.out',
    scrollTrigger:{trigger:h, start:'top 85%', once:true}});
});

function scrollToEl(sel){
  const t = typeof sel === 'string' ? $(sel) : sel;
  if (!t) return;
  if (window.lenis) lenis.scrollTo(t, {duration:1.6, offset:-60}); else t.scrollIntoView({behavior:REDUCED ? 'auto' : 'smooth'});
}
$('#searchBtn').onclick = () => catalogApi.focusSearch();

if (!REDUCED && window.Lenis) {
  window.lenis = new Lenis({lerp:.085});
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'); if (id === '#') { e.preventDefault(); return; }
  const t = id === '#top' ? document.body : $(id); if (!t) return;
  e.preventDefault(); if (id === '#top' && window.lenis) lenis.scrollTo(0, {duration:1.6}); else scrollToEl(t);
});



/* =====================================================================
   INTRO — the one orchestrated load moment
   ===================================================================== */
function startIntro(){
  const intro = $('#intro');
  const done = () => {
    document.body.classList.remove('locked');
    window.lenis && lenis.start();
    window.__auRevealed = true;
    ScrollTrigger.refresh();
  };
  let seen = false; try { seen = sessionStorage.getItem('au-intro') === '1'; sessionStorage.setItem('au-intro', '1'); } catch (e) {}
  if (!intro || REDUCED || seen) { if (intro) intro.remove(); done(); heroApi.enter(); if (seen) heroApi.restart(); return; }
  if (rStage) gsap.set([rStage, rCopy], {autoAlpha:0});
  const logo = $('.intro-logo', intro), shine = $('.intro-shine', intro), wrap = $('.intro-wrap', intro);
  const orbit = $('.intro-orbit', intro), doors = $$('.intro-door', intro), bar = $('.intro-bar i', intro);
  /* the crest follows the pointer in 3D while it waits */
  const tiltX = gsap.quickTo(wrap, 'rotationY', {duration:.8, ease:'power3'}), tiltY = gsap.quickTo(wrap, 'rotationX', {duration:.8, ease:'power3'});
  const onMove = e => { tiltX((e.clientX / innerWidth - .5) * 24); tiltY((.5 - e.clientY / innerHeight) * 16); };
  if (FINE) intro.addEventListener('pointermove', onMove);
  const tl = gsap.timeline({paused:true});
  tl.fromTo(orbit, {scale:.4, autoAlpha:0}, {scale:1, autoAlpha:1, duration:1.6, ease:'expo.out'})
    .fromTo(logo, {rotationX:78, z:-520, y:90, autoAlpha:0, filter:'blur(12px)'},
                  {rotationX:0, z:0, y:0, autoAlpha:1, filter:'blur(0px)', duration:1.9, ease:'expo.out'}, .1)
    .fromTo(bar, {scaleX:0}, {scaleX:1, duration:2.2, ease:'power2.inOut'}, 0)
    .fromTo(shine, {backgroundPosition:'130% 0'}, {backgroundPosition:'-30% 0', duration:1.3, ease:'power2.inOut'}, 1.3)
    .addLabel('open', '+=.25')
    /* exit: the crest flies toward you, the rings spread out and the two white doors swing open in 3D */
    .to(wrap, {z:380, autoAlpha:0, duration:1, ease:'power3.in'}, 'open')
    .to(orbit, {scale:2.4, autoAlpha:0, duration:1.1, ease:'power3.in'}, 'open')
    .to('.intro-bar', {autoAlpha:0, duration:.3}, 'open')
    .to(doors[0], {rotationY:-104, duration:1.5, ease:'power3.inOut'}, 'open+=.35')
    .to(doors[1], {rotationY:104, duration:1.5, ease:'power3.inOut', onStart:() => { done(); heroApi.enter(); },
      onComplete:() => { intro.removeEventListener('pointermove', onMove); intro.remove(); heroApi.restart(); }}, 'open+=.35');
  /* start once the logo file is decoded, so the reveal never shows an empty box */
  (logo.decode ? logo.decode() : Promise.resolve()).catch(() => {}).then(() => tl.play());
  intro.addEventListener('click', () => tl.play('open'), {once:true});
}
/* API used by features.js (momentos, comparador, kit, Círculo) */
window.AU = {$, $$, P, byId, clp, decant, sizesOf, TIME, REDUCED, FINE, showToast, scrollToEl, addToCart, addKit, kitPrice, openModal, cardHTML,
  setMoment:id => catalogApi.setMoment(id), setScent:id => catalogApi.setScent(id)};

document.fonts.ready.then(startIntro);
})();
