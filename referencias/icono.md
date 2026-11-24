# Icono de la app

Una app de Scriptable tiene dos iconos distintos:

## 1. Icono dentro de Scriptable (cabecera del script)

```
// icon-color: deep-blue; icon-glyph: check-circle;
```

- `icon-glyph`: nombre de un glifo del catálogo de Scriptable (iconos de tipo Font Awesome: `check-circle`, `wallet`, `sticky-note`, `book`, `calendar-alt`, `heartbeat`, `dumbbell`, `utensils`…).
- `icon-color`: uno de los colores de Scriptable. Usados con éxito: `deep-blue` y `green`. Otros habituales: `red`, `pink`, `purple`, `deep-purple`, `blue`, `light-blue`, `cyan`, `teal`, `deep-green`, `yellow`, `orange`, `brown`, `deep-gray`, `gray`.
- **Sin verificar** la lista exacta de colores y glifos: si no se ve como se espera, el usuario puede elegirlos en Scriptable (mantener pulsado el script → ajustes del icono) y copiar la cabecera resultante.
- No edites esas líneas a mano si Scriptable ya las reescribió.

## 2. Icono en la pantalla de inicio (lo que el usuario ve como «la app»)

Se hace con un atajo:

1. Atajos → **+** → acción **Run Script** (Ejecutar script): script `<Nombre>`, **Run In App** activado.
2. Nombre del atajo = nombre de la app.
3. Menú del atajo (ⓘ o compartir) → **Añadir a pantalla de inicio** (Add to Home Screen).
4. Toca el icono → **Elegir foto** (Choose Photo) → el PNG del icono (guárdalo antes en Fotos, p. ej. con AirDrop o desde Archivos).

Notas: iOS recorta la imagen a su forma redondeada; abrirlo pasa brevemente por Atajos (limitación de iOS). Sin verificar que el atajo abra directamente la UI.

## Requisitos de la imagen

- PNG cuadrado **1024×1024**, **a sangre**: el fondo llena todo el cuadrado, **sin esquinas redondeadas dibujadas** ni margen blanco (iOS aplica la máscara; si la imagen ya trae un «squircle» sobre blanco, quedan bordes blancos).
- **Sin transparencia** (se aplana sobre el color de fondo).
- Motivo centrado en la zona segura (círculo central de ~80 %), legible a 60 px: una sola idea, formas grandes, 2–3 colores, sin texto pequeño.
- Coherente con el acento de la app y con el glifo de Scriptable (mismo concepto).
- Estilo de las apps existentes: fondo degradado del acento (más claro arriba), objeto blanco con sombra suave y detalles en el acento.
- No uses logos, nombres ni personajes de marcas reales; inspirarse en la función de otra app está bien, copiar su identidad no.

## Flujo A: SVG propio (preferido, reproducible)

1. Edita `icono/icono.svg` (viewBox 1024, `<rect width="1024" height="1024">` de fondo, degradado + figura). La plantilla trae un ejemplo con los colores del acento.
2. `npm run icono` → `python3 tools/icono.py icono/icono.svg icono/icono-1024.png`
   - Renderiza con Chrome sin interfaz o, si no, con QuickLook (`qlmanage`, WebKit).
   - Genera `icono-1024.png` (para el atajo), `icono-1024-180.png` y `icono-1024-preview.png` (con la máscara de iOS, solo para revisar).
3. Mira `icono-1024-preview.png` (Read) y también a tamaño pequeño; itera.

## Flujo B: imagen generada con IA

Prompt base (rellenar entre corchetes):

> App icon for an iOS app about [tema]. Full-bleed square, 1024x1024, no rounded corners, no border, no white margin, no text. Background: smooth vertical gradient of [color claro] to [color oscuro]. Center: a single bold [objeto] in white with soft drop shadow and [acento] details, modern flat-3D style like Apple's system icons. Simple, readable at small size.

Si la imagen sale con el icono redondeado sobre fondo blanco (lo habitual en generadores de imágenes), límpiala:

```
python3 tools/icono.py "entrada.png" icono/icono-1024.png --recortar
```

`--recortar` detecta el icono sobre el fondo claro, quita el 9 % de cada lado (las esquinas) y lo escala a sangre. Revisa el resultado: si el motivo queda cortado, mejor regenerar con el prompt «full-bleed».

## Opcional: icono dentro de la UI

El mismo SVG (simplificado) puede ir como marca en el estado vacío o en Ajustes → Acerca de, incrustado en `src/ui.html` (nunca como archivo externo).
