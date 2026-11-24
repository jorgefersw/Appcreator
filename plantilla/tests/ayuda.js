// Carga __APP__.js en Node con mocks mínimos de la API de Scriptable.
// El script usa "await" de nivel superior (válido en Scriptable), así que se
// envuelve en una función async en lugar de hacer require().
process.env.TZ = 'Europe/Madrid';

const fs = require('node:fs');
const path = require('node:path');

const RUTA = path.join(__dirname, '..', '__APP__.js');

// FileManager en memoria. copy y move fallan si el destino existe, como el real.
class FileManagerFalso {
  constructor() { this.archivos = new Map(); this.fechas = new Map(); this.ultimaFecha = 0; }
  temporaryDirectory() { return '/tmp'; }
  documentsDirectory() { return '/docs'; }
  joinPath(a, b) { return a + '/' + b; }
  fileExists(r) { return this.archivos.has(r); }
  readString(r) { return this.archivos.has(r) ? this.archivos.get(r) : null; }
  writeString(r, texto) {
    this.archivos.set(r, String(texto));
    this.ultimaFecha = Math.max(Date.now(), this.ultimaFecha + 1); // estrictamente creciente
    this.fechas.set(r, new Date(this.ultimaFecha));
  }
  copy(o, d) {
    if (!this.archivos.has(o)) throw new Error('copy: no existe ' + o);
    if (this.archivos.has(d)) throw new Error('copy: ya existe ' + d);
    this.archivos.set(d, this.archivos.get(o));
  }
  move(o, d) { this.copy(o, d); this.archivos.delete(o); }
  remove(r) { this.archivos.delete(r); }
  createDirectory(r) { this.archivos.set(r, '<dir>'); }
  listContents(d) {
    const pref = d + '/';
    return [...this.archivos.keys()].filter((k) => k.startsWith(pref) && !k.slice(pref.length).includes('/')).map((k) => k.slice(pref.length));
  }
  modificationDate(r) { return this.fechas.get(r) || null; }
}

// Globales de Scriptable que se pueden inyectar con cargar().
const GLOBALES = ['FileManager', 'args', 'config', 'Script', 'Alert', 'ListWidget', 'WebView', 'DocumentPicker', 'ShareSheet',
  'Timer', 'Color', 'Font', 'URLScheme', 'SFSymbol', 'Size', 'Safari', 'Notification', 'Request'];

// Ejecuta el script completo. Sin "scriptable" solo se obtiene la lógica
// exportada; con él, el script corre en el modo que indiquen los mocks.
async function cargar(scriptable) {
  const fuente = fs.readFileSync(RUTA, 'utf8');
  const modulo = { exports: {} };
  const s = scriptable || {};
  const fn = new Function('module', ...GLOBALES, 'return (async () => {' + fuente + '\n})();');
  await fn(modulo, ...GLOBALES.map((n) => s[n]));
  return modulo.exports;
}

// Simula una ejecución desde Atajos y devuelve la salida del atajo.
async function ejecutarAtajo(fm, parametro, nube) {
  const salida = { texto: undefined, completado: false };
  await cargar({
    FileManager: { local: () => fm, iCloud: () => { if (!nube) throw new Error('sin iCloud'); return nube; } },
    args: { shortcutParameter: parametro },
    config: { runsInWidget: false },
    Script: { setShortcutOutput: (t) => { salida.texto = t; }, complete: () => { salida.completado = true; } }
  });
  return salida;
}

// Dobles de widget: cada nodo registra lo que se le añade.
class NodoFalso {
  constructor() { this.hijos = []; }
  addText(texto) { const n = new NodoFalso(); n.texto = texto; this.hijos.push(n); return n; }
  addStack() { const n = new NodoFalso(); n.esStack = true; this.hijos.push(n); return n; }
  addImage(img) { const n = new NodoFalso(); n.imagen = img; this.hijos.push(n); return n; }
  addSpacer() { this.hijos.push({ esEspacio: true, hijos: [] }); }
  layoutVertically() {}
  layoutHorizontally() {}
  centerAlignContent() {}
  centerAlignText() {}
  setPadding() {}
}
class ColorFalso {
  constructor(hex) { this.hex = hex; }
  static dynamic(c, o) { const x = new ColorFalso(c.hex); x.claro = c.hex; x.oscuro = o.hex; return x; }
}
const FontFalso = { boldSystemFont: (t) => ({ negrita: true, t }), systemFont: (t) => ({ t }), mediumSystemFont: (t) => ({ t }) };
function textosDe(nodo) {
  let out = [];
  (nodo.hijos || []).forEach((h) => { if (h.texto !== undefined) out.push(h.texto); out = out.concat(textosDe(h)); });
  return out;
}

// Ejecuta el script como widget de la familia dada y devuelve el widget falso.
async function ejecutarWidget(fm, familia) {
  let widget = null;
  await cargar({
    FileManager: { local: () => fm },
    args: {},
    config: { runsInWidget: true, widgetFamily: familia },
    Script: { setWidget: (w) => { widget = w; }, complete: () => {} },
    ListWidget: NodoFalso, Color: ColorFalso, Font: FontFalso
  });
  return widget;
}

module.exports = { cargar, ejecutarAtajo, ejecutarWidget, FileManagerFalso, NodoFalso, ColorFalso, FontFalso, textosDe };
