// Comprueba que la UI se ve bien en todos los tamaños de iPhone.
// Abre preview.html con WebKit (el motor del WebView de iOS) en cada modelo,
// en modo claro y oscuro y en cada estado de ESTADOS; guarda capturas, un
// resumen por estado y tema (todos los modelos lado a lado) y comprueba:
//   - la página arranca sin errores de JavaScript
//   - #app ocupa exactamente la pantalla (sin bandas ni desbordes)
//   - nada se sale por los lados ni hay scroll horizontal
//   - el contenido empieza por debajo de la reserva superior y la barra
//     inferior llega al borde de abajo
//   - zonas táctiles de al menos 44 pt y textos cortados sin puntos suspensivos (avisos)
// Uso: npm run build && npm run capturas [-- --solo 393x852] [-- --sin-resumen]
// Sale con código 1 si hay problemas (los avisos no cuentan).
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const RAIZ = path.join(__dirname, '..');
const PREVIEW = path.join(RAIZ, 'preview.html');
const SALIDA = path.join(RAIZ, 'capturas');

// Tamaños en puntos (vertical) y áreas seguras aproximadas (sup, inf).
// Un modelo nuevo de iPhone = una línea más. Si varios comparten tamaño, basta uno.
const DISPOSITIVOS = [
  { id: 'se', nombre: 'iPhone SE (2.ª/3.ª gen.), 8', ancho: 375, alto: 667, seguro: [20, 0], escala: 2 },
  { id: '8plus', nombre: 'iPhone 8 Plus', ancho: 414, alto: 736, seguro: [20, 0], escala: 3 },
  { id: 'mini', nombre: 'iPhone X/XS/11 Pro, 12/13 mini', ancho: 375, alto: 812, seguro: [50, 34], escala: 3 },
  { id: '11', nombre: 'iPhone XR/11, XS Max/11 Pro Max', ancho: 414, alto: 896, seguro: [48, 34], escala: 2 },
  { id: '14', nombre: 'iPhone 12/13/14, 16e', ancho: 390, alto: 844, seguro: [47, 34], escala: 3 },
  { id: '14plus', nombre: 'iPhone 12/13 Pro Max, 14 Plus', ancho: 428, alto: 926, seguro: [47, 34], escala: 3 },
  { id: '15', nombre: 'iPhone 14 Pro, 15, 15 Pro, 16', ancho: 393, alto: 852, seguro: [59, 34], escala: 3 },
  { id: '15promax', nombre: 'iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus', ancho: 430, alto: 932, seguro: [59, 34], escala: 3 },
  { id: '17', nombre: 'iPhone 16 Pro, 17, 17 Pro', ancho: 402, alto: 874, seguro: [62, 34], escala: 3 },
  { id: 'air', nombre: 'iPhone Air', ancho: 420, alto: 912, seguro: [62, 34], escala: 3 },
  { id: '17promax', nombre: 'iPhone 16 Pro Max, 17 Pro Max', ancho: 440, alto: 956, seguro: [62, 34], escala: 3 }
];

// Estados de la UI que se revisan (parámetros de preview.html). Añade los de tu app.
const ESTADOS = [
  { id: 'inicio', q: '' },
  { id: 'ajustes', q: 'vista=ajustes' },
  { id: 'hoja-nuevo', q: 'hoja=nuevo' }
];
const TEMAS = ['light', 'dark'];

// Busca una instalación de Playwright cuyo WebKit esté descargado: local,
// global, la de @playwright/cli o la caché de npx (la que usa el MCP de Playwright).
function cargarPlaywright() {
  const candidatos = ['playwright', 'playwright-core'];
  try {
    const global = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidatos.push(path.join(global, 'playwright'), path.join(global, 'playwright-core'),
      path.join(global, '@playwright', 'cli', 'node_modules', 'playwright-core'));
  } catch (e) { /* sin npm global */ }
  try {
    const npx = path.join(require('node:os').homedir(), '.npm', '_npx');
    fs.readdirSync(npx).forEach((d) => candidatos.push(path.join(npx, d, 'node_modules', 'playwright-core')));
  } catch (e) { /* sin caché de npx */ }
  for (const c of candidatos) {
    try {
      const pw = require(c);
      if (pw.webkit && fs.existsSync(pw.webkit.executablePath())) return pw;
    } catch (e) { /* siguiente */ }
  }
  console.error('No encuentro Playwright con WebKit descargado. Instálalo con:\n  npm i -g playwright && npx playwright install webkit');
  process.exit(2);
}

