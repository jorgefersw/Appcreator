# Atajos (Shortcuts) + Scriptable

Lee esto antes de diseñar la captura sin UI de una app. Distingue siempre **verificado** (probado en un iPhone real) de **sin verificar**. Los nombres de acciones cambian entre versiones de iOS e idiomas: escribe en el README el nombre en español con el inglés entre paréntesis y avisa de que busque el equivalente más cercano.

## Cómo llega la entrada al script

| Vía | En el script | Notas |
|---|---|---|
| Acción **Run Script** (Ejecutar script) con **Parameter** | `args.shortcutParameter` | Puede llegar como objeto (Diccionario), como texto JSON o como texto/número suelto: normaliza las tres formas (`normalizarEntrada`), con claves sin tildes ni mayúsculas. **Verificado** (app de gastos). |
| Run Script con **Run In App** desactivado | `config.runsInApp === false` | Corre en segundo plano: sin WebView ni `Alert` («Alerts are not supported in Siri»). **Verificado** que funciona para registrar. |
| Run Script con **Run In App** activado | se abre Scriptable | Necesario para pedir datos con `Alert` (cierre mensual) o abrir la UI. |
| Salida al atajo | `Script.setShortcutOutput(texto)` | La siguiente acción («Mostrar notificación», «Hablar texto», «Mostrar resultado») la usa. 1–2 líneas. |
| **Share Sheet Inputs** / hoja de compartir | `args.urls`, `args.plainTexts`, `config.runsInActionExtension` | Sin verificar (app de tareas). Termina con `Alert` de confirmación si está en la extensión. |
| URL scheme | `scriptable:///run/<Nombre>?accion=cierre` → `args.queryParameters` | Sirve desde Safari, Notas, otras apps o un widget. |
| Widget tocado | `w.url = URLScheme.forRunningScript()` | Abre el script en modo app (sin verificar). |

Avisos:
- El campo **Parameter** de Run Script puede **borrar el texto escrito a mano** (verificado en la app de gastos): usa una acción **Texto** (Text) antes y pásala como parámetro.
- Si el atajo ejecuta el script **sin parámetro** y con Run In App desactivado, devuelve un texto que explique qué falta (`AVISO_SIN_PARAMETRO`), nunca un error.
- Registra cada entrada cruda en `<n>-entradas.log` para ver en Ajustes → Diagnóstico cómo llegan realmente los datos.

## Diseño de la salida

- Línea 1: confirmación con `✓` y lo esencial (`✓ Entregar práctica de redes`, `12,50 € · Mercadona → Supermercado`).
- Línea 2: contexto útil (`vie 20 nov · 18:00 · alta · #uni`, `Hoy 20,00 € · Mes 643,20 €`). Pregunta qué quiere ver el usuario (en la app de gastos **no** se quería el saldo).
- Errores legibles: `No se ha podido guardar: <motivo>`, `No hay nada que añadir.`
- Para Siri: frases completas pensadas para oírse («Hoy tienes 3 tareas: A, B y C.», máximo 5 y «y N más»).

## Recetas probadas o documentadas

1. **Captura rápida** (app de tareas): Diccionario `{texto}` (de «Solicitar entrada» o «Dictar texto») → Run Script (Run In App off) → Mostrar notificación.
2. **Registro automático con Apple Pay** (app de gastos): Automatización → **Transacción** (Wallet, iOS 17+) → Ejecutar inmediatamente → Diccionario `{tipo: gasto, importe: Importe, comercio: Comercio, tarjeta: Tarjeta o pase}` → Run Script (off) → Mostrar notificación. Formato real de los campos: **sin verificar** hasta un pago real → mirar Diagnóstico. Solo Apple Pay con tarjetas de Cartera; no distingue devoluciones; importes negativos → reembolso.
3. **Menú manual** (app de gastos): Seleccionar del menú (Gasto/Ingreso) → Solicitar entrada (Número) → Solicitar entrada (texto) → Diccionario → Run Script → Mostrar resultado.
4. **Resumen por voz**: Diccionario `{accion: hoy|resumen}` → Run Script (off) → **Hablar texto**.
5. **Tarea periódica con preguntas** (cierre mensual, app de gastos, **verificado**): atajo con Texto `accion=cierre` → Run Script **con Run In App** → `Alert` con `addTextField` por cuenta → notificación final. Automatización **Fecha y hora**, mensual, día 1 → Ejecutar inmediatamente → Ejecutar atajo.
6. **Guardar para leer** (app de tareas): atajo en la hoja de compartir que acepta URLs y texto → Diccionario `{url, texto}` → Run Script (off).
7. **Icono en la pantalla de inicio**: atajo con Run Script (Run In App **on**) → Añadir a pantalla de inicio con icono propio (ver `icono.md`). Sin verificar que abra la app.
8. **Refrescar widgets tras registrar**: acción «Refresh All Widgets» de Scriptable si existe en su versión (**sin verificar**).

## Catálogo para estudiar (qué disparadores y acciones aprovechar)

Al empezar una app, repasa con el usuario cuáles encajan. Todo esto es de Atajos de iOS; su disponibilidad depende de la versión y el idioma, y nada está verificado salvo lo marcado arriba.

**Disparadores de automatización personal**: Hora del día (diario/semanal/mensual), Alarma, Transacción (Wallet), NFC (etiqueta), Llegar/Salir de un lugar, Wi‑Fi, Bluetooth, CarPlay, Modo de concentración, Batería, Cargador, Abrir/cerrar una app, Correo/Mensaje recibido, Pantalla de reposo, Modo avión.

**Entradas útiles**: Solicitar entrada (texto, número, fecha), Dictar texto, Seleccionar del menú, Elegir de la lista, Obtener portapapeles, Entrada del atajo (hoja de compartir), Obtener ubicación actual, Obtener detalles de eventos/recordatorios, Seleccionar foto, Escanear código QR/NFC.

**Salidas**: Mostrar notificación, Mostrar resultado, Hablar texto, Copiar al portapapeles, Abrir URL (`scriptable:///run/...`), Ejecutar atajo.

**Otras vías del sistema**: Siri («Oye Siri, <nombre del atajo>»), botón de Acción (iPhone 15 Pro+), toque posterior (Accesibilidad), widgets de Atajos, Centro de control, pantalla de bloqueo.

**Lo que puede hacer Scriptable por su cuenta** (sin Atajos): `Notification` (avisos locales programados, máx. 64 pendientes por app), `Calendar`/`CalendarEvent`/`Reminder` (EventKit), `Location`, `Photos`, `Pasteboard`, `Speech`, `Request` (red), `Keychain`, `Safari.open`, `DocumentPicker`, `ShareSheet`, `QuickLook`, `Dictation`. Usa siempre `try` y anota fallos; la mayoría están sin verificar en estas apps.

## Implementación (checklist)

- `normalizarEntrada` acepta objeto / JSON en texto / texto suelto; claves con alias (`texto|titulo`, `comercio|concepto|merchant`, `accion|acción`).
- `modoAtajo(almacen, nucleo, entrada, ahora)` nunca lanza; aplica una op con `almacen.aplicar` (relee el disco) y devuelve el texto.
- Efectos secundarios (copia iCloud, sincronización) **después** de `setShortcutOutput`.
- Si necesita UI y no hay Run In App: notificación + salida explicando que hay que activarlo.
- Tests: `ejecutarAtajo(fm, parametro)` para cada forma de entrada, errores y registro.
- README: pasos numerados con capturas mentales («despliega la acción con la flecha para ver Run In App»), ejemplo de salida real y «Cómo comprobar que funciona».
