#!/usr/bin/env node
// Crea una app nueva de Scriptable a partir de la plantilla de Appcreator.
// Uso:
//   node <carpeta-de-Appcreator>/scripts/nueva-app.js <Nombre> <carpeta> [opciones]
// Opciones:
//   --slug notas           prefijo de archivos de datos (por defecto, el nombre en minúsculas sin tildes)
//   --color deep-blue      color del icono en Scriptable (cabecera icon-color)
//   --glifo check-circle   glifo del icono en Scriptable (cabecera icon-glyph)
//   --sf checkmark.circle.fill  SF Symbol del widget
//   --acento "#4f46e5,#818cf8"  acento de la UI (claro,oscuro); por defecto según --color
// No sobrescribe nada: falla si la carpeta existe y no está vacía.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const PLANTILLA = path.join(__dirname, '..', 'plantilla');

// Acento de la UI según el color del icono de Scriptable (claro, oscuro).
const ACENTOS = {
  'deep-blue': ['#4f46e5', '#818cf8'], blue: ['#007aff', '#0a84ff'], 'light-blue': ['#0ea5e9', '#38bdf8'],
  cyan: ['#0891b2', '#22d3ee'], teal: ['#0d9488', '#2dd4bf'], green: ['#16a34a', '#4ade80'], 'deep-green': ['#15803d', '#4ade80'],
  yellow: ['#ca8a04', '#facc15'], orange: ['#ea580c', '#fb923c'], red: ['#dc2626', '#f87171'], pink: ['#db2777', '#f472b6'],
  purple: ['#9333ea', '#c084fc'], 'deep-purple': ['#7c3aed', '#a78bfa'], brown: ['#92400e', '#d97706'], 'deep-gray': ['#374151', '#9ca3af'], gray: ['#6b7280', '#9ca3af']
};

function salir(msg) { console.error(msg); process.exit(1); }
function slugDe(nombre) {
  return nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '').slice(0, 24);
}

const pos = [], op = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) op[argv[i].slice(2)] = argv[++i];
  else pos.push(argv[i]);
}
const [nombre, destino] = pos;
if (!nombre || !destino) salir('Uso: node nueva-app.js <Nombre> <carpeta> [--slug x] [--color deep-blue] [--glifo check-circle] [--sf checkmark.circle.fill] [--acento "#claro,#oscuro"]');
if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ][\wÁÉÍÓÚÑáéíóúñ]*$/.test(nombre)) salir('El nombre debe ser una sola palabra (es el nombre del script en Scriptable).');
const slug = op.slug || slugDe(nombre);
if (!/^[a-z][a-z0-9]*$/.test(slug)) salir('Slug no válido: ' + slug);
const color = op.color || 'deep-blue';
const acento = op.acento ? op.acento.split(',') : (ACENTOS[color] || ACENTOS['deep-blue']);
const fichas = {
  __APP__: nombre, __app__: slug, __COLOR__: color, __GLIFO__: op.glifo || 'check-circle',
  __GLIFO_SF__: op.sf || 'checkmark.circle.fill', __ACENTO_CLARO__: acento[0], __ACENTO_OSCURO__: acento[1] || acento[0]
};

const dest = path.resolve(destino);
if (fs.existsSync(dest) && fs.readdirSync(dest).filter((n) => n !== '.DS_Store').length) salir('La carpeta ' + dest + ' existe y no está vacía.');

function sustituir(texto) {
  return Object.keys(fichas).reduce((t, k) => t.split(k).join(fichas[k]), texto);
}
function copiar(origen, destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const n of fs.readdirSync(origen)) {
    if (n === '.DS_Store') continue;
    const o = path.join(origen, n);
    const d = path.join(destino, sustituir(n === 'APP.js' ? '__APP__.js' : n));
    if (fs.statSync(o).isDirectory()) copiar(o, d);
    else fs.writeFileSync(d, sustituir(fs.readFileSync(o, 'utf8')));
  }
}
copiar(PLANTILLA, dest);

execFileSync('node', ['tools/build.js'], { cwd: dest, stdio: 'inherit' });
execFileSync('node', ['--test'], { cwd: dest, stdio: 'inherit' });
execFileSync('node', ['tools/invisibles.js'], { cwd: dest, stdio: 'inherit' });
console.log('\nApp «' + nombre + '» creada en ' + dest);
console.log('Siguiente: rellena ESPEC.md (dominio), cambia el núcleo y src/ui.html, y ejecuta npm run build && npm test.');
