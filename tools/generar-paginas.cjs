/* Genera las páginas fijas que Google puede leer sin ejecutar JavaScript:
     perfume/<slug>/index.html   una por perfume: "¿a qué huele?", notas, precios, parecidos
     guias/<slug>/index.html     guías como "perfumes para el verano en Santiago"
     guias/index.html            índice de guías
     sitemap.xml y robots.txt
   Se arma a partir de producto.html (mismo encabezado, pie y estilos) y de js/data.js.
   Correr después de cambiar perfumes, precios o reseñas:   node tools/generar-paginas.cjs
   Cuando haya dominio propio:   SITE=https://altourbano.cl node tools/generar-paginas.cjs */
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SITE = (process.env.SITE || 'https://test-perfumeria.179.236.234.227.sslip.io').replace(/\/$/, '');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => { fs.mkdirSync(path.dirname(path.join(ROOT, f)), {recursive:true}); fs.writeFileSync(path.join(ROOT, f), s); };

/* the store's own data and helpers, exactly as the browser sees them */
const win = {};
vm.runInNewContext(read('js/data.js') + '\n' + read('js/resenas.js'), {window:win});
const P = win.AU_PRODUCTS, REVIEWS = win.AU_REVIEWS || [];
/* same price formula as js/app.js, read from there so it never drifts */
const decant = vm.runInNewContext(read('js/app.js').match(/const decant = ([^\n]+);/)[1]);
const clp = n => '$' + n.toLocaleString('es-CL');
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));
const list = a => a.length > 1 ? `${a.slice(0, -1).join(', ')} y ${a[a.length - 1]}` : (a[0] || '');
const LV = ['', 'suave', 'moderada', 'buena', 'alta', 'muy alta'];

const TEMPLATE = read('producto.html');
const VER = (TEMPLATE.match(/\?v=(\d+)/) || [, '1'])[1];