// Se ejecuta dentro de la página. Devuelve { problemas: [], avisos: [] }.
function revisarPagina() {
  const W = window.innerWidth, H = window.innerHeight;
  const problemas = [], avisos = [];
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
    (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') +
    (el.textContent ? ' «' + el.textContent.trim().slice(0, 30) + '»' : '');
  if (!window.__lista) problemas.push('la página no ha arrancado: ' + (window.__errores || []).join(' / '));
  (window.__errores || []).forEach((e) => problemas.push('error de JavaScript: ' + e));
  const app = document.getElementById('app');
  if (!app) return { problemas: problemas.concat('no hay #app'), avisos };
  const ra = app.getBoundingClientRect();
  if (Math.abs(ra.width - W) > 1 || Math.abs(ra.left) > 1) problemas.push('#app mide ' + Math.round(ra.width) + ' pt de ancho en una pantalla de ' + W);
  if (Math.abs(ra.height - H) > 1) problemas.push('#app mide ' + Math.round(ra.height) + ' pt de alto en una pantalla de ' + H);
  if (document.documentElement.scrollWidth > W + 1) problemas.push('hay scroll horizontal (' + document.documentElement.scrollWidth + ' > ' + W + ')');
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const vistos = new Set();
  app.querySelectorAll('*').forEach((el) => {
    if (el.closest('[aria-hidden="true"]') || el.closest('#avisos') || !visible(el)) return;
    const r = el.getBoundingClientRect();
    if ((r.right > W + 1 || r.left < -1) && ![...vistos].some((v) => v.contains(el))) {
      vistos.add(el);
      problemas.push(desc(el) + ' se sale por el ' + (r.left < -1 ? 'lado izquierdo' : 'lado derecho') + ' (' + Math.round(r.left) + '…' + Math.round(r.right) + ')');
    }
    if (el.matches('button, a, input, select, textarea, [role="button"]')) {
      if (r.width < 43.5 || r.height < 43.5) avisos.push('zona táctil pequeña (' + Math.round(r.width) + '×' + Math.round(r.height) + '): ' + desc(el));
    }
    const cs = getComputedStyle(el);
    if (el.children.length === 0 && el.textContent.trim() && el.scrollWidth > el.clientWidth + 1 &&
        cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis') avisos.push('texto cortado sin «…»: ' + desc(el));
  });
  // Reserva superior: el primer elemento de la vista no queda debajo de la banda.
  const banda = document.getElementById('banda-sup');
  const vista = app.querySelector('.vista');
  if (vista && vista.firstElementChild && vista.scrollTop === 0) {
    const tope = banda && visible(banda) ? banda.getBoundingClientRect().bottom : 0;
    const primero = vista.firstElementChild.getBoundingClientRect();
    if (primero.top < tope - 1) problemas.push('el contenido empieza en ' + Math.round(primero.top) + ' pt, debajo de la reserva superior (' + Math.round(tope) + ')');
  }
  const barra = document.getElementById('tabbar');
  if (barra && visible(barra)) {
    const rb = barra.getBoundingClientRect();
    if (Math.abs(rb.bottom - H) > 1) problemas.push('la barra de pestañas no llega al borde inferior (' + Math.round(rb.bottom) + ' de ' + H + ')');
  }
  return { problemas, avisos: Array.from(new Set(avisos)) };
}

async function resumen(navegador, archivos, destino, titulo) {
  const imgs = archivos.map((a) => '<figure><img src="data:image/png;base64,' + fs.readFileSync(a.ruta).toString('base64') +
    '" style="width:' + a.d.ancho + 'px;height:' + a.d.alto + 'px"><figcaption>' + a.d.ancho + '×' + a.d.alto + '<br>' + a.d.nombre + '</figcaption></figure>').join('');
  const pagina = await navegador.newPage({ viewport: { width: 2000, height: 1200 }, deviceScaleFactor: 1 });
  await pagina.setContent('<html><body style="margin:0;padding:24px;background:#888;font:13px -apple-system,sans-serif">' +
    '<h1 style="margin:0 0 16px;font-size:20px">' + titulo + '</h1><div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">' + imgs +
    '</div><style>figure{margin:0}img{display:block;border-radius:18px;box-shadow:0 4px 20px rgba(0,0,0,.4)}figcaption{width:160px;margin-top:6px;color:#111}</style></body></html>');
  await pagina.screenshot({ path: destino, fullPage: true });
  await pagina.close();
}

async function principal() {
  if (!fs.existsSync(PREVIEW)) { console.error('Falta preview.html: ejecuta npm run build.'); process.exit(2); }
  const args = process.argv.slice(2);
  const solo = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null;
  const dispositivos = DISPOSITIVOS.filter((d) => !solo || solo === d.id || solo === d.ancho + 'x' + d.alto);
  const { webkit } = cargarPlaywright();
  const navegador = await webkit.launch();
  fs.rmSync(SALIDA, { recursive: true, force: true });
  let nProblemas = 0, nAvisos = 0;
  for (const estado of ESTADOS) {
    for (const tema of TEMAS) {
      const archivos = [];
      for (const d of dispositivos) {
        const ctx = await navegador.newContext({
          viewport: { width: d.ancho, height: d.alto }, deviceScaleFactor: d.escala, isMobile: true, hasTouch: true, colorScheme: tema
        });
        const pagina = await ctx.newPage();
        const errores = [];
        pagina.on('pageerror', (e) => errores.push(String(e.message || e)));
        const q = ['scriptable', 'seguro=' + d.seguro.join(','), estado.q].filter(Boolean).join('&');
        await pagina.goto('file://' + PREVIEW + '?' + q);
        await pagina.waitForTimeout(700); // animaciones de entrada y hojas
        const r = await pagina.evaluate(revisarPagina);
        errores.forEach((e) => r.problemas.push('error de JavaScript: ' + e));
        const dir = path.join(SALIDA, estado.id, tema);
        fs.mkdirSync(dir, { recursive: true });
        const ruta = path.join(dir, d.id + '.png');
        await pagina.screenshot({ path: ruta, scale: 'css' });
        archivos.push({ d, ruta });
        await ctx.close();
        const etiqueta = estado.id + ' · ' + (tema === 'dark' ? 'oscuro' : 'claro') + ' · ' + d.nombre + ' (' + d.ancho + '×' + d.alto + ')';
        r.problemas.forEach((p) => { nProblemas++; console.log('✖ ' + etiqueta + ': ' + p); });
        r.avisos.slice(0, 5).forEach((a) => { nAvisos++; console.log('⚠ ' + etiqueta + ': ' + a); });
        if (r.avisos.length > 5) { nAvisos += r.avisos.length - 5; console.log('⚠ ' + etiqueta + ': y ' + (r.avisos.length - 5) + ' avisos más'); }
      }
      if (!args.includes('--sin-resumen')) {
        await resumen(navegador, archivos, path.join(SALIDA, 'resumen-' + estado.id + '-' + (tema === 'dark' ? 'oscuro' : 'claro') + '.png'),
          estado.id + ' · ' + (tema === 'dark' ? 'oscuro' : 'claro'));
      }
    }
  }
  await navegador.close();
  console.log('\n' + dispositivos.length + ' modelos × ' + ESTADOS.length + ' estados × 2 temas. ' +
    (nProblemas ? nProblemas + ' problemas' : 'Sin problemas') + (nAvisos ? ', ' + nAvisos + ' avisos' : '') + '.');
  console.log('Capturas en ' + path.relative(process.cwd(), SALIDA) + '/ (mira los resumen-*.png).');
  process.exit(nProblemas ? 1 : 0);
}

principal().catch((e) => { console.error(e); process.exit(1); });
