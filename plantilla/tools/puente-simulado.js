// Anfitrión simulado para preview.html (solo navegador de escritorio).
// Mantiene el «archivo» en memoria y repite el bucle del anfitrión real:
// Puente.esperar -> aplicar operaciones con el reloj del anfitrión ->
// Puente.recibir con datos frescos, hoy y ahora.
(function () {
  'use strict';
  var N = crearNucleo();
  var archivo = JSON.parse(JSON.stringify(window.__INICIO__.datos));
  var procesado = 0;
  var registro = '2026-11-16T09:12:03 {"texto":"comprar pan"} => ✓ comprar pan | 3 pendientes (registro simulado)\n';

  function copia() { return JSON.parse(JSON.stringify(archivo)); }
  function ahoraTexto() { return N.fechaLocal(new Date()); }
  function sellar(op, ahora) {
    var c = JSON.parse(JSON.stringify(op));
    c.ahora = ahora;
    if (Array.isArray(c.ops)) c.ops = c.ops.map(function (o) { return sellar(o, ahora); });
    return c;
  }
  function descargar(nombre, texto) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function procesar(msg) {
    var res = { n: msg.n, ok: true };
    try {
      if (msg.tipo === 'op') {
        res.info = N.aplicarOp(archivo, sellar(msg.op, ahoraTexto()));
        archivo.rev = (archivo.rev || 0) + 1;
      } else if (msg.tipo === 'exportar') {
        var nombre = '__app__-copia-' + ahoraTexto().slice(0, 10) + '.json';
        descargar(nombre, JSON.stringify(archivo, null, 2));
        res.info = { nombre: nombre };
      } else if (msg.tipo === 'importar') {
        res.ok = false; res.cancelado = true; // en la vista previa no se importa
      } else if (msg.tipo === 'registro') {
        res.info = { texto: registro };
      } else if (msg.tipo === 'abrir') {
        window.open(msg.url, '_blank', 'noopener');
      } else {
        res.ok = false; res.error = 'Mensaje desconocido: ' + msg.tipo;
      }
    } catch (e) { res.ok = false; res.error = e && e.message ? e.message : String(e); }
    return res;
  }
  // Mismo ciclo que bucleApp, con una pequeña latencia para parecerse al iPhone.
  function ciclo() {
    window.Puente.esperar(function (texto) {
      var lista = JSON.parse(texto);
      var nuevos = lista.filter(function (m) { return m.n > procesado; });
      if (!lista.length) { setTimeout(ciclo, 50); return; }
      var resultados = nuevos.map(function (m) { procesado = m.n; return procesar(m); });
      setTimeout(function () {
        var ahora = ahoraTexto();
        window.Puente.recibir({ ack: procesado, resultados: resultados, datos: copia(), avisos: [], hoy: ahora.slice(0, 10), ahora: ahora });
        ciclo();
      }, 120);
    });
  }
  ciclo();
})();