/* one shell for every generated page: producto.html with its own head and a <base> so every relative link still points at the root */
function page({url, title, description, image, jsonld, main, pid}){
  let h = TEMPLATE
    .replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<base href="../../">')
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}/${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}/${url}">
${image ? `<meta property="og:image" content="${SITE}/${image.split('?')[0]}">` : ''}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}`);
  h = main.pdp != null
    ? h.replace('<section class="pdp" id="pdp" aria-live="polite"></section>', `<section class="pdp" id="pdp" aria-live="polite">${main.pdp}</section>`)
    : h.replace(/<main id="top">[\s\S]*<\/main>/, `<main id="top" class="guide-page">${main.html}</main>`);
  if (pid) h = h.replace(`<script src="js/data.js?v=${VER}"></script>`, `<script>window.AU_PID = ${JSON.stringify(pid)};</script>\n<script src="js/data.js?v=${VER}"></script>`);
  return h;
}

/* ---------- perfume/<slug>/ ---------- */
const perfumeUrls = [];
for (const p of P) {
  const url = win.AU_url(p), smell = win.AU_smell(p), sim = win.AU_similar(p, 6);
  const revs = REVIEWS.filter(r => r.id === p.id);
  const d5 = decant(p, 5), d10 = decant(p, 10);
  const description = `${smell[0]} Decants de 5 ml (${clp(d5)}) y 10 ml (${clp(d10)}), o frasco de ${p.ml} ml. Original, con envío a todo Chile.`;
  const jsonld = {
    '@context':'https://schema.org', '@type':'Product', name:`${p.name} ${p.conc}`, brand:{'@type':'Brand', name:p.house},
    image:`${SITE}/${(p.cut || p.img).split('?')[0]}`, description:smell.join(' '), url:`${SITE}/${url}`,
    offers:{'@type':'AggregateOffer', priceCurrency:'CLP', lowPrice:d5, highPrice:p.price, offerCount:3, availability:'https://schema.org/InStock'},
    ...(revs.length ? {aggregateRating:{'@type':'AggregateRating', ratingValue:(revs.reduce((s, r) => s + r.estrellas, 0) / revs.length).toFixed(1), reviewCount:revs.length}} : {}),
  };
  /* what the HTML says before the store's script draws the full page (and what a crawler reads) */
  const pdp = `
    <nav class="crumbs" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><a href="perfumes.html">Perfumes</a><span>/</span><span aria-current="page">${esc(p.name)}</span></nav>
    <div class="pdp-static">
      <p class="pdp-sku">${esc(p.house)}</p>
      <h1>${esc(p.name)}</h1>
      <p>${esc(p.conc)} · ${p.ml} ml · Decant 5 ml ${clp(d5)} · Decant 10 ml ${clp(d10)} · Frasco ${clp(p.price)}</p>
      <img src="${p.cut || p.img}" alt="${esc(`${p.house} ${p.name}`)}" width="240">
      <h2>¿A qué huele ${esc(p.name)}?</h2>${smell.map(t => `<p>${esc(t)}</p>`).join('')}
      <h2>Notas</h2><p>Salida: ${esc(list(p.top))}. Corazón: ${esc(list(p.heart))}. Fondo: ${esc(list(p.base))}.</p>
      <h2>Si te gusta ${esc(p.name)}, prueba</h2>
      <ul>${sim.map(r => `<li><a href="${win.AU_url(r.p)}">${esc(r.p.name)} de ${esc(r.p.house)}</a></li>`).join('')}</ul>
    </div>`;
  write(`${url}index.html`, page({url, pid:p.id, image:p.cut || p.img, jsonld, main:{pdp},
    title:`${p.name} de ${p.house}: a qué huele, notas y decants · Alto Urbano`, description}));
  perfumeUrls.push(url);
}

/* ---------- guías ---------- */
const scent = id => win.AU_SCENTS.find(s => s.id === id);
const sc = (p, id) => win.AU_scentScore(p, scent(id)).score;
const why = p => `Abre con ${list(p.top.slice(0, 3).map(t => t.toLowerCase()))} y queda en ${list(p.base.slice(0, 2).map(t => t.toLowerCase()))}. Duración ${LV[p.longevity]}, estela ${LV[p.sillage]}.`;
const GUIDES = [
  {slug:'perfumes-para-el-verano-en-santiago', title:'Perfumes para el verano en Santiago',
    intro:'Con 30 grados en Santiago, un perfume pesado se vuelve empalagoso al mediodía. Estos son los de la colección que mejor funcionan con calor: cítricos, frutales y limpios, que se sienten frescos sin desaparecer a la hora. Un consejo: en verano basta con dos o tres disparos.',
    pick:p => p.seasons.includes('Verano'), rank:p => sc(p, 'citricas') + sc(p, 'frutales') + (p.family === 'fresco' ? 3 : 0)},
  {slug:'perfumes-para-el-invierno', title:'Perfumes para el invierno',
    intro:'El frío apaga los perfumes livianos; en invierno lucen los dulces, ambarados y amaderados, que con la ropa de lana duran todavía más. Estos son los que más rinden en los meses fríos.',
    pick:p => p.seasons.includes('Invierno'), rank:p => p.longevity + p.sillage + sc(p, 'dulces') / 2 + sc(p, 'amaderadas') / 2},
  {slug:'perfumes-para-la-oficina', title:'Perfumes para la oficina',
    intro:'Para la oficina conviene un perfume que se note de cerca y no llene la sala. Estos son frescos y limpios, fáciles de llevar ocho horas en un espacio cerrado.',
    pick:p => (p.moments || []).includes('dia'), rank:p => -p.sillage + sc(p, 'citricas') / 2},
  {slug:'perfumes-para-salir-de-noche', title:'Perfumes para salir de noche',
    intro:'De noche se puede subir el volumen: dulces, intensos y con estela, de los que dejan rastro cuando pasas. Estos son los más pedidos para salir.',
    pick:p => (p.moments || []).includes('noche'), rank:p => p.sillage + p.longevity},
  {slug:'perfumes-para-una-cita', title:'Perfumes para una cita',
    intro:'Para una cita funcionan los perfumes cálidos y cercanos, que se descubren al acercarse. Estos son los que más comentarios reciben.',
    pick:p => (p.moments || []).includes('cita'), rank:p => p.longevity + sc(p, 'dulces') / 2},
  {slug:'perfumes-para-regalar', title:'Perfumes para regalar',
    intro:'Si no conoces bien el gusto de la otra persona, lo seguro es un perfume que guste a casi todos. Estos son los que nunca fallan como regalo; si tienes dudas, un kit de tres decants deja elegir a quien lo recibe.',
    pick:p => (p.moments || []).includes('regalo'), rank:p => (p.badge ? 2 : 0) + p.longevity},
  {slug:'perfumes-dulces-y-avainillados', title:'Perfumes dulces y avainillados',
    intro:'Vainilla, caramelo, haba tonka y cacao: los perfumes golosos, cálidos y envolventes de la colección, ordenados por cuánto manda lo dulce en sus notas.',
    pick:p => sc(p, 'dulces') >= 3, rank:p => sc(p, 'dulces')},
  {slug:'perfumes-citricos', title:'Perfumes cítricos',
    intro:'Bergamota, limón, naranja y pomelo: los perfumes más luminosos y fáciles de llevar, ordenados por cuánto manda lo cítrico en sus notas.',
    pick:p => sc(p, 'citricas') >= 3, rank:p => sc(p, 'citricas')},
  {slug:'perfumes-frutales', title:'Perfumes frutales',
    intro:'Piña, manzana, mango y frutos rojos: perfumes jugosos y alegres, ordenados por cuánto manda la fruta en sus notas.',
    pick:p => sc(p, 'frutales') >= 3, rank:p => sc(p, 'frutales')},
  {slug:'perfumes-amaderados', title:'Perfumes amaderados',
    intro:'Cedro, sándalo, vetiver y oud: perfumes con cuerpo, elegantes y profundos, ordenados por cuánto mandan las maderas en sus notas.',
    pick:p => sc(p, 'amaderadas') >= 3, rank:p => sc(p, 'amaderadas')},
  {slug:'perfumes-que-duran-todo-el-dia', title:'Perfumes que duran todo el día',
    intro:'Los de mayor duración en la piel: se ponen en la mañana y siguen ahí en la noche. Ideales para probar en decant antes de ir por el frasco.',
    pick:p => p.longevity >= 5, rank:p => p.longevity + p.sillage},
  {slug:'perfumes-arabes-que-rinden', title:'Perfumes árabes que rinden',
    intro:'Los perfumes árabes tienen la mejor relación entre precio y rendimiento: proyección de perfume nicho por una fracción del valor. Estos son los de la colección.',
    pick:p => p.cat === 'arabe', rank:p => p.longevity + p.sillage},
];

const guideCard = p => `<li class="g-item"><a href="${win.AU_url(p)}">
  <img src="${p.cut || p.img}" alt="${esc(`${p.house} ${p.name}`)}" loading="lazy">
  <span class="g-copy"><small>${esc(p.house)}</small><b>${esc(p.name)}</b><span>${esc(why(p))}</span><em>Decant 5 ml ${clp(decant(p, 5))} · Frasco ${clp(p.price)}</em></span>
