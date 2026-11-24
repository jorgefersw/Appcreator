# Build, pruebas y vista previa

## Comandos

```
npm run build      # incrusta src/* en <Nombre>.js y genera preview.html
npm test           # node --test (TZ Europe/Madrid), sin dependencias
npm run invisibles # «Sin caracteres invisibles.»
npm run capturas   # todos los iPhone × claro/oscuro × estados, con comprobaciones (ver dispositivos.md)
npm run icono      # icono/icono.svg -> PNG
```

Tras **cualquier** cambio los tres primeros deben pasar. Node 20+.

## build.js

- `reemplazarBloque(fuente, '// >>> X', '// <<< X', contenido)` entre marcas de línea completa.
- `bloqueUI(html)`: una línea JSON por línea del HTML; los caracteres invisibles se escriben como `\uXXXX` en la salida (el build sí puede, porque no pasa por la herramienta de escritura).
- Comprueba que tras generar, `UI_HTML` cargado en Node es idéntico a `src/ui.html`.
- `datosEjemplo(N)`: datos de ejemplo **deterministas**, creados con operaciones reales del núcleo (con un `ahora` ancla creciente). La app de tareas además desplaza las fechas en el navegador para que el «hoy» de la vista previa sea el real.
- `construirPreview`: `construirHTML(plantilla, { entorno: 'preview', … })` + `tools/puente-simulado.js` antes de `</body>` (no puede contener `</script`).

## tests/ayuda.js

- `cargar(scriptable)`: envuelve el script en `new Function('module', ...globales, 'return (async () => {' + fuente + '})()')` porque tiene `await` de nivel superior. Sin mocks solo exporta la lógica; con mocks ejecuta `principal()` en el modo que indiquen (`args`, `config`).
- `FileManagerFalso`: en memoria; `copy`/`move` fallan si el destino existe; `modificationDate` estrictamente creciente.
- `ejecutarAtajo(fm, parametro)`, `ejecutarCompartir(fm, op)`, `ejecutarWidget(fm, familia)`.
- Dobles: `NodoFalso` (widget), `ColorFalso`, `FontFalso`, `textosDe`; en la app de tareas `mocksSincronizacion` (Notification, Calendar, CalendarEvent, Reminder en memoria con fallos inyectables); en la de gastos un `Request` espía con `Proxy`.

## Qué probar siempre

| Archivo | Contenido |
|---|---|
| `nucleo.test.js` | Esquema, `migrar` (no muta la entrada, versión futura), cada operación y sus errores, vistas, fechas (cambio de hora, fin de mes/año), `fusionar`. |
| `almacen.test.js` | `.bak`, `rev`, cuarentena y recuperación, `VERSION_FUTURA` intacto, `importar`, registros con límite de líneas. |
| `copia.test.js` | Una copia por periodo, rotación solo de su patrón, desactivada, nunca lanza. |
| `modos.test.js` / `atajo.test.js` | Formas de entrada, salida exacta, errores, sin parámetro fuera de la app, registro. |
| `widget.test.js` | Todas las familias, vacío, no escribe, error. |
| `puente.test.js` | `bucleApp` con un `wv` falso: sellado de `ahora`, reenvío idempotente, cambio externo, cierre, fallos repetidos; `procesarMensaje` nunca lanza; `abrir` solo http(s). |
| `ui.test.js` | `jsonSeguro`, `construirHTML` (marcas únicas, `$&`), `UI_HTML === src/ui.html`, la UI arranca en un DOM mínimo si se puede. |
| `red.test.js` | Sin red: no hay `Request`/`fetch`/`loadJSON` fuera de lo permitido. Con red: las únicas URLs son las fijas, la petición no lleva datos (`SECRETOS` nunca aparecen) y ningún modo salvo la app se conecta. |

Siempre `hoy`/`ahora` explícitos; nada de depender del reloj real (cuidado con desempates por tiempo de creación).

## Vista previa con Playwright

- Lo primero es `npm run capturas`, que es reproducible y cubre todos los modelos. El MCP de Playwright sirve para interactuar a mano (pulsar, escribir, arrastrar).

- `preview.html` funciona abriéndolo en el navegador, pero el MCP de Playwright bloquea `file:`: sirve la carpeta con `python3 -m http.server 8765 --bind 127.0.0.1` (en segundo plano) y abre `http://127.0.0.1:8765/preview.html?scriptable`.
- Para revisar todos los tamaños de iPhone usa `npm run capturas` (ver `dispositivos.md`). Chrome sin interfaz tiene un ancho mínimo de 500 px: no sirve para medir el diseño de un móvil.
- Borra lo que el MCP deje en `.playwright-mcp/` si lo creaste tú.
- Recorre los estados con los parámetros de la vista previa (`?vista=`, `?hoja=`, …) y haz captura de cada uno.
