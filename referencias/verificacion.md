# Verificación en el iPhone

La prueba en el iPhone la hace la persona que usará la app, paso a paso. Nunca afirmes que algo funciona en el dispositivo si no se ha confirmado.

## Ya verificado en las apps de referencia

- La app abre y funciona tras el arreglo de la pantalla negra 0x0 (alto medido por JS + recarga).
- El puente con `evaluateJavaScript` es fluido.
- Atajo con Diccionario → Run Script (Run In App desactivado) registra y la app lo ve: atajo, widget y app comparten `FileManager.local()`.
- Las acciones Diccionario y Run Script existen en Atajos con esos nombres (Scriptable en inglés).
- Cierre mensual: acción Texto → Run Script con Run In App, `Alert` con campos, automatización mensual; el campo Parameter borraba el texto escrito a mano.
- Petición de red a Kraken desde la app.
- Margen superior: 80 pt en un iPhone con Dynamic Island (100 sobraba, 50 tapaba). En otros modelos, sin verificar.

## Lista base «Sin verificar en el iPhone» (copiar al README y adaptar)

### App y WebView
- [ ] Se ve bien en el iPhone real (captura) y en otros tamaños si hay acceso (SE, Pro Max); `npm run capturas` solo cubre la vista previa.
- [ ] Abre sin pantalla negra y el plan B de recarga funciona.
- [ ] El margen superior deja libre la barra de Scriptable (calibrar con `inset-sup`).
- [ ] El teclado no tapa los campos; barra/pie sobre el teclado.
- [ ] Gestos reales: deslizar filas, arrastrar hojas.
- [ ] Selectores nativos de fecha y hora; `backdrop-filter`.
- [ ] `Safari.open`, `DocumentPicker`, `ShareSheet` por encima del WebView.
- [ ] Áreas seguras y cambio de tema claro/oscuro.

### Atajos
- [ ] `config.runsInApp === false` con Run In App desactivado; sin parámetro → aviso, no error.
- [ ] Cada receta del README, con su notificación.
- [ ] Siri: dictado y frases.
- [ ] Hoja de compartir (`args.urls`, `config.runsInActionExtension`).
- [ ] Run Script con el teléfono bloqueado.

### Widgets
- [ ] Todas las familias, incluidas `accessory*`.
- [ ] Tocar abre la app; `Color.dynamic`, `SFSymbol`, `refreshAfterDate`.

### iCloud y copias
- [ ] `FileManager.iCloud()` (`createDirectory`, `listContents`), también desde un atajo en segundo plano.
- [ ] Archivos `.icloud` sin descargar al importar.

### Otros (si se usan)
- [ ] `Notification` (programar, quitar, al tocar), `Calendar`/`Reminder` (permisos desde un atajo), `Request` a cada servicio.

## Cómo guiar una prueba

1. Qué copiar: «Sustituye `<Nombre>.js` en iCloud Drive → Scriptable».
2. Pasos numerados, uno por acción, con el nombre en inglés (Scriptable en inglés) y en español.
3. Qué debería ver exactamente (texto de la notificación, pantalla).
4. Si falla: captura + Ajustes → Diagnóstico + `<n>-traza.log` / `<n>-entradas.log`.
5. Al confirmar: marca la casilla en README y pásalo a «Verificado» en CONTEXTO con la fecha.
