// Comprueba que ningún fuente contiene caracteres invisibles literales
// (NBSP, U+2028/2029, U+FEFF, espacios de ancho cero...). Uso: npm run invisibles
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const RAIZ = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..");
const RANGOS = [[0x0, 0x8], [0xb, 0xc], [0xe, 0x1f], [0x7f, 0xa0], [0xad, 0xad], [0x61c, 0x61c], [0x180e, 0x180e],
  [0x2000, 0x200f], [0x2028, 0x202f], [0x205f, 0x206f], [0x3000, 0x3000], [0xfe00, 0xfe0f], [0xfeff, 0xfeff], [0xfff0, 0xffff]];
function invisible(cp) { return RANGOS.some(([a, b]) => cp >= a && cp <= b); }
function recorrer(dir, salida) {
  for (const n of fs.readdirSync(dir)) {
    if (n === 'node_modules' || n.startsWith('.') || n === 'preview.html') continue;
    const r = path.join(dir, n);
    if (fs.statSync(r).isDirectory()) recorrer(r, salida);
    else if (/\.(js|html|md|json)$/.test(n)) salida.push(r);
  }
  return salida;
}
let fallos = 0;
for (const r of recorrer(RAIZ, [])) {
  fs.readFileSync(r, 'utf8').split('\n').forEach((l, i) => {
    for (const ch of l) {
      const cp = ch.codePointAt(0);
      if (cp !== 9 && invisible(cp)) { fallos++; console.log(path.relative(RAIZ, r) + ':' + (i + 1) + ' U+' + cp.toString(16).toUpperCase().padStart(4, '0')); }
    }
  });
}
if (fallos) { console.log(fallos + ' caracteres invisibles'); process.exit(1); }
console.log('Sin caracteres invisibles.');
