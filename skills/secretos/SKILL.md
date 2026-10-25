---
name: secretos
description: Integrar secretos narrativos, umbrales, carga Markdown, overlays y pausa global por puntuación.
---

# Secretos y narrativa

## Fuentes del componente

- [Directives/README.md](../../Directives/README.md) y [secuencia definitiva](../../Directives/sequence_to_9999550.txt).
- [Guía narrativa y seguimiento](../../Directives/Conspiracy_Secrets_Master_Guide_and_Tracker.md).
- [narrativa.md](../../narrativa.md) conserva las ideas originales del usuario: nombre **TODA LA VERDAD**, música, niveles, conspiraciones, Camus, ronda express, puntuación, azar, voces y propuestas responsive.
- Esas ideas no acreditan que una mecánica ya esté implementada. Para umbrales usa la secuencia definitiva; para responsive aplica [interfaz (4.1)](../interfaz/SKILL.md). Aclara decisiones de producto pendientes antes de convertir propuestas en reglas nuevas.
- Integraciones: [guardado (3)](../guardado/SKILL.md), [pausa (10)](../pausa/SKILL.md), [localizacion (7)](../localizacion/SKILL.md) y [desarrollo](../desarrollo/SKILL.md).

## 11. Secretos desbloqueables por puntuación

Mecánica narrativa global: al alcanzar determinados umbrales de la puntuación
global, se muestra una card con un texto secreto en **la pantalla del juego
que se está jugando**. La secuencia definitiva vive en
`Directives/sequence_to_9999550.txt`: 633 umbrales. El Yeti usa el primero,
**150 puntos**; el antiguo umbral de prueba de 400 está retirado.
Cada secreto es un hito narrativo equivalente a un «final boss».
La comparación, la cola,
la carga Markdown, el overlay y el control de repeticiones son compartidos: viven en
`scripts/secrets-data.js` y `scripts/secrets.js`. Cada página de juego carga
ese módulo y `styles/secrets.css`; los juegos **no llaman ni duplican** una
comprobación de umbral.

`scripts/storage.js` publica cambios de puntuación y de entrada a juego a los
suscriptores globales. `secrets.js` escucha esos cambios, calcula el total y
abre el secreto elegible. Cada juego solo expone `window.NSG_GAME_CONTROL`
con `isActive()`, `pause()` y `resume()`: es el adaptador mínimo para que el
módulo común presente el secreto en esa pantalla y congele/reanude la partida.

Los secretos van **numerados**. La card se presenta siempre como
**«Secreto nºX»** en español y **«Secret #X»** en inglés, donde `X` es el
índice estable del secreto. El archivo `Secrets/secreto_NNN.md` (tres dígitos,
mismo nombre en los cinco idiomas) usa el elemento NNN de la secuencia (índice
desde 1). El generador detecta nuevas entregas sin editar cada juego. Los huecos
no renumeran secretos: `secreto_112.md` siempre usa el elemento 112.

### 11.1 Cuándo se comprueba

- La condición es `puntuación global >= umbral`, no `>`. Si el jugador
  llega exactamente a 150, el primer secreto debe mostrarse.
- La comprobación se hace en la página del minijuego, nunca en el menú
  principal.
- **Juegos con rondas (calculadoras):** publicar el marcador provisional al
  terminar cada ronda. El módulo global reacciona al cambio y muestra el
  secreto antes de que empiece la siguiente, aunque el jugador todavía no
  haya guardado el progreso en el menú.
- **Juegos de partida única (snake y otros):** `addPendingScore` publica el
  nuevo total al contabilizar la puntuación final; no hace falta una llamada
  especial a secretos.
- Si en una misma pantalla se cruzan varios umbrales a la vez, se aplica la
  regla de «varios de golpe» del punto 11.4: aviso y solo el más cercano.

La puntuación que decide el desbloqueo es la **puntuación global visible**:
el total guardado más los puntos pendientes de la sesión. Para los juegos
con puntuación local por ronda, se añade además la puntuación provisional
acumulada de la partida en curso:

```text
total para secretos = NSG.getSecretsTotal()
```

El total para secretos lo mantiene `NSG`: puntuación guardada + pendiente +
provisional de la partida en curso. Al cerrar una calculadora,
`settleProvisionalScore` transfiere los puntos a pendiente sin duplicarlos.
**Nunca se suma dos veces la misma puntuación.**

### 11.2 Presentación

