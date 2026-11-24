// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: __COLOR__; icon-glyph: __GLIFO__;

// __APP__ — app personal para iPhone escrita como un único script de Scriptable.
// Todos los datos se quedan en el iPhone (FileManager.local), sin red y sin
// dependencias. Copia diaria automática en iCloud Drive (Scriptable/__app__APP/Backup).
//
// Estructura del archivo:
//   1. crearNucleo()   Lógica pura, sin APIs de Scriptable (testeable en Node y
//                      también inyectada en el WebView con toString()).
//   2. crearAlmacen()  Lectura/escritura del JSON, .bak, cuarentena y registros.
//   3. UI              HTML de la app, bloque UI_HTML (generado por npm run build).
//   4. Modos           Atajo, widget, app y principal().

// ───────────────────────────── 1. NÚCLEO PURO ─────────────────────────────
// Función autocontenida: no usa nada de fuera, para poder inyectarla también
// en el WebView con crearNucleo.toString().
function crearNucleo() {
  'use strict';

  const VERSION = 1;
  const COLECCIONES = ['elementos'];
  // Migraciones { [desdeVersion]: fn(datos) } que llevan de la versión n a la n+1.
  const MIGRACIONES = {};
  // Colores del sistema de iOS (claro / oscuro), compartidos por la UI y el widget.
  const COLORES = {
    indigo: { claro: '#5856d6', oscuro: '#5e5ce6' },
    azul: { claro: '#007aff', oscuro: '#0a84ff' },
    turquesa: { claro: '#30b0c7', oscuro: '#40c8e0' },
    verde: { claro: '#34c759', oscuro: '#30d158' },
    amarillo: { claro: '#ffcc00', oscuro: '#ffd60a' },
    naranja: { claro: '#ff9500', oscuro: '#ff9f0a' },
    rojo: { claro: '#ff3b30', oscuro: '#ff453a' },
    rosa: { claro: '#ff2d55', oscuro: '#ff375f' }
  };
  const DIAS_SEMANA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // ── Utilidades ──
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function pad4(n) { return ('000' + n).slice(-4); }
  function nuevoId() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function limpiarTexto(t, max) {
    if (t == null || typeof t === 'object') return '';
    return String(t).replace(/\s+/g, ' ').trim().slice(0, max || 200);
  }
  const DIACRITICOS = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g');
  // Minúsculas, sin tildes y solo letras/números separados por un espacio.
  function normalizar(texto) {
    if (texto == null) return '';
    return String(texto).toLowerCase().normalize('NFD').replace(DIACRITICOS, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function clonar(x) { return JSON.parse(JSON.stringify(x)); }
  function esObjeto(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
  function tiene(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function invalida(msg) { const e = new Error(msg); e.codigo = 'OP_INVALIDA'; return e; }

  // ── Fechas ──
  // Día: 'YYYY-MM-DD'. Instante: 'YYYY-MM-DDTHH:mm:ss' local, sin zona. Sin Intl.
  function fechaLocal(d) {
    return pad4(d.getFullYear()) + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  function esDiaValido(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const y = +s.slice(0, 4), m = +s.slice(5, 7), d = +s.slice(8, 10);
    const f = new Date(y, m - 1, d);
    return f.getFullYear() === y && f.getMonth() === m - 1 && f.getDate() === d;
  }
  function esInstanteValido(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s) && esDiaValido(s.slice(0, 10));
  }
  function sumarDias(dia, n) {
    const f = new Date(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10) + n);
    return fechaLocal(f).slice(0, 10);
  }
  function diasEntre(a, b) {
    const x = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
    const y = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
    return Math.round((y - x) / 864e5);
  }
  // 1 = lunes … 7 = domingo.
  function diaSemana(dia) { const d = new Date(+dia.slice(0, 4), +dia.slice(5, 7) - 1, +dia.slice(8, 10)).getDay(); return d === 0 ? 7 : d; }
  function textoDia(dia) {
    return DIAS_SEMANA[diaSemana(dia) - 1] + ' ' + (+dia.slice(8, 10)) + ' de ' + MESES[+dia.slice(5, 7) - 1];
  }

  // ── Esquema y migraciones ──
  function datosIniciales() {
    return {
      version: VERSION,
      rev: 0,
      ajustes: { margenSuperior: 80, copiaIcloud: true },
      elementos: []
    };
  }

  // Fusión en profundidad de objetos planos: los valores de "extra" ganan.
  function fusionarProfundo(base, extra) {
    const r = clonar(base);
    if (!esObjeto(extra)) return r;
    Object.keys(extra).forEach(function (k) {
      if (esObjeto(extra[k]) && esObjeto(r[k])) r[k] = fusionarProfundo(r[k], extra[k]);
      else r[k] = clonar(extra[k]);
    });
    return r;
  }

  // Trabaja sobre una copia: nunca modifica la entrada. Lanza VERSION_FUTURA si
  // los datos son de una versión más nueva (no se tocan nunca).
  function migrar(d) {
    const base = datosIniciales();
    if (!esObjeto(d)) return base;
    const x = clonar(d);
    let v = x.version;
    if (typeof v !== 'number' || !isFinite(v) || v < 1) v = 1;
    if (v > VERSION) {
      const e = new Error('Los datos son de una versión más nueva (' + v + ') que esta app (' + VERSION + '). Actualiza __APP__.js.');
      e.codigo = 'VERSION_FUTURA';
      throw e;
    }
    while (v < VERSION) {
      if (typeof MIGRACIONES[v] === 'function') MIGRACIONES[v](x);
      v++;
    }
    const r = base;
    r.version = VERSION;
    r.rev = typeof x.rev === 'number' && isFinite(x.rev) ? x.rev : 0;
    r.ajustes = fusionarProfundo(base.ajustes, x.ajustes);
    COLECCIONES.forEach(function (c) { r[c] = Array.isArray(x[c]) ? x[c].filter(esObjeto) : []; });
    return r;
  }

  // ── Operaciones ──
  // Toda escritura es una operación { tipo, ahora, ... }. La UI la aplica en
  // pantalla sobre una copia y el anfitrión la vuelve a aplicar sobre el disco.
  function buscarId(lista, id, que) {
    const x = lista.filter(function (e) { return e.id === id; })[0];
    if (!x) throw invalida('no existe ' + que + ' «' + id + '»');
    return x;
  }

  function construirElemento(datos, e, ahora) {
    if (!esObjeto(e)) throw invalida('falta el elemento');
    const titulo = limpiarTexto(e.titulo, 200);
    if (!titulo) throw invalida('el título está vacío');
    const id = typeof e.id === 'string' && e.id ? e.id : nuevoId();
    if (datos.elementos.some(function (x) { return x.id === id; })) throw invalida('ya existe «' + id + '»');
    return {
      id: id, titulo: titulo, notas: limpiarTexto(e.notas, 2000), hecho: false, hechoEn: null,
      creado: ahora, modificado: ahora, borrado: false
    };
  }

  function aplicarOp(datos, op) {
    if (!esObjeto(op) || typeof op.tipo !== 'string') throw invalida('operación no válida');
    if (op.tipo === 'lote') {
      if (!Array.isArray(op.ops)) throw invalida('el lote no tiene operaciones');
      return op.ops.map(function (o) { return aplicarOp(datos, o); });
    }
    const ahora = op.ahora;
    if (!esInstanteValido(ahora)) throw invalida('«ahora» no válido');
    switch (op.tipo) {
      case 'elemento.crear': {
        const e = construirElemento(datos, op.elemento, ahora);
        datos.elementos.push(e);
        return { id: e.id, titulo: e.titulo };
      }
      case 'elemento.editar': {
        const e = buscarId(datos.elementos, op.id, 'elemento');
        if (!esObjeto(op.cambios)) throw invalida('faltan los cambios');
        if (tiene(op.cambios, 'titulo')) {
          const t = limpiarTexto(op.cambios.titulo, 200);
          if (!t) throw invalida('el título está vacío');
          e.titulo = t;
        }
        if (tiene(op.cambios, 'notas')) e.notas = limpiarTexto(op.cambios.notas, 2000);
        e.modificado = ahora;
        return { id: e.id };
      }
      case 'elemento.completar':
      case 'elemento.reabrir': {
        const e = buscarId(datos.elementos, op.id, 'elemento');
        e.hecho = op.tipo === 'elemento.completar';
        e.hechoEn = e.hecho ? ahora : null;
        e.modificado = ahora;
        return { id: e.id };
      }
      // Los borrados son marcas, para que la fusión de copias los respete.
      case 'elemento.borrar':
      case 'elemento.restaurar': {
        const e = buscarId(datos.elementos, op.id, 'elemento');
        e.borrado = op.tipo === 'elemento.borrar';
        e.modificado = ahora;
        return { id: e.id };
      }
      case 'ajustes.editar': {
        if (!esObjeto(op.cambios)) throw invalida('faltan los cambios');
        const c = op.cambios;
        if (tiene(c, 'margenSuperior')) {
          const m = Math.round(Number(c.margenSuperior));
          if (!isFinite(m) || m < 0 || m > 200) throw invalida('margen superior no válido');
          datos.ajustes.margenSuperior = m;
        }
        if (tiene(c, 'copiaIcloud')) datos.ajustes.copiaIcloud = !!c.copiaIcloud;
        return { ajustes: clonar(datos.ajustes) };
      }
      default:
        throw invalida('operación desconocida: ' + op.tipo);
    }
  }

  // ── Vistas (puras) ──
  function activos(datos) {
    return datos.elementos.filter(function (e) { return !e.borrado; });
  }
  function pendientes(datos) {
    // Más recientes primero; a igual «creado», el que está más atrás en la lista.
    return activos(datos).map(function (e, i) { return { e: e, i: i }; })
      .filter(function (x) { return !x.e.hecho; })
      .sort(function (a, b) { return a.e.creado < b.e.creado ? 1 : a.e.creado > b.e.creado ? -1 : b.i - a.i; })
      .map(function (x) { return x.e; });
  }
  function hechosHoy(datos, hoy) {
    return activos(datos).filter(function (e) { return e.hecho && e.hechoEn && e.hechoEn.slice(0, 10) === hoy; });
  }

  // ── Fusión de copias (importar) ──
  // Por id y sin duplicar: gana el "modificado" mayor, borrados incluidos.
  function fusionar(local, entrante) {
    const res = migrar(local);
    const ent = migrar(entrante);
    let añadidos = 0, actualizados = 0;
    COLECCIONES.forEach(function (c) {
      const idx = {};
      res[c].forEach(function (x, i) { idx[x.id] = i; });
      ent[c].forEach(function (x) {
        if (!x || typeof x.id !== 'string') return;
        if (!tiene(idx, x.id)) { idx[x.id] = res[c].length; res[c].push(x); añadidos++; return; }
        if ((x.modificado || '') > (res[c][idx[x.id]].modificado || '')) { res[c][idx[x.id]] = x; actualizados++; }
      });
    });
    return { datos: res, añadidos: añadidos, actualizados: actualizados };
  }

  return {
    VERSION: VERSION, COLECCIONES: COLECCIONES, MIGRACIONES: MIGRACIONES, COLORES: COLORES,
    nuevoId: nuevoId, limpiarTexto: limpiarTexto, normalizar: normalizar, clonar: clonar,
    fechaLocal: fechaLocal, esDiaValido: esDiaValido, esInstanteValido: esInstanteValido,
    sumarDias: sumarDias, diasEntre: diasEntre, diaSemana: diaSemana, textoDia: textoDia,
    datosIniciales: datosIniciales, migrar: migrar, aplicarOp: aplicarOp,
    activos: activos, pendientes: pendientes, hechosHoy: hechosHoy, fusionar: fusionar
  };
}

// ───────────────────────────── 2. ALMACÉN ─────────────────────────────
// Todo el estado vive en un único JSON en FileManager.local(). Cada escritura
// relee el disco, aplica la operación y guarda: un Atajo y la app abierta a la
// vez nunca se pisan. opciones = { dir, ahora: () => Date } (solo tests).
function crearAlmacen(fm, nucleo, opciones) {
  const dir = (opciones && opciones.dir) || fm.documentsDirectory();
  const ruta = fm.joinPath(dir, '__app__-datos.json');
  const rutaBak = ruta + '.bak';
  const rutaLog = fm.joinPath(dir, '__app__-entradas.log');
  const rutaCopia = fm.joinPath(dir, '__app__-copia-icloud.txt');
  const reloj = (opciones && opciones.ahora) || function () { return new Date(); };

  // Un JSON válido que no es un objeto cuenta como corrupto.
  function leerArchivo(r) {
    if (!fm.fileExists(r)) return { estado: 'falta' };
    try {
      const crudo = JSON.parse(fm.readString(r));
      if (crudo === null || typeof crudo !== 'object' || Array.isArray(crudo)) return { estado: 'corrupto' };
      return { estado: 'ok', datos: nucleo.migrar(crudo) };
    } catch (e) {
      if (e.codigo === 'VERSION_FUTURA') throw e;
      return { estado: 'corrupto' };
    }
  }

  // Un archivo ilegible se aparta con otro nombre; nunca se sobrescribe.
  function cuarentena(r) {
    const sello = nucleo.fechaLocal(reloj()).replace(/[-:]/g, '');
    let destino = r + '.corrupto-' + sello;
    for (let i = 2; fm.fileExists(destino); i++) destino = r + '.corrupto-' + sello + '-' + i;
    fm.move(r, destino);
    return destino.slice(dir.length + 1);
  }

  function leer() {
    const avisos = [];
    const principal = leerArchivo(ruta);
    if (principal.estado === 'ok') return { datos: principal.datos, avisos: avisos, recuperado: false };
    if (principal.estado === 'corrupto') avisos.push('El archivo de datos estaba dañado y se ha apartado como «' + cuarentena(ruta) + '».');
    const copia = leerArchivo(rutaBak);
    if (copia.estado === 'ok') {
      avisos.push('Se han recuperado los datos de la copia de seguridad (puede faltar el último cambio).');
      return { datos: copia.datos, avisos: avisos, recuperado: true };
    }
    if (copia.estado === 'corrupto') avisos.push('La copia de seguridad también estaba dañada y se ha apartado como «' + cuarentena(rutaBak) + '».');
    if (avisos.length) avisos.push('Se empieza con datos vacíos.');
    return { datos: nucleo.datosIniciales(), avisos: avisos, recuperado: false };
  }

  function guardar(datos) {
    const texto = JSON.stringify(datos);
    if (fm.fileExists(ruta)) {
      if (fm.fileExists(rutaBak)) fm.remove(rutaBak);
      fm.copy(ruta, rutaBak);
    }
    fm.writeString(ruta, texto);
  }

  // Relee, aplica fn(datos) y guarda. Si fn devuelve false no se escribe.
  // Aquí se añaden los pasos automáticos (recurrentes, cierres calculados…).
  function mutar(fn) {
    const leido = leer();
    const datos = leido.datos;
    const info = fn ? fn(datos) : false;
    const escrito = info !== false || leido.recuperado;
    if (escrito) {
      datos.rev = (datos.rev || 0) + 1;
      guardar(datos);
    }
    return { datos: datos, info: info, avisos: leido.avisos, escrito: escrito };
  }

  function tieneFormaDeDatos(x) {
    if (x === null || typeof x !== 'object' || Array.isArray(x)) return false;
    let alguna = false;
    for (const c of nucleo.COLECCIONES) {
      if (x[c] === undefined) continue;
      if (!Array.isArray(x[c])) return false;
      alguna = true;
    }
    return alguna;
  }

  // Fusiona una copia externa (gana el "modificado" mayor) y conserva los ajustes locales.
  function importar(externo) {
    if (!tieneFormaDeDatos(externo)) {
      const e = new Error('El archivo no es una copia de seguridad válida de __APP__.');
      e.codigo = 'FORMATO';
      throw e;
    }
    let resumen = { añadidos: 0, actualizados: 0 };
    mutar(function (datos) {
      const f = nucleo.fusionar(datos, externo);
      resumen = { añadidos: f.añadidos, actualizados: f.actualizados };
      if (!f.añadidos && !f.actualizados) return false;
      nucleo.COLECCIONES.forEach(function (c) { datos[c] = f.datos[c]; });
      return resumen;
    });
    return resumen;
  }

  // Últimas 30 entradas recibidas desde Atajos: diagnóstico en el iPhone.
  function anotar(linea) {
    try {
      const previo = fm.fileExists(rutaLog) ? (fm.readString(rutaLog) || '') : '';
      const lineas = previo.split('\n').filter(Boolean).slice(-29);
      lineas.push(reloj().toISOString() + ' ' + String(linea).replace(/\s*\n\s*/g, ' | '));
      fm.writeString(rutaLog, lineas.join('\n') + '\n');
    } catch (e) { /* el registro de diagnóstico es prescindible */ }
  }
  function leerNotaCopia() {
    try { return fm.fileExists(rutaCopia) ? (fm.readString(rutaCopia) || '') : ''; } catch (e) { return ''; }
  }
  function notaCopia(texto) {
    try { if (leerNotaCopia() !== texto) fm.writeString(rutaCopia, texto); } catch (e) { /* prescindible */ }
  }
  function leerLog() {
    let log = '';
    try { log = fm.fileExists(rutaLog) ? (fm.readString(rutaLog) || '') : ''; } catch (e) { log = ''; }
    const nota = leerNotaCopia();
    return (nota ? nota + '\n' : '') + log;
  }

  return {
    ruta: ruta, rutaBak: rutaBak, leer: leer, mutar: mutar,
    aplicar: function (op) { return mutar(function (d) { return nucleo.aplicarOp(d, op); }); },
    sincronizar: function () { return mutar(null); },
    importar: importar, anotar: anotar, leerLog: leerLog, notaCopia: notaCopia,
    fechaModificacion: function () { return fm.fileExists(ruta) ? fm.modificationDate(ruta) : null; }
  };
}

// ───────────────────────────── 3. UI ─────────────────────────────
// La UI vive en src/ui.html. El bloque entre las marcas lo genera
// `npm run build`; no lo edites a mano.
// >>> UI_HTML
const UI_HTML = '';
// <<< UI_HTML

// JSON que se puede incrustar dentro de <script> sin que un "</script>", un
// "<!--" o un separador de línea Unicode en los datos rompan la página.
// El escape se construye con '\\' + 'u' para no escribir secuencias \u en el fuente.
const CARACTERES_PELIGROSOS = new RegExp('[<>&' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
function jsonSeguro(valor) {
  return JSON.stringify(valor).replace(CARACTERES_PELIGROSOS, function (c) {
    return '\\' + 'u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
  });
}

// Rellena la plantilla con el núcleo y el estado inicial.
// inicio: { datos, avisos: [texto], entorno: 'scriptable' | 'preview', hoy, ahora }.
function construirHTML(plantilla, inicio) {
  const marcas = ['/*__NUCLEO__*/', '/*__INICIO__*/'];
  marcas.forEach(function (m) {
    if (plantilla.split(m).length !== 2) throw new Error('La plantilla de la UI debe contener una vez ' + m);
  });
  // Funciones como reemplazo para que "$&" en los datos no se interprete.
  return plantilla
    .replace(marcas[0], function () { return 'window.crearNucleo = ' + crearNucleo.toString() + ';'; })
    .replace(marcas[1], function () { return 'window.__INICIO__ = ' + jsonSeguro(inicio) + ';'; });
}

// ───────────────────────────── 4. MODOS ─────────────────────────────

// ── Utilidades ──
function hoyLocal(nucleo, ahora) { return nucleo.fechaLocal(ahora || new Date()).slice(0, 10); }
function mensajeDeError(e) { return e && e.message ? e.message : String(e); }
function esObjetoPlano(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }
// Espera ms milisegundos con el temporizador de Scriptable (no hay setTimeout).
function esperarMs(ms) {
  return new Promise(function (resolver) {
    try { Timer.schedule(ms, false, function () { resolver(); }); } catch (e) { resolver(); }
  });
}

// ── Copia diaria en iCloud Drive ──
// La primera vez que el script se ejecuta cada día guarda todos los datos en
// iCloud Drive (Scriptable/__app__APP/Backup) y conserva las 30 últimas.
// Nunca lanza. Devuelve 'hecha', 'ya', 'desactivada' o 'error'.
const CARPETA_COPIAS = '__app__APP/Backup';
const COPIAS_CONSERVADAS = 30;
function copiaDiaria(almacen, nucleo, obtenerNube, ahora) {
  const hoy = hoyLocal(nucleo, ahora);
  try {
    const datos = almacen.leer().datos;
    if (!datos.ajustes || !datos.ajustes.copiaIcloud) {
      almacen.notaCopia('Copia diaria en iCloud desactivada en los ajustes.');
      return 'desactivada';
    }
    const nube = obtenerNube();
    const carpeta = nube.joinPath(nube.documentsDirectory(), CARPETA_COPIAS);
    const archivo = nube.joinPath(carpeta, '__app__-' + hoy + '.json');
    if (nube.fileExists(archivo)) return 'ya';
    if (!nube.fileExists(carpeta)) nube.createDirectory(carpeta, true);
    nube.writeString(archivo, JSON.stringify(datos));
    almacen.notaCopia('Copia diaria ' + hoy + ' guardada en iCloud Drive (Scriptable/' + CARPETA_COPIAS + ').');
    // Solo se borran archivos con el patrón exacto; el resto no se toca.
    try {
      const copias = nube.listContents(carpeta)
        .filter(function (n) { return /^__app__-\d{4}-\d{2}-\d{2}\.json$/.test(n); }).sort();
      copias.slice(0, Math.max(0, copias.length - COPIAS_CONSERVADAS)).forEach(function (n) {
        nube.remove(nube.joinPath(carpeta, n));
      });
    } catch (e) { /* la limpieza es prescindible */ }
    return 'hecha';
  } catch (e) {
    almacen.notaCopia('Copia diaria ' + hoy + ' en iCloud: error: ' + mensajeDeError(e));
    return 'error';
  }
}

// ── Atajo ──
// Atajos puede entregar un texto, un diccionario como objeto o como texto JSON.
// Devuelve { texto, accion }. Las claves se comparan sin tildes ni mayúsculas.
function normalizarEntrada(nucleo, entrada, profundo) {
  if (entrada == null) return { texto: '', accion: '' };
  if (typeof entrada === 'number') return { texto: String(entrada), accion: '' };
  if (typeof entrada === 'string') {
    const t = entrada.trim();
    if (!profundo && /^\{[\s\S]*\}$/.test(t)) {
      try { return normalizarEntrada(nucleo, JSON.parse(t), true); } catch (e) { /* texto normal */ }
    }
    const m = /^acci[oó]n\s*=\s*(\w+)$/i.exec(t);
    if (m) return { texto: '', accion: m[1].toLowerCase() };
    return { texto: t, accion: '' };
  }
  if (esObjetoPlano(entrada)) {
    const r = { texto: '', accion: '' };
    Object.keys(entrada).forEach(function (k) {
      const c = nucleo.normalizar(k);
      if (c === 'texto' || c === 'titulo' || c === 'text') r.texto = String(entrada[k] == null ? '' : entrada[k]).trim();
      if (c === 'accion' || c === 'action') r.accion = nucleo.normalizar(entrada[k]);
    });
    return r;
  }
  return { texto: '', accion: '' };
}

// «Tienes 3 pendientes: A, B y C.» pensado para que Siri lo lea.
function resumenHoy(nucleo, datos) {
  const p = nucleo.pendientes(datos);
  if (!p.length) return 'No tienes nada pendiente.';
  const nombres = p.slice(0, 5).map(function (e) { return e.titulo; });
  const lista = nombres.length === 1 ? nombres[0] : nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
  return 'Tienes ' + p.length + (p.length === 1 ? ' pendiente: ' : ' pendientes: ') + lista +
    (p.length > 5 ? ' y ' + (p.length - 5) + ' más.' : '.');
}

// Atajo: añade un elemento o lee el resumen. Devuelve 1-2 líneas para la
// notificación del atajo. Nunca lanza.
function modoAtajo(almacen, nucleo, entrada, ahora) {
  const momento = ahora || new Date();
  let crudo;
  try { crudo = typeof entrada === 'string' ? entrada : JSON.stringify(entrada); } catch (e) { crudo = String(entrada); }
  let texto;
  try {
    const e = normalizarEntrada(nucleo, entrada);
    if (e.accion === 'resumen' || e.accion === 'hoy') {
      texto = resumenHoy(nucleo, almacen.sincronizar().datos);
    } else if (!e.texto) {
      texto = 'No hay nada que añadir.';
    } else {
      const r = almacen.aplicar({ tipo: 'elemento.crear', elemento: { titulo: e.texto }, ahora: nucleo.fechaLocal(momento) });
      const n = nucleo.pendientes(r.datos).length;
      texto = '✓ ' + r.info.titulo + '\n' + n + (n === 1 ? ' pendiente' : ' pendientes');
    }
  } catch (err) {
    texto = 'No se ha podido guardar: ' + mensajeDeError(err);
  }
  almacen.anotar(String(crudo).slice(0, 300) + ' => ' + texto);
  return texto;
}

// ── App: puente con la página ──
// La página nunca manda su estado: solo mensajes {n, tipo, ...}. El anfitrión
// aplica las operaciones sobre el archivo y le devuelve los datos frescos.
function nombreExportacion(hoy) { return '__app__-copia-' + hoy + '.json'; }

// DocumentPicker puede devolver una ruta o una lista de rutas.
function rutaElegida(seleccion) {
  if (Array.isArray(seleccion)) return seleccion.length ? seleccion[0] : null;
  return typeof seleccion === 'string' && seleccion ? seleccion : null;
}

// Sobrescribe "ahora" con el reloj del anfitrión, también dentro de un lote.
function sellarOp(op, ahoraTexto) {
  if (!esObjetoPlano(op)) return op;
  const copia = Object.assign({}, op, { ahora: ahoraTexto });
  if (Array.isArray(op.ops)) copia.ops = op.ops.map(function (o) { return sellarOp(o, ahoraTexto); });
  return copia;
}

async function exportarDatos(msg, ctx, res) {
  const destino = msg.destino;
  if (destino !== 'archivos' && destino !== 'compartir') throw new Error('Destino de exportación no válido.');
  const nombre = nombreExportacion(ctx.hoy);
  const ruta = ctx.fm.joinPath(ctx.fm.temporaryDirectory(), nombre);
  ctx.fm.writeString(ruta, JSON.stringify(ctx.almacen.leer().datos, null, 2));
  try {
    if (destino === 'archivos') await DocumentPicker.export(ruta);
    else {
      const r = await ShareSheet.present([ruta]);
      if (r && r.completed === false) { res.ok = false; res.cancelado = true; }
    }
  } catch (e) {
    // Cancelar el selector o la hoja de compartir rechaza la promesa.
    res.ok = false;
    res.cancelado = true;
  }
  if (res.ok) res.info = { nombre: nombre };
}

async function importarDatos(ctx, res) {
  let seleccion;
  try { seleccion = await DocumentPicker.openFile(); } catch (e) { res.ok = false; res.cancelado = true; return; }
  const ruta = rutaElegida(seleccion);
  if (!ruta) { res.ok = false; res.cancelado = true; return; }
  const invalido = 'El archivo no es una copia de seguridad válida de __APP__.';
  let externo;
  try {
    // Un archivo de iCloud puede estar solo en la nube: se descarga antes.
    if (typeof ctx.fm.isFileStoredIniCloud === 'function' && ctx.fm.isFileStoredIniCloud(ruta) && !ctx.fm.isFileDownloaded(ruta)) {
      await ctx.fm.downloadFileFromiCloud(ruta);
    }
    externo = JSON.parse(ctx.fm.readString(ruta));
  } catch (e) { res.ok = false; res.error = invalido; return; }
  try { res.info = ctx.almacen.importar(externo); } catch (e) {
    res.ok = false;
    res.error = e && e.codigo === 'FORMATO' ? invalido : mensajeDeError(e);
  }
}

// Procesa un mensaje de la página. Nunca lanza: devuelve el resultado.
// ctx = { almacen, nucleo, fm, hoy, ahora: () => Date }. Un tipo nuevo es otro case.
async function procesarMensaje(msg, ctx) {
  const res = { n: msg && msg.n, ok: true };
  try {
    switch (msg && msg.tipo) {
      case 'op': {
        const ahoraTexto = ctx.nucleo.fechaLocal(ctx.ahora ? ctx.ahora() : new Date());
        res.info = ctx.almacen.aplicar(sellarOp(msg.op, ahoraTexto)).info;
        break;
      }
      case 'exportar': await exportarDatos(msg, ctx, res); break;
      case 'importar': await importarDatos(ctx, res); break;
      case 'registro': res.info = { texto: ctx.almacen.leerLog() }; break;
      case 'abrir': {
        // Los enlaces no se abren con <a href> en el WebView: solo http(s), vía Safari.
        const url = typeof msg.url === 'string' ? msg.url.trim() : '';
        if (!/^https?:\/\/[^\s\/?#]+\S*$/i.test(url)) { res.ok = false; res.error = 'Solo se pueden abrir enlaces http o https.'; break; }
        try { await Promise.race([Promise.resolve(Safari.open(url)), esperarMs(1500)]); } catch (e) { res.ok = false; res.error = 'No se pudo abrir el enlace.'; }
        break;
      }
      default:
        res.ok = false;
        res.error = 'Mensaje desconocido: ' + (msg && msg.tipo);
    }
  } catch (e) {
    res.ok = false;
    res.error = mensajeDeError(e);
  }
  return res;
}

function parsearMensajes(texto) {
  const lista = JSON.parse(texto);
  if (!Array.isArray(lista)) throw new Error('Respuesta del puente no válida.');
  return lista;
}
function sello(fecha) { return fecha ? fecha.getTime() : null; }

// Bucle de sondeo: Scriptable llama a Puente.esperar(completion) (la página
// responde con sus mensajes pendientes o con [] a los 400 ms), procesa, y
// contesta con Puente.recibir({ack, resultados, datos, avisos, hoy, ahora}).
// estado = { cerrado, fin: Promise }. opciones: { ahora, esperar, maxFallos, pausaMs }.
async function bucleApp(wv, ctx, estado, opciones) {
  const op = opciones || {};
  const ahora = op.ahora || function () { return new Date(); };
  const esperar = op.esperar || esperarMs;
  const maxFallos = op.maxFallos || 10;
  const pausaMs = op.pausaMs == null ? 300 : op.pausaMs;
  const guardados = new Map(); // n -> resultado, por si hay que reenviarlo
  let ultimoN = 0, fallos = 0, ultimoError = '';
  let visto = sello(ctx.almacen.fechaModificacion());
  let hoyVisto = hoyLocal(ctx.nucleo, ahora());

  async function fallar() {
    fallos++;
    if (fallos >= maxFallos) return true;
    await esperar(pausaMs);
    return false;
  }

  while (!estado.cerrado) {
    let lista;
    try {
      const texto = await Promise.race([
        wv.evaluateJavaScript('Puente.esperar(completion)', true),
        estado.fin.then(function () { return null; })
      ]);
      if (estado.cerrado) break;
      lista = parsearMensajes(texto);
    } catch (e) {
      ultimoError = 'esperar: ' + mensajeDeError(e);
      if (estado.cerrado || await fallar()) break;
      continue;
    }
    try {
      const nuevos = lista.filter(function (m) { return m && Number.isInteger(m.n) && m.n > ultimoN; })
        .sort(function (a, b) { return a.n - b.n; });
      const repetidos = lista.filter(function (m) { return m && Number.isInteger(m.n) && m.n <= ultimoN; });
      const resultados = [];
      const hoy = hoyLocal(ctx.nucleo, ahora());
      const base = { almacen: ctx.almacen, nucleo: ctx.nucleo, fm: ctx.fm, hoy: hoy, ahora: ahora };
      for (const m of nuevos) {
        const r = await procesarMensaje(m, base);
        guardados.set(m.n, r);
        resultados.push(r);
        ultimoN = m.n;
      }
      // Si la página reenvía algo ya procesado es que no recibió la respuesta.
      repetidos.forEach(function (m) { if (guardados.has(m.n)) resultados.push(guardados.get(m.n)); });
      guardados.forEach(function (_, n) { if (n <= ultimoN - 200) guardados.delete(n); });

      const diaNuevo = hoy !== hoyVisto;
      if (diaNuevo) { hoyVisto = hoy; try { ctx.almacen.sincronizar(); } catch (e) { /* se verá al leer */ } }
      // Un cambio externo (p. ej. un atajo con la app abierta) también se envía.
      const cambioExterno = sello(ctx.almacen.fechaModificacion()) !== visto;
      if (lista.length === 0 && !cambioExterno && !diaNuevo) { fallos = 0; continue; }

      const leido = ctx.almacen.leer();
      visto = sello(ctx.almacen.fechaModificacion());
      const respuesta = { ack: ultimoN, resultados: resultados, datos: leido.datos, avisos: leido.avisos, hoy: hoy, ahora: ctx.nucleo.fechaLocal(ahora()) };
      await wv.evaluateJavaScript('Puente.recibir(' + jsonSeguro(respuesta) + ')', false);
      fallos = 0;
    } catch (e) {
      ultimoError = 'recibir: ' + mensajeDeError(e);
      if (estado.cerrado || await fallar()) break;
    }
  }
  return { cerrado: estado.cerrado, error: ultimoError };
}

// Alerta que nunca lanza: desde Atajos con «Run In App» desactivado (o Siri)
// Scriptable responde «Alerts are not supported in Siri»; entonces el texto
// sale como resultado del atajo y en el registro.
async function mostrarAlerta(texto) {
  try {
    const a = new Alert();
    a.title = '__APP__';
    a.message = texto;
    a.addAction('OK');
    await a.present();
  } catch (e) {
    try { console.log('__APP__: ' + texto); } catch (e2) { /* sin consola */ }
    try { Script.setShortcutOutput(texto); } catch (e2) { /* fuera de Atajos */ }
  }
}

const AVISO_SIN_PARAMETRO = '__APP__ no ha recibido nada. En la acción «Run Script», pon un Diccionario ' +
  '(clave «texto», o «accion» = «resumen») en el campo Parameter. Para abrir la app, activa «Run In App».';

// true si el script corre dentro de la app Scriptable. Si no informa, se asume que sí.
function corriendoEnApp() {
  return !(typeof config !== 'undefined' && config && config.runsInApp === false);
}

// Traza de arranque: registro de Scriptable + __app__-traza.log.
function crearTraza(fm) {
  const lineas = [];
  return function (texto) {
    lineas.push(new Date().toISOString() + ' ' + texto);
    try { console.log('__APP__: ' + texto); } catch (e) { /* sin consola */ }
    try { fm.writeString(fm.joinPath(fm.documentsDirectory(), '__app__-traza.log'), lineas.join('\n') + '\n'); } catch (e) { /* prescindible */ }
  };
}

// Pregunta a la página si ha arrancado. '' si va bien o no se sabe.
async function sondearPagina(wv, traza) {
  try {
    const consulta = wv.evaluateJavaScript('(window.__lista ? "lista" : "sin arrancar") + "|" + (window.__errores || []).join(" / ")', false);
    const r = await Promise.race([consulta, esperarMs(4000).then(function () { return 'tiempo agotado'; })]);
    traza('sonda: ' + r);
    if (typeof r === 'string' && r.indexOf('sin arrancar|') === 0) {
      return r.slice('sin arrancar|'.length) || 'la página se cargó pero su código no llegó a ejecutarse';
    }
  } catch (e) { traza('sonda no disponible: ' + mensajeDeError(e)); }
  return '';
}

// Medidas reales de la página (incluido inset-sup) para calibrar el diseño.
async function medirPagina(wv) {
  try {
    return await wv.evaluateJavaScript(
      '(function(){var a=document.getElementById("app").getBoundingClientRect();var v=window.visualViewport;' +
      'return "ventana "+innerWidth+"x"+innerHeight+", visual "+(v?Math.round(v.width)+"x"+Math.round(v.height):"-")+' +
      '", pantalla "+screen.width+"x"+screen.height+", app "+Math.round(a.width)+"x"+Math.round(a.height)+' +
      '", sin-alto "+document.documentElement.classList.contains("sin-alto")+' +
      '", inset-sup "+(function(){var p=document.createElement("div");p.style.cssText="position:fixed;top:0;left:0;width:1px;height:env(safe-area-inset-top)";' +
      'document.body.appendChild(p);var h=p.getBoundingClientRect().height;document.body.removeChild(p);return h;})();})()', false);
  } catch (e) { return null; }
}

// App: WebView a pantalla completa con el puente. plantilla solo cambia en tests.
async function modoApp(almacen, nucleo, fm, plantilla, opciones) {
  const html0 = plantilla === undefined ? UI_HTML : plantilla;
  if (!html0) {
    await mostrarAlerta('La interfaz no está incluida en este script. Ejecuta «npm run build» y vuelve a copiar __APP__.js al iPhone.');
    return;
  }
  const reloj = (opciones && opciones.ahora) || function () { return new Date(); };
  const traza = crearTraza(fm);
  const r = almacen.sincronizar();
  traza('datos leídos: ' + r.datos.elementos.length + ' elementos');
  const fechaInicio = nucleo.fechaLocal(reloj());
  const html = construirHTML(html0, { datos: r.datos, avisos: r.avisos, entorno: 'scriptable', hoy: fechaInicio.slice(0, 10), ahora: fechaInicio });
  const wv = new WebView();
  await wv.loadHTML(html);
  traza('página cargada (' + html.length + ' caracteres)');
  const problema = await sondearPagina(wv, traza);
  if (problema) { await mostrarAlerta('La interfaz no ha arrancado:\n' + problema); return; }
  const estado = { cerrado: false, fin: null };
  // Sin await: el bucle funciona mientras la pantalla está abierta.
  estado.fin = wv.present(true).then(function () { estado.cerrado = true; }, function () { estado.cerrado = true; });
  traza('pantalla presentada');
  // Si la página se cargó cuando la vista medía 0x0 puede quedarse en negro:
  // se mide ya en pantalla y, si es así, se recarga (plan B probado en un iPhone real).
  const pausa = (opciones && opciones.esperar) || esperarMs;
  await pausa(600);
  let medidas = await medirPagina(wv);
  traza('medidas: ' + medidas);
  if (!estado.cerrado && typeof medidas === 'string' && medidas.indexOf('ventana 0x0') === 0) {
    traza('la vista mide 0x0: se recarga la página ya presentada');
    try {
      await Promise.race([wv.loadHTML(html), pausa(5000)]);
      await pausa(600);
      traza('medidas tras recargar: ' + await medirPagina(wv));
    } catch (e) { traza('recarga fallida: ' + mensajeDeError(e)); }
  }
  const fin = await bucleApp(wv, { almacen: almacen, nucleo: nucleo, fm: fm }, estado, opciones);
  traza(fin.cerrado ? 'app cerrada' : 'el puente ha dejado de responder: ' + fin.error);
  if (!fin.cerrado) {
    try { await mostrarAlerta('La app ha perdido la comunicación con Scriptable y los cambios ya no se guardan. Ciérrala y vuelve a abrirla.\n\n' + fin.error); } catch (e) { /* puede no mostrarse */ }
  }
}

// ── Widget ──
// Solo lee: nunca escribe. Cualquier estilo que falle se ignora (intentar).
function datosWidget(nucleo, datos, hoy) {
  const p = nucleo.pendientes(datos);
  return { total: p.length, hechosHoy: nucleo.hechosHoy(datos, hoy).length, lista: p.map(function (e) { return { id: e.id, titulo: e.titulo }; }) };
}
function colorWidget(claro, oscuro) {
  try { return Color.dynamic(new Color(claro), new Color(oscuro)); } catch (e) { return new Color(claro); }
}
function intentar(fn) { try { fn(); } catch (e) { /* estilo opcional */ } }
// Símbolo SF; si no está disponible, un glifo de texto.
function simbolo(pila, nombre, glifo, tam, color) {
  try {
    const s = SFSymbol.named(nombre);
    intentar(function () { s.applyFont(Font.boldSystemFont(tam)); });
    const img = pila.addImage(s.image);
    intentar(function () { img.imageSize = new Size(tam, tam); });
    intentar(function () { img.tintColor = color; });
    return img;
  } catch (e) {
    const t = pila.addText(glifo);
    intentar(function () { t.font = Font.boldSystemFont(tam); });
    intentar(function () { t.textColor = color; });
    return t;
  }
}
function textoWidget(pila, texto, fuente, color, lineas, escala) {
  const t = pila.addText(texto);
  intentar(function () { t.font = fuente; });
  intentar(function () { t.textColor = color; });
  intentar(function () { t.lineLimit = lineas || 1; });
  intentar(function () { t.minimumScaleFactor = escala || 0.7; });
  return t;
}
function paletaWidget(nucleo) {
  const c = nucleo.COLORES;
  return {
    texto: colorWidget('#111111', '#f5f5f7'), suave: colorWidget('#6b7280', '#9ca3af'),
    acento: colorWidget(c.indigo.claro, c.indigo.oscuro)
  };
}

function construirWidget(nucleo, d, familia) {
  const p = paletaWidget(nucleo);
  const w = new ListWidget();
  intentar(function () { w.url = URLScheme.forRunningScript(); });
  intentar(function () { w.refreshAfterDate = new Date(Date.now() + 30 * 60000); });
  const vacio = d.total === 0;
  const primero = d.lista[0];
  if (familia === 'accessoryCircular') {
    const t = textoWidget(w, vacio ? '✓' : String(d.total), Font.boldSystemFont(24), p.texto, 1, 0.5);
    intentar(function () { t.centerAlignText(); });
    return w;
  }
  if (familia === 'accessoryRectangular') {
    textoWidget(w, vacio ? 'Nada pendiente ✓' : d.total + ' pendientes', Font.boldSystemFont(14), p.texto);
    if (!vacio) textoWidget(w, primero.titulo, Font.systemFont(12), p.texto, 2, 0.8);
    return w;
  }
  if (familia === 'accessoryInline') {
    textoWidget(w, vacio ? 'Nada pendiente ✓' : d.total + ' · ' + primero.titulo, Font.systemFont(12), p.texto);
    return w;
  }
  if (familia === 'small') {
    intentar(function () { w.setPadding(12, 14, 12, 14); });
    simbolo(w, '__GLIFO_SF__', '•', 18, p.acento);
    w.addSpacer(6);
    textoWidget(w, String(d.total), Font.boldSystemFont(40), p.acento, 1, 0.5);
    textoWidget(w, 'pendientes', Font.mediumSystemFont(12), p.suave);
    w.addSpacer();
    if (!vacio) textoWidget(w, primero.titulo, Font.mediumSystemFont(13), p.texto, 2, 0.8);
    return w;
  }
  // Mediano, grande y cualquier otra familia.
  const grande = familia === 'large' || familia === 'extraLarge';
  intentar(function () { w.setPadding(grande ? 16 : 12, 14, grande ? 16 : 12, 14); });
  const cab = w.addStack();
  cab.layoutHorizontally();
  intentar(function () { cab.centerAlignContent(); });
  simbolo(cab, '__GLIFO_SF__', '•', 14, p.acento);
  cab.addSpacer(5);
  textoWidget(cab, '__APP__', Font.boldSystemFont(14), p.texto);
  cab.addSpacer();
  textoWidget(cab, String(d.total), Font.boldSystemFont(14), p.acento);
  w.addSpacer(grande ? 10 : 8);
  if (vacio) textoWidget(w, 'Nada pendiente ✓', Font.mediumSystemFont(14), p.suave);
  else d.lista.slice(0, grande ? 9 : 4).forEach(function (f, i) {
    if (i > 0) w.addSpacer(grande ? 7 : 5);
    textoWidget(w, '• ' + f.titulo, Font.mediumSystemFont(13), p.texto, 1, 0.8);
  });
  w.addSpacer();
  return w;
}

function widgetDeError(mensaje) {
  const w = new ListWidget();
  intentar(function () { w.url = URLScheme.forRunningScript(); });
  textoWidget(w, '__APP__', Font.boldSystemFont(14), new Color('#888888'));
  textoWidget(w, 'Error: ' + mensaje, Font.systemFont(11), new Color('#888888'), 4, 0.6);
  return w;
}

function modoWidget(almacen, nucleo, ahora, familia) {
  let w;
  try {
    const hoy = hoyLocal(nucleo, ahora instanceof Date ? ahora : new Date());
    w = construirWidget(nucleo, datosWidget(nucleo, almacen.leer().datos, hoy), familia);
  } catch (e) {
    almacen.anotar('Widget: ' + mensajeDeError(e));
    w = widgetDeError(mensajeDeError(e));
  }
  Script.setWidget(w);
}

// ── Punto de entrada: un script, varios modos ──
// opciones (solo tests): { plantilla, bucle } se pasan a modoApp.
async function principal(opciones) {
  const nucleo = crearNucleo();
  const fm = FileManager.local();
  const almacen = crearAlmacen(fm, nucleo);
  const entrada = typeof args !== 'undefined' ? args.shortcutParameter : undefined;
  const nube = function () { return FileManager.iCloud(); };
  if (entrada !== undefined && entrada !== null) {
    Script.setShortcutOutput(modoAtajo(almacen, nucleo, entrada));
    copiaDiaria(almacen, nucleo, nube);
  } else if (config.runsInWidget) {
    try { modoWidget(almacen, nucleo, new Date(), config.widgetFamily); } catch (e) { /* el widget no debe romper el script */ }
  } else if (!corriendoEnApp()) {
    // Atajo sin parámetro y con «Run In App» desactivado: no se puede abrir la app.
    Script.setShortcutOutput(AVISO_SIN_PARAMETRO);
    almacen.anotar('(sin parámetro, fuera de la app) => ' + AVISO_SIN_PARAMETRO);
  } else {
    copiaDiaria(almacen, nucleo, nube);
    try { await modoApp(almacen, nucleo, fm, opciones && opciones.plantilla, opciones && opciones.bucle); } catch (e) { await mostrarAlerta('Error: ' + mensajeDeError(e)); }
  }
  Script.complete();
}

// En Node (tests) no existen las APIs de Scriptable: solo se exporta la lógica.
if (typeof module !== 'undefined' && module && module.exports) {
  module.exports = {
    crearNucleo: crearNucleo, crearAlmacen: crearAlmacen, copiaDiaria: copiaDiaria,
    normalizarEntrada: normalizarEntrada, modoAtajo: modoAtajo, resumenHoy: resumenHoy,
    modoApp: modoApp, bucleApp: bucleApp, procesarMensaje: procesarMensaje, sellarOp: sellarOp,
    modoWidget: modoWidget, datosWidget: datosWidget,
    jsonSeguro: jsonSeguro, construirHTML: construirHTML, UI_HTML: UI_HTML,
    nombreExportacion: nombreExportacion, esperarMs: esperarMs, principal: principal
  };
}
if (typeof FileManager !== 'undefined' && typeof Script !== 'undefined') {
  await principal();
}
