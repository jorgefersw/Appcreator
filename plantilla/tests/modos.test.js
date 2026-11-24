// Almacén, copia en iCloud, atajo, widget, puente y garantías de privacidad.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { cargar, ejecutarAtajo, ejecutarWidget, FileManagerFalso, textosDe } = require('./ayuda');

let M, N;
before(async () => { M = await cargar(); N = M.crearNucleo(); });
const RUTA = '/docs/__app__-datos.json';

test('mutar relee, escribe .bak antes de cada escritura y sube rev', () => {
  const fm = new FileManagerFalso();
  const a = M.crearAlmacen(fm, N);
  a.aplicar({ tipo: 'elemento.crear', elemento: { titulo: 'uno' }, ahora: '2026-11-16T10:00:00' });
  a.aplicar({ tipo: 'elemento.crear', elemento: { titulo: 'dos' }, ahora: '2026-11-16T10:00:01' });
  assert.equal(JSON.parse(fm.readString(RUTA)).rev, 2);
  assert.equal(JSON.parse(fm.readString(RUTA + '.bak')).elementos.length, 1);
});

test('archivo dañado: cuarentena, recuperación desde .bak y aviso', () => {
  const fm = new FileManagerFalso();
  const a = M.crearAlmacen(fm, N);
  a.aplicar({ tipo: 'elemento.crear', elemento: { titulo: 'uno' }, ahora: '2026-11-16T10:00:00' });
  a.aplicar({ tipo: 'elemento.crear', elemento: { titulo: 'dos' }, ahora: '2026-11-16T10:00:01' });
  fm.writeString(RUTA, '{roto');
  const r = a.leer();
  assert.equal(r.datos.elementos.length, 1);
  assert.equal(r.recuperado, true);
  assert.ok(r.avisos.some((x) => /dañado/.test(x)));
  assert.ok([...fm.archivos.keys()].some((k) => k.includes('.corrupto-')), 'el archivo dañado se aparta, no se borra');
});

test('versión futura: no se toca el archivo', () => {
  const fm = new FileManagerFalso();
  fm.writeString(RUTA, JSON.stringify({ version: 999, elementos: [] }));
  const a = M.crearAlmacen(fm, N);
  assert.throws(() => a.aplicar({ tipo: 'elemento.crear', elemento: { titulo: 'x' }, ahora: '2026-11-16T10:00:00' }), (e) => e.codigo === 'VERSION_FUTURA');
  assert.equal(JSON.parse(fm.readString(RUTA)).version, 999);
});

test('copia diaria: una por día, solo borra su patrón y conserva 30', () => {
  const fm = new FileManagerFalso();
  const nube = new FileManagerFalso();
  const a = M.crearAlmacen(fm, N);
  a.sincronizar();
  const dir = '/docs/__app__APP/Backup';
  for (let i = 1; i <= 31; i++) nube.writeString(dir + '/__app__-2026-10-' + String(i).padStart(2, '0') + '.json', '{}');
  nube.writeString(dir + '/otro.json', '{}');
  assert.equal(M.copiaDiaria(a, N, () => nube, new Date(2026, 10, 16)), 'hecha');
  assert.equal(M.copiaDiaria(a, N, () => nube, new Date(2026, 10, 16)), 'ya');
  const nombres = nube.listContents(dir);
  assert.ok(nombres.includes('otro.json'));
  assert.equal(nombres.filter((n) => /^__app__-/.test(n)).length, 30);
  assert.equal(M.copiaDiaria(a, N, () => { throw new Error('sin iCloud'); }, new Date(2026, 10, 17)), 'error', 'nunca lanza');
});

test('atajo: diccionario, JSON en texto, texto suelto y resumen', async () => {
  const fm = new FileManagerFalso();
  assert.match((await ejecutarAtajo(fm, { texto: 'Comprar pan' })).texto, /^✓ Comprar pan\n1 pendiente$/);
  assert.match((await ejecutarAtajo(fm, '{"Texto":"Llamar"}')).texto, /^✓ Llamar/);
  assert.match((await ejecutarAtajo(fm, 'Suelto')).texto, /^✓ Suelto/);
  const r = await ejecutarAtajo(fm, { accion: 'resumen' });
  assert.equal(r.texto, 'Tienes 3 pendientes: Suelto, Llamar y Comprar pan.');
  assert.equal(r.completado, true);
  assert.equal((await ejecutarAtajo(fm, { texto: '' })).texto, 'No hay nada que añadir.');
  assert.ok(fm.readString('/docs/__app__-entradas.log').includes('Comprar pan'), 'cada entrada queda en el registro');
});

