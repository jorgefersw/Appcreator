// Núcleo puro: esquema, migraciones, operaciones, vistas y fusión.
// Los tests nunca dependen de la fecha real: pasan siempre «ahora» explícito.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { cargar } = require('./ayuda');

let N;
before(async () => { N = (await cargar()).crearNucleo(); });
const AHORA = '2026-11-16T10:00:00';

test('datos iniciales con versión, rev, ajustes y colecciones', () => {
  const d = N.datosIniciales();
  assert.equal(d.version, N.VERSION);
  assert.equal(d.rev, 0);
  N.COLECCIONES.forEach((c) => assert.deepEqual(d[c], []));
});

test('migrar no modifica la entrada y completa lo que falta', () => {
  const crudo = { elementos: [{ id: 'a', titulo: 'x' }], ajustes: { copiaIcloud: false } };
  const copia = JSON.parse(JSON.stringify(crudo));
  const d = N.migrar(crudo);
  assert.deepEqual(crudo, copia);
  assert.equal(d.ajustes.copiaIcloud, false);
  assert.equal(d.ajustes.margenSuperior, 80);
});

test('migrar rechaza datos de una versión futura', () => {
  assert.throws(() => N.migrar({ version: N.VERSION + 1 }), (e) => e.codigo === 'VERSION_FUTURA');
});

test('crear, editar, completar, borrar y restaurar', () => {
  const d = N.datosIniciales();
  const { id } = N.aplicarOp(d, { tipo: 'elemento.crear', elemento: { titulo: '  Hola   mundo ' }, ahora: AHORA });
  assert.equal(d.elementos[0].titulo, 'Hola mundo');
  N.aplicarOp(d, { tipo: 'elemento.editar', id, cambios: { notas: 'n' }, ahora: '2026-11-16T10:01:00' });
  assert.equal(d.elementos[0].modificado, '2026-11-16T10:01:00');
  N.aplicarOp(d, { tipo: 'elemento.completar', id, ahora: AHORA });
  assert.equal(N.hechosHoy(d, '2026-11-16').length, 1);
  N.aplicarOp(d, { tipo: 'elemento.borrar', id, ahora: AHORA });
  assert.equal(N.activos(d).length, 0);
  assert.equal(d.elementos.length, 1, 'el borrado es una marca');
  N.aplicarOp(d, { tipo: 'elemento.restaurar', id, ahora: AHORA });
  assert.equal(N.activos(d).length, 1);
});

test('operaciones inválidas lanzan OP_INVALIDA', () => {
  const d = N.datosIniciales();
  assert.throws(() => N.aplicarOp(d, { tipo: 'elemento.crear', elemento: { titulo: '' }, ahora: AHORA }), (e) => e.codigo === 'OP_INVALIDA');
  assert.throws(() => N.aplicarOp(d, { tipo: 'elemento.crear', elemento: { titulo: 'x' } }), (e) => e.codigo === 'OP_INVALIDA');
  assert.throws(() => N.aplicarOp(d, { tipo: 'nada', ahora: AHORA }), (e) => e.codigo === 'OP_INVALIDA');
});

test('fusionar por id: gana el modificado mayor y no duplica', () => {
  const a = N.datosIniciales();
  N.aplicarOp(a, { tipo: 'elemento.crear', elemento: { id: 'x', titulo: 'viejo' }, ahora: AHORA });
  const b = JSON.parse(JSON.stringify(a));
  N.aplicarOp(b, { tipo: 'elemento.editar', id: 'x', cambios: { titulo: 'nuevo' }, ahora: '2026-11-17T10:00:00' });
  N.aplicarOp(b, { tipo: 'elemento.crear', elemento: { id: 'y', titulo: 'otro' }, ahora: AHORA });
  const f = N.fusionar(a, b);
  assert.equal(f.añadidos, 1);
  assert.equal(f.actualizados, 1);
  assert.equal(f.datos.elementos.find((e) => e.id === 'x').titulo, 'nuevo');
  assert.equal(N.fusionar(f.datos, b).añadidos, 0, 'importar dos veces es inocuo');
});

test('fechas como texto local sin zona', () => {
  assert.equal(N.fechaLocal(new Date(2026, 0, 5, 7, 8, 9)), '2026-01-05T07:08:09');
  assert.equal(N.sumarDias('2026-12-31', 1), '2027-01-01');
  assert.equal(N.diasEntre('2026-03-28', '2026-03-30'), 2, 'cambio de hora');
  assert.equal(N.diaSemana('2026-11-16'), 1);
  assert.equal(N.normalizar('Ácción  Ñu'), 'accion nu');
});