</a></li>`;
const otherGuides = slug => `<nav class="g-more" aria-label="Otras guías"><h2>Otras guías</h2><ul>${GUIDES.filter(g => g.slug !== slug).map(g => `<li><a href="guias/${g.slug}/">${g.title}</a></li>`).join('')}</ul></nav>`;
const guideUrls = [];
for (const g of GUIDES) {
  const items = P.filter(g.pick).sort((a, b) => g.rank(b) - g.rank(a)).slice(0, 12);
  if (!items.length) continue;
  const url = `guias/${g.slug}/`;
  const html = `
  <section class="guide">
    <nav class="crumbs" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><a href="guias/">Guías</a><span>/</span><span aria-current="page">${g.title}</span></nav>
    <p class="eyebrow"><span>✦</span>Guía Alto Urbano</p>
    <h1>${g.title}</h1>
    <p class="g-intro">${g.intro}</p>
    <ol class="g-list">${items.map(guideCard).join('')}</ol>
    ${otherGuides(g.slug)}
  </section>`;
  write(`${url}index.html`, page({url, main:{html}, image:items[0].cut || items[0].img,
    title:`${g.title} · Alto Urbano`, description:`${g.intro.split('. ')[0]}. ${items.length} perfumes originales con decants de 5 y 10 ml.`,
    jsonld:{'@context':'https://schema.org', '@type':'ItemList', name:g.title, itemListElement:items.map((p, i) => ({'@type':'ListItem', position:i + 1, url:`${SITE}/${win.AU_url(p)}`, name:`${p.name} de ${p.house}`}))}}));
  guideUrls.push(url);
}
write('guias/index.html', page({url:'guias/', title:'Guías de perfumes · Alto Urbano',
  description:'Qué perfume usar en verano, en invierno, en la oficina o en una cita: guías con perfumes originales y decants para probar.',
  main:{html:`
  <section class="guide">
    <nav class="crumbs" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><span aria-current="page">Guías</span></nav>
    <p class="eyebrow"><span>✦</span>Guías Alto Urbano</p>
    <h1>Guías de perfumes</h1>
    <p class="g-intro">Qué usar según el clima, la ocasión o el aroma que te gusta. Cada guía sale de las notas reales de cada perfume.</p>
    <ul class="g-index">${GUIDES.map(g => `<li><a href="guias/${g.slug}/"><b>${g.title}</b><span>${g.intro.split('. ')[0]}.</span></a></li>`).join('')}</ul>
  </section>`}}).replace('<base href="../../">', '<base href="../">'));

/* ---------- sitemap y robots ---------- */
const today = new Date().toISOString().slice(0, 10);
const urls = ['', 'perfumes.html', 'guias/', ...guideUrls, ...perfumeUrls];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}/${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`${perfumeUrls.length} perfumes · ${guideUrls.length} guías · sitemap con ${urls.length} direcciones · ${SITE}`);