test('widget: todas las familias, sin escribir datos', async () => {
  const fm = new FileManagerFalso();
  await ejecutarAtajo(fm, { texto: 'Algo' });
  const antes = fm.readString(RUTA);
  for (const f of ['small', 'medium', 'large', 'accessoryCircular', 'accessoryRectangular', 'accessoryInline', undefined]) {
    const w = await ejecutarWidget(fm, f);
    assert.ok(textosDe(w).length > 0, 'familia ' + f);
  }
  assert.equal(fm.readString(RUTA), antes);
});

test('puente: op sellada con el reloj del anfitrión, reenvío idempotente y cierre', async () => {
  const fm = new FileManagerFalso();
  const a = M.crearAlmacen(fm, N);
  const enviados = [];
  const colas = [
    JSON.stringify([{ n: 1, tipo: 'op', op: { tipo: 'elemento.crear', elemento: { titulo: 'x' }, ahora: '1999-01-01T00:00:00' } }]),
    JSON.stringify([{ n: 1, tipo: 'op', op: { tipo: 'elemento.crear', elemento: { titulo: 'x' } } }])
  ];
  const estado = { cerrado: false, fin: new Promise(() => {}) };
  const wv = {
    evaluateJavaScript(js) {
      if (js.startsWith('Puente.recibir(')) { enviados.push(JSON.parse(js.slice(15, -1))); return Promise.resolve(); }
      if (!colas.length) { estado.cerrado = true; return Promise.resolve('[]'); }
      return Promise.resolve(colas.shift());
    }
  };
  const fin = await M.bucleApp(wv, { almacen: a, nucleo: N, fm }, estado, { ahora: () => new Date(2026, 10, 16, 9), esperar: async () => {} });
  assert.equal(fin.cerrado, true);
  const d = a.leer().datos;
  assert.equal(d.elementos.length, 1, 'el reenvío no duplica');
  assert.equal(d.elementos[0].creado, '2026-11-16T09:00:00');
  assert.equal(enviados[1].resultados[0].n, 1, 'se reenvía el resultado guardado');
});

test('procesarMensaje nunca lanza y rechaza enlaces que no son http(s)', async () => {
  const fm = new FileManagerFalso();
  const ctx = { almacen: M.crearAlmacen(fm, N), nucleo: N, fm, hoy: '2026-11-16' };
  assert.equal((await M.procesarMensaje({ n: 1, tipo: 'raro' }, ctx)).ok, false);
  assert.equal((await M.procesarMensaje({ n: 2, tipo: 'abrir', url: 'javascript:alert(1)' }, ctx)).ok, false);
  assert.equal((await M.procesarMensaje(null, ctx)).ok, false);
});

test('jsonSeguro y construirHTML no dejan cerrar el <script>', () => {
  const t = M.jsonSeguro({ a: '</script><!--' + String.fromCharCode(0x2028) });
  assert.ok(!/[<>]/.test(t));
  assert.ok(!t.includes(String.fromCharCode(0x2028)));
  const html = M.construirHTML('<script>/*__NUCLEO__*/</script><script>/*__INICIO__*/</script>', { datos: { x: '$&' } });
  assert.ok(html.includes('"$' + '\\' + 'u0026"'), 'el $& de los datos no se interpreta como patrón');
  assert.throws(() => M.construirHTML('<p></p>', {}));
});

test('sin red: el script no contiene peticiones ni direcciones externas', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', '__APP__.js'), 'utf8');
  const sinUI = fuente.slice(0, fuente.indexOf('// >>> UI_HTML')) + fuente.slice(fuente.indexOf('// <<< UI_HTML'));
  assert.ok(!/new\s+Request\b|loadJSON|loadString|fetch\(|XMLHttpRequest/.test(sinUI));
  const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.html'), 'utf8');
  assert.ok(!/fetch\(|XMLHttpRequest|<script[^>]+src=|<link[^>]+href=["']https?:/.test(ui));
});

test('la UI generada coincide con src/ui.html (npm run build)', () => {
  const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'ui.html'), 'utf8');
  assert.equal(M.UI_HTML, ui, 'ejecuta npm run build');
});
