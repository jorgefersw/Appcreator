---
name: appcreator
description: Crea, amplía o revisa apps personales para iPhone hechas con Scriptable siguiendo un patrón probado en apps reales — un único script con núcleo puro, almacén JSON local con .bak y cuarentena, copias en iCloud Drive, UI HTML en WebView con puente de sondeo, modos Atajo/Widget/App, tests en Node sin dependencias, vista previa en navegador e icono de la app. Úsala cuando el usuario quiera "una app para el iPhone", "una app con Scriptable", "otra app como esta", añadir atajos o widgets a una app de Scriptable, estudiar qué atajos y widgets son posibles, o crear el icono de una app.
---

# Appcreator — apps de iPhone con Scriptable

Patrón extraído de dos apps reales hechas con Scriptable: una de **tareas** (la más completa: hoja de compartir, avisos, Calendario, Recordatorios, widgets de pantalla de bloqueo) y una de **gastos** (la más probada en el iPhone: puente del WebView, atajo en segundo plano, automatización con Apple Pay, red controlada). Cuando las referencias dicen «la app de tareas» o «la app de gastos» se refieren a ellas.

Todo se escribe en **español de España**: código, comentarios, textos, documentos y respuestas.

## Cuándo y cómo

1. **App nueva** → sigue «Flujo de una app nueva».
2. **Ampliar una app existente** → lee su `CONTEXTO.md` y `ESPEC.md` primero; respeta las reglas de oro; cambia `ESPEC.md` antes o a la vez que el código.
3. **Estudiar atajos/widgets** → `referencias/atajos.md` y `referencias/widgets.md`: catálogo de posibilidades, recetas y qué está verificado.
4. **Icono** → `referencias/icono.md` + `plantilla/tools/icono.py` (en cada app generada: `tools/icono.py`).

## Flujo de una app nueva

1. **Entender el dominio** (pregunta solo lo imprescindible): qué entidades, qué se captura desde Atajos sin abrir la app, qué debe enseñar el widget, si necesita red (por defecto: no), cada cuánto copia (diaria por defecto; mensual + CSV si son datos tabulares como gastos).
2. **Generar el esqueleto** (funciona, con build y tests en verde):
   ```
   node <carpeta-de-esta-skill>/scripts/nueva-app.js <Nombre> <carpeta-destino>/<nombre>APP \
     --color deep-blue --glifo check-circle --sf checkmark.circle.fill
   ```
   Crea `<Nombre>.js`, `src/ui.html`, `tools/` (build, puente simulado, invisibles, icono), `tests/`, `icono/icono.svg`, `ESPEC.md`, `CONTEXTO.md`, `README.md` y `package.json`; ejecuta build, tests e invisibles.
3. **Escribir `ESPEC.md`** (fuente de verdad): esquema con `version`, operaciones (`tipo` = `grupo.accion`), vistas puras, entradas del atajo, familias del widget, copias. Ver `referencias/arquitectura.md`.
4. **Núcleo** (`crearNucleo`): sustituye la colección `elementos` de ejemplo por el dominio. Lógica pura + tests en `tests/nucleo.test.js`.
5. **UI** (`src/ui.html`): vistas, hojas, deshacer. Estilo en `referencias/estilo-ui.md`. Después `npm run build` y **comprueba que se ve bien en todos los modelos de iPhone** (`npm run capturas` + revisar cada `capturas/resumen-*.png`; ver `referencias/dispositivos.md`). Añade a `ESTADOS` de `tools/capturas.js` cada pantalla y hoja nueva.
6. **Atajos y widget**: `modoAtajo` y `construirWidget` según el dominio (`referencias/atajos.md`, `referencias/widgets.md`).
7. **Icono**: diseña `icono/icono.svg` y `npm run icono` (`referencias/icono.md`).
8. **Cerrar la fase**: `npm run build && npm test && npm run invisibles` en verde, `npm run capturas` sin problemas y los resúmenes revisados a ojo en claro y oscuro; actualiza README (incluida la lista «Sin verificar en el iPhone») y CONTEXTO; di al usuario qué copiar al iPhone y qué probar, paso a paso.

## Reglas de oro (no negociables)

