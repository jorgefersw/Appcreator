# Almacenamiento, registros y copias de seguridad

## Dónde viven los datos

| Qué | Dónde | Por qué |
|---|---|---|
| Datos (`<n>-datos.json`) | `FileManager.local().documentsDirectory()` | Siempre disponible, también desde atajos en segundo plano y widgets; no depende de la descarga de iCloud. **Verificado** en la app de gastos: atajo, widget y app comparten carpeta. |
| `.bak` | junto a los datos | Copia antes de cada escritura. |
| `.corrupto-<sello>` | junto a los datos | Un archivo ilegible se aparta, nunca se sobrescribe. |
| Registros | junto a los datos | `<n>-entradas.log` (30 últimas entradas de Atajos), `<n>-copia-icloud.txt` (una línea: estado de la última copia), `<n>-traza.log` (arranque de la app), `<n>-sinc.txt` (40 líneas de sincronización, si la hay). |
| Copias automáticas | `FileManager.iCloud()` → `Scriptable/<n>APP/Backup/` | Fuera del teléfono pero en el iCloud del usuario; todo dentro de la carpeta Scriptable, una subcarpeta por app. |
| Exportación manual | temporal → `DocumentPicker.export` o `ShareSheet.present` | El usuario elige dónde. |

Advertencias para el README: borrar la app Scriptable borra los datos locales; borrar o renombrar el script no. Actualizar = sobrescribir el `.js`.

## Almacén

```js
function crearAlmacen(fm, nucleo, opciones) // opciones = { dir, ahora } solo en tests
  leerArchivo(r) -> { estado: 'falta' | 'corrupto' | 'ok', datos }   // JSON que no es objeto = corrupto
  leer()  -> { datos, avisos, recuperado }   // principal -> .bak -> vacío, con avisos en español
  guardar(datos)                              // borra .bak, copia actual a .bak, escribe
  mutar(fn) -> { datos, info, avisos, escrito }
     relee; [pasos automáticos]; info = fn(datos); [pasos automáticos];
     escribe solo si info !== false || hubo cambios automáticos || se recuperó de .bak; rev++
  aplicar(op) = mutar(d => nucleo.aplicarOp(d, op))
  sincronizar() = mutar(null)                 // aplica solo los pasos automáticos
```

- `VERSION_FUTURA` se propaga (no se aparta ni se sobrescribe un archivo de una versión más nueva).
- No hay bloqueo de archivo: dos escrituras en el mismo instante podrían chocar. Releer siempre antes de escribir lo hace improbable; `.bak` limita el daño. Documentarlo en Limitaciones.
- `fm.copy`/`fm.move` fallan si el destino existe: borrar antes.
- Registros: nunca interrumpen nada (`try` vacío con comentario «prescindible»); limitan líneas; una entrada por línea (`\n` → ` | `).

## Copia automática en iCloud Drive

Diaria (app de tareas) o mensual con CSV + JSON (app de gastos). Reglas comunes:

- Se hace **la primera vez que el script corre** en el periodo, desde la app y desde el atajo; **nunca desde el widget** (debe ser rápido y de solo lectura) ni desde la hoja de compartir.
- `obtenerNube` es una función inyectada (`() => FileManager.iCloud()`), para tests y para que un fallo al obtenerla quede dentro del `try`.
- Nunca lanza: devuelve `'hecha' | 'ya' | 'desactivada' | 'vacio' | 'error'` y escribe la nota en `<n>-copia-icloud.txt` (visible en Ajustes → Diagnóstico, primera línea).
- `createDirectory(carpeta, true)` si no existe.
- Rotación: solo se borran archivos que encajan **exactamente** con el patrón (`/^tareas-\d{4}-\d{2}-\d{2}\.json$/`); el resto de la carpeta no se toca. Conservar N (30 diarias).
- Desactivable en Ajustes (`ajustes.copiaIcloud`).
- Sin verificar habitualmente: `FileManager.iCloud()` desde un atajo en segundo plano; archivos `.icloud` sin descargar.

## Exportar e importar

- **Exportar**: escribe en `fm.temporaryDirectory()` `<n>-copia-AAAA-MM-DD.json` (con sangría) y abre `DocumentPicker.export(ruta)` («Guardar en Archivos») o `ShareSheet.present([ruta])` («Compartir…»). Cancelar rechaza la promesa → `{ ok: false, cancelado: true }` y la UI no muestra error.
- **CSV** (si los datos son tabulares): `;` como separador, coma decimal, UTF-8 con BOM, fechas `dd/mm/aaaa` → se abre bien en Excel en español. Solo exportación.
- **Importar**: `DocumentPicker.openFile()` (puede devolver ruta o lista), descargar si `isFileStoredIniCloud && !isFileDownloaded` (`downloadFileFromiCloud`), `JSON.parse`, comprobar forma (`tieneFormaDeDatos`: colecciones presentes son listas y hay al menos una) y `almacen.importar`.
- **Fusión** (`nucleo.fusionar`): por `id`, gana el `modificado` mayor (borrados incluidos), sin duplicar; los ajustes locales se conservan. Importar dos veces la misma copia es inocuo. Devuelve `{ añadidos, actualizados }` para el toast.

## Recuperación ante fallos (texto para el README)

- Antes de cada escritura se copia a `.bak`.
- Si el archivo está dañado: se renombra a `.corrupto-<fecha>`, se recupera la `.bak` y la app avisa (puede faltar el último cambio). Si la `.bak` también está dañada: se aparta igual y se empieza vacío (con aviso). Los apartados se recuperan a mano desde Archivos.
- Datos de una versión más nueva: error pidiendo actualizar el script; no se tocan.
