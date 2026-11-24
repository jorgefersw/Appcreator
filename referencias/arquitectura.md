# Arquitectura

## Organización del repositorio

```
<nombre>APP/
  <Nombre>.js            entregable (lo único que va al iPhone)
  src/ui.html            fuente de la UI (HTML + CSS + JS en un archivo)
  src/<modulo>.js        (opcional) otros bloques incrustados, p. ej. src/interprete.js en la app de tareas
  tools/build.js         npm run build: incrusta src/ en el script y genera preview.html
  tools/puente-simulado.js   anfitrión falso para preview.html
  tools/invisibles.js    npm run invisibles
  tests/ayuda.js         carga el script en Node con mocks de Scriptable
  tests/*.test.js        npm test (node:test, sin dependencias)
  icono/icono.svg        fuente del icono (+ PNG generados)
  preview.html           generado: la UI con datos de ejemplo
  ESPEC.md               especificación: fuente de verdad
  CONTEXTO.md            contexto para retomar en otra sesión (estado, decisiones, pendiente)
  README.md              guía de usuario: instalación, atajos, widgets, copias, limitaciones, «Sin verificar»
  package.json           scripts build / test / invisibles / icono (sin dependencias)
```

Skills de proyecto útiles en `.claude/skills/`: `apple-design`, `gestures`, `security-audit`, `untangle-codebase`.

## El script: cuatro secciones

```
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-blue; icon-glyph: check-circle;

1. crearNucleo()      lógica pura y AUTOCONTENIDA
2. crearAlmacen(fm, nucleo, opciones)
3. // >>> UI_HTML … // <<< UI_HTML  (generado) + jsonSeguro + construirHTML
4. modos: atajo, widget, app (+ cierre, compartir…) y principal()
module.exports (solo en Node) + `if (FileManager && Script) await principal()`
```

### 1. Núcleo (`crearNucleo`)

- No usa nada de fuera (ni globales, ni otras funciones del archivo): se inyecta en el WebView con `crearNucleo.toString()`, así la UI y el anfitrión comparten **exactamente** la misma lógica (validación, operaciones, vistas, formatos).
- Contiene: constantes (`VERSION`, `COLECCIONES`, `COLORES`, tablas de días/meses), utilidades (`nuevoId`, `limpiarTexto`, `normalizar` sin tildes, `clonar`), fechas de texto, `datosIniciales`, `migrar`, `aplicarOp`, vistas puras (listas ordenadas, totales, datos de widget), textos (`formatearImporte`, `textoDia`), `fusionar`, y lo que el dominio necesite (recurrentes, intérprete de lenguaje natural, cierres…).
- Errores con código: `e.codigo = 'OP_INVALIDA' | 'VERSION_FUTURA' | 'FORMATO'`.
- Módulos grandes (p. ej. el intérprete de lenguaje natural de la app de tareas) van en `src/x.js` como `function crearX() {…}` y el build los incrusta entre marcas; se inyectan igual en la UI (`/*__INTERPRETE__*/`).

### 2. Almacén

Ver `almacenamiento.md`. Interfaz: `leer()`, `mutar(fn)`, `aplicar(op)`, `sincronizar()`, `importar(externo)`, `anotar(linea)`, `leerLog()`, `notaCopia(t)`, `fechaModificacion()`.

### 3. UI incrustada

