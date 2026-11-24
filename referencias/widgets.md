# Widgets de Scriptable

## Reglas

- El widget **solo lee**: nunca escribe, ni sincroniza, ni hace copia, ni red. Si hacen falta recurrentes, se generan sobre la copia leída sin guardar.
- Una función pura `datosWidget(nucleo, datos, hoy, ahora)` calcula lo que se muestra (testeable); `construirWidget(nucleo, d, familia)` solo dibuja.
- Todo estilo va dentro de `intentar(fn)`: si una propiedad no existe en esa versión de Scriptable, el widget sigue. Si falla todo, `widgetDeError` y anotar en el registro.
- `w.url = URLScheme.forRunningScript()` para que tocarlo abra la app (o «When Interacting» = Run Script en la configuración del widget).
- `Script.setWidget(w)` y `Script.complete()`.

## Familias (`config.widgetFamily`)

| Familia | Uso recomendado |
|---|---|
| `small` | Un número grande (pendientes de hoy, gastado este mes) + una línea (primera tarea, balance). |
| `medium` | Cabecera (símbolo + título + total) y 3–4 filas, o dos «píldoras» (ingresos / gastos) + balance + comparación con el periodo anterior. |
| `large` / `extraLarge` | Hasta 9 filas o un gráfico (barras por semanas S1–S5 dibujadas con pilas) + pie con lo siguiente («Próximo bloque: sáb 18:00 · …»). |
| `accessoryCircular` | Pantalla de bloqueo: solo un número o `✓`. |
| `accessoryRectangular` | 2–3 líneas: «N hoy» + primera tarea. |
| `accessoryInline` | Una línea encima del reloj: «N hoy · primera tarea». |

Sin familia (al ejecutar en la app o tests): dibujar como mediano. Estado vacío explícito («Nada por vencer ✓»).

## API usada (y alternativas)

```js
const w = new ListWidget();          w.setPadding(12, 14, 12, 14);  w.backgroundColor / backgroundGradient (LinearGradient)
const pila = w.addStack();           pila.layoutHorizontally() / layoutVertically(); pila.centerAlignContent(); pila.size = new Size(w, h);
pila.cornerRadius; pila.borderWidth; pila.borderColor; pila.backgroundColor        // sin verificar: dentro de intentar
const t = pila.addText('…');         t.font = Font.boldSystemFont(14); t.textColor; t.lineLimit; t.minimumScaleFactor; t.centerAlignText()
pila.addSpacer(n) / addSpacer()      // flexible
SFSymbol.named('checkmark.circle.fill') -> s.applyFont(...); pila.addImage(s.image) -> imageSize, tintColor   // con glifo de texto de reserva
Color.dynamic(new Color(claro), new Color(oscuro))   // claro/oscuro; de reserva, el claro
w.refreshAfterDate = new Date(...)   // solo una pista: iOS decide
```

Helpers de las apps: `colorWidget(claro, oscuro)`, `intentar(fn)`, `simbolo(pila, nombre, glifo, tam, color)`, `textoWidget(pila, texto, fuente, color, lineas, escala)`, `paletaWidget(nucleo)` (usa `nucleo.COLORES`).

## Diseño

- Jerarquía: un dato protagonista grande (40 pt negrita, en acento o rojo si hay atrasadas), etiquetas pequeñas en gris (`suave`).
- Fechas relativas cortas: «Ayer», «Hoy 18:00», «Mañana», «vie 20», «20 dic». Atrasadas en rojo.
- Punto de color por prioridad/categoría, `⚡` para rápidas; nada de emojis con selector de variación.
- Mismos colores que la app (modo claro y oscuro).
- Respetar «ocultar importes» de la app. No poner botón de ojo en el widget: iOS tarda en repintar y no se puede forzar (decisión tomada en la app de gastos).
- Ordenar por lo que importa ahora (vencimiento, atrasadas primero).

## Refresco

- `refreshAfterDate` = el primer instante relevante después de ahora: próximo vencimiento, próximo bloque (inicio o fin), medianoche o ahora + 30 min.
- iOS decide cuándo refresca (puede tardar más de un cuarto de hora). Tras registrar desde un atajo, la acción «Refresh All Widgets» podría ayudar (**sin verificar**).
- Los widgets de Scriptable **no son interactivos** (no hay botones que ejecuten código sin abrir la app).

## Estudio de posibilidades (al diseñar una app)

Pregunta qué responde el widget de un vistazo: ¿cuánto queda?, ¿qué es lo siguiente?, ¿cómo voy este mes? Propón uno por tamaño, más pantalla de bloqueo. Ideas reutilizables: contador + primera fila; lista ordenada; píldoras comparativas; mini‑gráfico de barras con pilas de alto proporcional (`alturasBarras`); próximo evento; racha o progreso (barra con dos pilas).

## Tests

`ejecutarWidget(fm, familia)` con `NodoFalso`/`ColorFalso`/`FontFalso`; `textosDe(widget)` para comprobar textos; probar todas las familias, el estado vacío, que no escribe el archivo y que un fallo produce el widget de error.

## Sin verificar habitualmente

`config.widgetFamily` con `accessory*`, `URLScheme.forRunningScript()` al tocar, `Color.dynamic`, `SFSymbol`, `refreshAfterDate`, `stack.size`, `borderWidth`, `cornerRadius`.
