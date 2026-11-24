// Genera el bloque incrustado de __APP__.js a partir de su fuente y crea
// preview.html para probar la interfaz en el navegador de escritorio:
//   src/ui.html  -> bloque entre «// >>> UI_HTML» y «// <<< UI_HTML»
//   preview.html -> la UI con datos de ejemplo y el puente simulado
// Uso: npm run build
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const RAIZ = path.join(__dirname, '..');
const RUTA_SCRIPT = path.join(RAIZ, '__APP__.js');
const RUTA_UI = path.join(RAIZ, 'src', 'ui.html');
const RUTA_PREVIEW = path.join(RAIZ, 'preview.html');
const RUTA_SIM = path.join(__dirname, 'puente-simulado.js');
const MARCA_UI_INI = '// >>> UI_HTML';
const MARCA_UI_FIN = '// <<< UI_HTML';

// Sustituye lo que hay entre dos marcas de línea completa.
function reemplazarBloque(fuente, ini, fin, contenido) {
  const i = fuente.indexOf(ini);
  const j = fuente.indexOf(fin);
  if (i < 0 || j < i) throw new Error('No se encuentran las marcas ' + ini + ' / ' + fin);
  return fuente.slice(0, i + ini.length) + '\n' + contenido.replace(/\s+$/, '') + '\n' + fuente.slice(j);
}

// Caracteres que no se ven o que rompen un literal JS: siempre como \uXXXX.
function esInvisible(cp) {
  return cp < 0x20 || (cp >= 0x7f && cp <= 0xa0) || cp === 0xad || cp === 0x61c || cp === 0x180e ||
    (cp >= 0x2000 && cp <= 0x200f) || (cp >= 0x2028 && cp <= 0x202f) || (cp >= 0x205f && cp <= 0x206f) ||
    cp === 0x3000 || (cp >= 0xfe00 && cp <= 0xfe0f) || cp === 0xfeff || (cp >= 0xfff0 && cp <= 0xffff) ||
    (cp >= 0xd800 && cp <= 0xdfff) || (cp >= 0xe0000 && cp <= 0xe01ef);
}
function literal(linea) {
  let salida = '';
  for (const ch of JSON.stringify(linea)) {
    const cp = ch.codePointAt(0);
    salida += esInvisible(cp) ? '\\u' + cp.toString(16).padStart(4, '0') : ch;
  }
  return salida;
}
// Una línea de HTML por elemento del array: diffs legibles y sin plantillas `...`.
function bloqueUI(html) {
  return 'const UI_HTML = [\n' + html.split('\n').map(literal).join(',\n') + '\n].join(\'\\n\');';
}

// ── Datos de ejemplo (deterministas) ──
const ANCLA = '2026-11-16';
function datosEjemplo(N) {
  const d = N.datosIniciales();
  let reloj = 0;
  const op = (o) => { reloj++; return N.aplicarOp(d, Object.assign({ ahora: ANCLA + 'T08:00:' + String(reloj).padStart(2, '0') }, o)); };
  ['Primer elemento de ejemplo', 'Otro elemento con notas', 'Algo que ya está hecho'].forEach((t, i) => {
    op({ tipo: 'elemento.crear', elemento: { id: 'e' + (i + 1), titulo: t, notas: i === 1 ? 'Notas de ejemplo.' : '' } });
  });
  op({ tipo: 'elemento.completar', id: 'e3' });
  d.rev = 3;
  return d;
}

function construirPreview(exportado) {
  const html = fs.readFileSync(RUTA_UI, 'utf8');
  const N = exportado.crearNucleo();
  const sim = fs.readFileSync(RUTA_SIM, 'utf8');
  if (/<\/script/i.test(sim)) throw new Error('puente-simulado.js no puede contener </script');
  const ahora = ANCLA + 'T09:00:00';
  const pagina = exportado.construirHTML(html, { datos: datosEjemplo(N), avisos: [], entorno: 'preview', hoy: ANCLA, ahora: ahora });
  const fin = pagina.lastIndexOf('</body>');
  if (fin < 0) throw new Error('src/ui.html no tiene </body>');
  return pagina.slice(0, fin) + '<script>\n' + sim + '</script>\n' + pagina.slice(fin);
}

async function principal() {
  const html = fs.readFileSync(RUTA_UI, 'utf8');
  const original = fs.readFileSync(RUTA_SCRIPT, 'utf8');
  const fuente = reemplazarBloque(original, MARCA_UI_INI, MARCA_UI_FIN, bloqueUI(html));
  if (fuente !== original) fs.writeFileSync(RUTA_SCRIPT, fuente);
  const exportado = await require('../tests/ayuda').cargar();
  if (exportado.UI_HTML !== html) throw new Error('UI_HTML no coincide con src/ui.html tras la generación');
  fs.writeFileSync(RUTA_PREVIEW, construirPreview(exportado));
  console.log('__APP__.js actualizado (' + fuente.length + ' caracteres) y preview.html generado.');
}

module.exports = { reemplazarBloque, literal, bloqueUI, construirPreview, datosEjemplo };
if (require.main === module) principal().catch((e) => { console.error(e); process.exit(1); });
