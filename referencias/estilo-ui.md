# Estilo de la UI

Objetivo: que parezca una app nativa de iOS dentro de un WebView. Para detalles de movimiento y gestos, carga también las skills `apple-design` y `gestures`.

## Base

- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">`, `color-scheme: light dark`, `format-detection: telephone=no`.
- Tipografía del sistema: `-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui`. Títulos grandes 34px/700/-0.03em; secciones 13px mayúsculas en `--txt2`; números `font-variant-numeric: tabular-nums`.
- `user-select: none` y `-webkit-touch-callout: none` en todo salvo campos; `-webkit-tap-highlight-color: transparent`; `touch-action: manipulation`.
- `#app` al 100 % del ancho en cualquier iPhone (375–440 pt); solo en escritorio (`min-width: 500px`) se limita a 440 px y se centra con sombra. Áreas seguras siempre vía `--seg-sup`/`--seg-inf`. Ver `dispositivos.md`.
- Sin recursos externos: ni fuentes, ni imágenes, ni CDN. Iconos como rutas SVG de trazo 24×24 en un objeto `ICONOS` (estilo SF Symbols: trazo 1.8, extremos redondeados). Gráficas (anillo, barras, sankey, treemap en la app de gastos) en SVG dibujado por la app.
- DOM con un helper `h(tag, atributos, hijos)` y `textContent`; **nunca `innerHTML` con datos** (inyección).

## Tokens (variables CSS)

```css
:root {
  --bg; --fuera; --sup; --sup2; --txt; --txt2; --txt3; --linea;
  --acento; --acento-s; --sobre-acento; --rojo; --barra; --velo; --sombra;
  --tabbar: 56px; --reserva-sup: env(safe-area-inset-top, 0px);
  --curva: cubic-bezier(.32, .72, 0, 1);   /* curva tipo iOS para hojas y transiciones */
}
html.en-scriptable { --reserva-sup: 80px; }
@media (prefers-color-scheme: dark) { :root { … } }
```

- Cada app tiene su acento: Tareas índigo (`#4f46e5` / `#818cf8`), Gastos verde (fondo con tinte verde `#f2f5f2` / `#101412`). El oscuro es casi negro (`#0b0b0e`), superficies `#17171c`/`#24242b`.
- Colores de datos compartidos con el widget en `nucleo.COLORES` (colores del sistema iOS en claro/oscuro): indigo, azul, turquesa, verde, amarillo, naranja, rojo, rosa.
- Ingresos verde, gastos/atrasadas rojo, prioridades azul/ámbar/rojo.

## Componentes

- **Barra de pestañas** inferior translúcida (`backdrop-filter: saturate(1.8) blur(22px)`), 3–4 pestañas, icono 25px + etiqueta 10.5px, activa en `--acento`, `:active { scale(.94) }`. Ajustes puede ser pestaña o un engranaje en la cabecera (app de gastos).
- **Cabecera**: título grande + subtítulo (fecha), botones redondos de 44px (`.bi`, `.bi.prim` con el acento) a la derecha: buscar, +, ojo (ocultar importes).
- **Banda superior** del color de fondo bajo la barra de Scriptable con degradado de 14px.
- **Listas agrupadas**: `.grupo` con radio 14px sobre `--sup`, filas ≥ 52px, separador que empieza tras el icono.
- **Hojas** (modales): capa con velo, panel desde abajo con radio 26px, asa, cabecera «Cancelar · Título · Guardar», cuerpo con scroll; se cierran tocando el velo o arrastrando hacia abajo (distancia > 40 % o velocidad > 520 px/s, con muelle). Variante `alta`. Pie fijo con botones (`.hoja-pie`) cuando hay acción principal.
- **Toasts** abajo, sobre la tabbar, oscuros translúcidos, máximo 3; con **Deshacer** durante 5 s tras completar, borrar, posponer o crear.
- **Filas deslizables** (`deslizable`): derecha = acción rápida (posponer, archivar), izquierda = abre acciones (Mañana, Semana, Borrar) o borra si se arrastra > 50 % del ancho; eje decidido tras un umbral; seguimiento 1:1; velocidad de los últimos 100 ms; proyección con deceleración 0,99; rubber-band (`elastico`) al pasar el límite; una sola fila abierta a la vez.
- **Captura rápida** con resaltado de lo que entiende el intérprete (app de tareas).
- **Estado vacío** con frase amable y la acción para empezar.
- **Ocultar importes** (app de gastos): ojo en la cabecera, se recuerda en ajustes y el widget lo respeta.

## Movimiento

- `muelle(desde, hasta, velocidad, paso, fin, { respuesta, amort })` con `requestAnimationFrame`: integra un muelle amortiguado, arranca desde el valor actual y la velocidad del dedo → interrumpible en cualquier momento. `respuesta ≈ 0.3–0.36 s`, `amort 1` (sin rebote) o `0.8–0.85` tras un gesto rápido.
- Transiciones CSS con `--curva` (≈ 0.3–0.42 s). `:active { transform: scale(.92–.94) }` en botones.
- `prefers-reduced-motion: reduce` → sin transiciones; `reducido()` en JS salta los muelles.

## Accesibilidad y robustez

- `aria-label` en botones de icono, `role="dialog"` en hojas, `role="status" aria-live="polite"` en toasts, `:focus-visible` con el acento.
- Contraste suficiente en ambos temas; objetivos táctiles ≥ 44 pt (si el elemento visible es menor, el botón que lo contiene mide 44).
- Repintado cada 60 s si no hay gesto ni hoja abierta (para «hace 5 min», «atrasada»).
- Parámetros solo de vista previa (`?vista=`, `?hoja=`, `?q=`, `?desp=`, `?scriptable`, `?seguro=sup,inf`) para revisar estados con `npm run capturas`.
