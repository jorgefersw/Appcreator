# Todos los modelos de iPhone: comprobar que se ve bien

Una app no está terminada hasta que se ha revisado en **todos** los tamaños de iPhone, en modo claro y oscuro, en cada pantalla y hoja. Hay que hacerlo tras cualquier cambio de la UI y antes de dar una fase por terminada.

## Tamaños (vertical, en puntos)

| Tamaño | Modelos | Áreas seguras aprox. (sup / inf) | Particularidades |
|---|---|---|---|
| 375×667 | iPhone SE (2.ª y 3.ª gen.), 6/7/8 | 20 / 0 | El más bajo: sin notch ni indicador de inicio. Comprueba que caben las hojas y que nada queda debajo de la barra. |
| 414×736 | iPhone 6/7/8 Plus | 20 / 0 | Ancho, sin indicador de inicio. |
| 375×812 | iPhone X, XS, 11 Pro, 12 mini, 13 mini | 44–50 / 34 | El más estrecho con notch. Textos largos y filas con varios elementos. |
| 414×896 | iPhone XR, 11, XS Max, 11 Pro Max | 48 / 34 | |
| 390×844 | iPhone 12, 13, 14, 16e | 47 / 34 | |
| 428×926 | iPhone 12/13 Pro Max, 14 Plus | 47 / 34 | |
| 393×852 | iPhone 14 Pro, 15, 15 Pro, 16 | 59 / 34 | Dynamic Island. Margen superior de Scriptable verificado: 80 pt. |
| 430×932 | iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus | 59 / 34 | |
| 402×874 | iPhone 16 Pro, 17, 17 Pro | 62 / 34 | |
| 420×912 | iPhone Air | 62 / 34 | |
| 440×956 | iPhone 16 Pro Max, 17 Pro Max | 62 / 34 | El más ancho: **no limites `#app` a 430 px**, o quedarán bandas a los lados. |

Las áreas seguras son aproximadas. Los modelos nuevos se añaden como una línea más en `DISPOSITIVOS` de `tools/capturas.js`. El margen superior dentro de Scriptable (80 pt por defecto) solo está calibrado en 393×852: en el resto de tamaños queda sin verificar, y por eso es ajustable en Ajustes.

## Reglas de diseño para que funcione en todos

- `#app` ocupa el 100 % del ancho en cualquier iPhone. Solo se limita y se centra en escritorio (`@media (min-width: 500px)`).
- No uses anchos fijos en px para el contenido: usa `flex`, `min-width: 0`, `text-overflow: ellipsis` y `minmax()`.
- Usa las áreas seguras siempre a través de `--seg-sup` y `--seg-inf` (que valen `env(safe-area-inset-*)`). Así la vista previa las simula con `?seguro=sup,inf`.
- Las zonas táctiles miden al menos 44×44 pt. Si el elemento visible es más pequeño (un círculo de 24 pt), amplía el botón que lo contiene.
- Hojas: `max-height` relativo a la pantalla menos la reserva superior, con scroll interno. En el SE (667 pt de alto) tienen que caber la cabecera, los campos y los botones.
- Cuida las cifras grandes y los títulos largos en 375 pt: deben reducirse, cortarse con «…» o pasar a otra línea, pero nunca salirse.
- Comprueba también el modo oscuro: contraste, bordes que desaparecen, sombras.

## Comprobación automática: `npm run capturas`

```
npm run build && npm run capturas            # todos los modelos
node tools/capturas.js --solo 375x667        # un tamaño (o el id: se, 17promax…)
```

- Usa WebKit (el motor del WebView de iOS) mediante Playwright. Si no está instalado: `npm i -g playwright && npx playwright install webkit`. También le sirve la copia que deja en la caché el MCP de Playwright.
- Abre `preview.html?scriptable&seguro=…&<estado>` en cada modelo, en claro y en oscuro.
- Añade a `ESTADOS` cada pantalla y cada hoja de la app (`vista=…`, `hoja=…`, `q=…`, `desp=…` para el desplazamiento). Si una pantalla no se puede abrir por parámetro, añade el parámetro a la vista previa.
- **Problemas** (salida con código 1):
  - errores de JavaScript o la página no arranca;
  - `#app` no ocupa justo la pantalla;
  - hay scroll horizontal o algún elemento se sale por un lado;
  - el contenido empieza debajo de la reserva superior;
  - la barra de pestañas no llega al borde inferior.
- **Avisos**: zonas táctiles de menos de 44 pt y textos cortados sin «…».
- Salida: `capturas/<estado>/<tema>/<modelo>.png` y `capturas/resumen-<estado>-<tema>.png`, con todos los modelos lado a lado.

## Revisión visual (obligatoria además de la automática)

Abre con Read **cada** `capturas/resumen-*.png` y revisa:

1. Alineación y márgenes coherentes en todos los anchos. Nada pegado a los bordes ni bandas vacías.
2. Que la parte de arriba no quede tapada por la barra de Scriptable y que la de abajo no quede tapada por el indicador de inicio ni por la tabbar.
3. Textos: sin solapes, sin cortes feos, jerarquía legible en 375 pt.
4. Que las hojas quepan en el SE y que los botones principales se vean sin desplazar.
5. Modo oscuro: contraste suficiente y nada «desaparece».
6. Gráficos y números grandes: escalan bien y no se deforman.

Si algo se ve mal, corrígelo en `src/ui.html`, ejecuta `npm run build` y vuelve a pasar `npm run capturas` hasta que no haya problemas y los resúmenes se vean bien. Los avisos que queden deben estar justificados.

## En el dispositivo

La vista previa no reproduce la barra real de Scriptable, el teclado ni las áreas seguras exactas. Pide a la persona que pruebe en su iPhone y que mande una captura y la línea `medidas` de la traza (incluye `inset-sup`). Si tiene acceso a otro modelo (sobre todo un SE o un Pro Max), que lo pruebe también. Lo que no se haya probado en un modelo va a «Sin verificar en el iPhone».

## Widgets

Los widgets cambian de tamaño según el modelo: un widget pequeño mide de unos 148 a 170 pt. Usa `minimumScaleFactor`, `lineLimit` y espaciadores flexibles en lugar de tamaños fijos, y pide capturas del widget en el iPhone real.