`UI_HTML` es un array de líneas JSON (`[...].join('\n')`): diffs legibles, sin plantillas `` ` `` que rompan con `${`. `construirHTML(plantilla, inicio)` sustituye `/*__NUCLEO__*/` y `/*__INICIO__*/` (con funciones como reemplazo, para que `$&` en datos no se interprete) y exige que cada marca aparezca exactamente una vez. `jsonSeguro` escapa `< > & U+2028 U+2029`.

### 4. Modos y `principal()`

Un script, varios modos según cómo lo lance iOS. Orden de despacho (unión de las dos apps de referencia):

```js
async function principal(opciones) {
  const nucleo = crearNucleo(), fm = FileManager.local(), almacen = crearAlmacen(fm, nucleo);
  const entrada = typeof args !== 'undefined' ? args.shortcutParameter : undefined;
  if (pideAccionEspecial(args)) { … }              // p. ej. accion=cierre (necesita Run In App)
  else if (entrada != null) {                       // ATAJO: sin UI
    Script.setShortcutOutput(modoAtajo(almacen, nucleo, entrada));
    copiaDiaria(...); await sincronizarTodo(...);   // efectos secundarios después de responder
  } else if (config.runsInActionExtension || args.urls?.length || args.plainTexts?.length) {
    // HOJA DE COMPARTIR
  } else if (config.runsInWidget) {                 // WIDGET: solo lectura
    modoWidget(almacen, nucleo, new Date(), config.widgetFamily);
  } else if (!corriendoEnApp()) {                   // atajo sin parámetro y Run In App desactivado
    Script.setShortcutOutput(AVISO_SIN_PARAMETRO);
  } else {                                          // APP
    copiaDiaria(...); await modoApp(almacen, nucleo, fm);
  }
  Script.complete();
}
```

- `corriendoEnApp()` = `config.runsInApp !== false` (si Scriptable no informa, se asume que sí).
- `mostrarAlerta` nunca lanza: fuera de la app (Siri / Run In App desactivado) Scriptable responde «Alerts are not supported in Siri»; entonces el texto va a `Script.setShortcutOutput` y a la consola.
- Los modos reciben dependencias inyectables (`ahora`, `obtenerNube`, `ui: { Alert, Notification }`, `ClaseRequest`) para poder probarlos en Node.

## Operaciones

- Forma: `{ tipo: 'grupo.accion', ahora: 'YYYY-MM-DDTHH:mm:ss', …campos }`; `lote` = `{ tipo: 'lote', ops: [...] }`.
- `aplicarOp(datos, op)` **muta** `datos` y devuelve un `info` pequeño (`{ id }`, resumen). Valida todo y lanza `OP_INVALIDA` con mensaje en español (la UI lo muestra en un toast).
- Acciones típicas: `crear`, `editar` (con `cambios` y lista blanca de campos), `borrar`/`restaurar` (marca), `completar`/`reabrir`, más las del dominio (`tarea.posponer`, `cierre.guardar`, `tarjeta.mapear`…). La app de tareas tiene un atajo genérico `TIPOS_SIMPLES` para grupos con CRUD estándar.
- Cada entidad lleva `id`, `creado`, `modificado` (para la fusión) y `borrado`.
- `generarRecurrentes`, cierres calculados y similares corren dentro de `mutar` (antes y después de la op), son idempotentes (ids deterministas tipo `serie:fecha`) y nunca duplican.

## Esquema y migraciones

```js
{ version: N, rev: <contador de escrituras>, ajustes: {...}, <colecciones>: [...], <mapas>: {...} }
```

- `migrar(d)` trabaja sobre una copia, aplica `MIGRACIONES[v]` de v a v+1, completa con `datosIniciales()` (los ajustes con `fusionarProfundo`) y normaliza colecciones.
- Antes de una migración con riesgo, guarda una copia intacta que no se sobrescribe (p. ej. `gastos-datos.v2-antes-de-v3.json`).
- Documenta cada versión en ESPEC y README (qué añadió).

## Documentos

- **ESPEC.md**: reglas generales, fechas, esquema, operaciones (tabla), vistas, modos, copias; ampliaciones por fases («Fase 5: widgets…», «Ampliación A…»). Escrito para que un subagente implemente sin preguntar.
- **CONTEXTO.md**: qué es, archivos, reglas, estado en el iPhone (verificado / sin verificar con fechas), decisiones tomadas, pendiente, cómo trabaja el usuario.
- **README.md**: para el usuario final; ejemplos de salida reales; nombres de menús en español con el inglés entre paréntesis; lista «Sin verificar en el iPhone» con casillas.

## Trabajo por fases con subagentes

El orquestador escribe ESPEC por fase y delega: «núcleo + tests», «almacén + atajo + puente», «UI», «widgets/avisos/sincronización». Cada subagente debe dejar `npm run build && npm test && npm run invisibles` en verde. El orquestador revisa, prueba `preview.html` y actualiza README/CONTEXTO.
