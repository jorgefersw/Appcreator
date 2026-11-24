# Contexto: app «__APP__» (iPhone con Scriptable)

Contexto para continuar el trabajo en otra sesión. Creada con la skill `Appcreator`.

## Qué es

Un único script, `__APP__.js`, sin dependencias ni red, con tres modos: App (WebView + puente), Atajo (sin UI) y Widget (solo lectura).

Datos en `FileManager.local()`: `__app__-datos.json` (+ `.bak`). Copia diaria en iCloud Drive: `Scriptable/__app__APP/Backup/`. Registros: `__app__-entradas.log`, `__app__-copia-icloud.txt`, `__app__-traza.log`.

## Archivos

| Archivo | Qué es |
|---|---|
| `__APP__.js` | Entregable: núcleo, almacén, `UI_HTML` (generado), modos y `principal()`. |
| `src/ui.html` | Fuente de la UI. |
| `tools/build.js` | `npm run build`: incrusta la UI y genera `preview.html`. |
| `tools/puente-simulado.js` | Anfitrión simulado para `preview.html`. |
| `tools/invisibles.js` | `npm run invisibles`. |
| `tests/` | `npm test` (node:test). `ayuda.js` carga el script con mocks. |
| `icono/` | `icono.svg` y los PNG generados (`npm run icono`). |
| `ESPEC.md` | Fuente de verdad. |
| `README.md` | Instalación, atajos, widgets, copias y «Sin verificar en el iPhone». |

## Reglas

- `ESPEC.md` manda. La UI nunca guarda: toda escritura es una operación que el almacén aplica sobre el archivo recién releído.
- No edites a mano el bloque `UI_HTML`. Tras cualquier cambio: `npm run build`, `npm test`, `npm run invisibles`.
- Todo lo que toca APIs de Scriptable va en `try`; nunca rompe app, atajo ni widget.

## Estado en el iPhone

Nada verificado todavía. Ver README → «Sin verificar en el iPhone».

## Decisiones tomadas

(Ir anotando con fecha.)

## Pendiente

1. Definir el dominio en `ESPEC.md`.
