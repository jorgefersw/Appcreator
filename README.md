# Appcreator

Skill para agentes de código (Claude Code y compatibles) que crea apps personales para iPhone con [Scriptable](https://scriptable.app): un único script en JavaScript, sin servidores ni dependencias, con interfaz HTML, atajos, widgets, copias de seguridad en iCloud Drive e icono propio.

Todo está en español.

## Qué produce

Cada app es un único `<Nombre>.js` que se copia a iCloud Drive → Scriptable y funciona en tres modos:

- **App**: interfaz HTML a pantalla completa en un `WebView`, conectada a Scriptable por un puente de sondeo.
- **Atajo**: captura sin interfaz desde Atajos o Siri (`args.shortcutParameter`) con una respuesta de 1–2 líneas.
- **Widget**: pequeño, mediano, grande y pantalla de bloqueo, solo lectura.

La interfaz se comprueba automáticamente en todos los tamaños de iPhone (del SE al Pro Max) en modo claro y oscuro, con capturas para revisarla a ojo.

Datos en un JSON local (`FileManager.local()`) con `.bak` antes de cada escritura, archivos dañados apartados (nunca sobrescritos), esquema versionado con migraciones, copia automática en iCloud Drive, exportación e importación con fusión por id.

## Contenido

```
SKILL.md              instrucciones para el agente: flujo, reglas de oro, referencias
referencias/          arquitectura, almacenamiento, puente-webview, estilo-ui,
                      atajos, widgets, icono, dispositivos, pruebas-y-build, verificacion
plantilla/            esqueleto de app funcional (script, UI, build, tests, icono, docs)
scripts/nueva-app.js  genera una app nueva a partir de la plantilla
```

## Uso

Instala la skill copiando o enlazando esta carpeta en `.claude/skills/appcreator/` del proyecto (o en `~/.claude/skills/`). Después pide al agente, por ejemplo, «hazme una app para el iPhone con Scriptable para apuntar hábitos».

También se puede generar el esqueleto a mano:

```
node scripts/nueva-app.js Notas ~/apps/notasAPP --color green --glifo sticky-note --sf note.text
cd ~/apps/notasAPP
npm run build      # incrusta src/ui.html en Notas.js y genera preview.html
npm test           # node:test, sin dependencias
npm run invisibles # comprueba que no hay caracteres invisibles literales
npm run capturas   # revisa la UI en todos los iPhone (375×667 a 440×956), claro y oscuro
npm run icono      # icono/icono.svg -> PNG 1024 a sangre (+ 180 y vista previa)
```

Requisitos: Node 20+. Para las capturas, Playwright con WebKit (`npm i -g playwright && npx playwright install webkit`). Para el icono, Python 3 con Pillow y Google Chrome o QuickLook (macOS).

## Estado

El patrón sale de dos apps reales. Parte está verificada en un iPhone (puente del WebView, atajo en segundo plano, almacenamiento compartido entre modos, alertas con Run In App) y parte no; `referencias/verificacion.md` lo detalla.