- La card se superpone al minijuego con un fondo atenuado, pero deja ver
  el contenido de detrás por los lados, arriba y abajo. No ocupa el
  100 % del viewport.
- El encabezado visible de la card es **«Secreto nºX»** / **«Secret #X»**,
  con el índice estable extraído del nombre del archivo por el importador.
  El título se obtiene de una clave i18n con variable de número, no se
  escribe fijo en el HTML ni se toma del nombre del archivo `.md`.
- El texto va dentro de una zona con scroll propio, `overflow-y: auto` y
  barra de scroll visible a la derecha. El resto de la página no debe
  hacer scroll mientras la card está abierta.
- Debe ser responsive: en móvil conserva márgenes y sigue teniendo scroll
  vertical.
- El contenido se carga desde los `.md` de `Textos/<IDIOMA>/Secrets/secreto_NNN.md`,
  que escribe y traduce Claude web en Drive. No se crean, reescriben ni generan
  esos archivos desde el código salvo petición expresa. Hoy existe
  `secreto_001.md` (Yeti) en los cinco idiomas.

  `build-translations.py` descubre los archivos por nombre, deriva los umbrales
  de la secuencia y genera las rutas en `scripts/secrets-data.js`; solo publica
  los secretos presentes en los cinco idiomas y avisa de los incompletos. Para
  incorporar un secreto nuevo desde Drive: `python scripts/textos.py pull-secrets`
  (simulación) y `--apply`; no sobrescribe uno ya integrado sin `--overwrite NNN`.
- El Markdown se renderiza de forma segura y sin dependencias externas
  (párrafos, encabezados, listas y énfasis como mínimo). No se inyecta
  HTML crudo del archivo con `innerHTML` sin sanear.
- Si un `.md` falta o falla la carga, el juego no debe romperse: se muestra
  un aviso discreto y se continúa. Cargar `.md` con `fetch` requiere servir
  el proyecto por HTTP; desde `file://` el navegador puede bloquearlo.

El generador también incluye relatos en el catálogo para uso sin conexión;
los que no estén incluidos conservan carga por `fetch`. Consulta
[Textos/CONVENTIONS.md](../../Textos/CONVENTIONS.md) para nombres, flujo con Claude web
e importación.

### 11.3 Teclado, foco y pausa

- Al abrirse, el foco entra en la card. El fondo queda `inert` y el foco
  no puede escapar a los controles del juego.
- **↑/↓** desplazan el contenido de la card. No mueven el foco ni cambian
  el estado del juego.
- **Enter** y **Escape** cierran la card. Escape debe capturarse antes que
  el aviso de salida de `scripts/quit-confirm.js`, para que cierre el
  secreto y no abra el diálogo de abandonar la partida.
- Mientras el secreto está abierto, el juego queda pausado: no corren
  timers ni cuenta atrás, no se mueve la serpiente y no se aceptan teclas
  de la calculadora. Tampoco se conceden puntos.
- Si el secreto aparece al terminar una ronda, **la cuenta atrás entre
  rondas también se pausa**. Al cerrar la card, se reanuda exactamente
  donde estaba, igual que hace `quit-confirm.js` al cancelar la salida.
- Al cerrar, se restaura el foco al juego y se continúa el flujo normal:
  siguiente ronda, pantalla de fin de partida o overlay final.
- En la última ronda, el secreto se muestra antes de estabilizar la
  pantalla final; al cerrarlo, el flujo de fin de partida sigue como
  siempre.

### 11.4 Repetición por umbral y arquitectura

- **Historial permanente (decisión del usuario, 2026-10-24).** Un secreto se
  obtiene **una sola vez**: la primera vez que la puntuación global alcanza o
  supera su umbral. En ese instante pasa al historial
  (`NSG.getSecretsHistory()` / `NSG.addSecretsHistory(ids)`, clave
  `nsg_secrets_history_v1` en `localStorage`), **al momento y sin depender de
  «Guardar progreso»**: aunque se cierre sin guardar, o sin llegar a leerlo,
  sigue en el historial. Bajar del umbral y volver a cruzarlo **no** lo reabre;
  se relee desde la pantalla de Secretos (11.6). Sustituye a la antigua regla
  de repetición por cruce; la clave `nsg_secrets_seen_v3` se ignora.
