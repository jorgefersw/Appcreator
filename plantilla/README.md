# __APP__

App personal para iPhone escrita como un único script de [Scriptable](https://scriptable.app).

## Qué es

Todos los datos se quedan en el iPhone, en un JSON en el almacenamiento local de Scriptable (`FileManager.local()`). Sin servidores, sin cuentas y sin red. Lo único que sale del teléfono es una copia diaria a tu propio iCloud Drive (`Scriptable/__app__APP/Backup`, las 30 últimas).

Tres modos con el mismo script: **App** (interfaz completa), **Atajo** (sin interfaz) y **Widget**.

## Instalación

1. Instala **Scriptable** desde la App Store.
2. Copia `__APP__.js` a la carpeta `Scriptable` de iCloud Drive. Aparecerá como «__APP__». (Alternativa: crea un script llamado exactamente `__APP__` y pega el contenido.)
3. Las primeras líneas (`// Variables used by Scriptable`) deben seguir al principio, sin nada antes.
4. Ábrelo una vez a mano para comprobar que arranca.

**Actualizar:** sobrescribe `__APP__.js`. Los datos están en otro sitio y no se tocan. No borres la app Scriptable: borrarla borra los datos locales.

**Icono en la pantalla de inicio:** en Atajos crea un atajo con **Run Script** → `__APP__`, **Run In App** activado. Menú compartir del atajo → **Añadir a pantalla de inicio** → toca el icono → **Elegir foto** → `icono/icono-1024.png` (guárdalo antes en Fotos). Nombre: «__APP__».

El nombre del script importa: atajos y widgets lo referencian por nombre.

| Archivo local | Contenido |
|---|---|
| `__app__-datos.json` | Todos los datos. |
| `__app__-datos.json.bak` | Copia antes de cada escritura. |
| `__app__-datos.json.corrupto-<fecha>` | Solo si hubo un archivo dañado (se aparta, nunca se sobrescribe). |
| `__app__-entradas.log` | Últimas 30 entradas desde Atajos. |
| `__app__-copia-icloud.txt` | Estado de la última copia diaria. |
| `__app__-traza.log` | Traza de arranque de la app. |

## Atajos

Con Scriptable en inglés la acción se llama **Run Script** y su opción **Run In App**.

### Añadir rápido

1. **Diccionario** con la clave `texto` (por ejemplo, el resultado de **Solicitar entrada** o **Dictar texto**).
2. **Run Script**: script `__APP__`, Parameter = el diccionario, **Run In App desactivado**.
3. **Mostrar notificación** con el resultado: `✓ Comprar pan` / `3 pendientes`.

### Resumen por Siri

**Diccionario** con `accion` = `resumen` → **Run Script** (Run In App desactivado) → **Hablar texto**.

## Widgets

Añade un widget de Scriptable, mantén pulsado → **Editar widget** → Script `__APP__`, «When Interacting» = **Run Script**. Tamaños pequeño, mediano, grande y pantalla de bloqueo. Los widgets no son interactivos y iOS decide cuándo se refrescan.

## Copias de seguridad

- **Ajustes → Exportar a Archivos / Compartir copia**: JSON `__app__-copia-AAAA-MM-DD.json`.
- **Importar copia**: fusiona por id sin duplicar (gana lo modificado más recientemente); tus ajustes se conservan.
- **Copia diaria** en iCloud Drive, 30 últimas. Desactivable en Ajustes.

## Limitaciones

- La interfaz es un WebView: Scriptable dibuja encima su barra («Close»), por eso se reserva un margen superior (80 pt, ajustable en Ajustes).
- Sin red, sin sincronización entre dispositivos, sin bloqueo de archivo (la `.bak` limita el daño de dos escrituras simultáneas).

## Sin verificar en el iPhone

- [ ] La app abre sin pantalla negra (medición 0x0) y el plan B de recarga funciona.
- [ ] El margen superior de 80 pt deja libre la barra de Scriptable (calibrar con `inset-sup` de la traza).
- [ ] El teclado no tapa los campos de las hojas.
- [ ] `config.runsInApp` es `false` desde Atajos con Run In App desactivado.
- [ ] Atajo de añadir y notificación de salida; resumen por Siri.
- [ ] Widgets: familias, `Color.dynamic`, `SFSymbol`, tocar abre la app, `refreshAfterDate`.
- [ ] `DocumentPicker` y `ShareSheet` por encima del WebView.
- [ ] Copia diaria con `FileManager.iCloud()`, también desde un atajo en segundo plano.

## Desarrollo

```
npm run build      # incrusta src/ui.html en __APP__.js y genera preview.html
npm test           # node --test, sin dependencias
npm run invisibles # comprueba que no hay caracteres invisibles literales
npm run capturas   # capturas y comprobaciones en todos los iPhone, claro y oscuro (necesita Playwright con WebKit)
npm run icono      # icono/icono.svg -> icono/icono-1024.png (+ 180 y vista previa)
```

**Vista previa:** abre `preview.html`. Parámetros: `?scriptable` (simula la barra nativa), `?vista=ajustes`, `?hoja=nuevo`, `?seguro=59,34` (simula las áreas seguras de un modelo).