- **Un único archivo entregable** con la cabecera de Scriptable en las 3 primeras líneas. Sin dependencias.
- **La UI nunca guarda estado.** Toda escritura es una operación `{tipo, ahora, …}` que la UI aplica en pantalla sobre una copia y envía al anfitrión; el almacén la aplica sobre el archivo **recién releído** (`mutar`). Así un atajo con la app abierta no se pierde.
- **Fechas como texto local** (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss`), sin zona y sin `Intl`. El anfitrión sobrescribe `ahora` (`sellarOp`). Importes en enteros (céntimos).
- **Borrados como marca** (`borrado: true`) para que la fusión de copias los respete.
- **Esquema versionado** con `MIGRACIONES`; datos de una versión futura → `VERSION_FUTURA`, no se tocan jamás.
- **Nada rompe**: todo lo que toca APIs de Scriptable va en `try`; atajo y widget nunca lanzan; los fallos se anotan en un registro que la app muestra en Ajustes → Diagnóstico.
- **Sin red por defecto.** Si hace falta: URL fija por servicio, solo desde la app, sin datos del usuario, respuesta validada, y un test (`red.test.js`) que lo blinde.
- **Bloques generados**: no edites a mano `UI_HTML` (ni otros bloques `// >>> X … // <<< X`); edita `src/` y ejecuta `npm run build`.
- **Caracteres invisibles**: la herramienta de escritura convierte `\uXXXX` en el carácter real. Nunca escribas escapes `\u` en código: usa `String.fromCharCode(0x2028)` o `'\\' + 'u'`. Nada de emojis con U+FE0F. `npm run invisibles` tras escribir.
- **Tests deterministas**: `node:test`, `TZ=Europe/Madrid`, `hoy`/`ahora` explícitos, mocks de Scriptable en `tests/ayuda.js` (el script tiene `await` de nivel superior: no se puede `require`).
- **Se ve bien en todos los iPhone**: de 375×667 (SE) a 440×956 (Pro Max), en claro y oscuro, cada pantalla y cada hoja. Ancho completo (nunca un `max-width` en móvil), áreas seguras con `--seg-sup`/`--seg-inf`, zonas táctiles ≥ 44 pt, sin anchos fijos. No des una UI por buena sin haber mirado las capturas.
- **Honestidad sobre el dispositivo**: nunca des por hecho el comportamiento de una API de Scriptable o de Atajos. Todo lo no probado va a «Sin verificar en el iPhone» del README, con casillas, y se dice explícitamente al usuario.

## Cómo trabajar con quien la usa

- Pregunta en qué iPhone, idioma de Scriptable y tema (claro/oscuro) va a probar, y adapta los nombres de las acciones (Scriptable en inglés: «Run Script», «Run In App»).
- La prueba en el dispositivo la hace la persona, paso a paso: dale pasos numerados con los nombres de las acciones en inglés y español y lo que debería ver.
- Se instala copiando `<Nombre>.js` a iCloud Drive → Scriptable. Cada app tiene su carpeta dentro de Scriptable (`<nombre>APP/`) con las copias en `Backup/`; nada fuera de Scriptable.
- Para diagnosticar pide capturas y los registros (`<nombre>-traza.log`, `<nombre>-entradas.log`, Ajustes → Diagnóstico).
- En trabajos largos, orquesta y delega código y tests en subagentes, y avisa al terminar cada fase.

## Referencias

| Archivo | Contenido |
|---|---|
| `referencias/arquitectura.md` | Las 4 secciones del script, `principal()` y el despacho de modos, operaciones, esquema y migraciones, organización de carpetas y documentos. |
| `referencias/almacenamiento.md` | `FileManager.local` vs `iCloud`, almacén (`mutar`, `.bak`, cuarentena), registros, copia diaria/mensual, exportar/importar y fusión. |
| `referencias/puente-webview.md` | Protocolo `Puente.esperar/recibir`, `bucleApp`, arreglo de la pantalla negra 0x0, margen superior, teclado, traza y sonda de arranque. |
| `referencias/estilo-ui.md` | Tokens CSS claro/oscuro, componentes (tabbar, grupos, hojas, toasts, deshacer), movimiento con muelles, gestos, SVG propio, accesibilidad. |
| `referencias/atajos.md` | Catálogo de lo que se puede hacer con Atajos + Scriptable, recetas probadas, entradas robustas, automatizaciones, Siri, hoja de compartir, URL scheme. |
| `referencias/widgets.md` | Familias, API de `ListWidget`, patrón `intentar`, diseño por tamaño, refresco, limitaciones. |
| `referencias/icono.md` | Icono de Scriptable (cabecera) e icono de la pantalla de inicio: diseño, SVG, generación con IA, `icono.py`. |
| `referencias/pruebas-y-build.md` | `build.js`, `ayuda.js`, mocks, puente simulado, `preview.html`, tests tipo, Playwright. |
| `referencias/dispositivos.md` | Tamaños y áreas seguras de todos los iPhone, reglas de diseño adaptable, `npm run capturas` (comprobación automática con WebKit) y revisión visual obligatoria. |
| `referencias/verificacion.md` | Lista base «Sin verificar en el iPhone», lo ya verificado en las apps de referencia, cómo guiar la prueba en el dispositivo. |