- **Varios de golpe (2 o más secretos nuevos en la misma comprobación,
  p. ej. 25.000 puntos de una vez):** todos entran en el historial, se muestra
  primero un aviso «Has recibido X secretos» (X = secretos nuevos con relato
  disponible, no entradas de la secuencia sin escribir) con «Guardando en tu
  historial…» y el botón «Ver secreto» desactivado hasta que el relato más
  cercano está precargado; al continuar se muestra **solo el secreto de mayor
  umbral alcanzado** (el más cercano a la puntuación). Con un único secreto
  nuevo se muestra directamente, como siempre. El juego se pausa una vez y se
  reanuda al cerrar el último.
- Si el texto no se carga, el secreto ya está en el historial; el aviso o la
  tarjeta muestran el error y se puede reintentar desde la pantalla de Secretos.
- Los umbrales se leen de `Directives/sequence_to_9999550.txt`, sin extrapolar.
  `scripts/build-translations.py` genera `scripts/secrets-data.js` a partir
  de los relatos disponibles y su índice. No editar ese resultado a mano ni
  crear tarjetas vacías para los relatos todavía no escritos.
- La lógica común debe vivir en un único módulo compartido (manifiesto de
  umbrales + suscripción al estado global de puntuación + cargador de textos
  + overlay + control de repeticiones). Los juegos no llaman a `NSG_SECRETS.check()` ni
  duplican la comprobación de umbrales o el HTML del overlay. Solo publican
  su marcador provisional cuando corresponda y exponen el control de pausa.
- El manifiesto debe ser fácil de ampliar: cada entrada incluye como
  mínimo `id`, `index`, `threshold` y las rutas por idioma de su `.md`.
- **La numeración visible conserva el índice del archivo**, aunque falten
  relatos intermedios. El umbral se obtiene de ese mismo índice en la secuencia.
- El secreto no concede puntos, no modifica la puntuación y no altera el
  guardado manual del menú.

### 11.6 Pantalla de Secretos (`secretos/index.html`)

- Botón **Secretos** a la derecha de Opciones en el menú (`#secrets-link`,
  clase `.topbar-link`, incluido en `getNavTargets()`), que lleva a
  `secretos/index.html`. La página lleva `data-secrets="viewer"`: carga
  `secrets.js` solo para el overlay y **no** se suscribe a la puntuación.
- Lista los secretos del historial **de menor a mayor umbral**, en cards con el
  número («Secreto nºX»), el título (primera línea del `.md`) y un fragmento del
  texto (`NSG_SECRETS.describe`, 150 caracteres; 75 en chino). Rejilla de **4
  columnas × 3 filas = 12 por página** con paginación; baja a 3, 2 y 1
  columnas al estrecharse. Sin secretos: mensaje vacío.
- Al pulsar una card se abre el secreto con el mismo overlay
  (`NSG_SECRETS.openSecret(id)`), sin pausar ningún juego; al cerrar el foco
  vuelve a la card. Lógica en `scripts/secrets-gallery.js`, estilos en
  `styles/secrets-gallery.css`, textos en `Textos/<IDIOMA>/Common/secrets-page.md`.
- Teclado: flechas entre cards y botones (navegación espacial), Enter abre,
  Escape vuelve al menú (sin confirmación: no hay partida).
- Pruebas: `node --test tests/secrets-history.cjs`.

### 11.5 Checklist de aceptación

1. Con 149 puntos no aparece el primer secreto; con 150 exactos, sí.
2. Con 100 puntos guardados, sumar 50 puntos más (en una ronda o varias)
   abre la card en la pantalla del minijuego.
3. En una calculadora, la card sale al terminar la ronda, no al volver al
   menú. La cuenta atrás para la siguiente ronda no avanza mientras está
   abierta.
4. En snake, la card sale al terminar la partida.
5. ↑/↓ hacen scroll, la barra derecha es visible y Enter/Escape cierran.
6. El foco queda atrapado, el fondo no responde y al cerrar se recupera
   el foco y el juego continúa.
7. Un secreto obtenido no vuelve a abrirse al bajar de su umbral y volver a
   cruzarlo, ni al recargar; sigue en la pantalla de Secretos. Con 2 o más
   secretos nuevos de golpe, aviso + solo el más cercano, y todos al historial.
8. Funciona en los cinco idiomas con sus `.md` correspondientes y no rompe la partida
   si falta un archivo.
9. La card deja ver el fondo alrededor y se adapta a móvil.
10. El Yeti muestra **«Secreto nº1»** (ES) / **«Secret #1»** (EN).
    Añadir `secreto_004.md` conserva el número 4 y el umbral 2.410 aunque
    todavía no existan los secretos 2 y 3.
