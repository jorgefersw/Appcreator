# Especificación — «__APP__» (Scriptable, iOS)

Documento de referencia para quien escriba código. **Fuente de verdad**: si cambia el comportamiento, se cambia primero (o a la vez) aquí. Todo en español (es-ES).

## Reglas generales

- `__APP__.js` es el entregable: un único archivo, sin dependencias, con la cabecera de Scriptable en las 3 primeras líneas (`icon-color: __COLOR__; icon-glyph: __GLIFO__`).
- Secciones: 1) `crearNucleo()` puro y autocontenido (se inyecta en el WebView con `toString()`), 2) `crearAlmacen(fm, nucleo, opciones)`, 3) bloque generado `// >>> UI_HTML … // <<< UI_HTML` + `jsonSeguro`/`construirHTML`, 4) modos y `principal()`.
- Usa `await` de nivel superior: en Node se carga con `tests/ayuda.js`, nunca con `require`.
- Tests: `tests/*.test.js` con `node:test`, sin dependencias, `TZ=Europe/Madrid`, siempre con `hoy`/`ahora` explícitos.
- Prohibidos los caracteres invisibles literales y los emojis con U+FE0F en los fuentes. Constrúyelos con `String.fromCharCode`. `npm run invisibles` debe decir «Sin caracteres invisibles.».
- Sin `Intl` ni `toLocaleString`: tablas propias de días y meses.
- Red: ninguna. (Si alguna vez hace falta, una URL fija por servicio, solo desde la app, nunca con datos del usuario, y un test que lo blinde.)

## Fechas

- Día `YYYY-MM-DD`; instante `YYYY-MM-DDTHH:mm:ss` local, sin zona.
- El anfitrión sobrescribe `ahora` de cada operación con su reloj (`sellarOp`).

## Esquema (versión 1)

```
{ version: 1, rev: 0,
  ajustes: { margenSuperior: 80, copiaIcloud: true },
  elementos: [ { id, titulo, notas, hecho, hechoEn, creado, modificado, borrado } ] }
```

- Los borrados son marcas (`borrado: true`), para que la fusión de copias los respete.
- Migraciones: `MIGRACIONES[n]` lleva de n a n+1; subir `VERSION`. Datos de una versión futura: error `VERSION_FUTURA`, no se tocan.

## Operaciones — `aplicarOp(datos, op)`

| tipo | campos | devuelve |
|---|---|---|
| `elemento.crear` | `elemento: { id?, titulo, notas? }` | `{ id, titulo }` |
| `elemento.editar` | `id, cambios: { titulo?, notas? }` | `{ id }` |
| `elemento.completar` / `elemento.reabrir` | `id` | `{ id }` |
| `elemento.borrar` / `elemento.restaurar` | `id` | `{ id }` |
| `ajustes.editar` | `cambios: { margenSuperior?, copiaIcloud? }` | `{ ajustes }` |
| `lote` | `ops: [...]` | lista de resultados |

Errores: `Error` con `codigo = 'OP_INVALIDA'`.

## Modos

- **Atajo** (`args.shortcutParameter`): `{ texto }` crea; `{ accion: 'resumen' }` devuelve un texto para Siri. Acepta objeto, JSON en texto o texto suelto. Salida de 1–2 líneas. Nunca lanza.
- **Widget** (`config.runsInWidget`): solo lee. Familias `small`, `medium`, `large`, `accessory*`.
- **App**: WebView + puente (`Puente.esperar` / `Puente.recibir`). Mensajes: `op`, `exportar`, `importar`, `registro`, `abrir`.
- Sin parámetro y con Run In App desactivado: devuelve `AVISO_SIN_PARAMETRO`.

## Copias

- `__app__-datos.json` + `.bak` antes de cada escritura; cuarentena `.corrupto-<fecha>`.
- Copia diaria en iCloud: `Scriptable/__app__APP/Backup/__app__-AAAA-MM-DD.json`, 30 últimas; solo se borran archivos con ese patrón.
- Exportar/importar JSON; la importación fusiona por id (gana `modificado` mayor) y conserva los ajustes locales.

## Dominio

(Rellenar: entidades, reglas, vistas, decisiones tomadas.)
