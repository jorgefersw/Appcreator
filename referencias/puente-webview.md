# UI en WebView y puente con Scriptable

## Por qué un puente de sondeo

La página del `WebView` no puede llamar a Scriptable. Lo único fiable (verificado en la app de gastos: «fluido») es que Scriptable evalúe JS en la página y espere un `completion`:

```
Scriptable (bucleApp)                         Página (Puente)
  evaluateJavaScript('Puente.esperar(completion)', true)
                                  ──────────▶  responde ya si hay mensajes, o [] a los 400 ms
  procesa mensajes nuevos (n > ultimoN)
  evaluateJavaScript('Puente.recibir(' + jsonSeguro(resp) + ')', false)
                                  ──────────▶  ack, resultados, datos frescos, avisos, hoy/ahora
```

- Mensajes de la página: `{ n, tipo, … }` con `n` creciente. Tipos base: `op`, `exportar`, `importar`, `registro`, `abrir`; añade los tuyos como otro `case` de `procesarMensaje` (p. ej. `avisos.sincronizar`).
- Respuesta: `{ ack: ultimoN, resultados: [{ n, ok, info?, error?, cancelado? }], datos, avisos, hoy, ahora }`.
- **Idempotencia**: si la página reenvía un `n` ya procesado (no le llegó la respuesta), se devuelve el resultado guardado (mapa de los 200 últimos) sin reaplicar.
- **Cambios externos**: si `fechaModificacion()` del archivo cambia (un atajo con la app abierta), se envían datos frescos aunque no haya mensajes.
- **Medianoche**: si cambia el día con la app abierta, `almacen.sincronizar()` y se avisa a la página.
- **Fallos**: 10 fallos seguidos → se sale del bucle y se muestra una alerta («ha perdido la comunicación… ciérrala y vuelve a abrirla»).
- **Fin**: `wv.present(true)` sin `await`; su promesa marca `estado.cerrado`. `Promise.race` con `estado.fin` para no quedarse colgado en `evaluateJavaScript`.
- Trabajo lento (Calendario, red) se hace **después** de responder a la página, con antirrebote (app de tareas: como mucho cada 20 s y una pasada al cerrar).
- `Timer.schedule` en vez de `setTimeout` en el lado Scriptable (`esperarMs`).

## Lado página

- `hacerOp(op)`: sella `op.ahora` con el reloj (corregido con el `ahora` del anfitrión), aplica sobre una **copia** con el núcleo, repinta y envía. Si el núcleo lanza, toast con el mensaje y no se envía.
- `datosNuevos(d)`: `migrar(d)` y **reaplica las ops aún no confirmadas** (`Puente.opsPendientes()`) para que la pantalla no retroceda.
- Avisos del almacén (archivo recuperado…) se muestran una vez (`avisosVistos`).
- Enlaces: nunca `<a href>`; se pide `{tipo:'abrir', url}` y el anfitrión solo acepta `http(s)` y llama a `Safari.open`.
- La página no tiene red: todo lo externo lo hace Scriptable.

## Pantalla negra (0x0) — verificado y arreglado en la app de gastos

El WebView de Scriptable puede informar ventana 0x0 y `vh/dvh` = 0.

1. En la página, un script **antes** de todo mide `innerHeight` (o `clientHeight`, `visualViewport.height`) y fija `#app.style.height` en px. Si mide 0: usa `screen.height - 110`, añade `html.sin-alto` y reescribe la meta viewport para forzar recálculo. Se repite en `resize`, `orientationchange`, `pageshow`, `focus`, `visibilitychange`, a 50/250/600 ms y cada segundo.
2. En `modoApp`: tras `present`, espera 600 ms, `medirPagina(wv)`; si empieza por `ventana 0x0`, recarga el HTML ya presentado (`loadHTML`) y vuelve a medir.
3. Antes de presentar, `sondearPagina`: `window.__lista` y `window.__errores`. La página muestra «Cargando…» y, si hay error de JS o no arranca en 4 s, lo pinta en rojo en pantalla (en vez de quedar en negro).
4. Traza en consola (`<App>: …`) y en `<n>-traza.log`: datos leídos, tamaño del HTML, sonda, medidas.

## Margen superior

Scriptable dibuja su barra nativa («Close» y compartir) encima de la página. `html.en-scriptable` (cuando `INICIO.entorno === 'scriptable'`, o `?scriptable` en la vista previa) reserva `--reserva-sup: 80px`, ajustable en Ajustes (`ajustes.margenSuperior`, botones −/+ de 5 en 5; en un iPhone con Dynamic Island 100 sobraba y 50 quedaba tapado; en otros modelos hay que calibrarlo, ver `dispositivos.md`). Una `#banda-sup` del color de fondo con degradado tapa el contenido que pasa por debajo. La traza `medidas` incluye `inset-sup` para calibrar.

## Teclado

- En Scriptable el WebView **encoge** con el teclado (app de gastos): medir contra `#app.getBoundingClientRect()` y no restar el teclado dos veces. Clase `kb` cuando está abierto de verdad.
- Hojas con botones fijos abajo (`.hoja-pie`) o barra sobre el teclado (Cerrar / Listo / Guardar) solo en hojas sin pie.
- Sin foco automático al abrir hojas en Scriptable (sin verificar que funcione; la app de gastos lo quitó).
- `focusin` → `scrollIntoView({block:'center'})` tras 320 ms.
- Guardar en Diagnóstico «Teclado (última medida)» para depurar con capturas.

## Diagnóstico en la app

Ajustes → Diagnóstico pide `{tipo:'registro'}` y muestra: nota de la última copia, últimas entradas de Atajos (crudas, tal como llegaron), registro de sincronización. Es lo primero que se mira cuando algo falla en el iPhone.
