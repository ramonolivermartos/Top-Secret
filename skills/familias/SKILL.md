---
name: familias
description: Localizar y modificar Calculadoras, Snake, All in y Laberinto respetando IDs, variantes y dependencias compartidas.
---

# Familias y componentes jugables

Usa esta guía cuando se mencione un juego concreto. Para crear variantes, sigue
[minijuegos](../minijuegos/SKILL.md); no deduzcas las reglas por el número de versión.
Los IDs y enlaces reales se consultan en `scripts/games-data.js`.

## Calculadoras

- Rutas: `juegos/Calculadora/calculadora1/` a `calculadora4/`.
- La primera tiene ID `calculadora`, no `calculadora1`. Conserva los IDs persistidos.
- Son juegos por rondas: consulta [guardado](../guardado/SKILL.md), [pausa](../pausa/SKILL.md) y [secretos](../secretos/SKILL.md) antes de cambiar puntuación o transiciones.
- Publica el provisional tras cada ronda y liquídalo una sola vez al terminar. Los mensajes de ánimo/felicitación se reservan para el overlay final.
- La dificultad fija no lleva indicador de dificultad variable. No confundas la nota de la card con un nivel sorteado.

## Snake

- Rutas: `juegos/SnakeContainer/snake/`, `snake2/`, `snake3/`.
- Compartidos: `juegos/SnakeContainer/powerups.js` y `juegos/SnakeContainer/difficulty-levels.js`.
- Las variantes comparten metadatos de dificultad (`id`, `label`), pero cada una define probabilidades y parámetros propios. Consulta [dificultad](../dificultad/SKILL.md).
- Al tocar un compartido, comprueba las tres variantes. No extrapoles daños, temporizadores ni puntuación de una versión a otra.
- Conserva pausa de movimiento/temporizadores, entradas bloqueadas durante overlays y puntuación según el resultado legítimo de la partida.
- Reglas fijadas por el usuario (cubiertas por `tests/keyboard-regressions.cjs`):
  - Puntuación según la longitud **al terminar** (`baseScore` del nivel + 6 por segmento sobre 17), no la máxima alcanzada.
  - Manzanas azules (`powerups.js`): entre 1 y 2 por partida, solo en los niveles con `blueApples` (difícil y muy difícil de Snake 2 y Snake 3). **Snake 1 no tiene manzanas azules en ningún nivel.**
  - Comer una da 8 s de inmunidad a los bichos; la siguiente aparece 23 s después de acabar la inmunidad. La pausa congela ambos relojes. La inmunidad no protege de chocar contigo mismo.

## All in

- Ruta: `juegos/All-inContainer/allin1/`; archivos `allin.js`, `allin.css` e `index.html`.
- El ID registrado es `allin`; no lo sustituyas por el nombre de la carpeta.
- Para ganancias y pérdidas globales usa `NSG.applyScoreDelta`, según [guardado](../guardado/SKILL.md). No apliques una segunda suma con `addPendingScore` para el mismo resultado.
- Comprueba las cantidades en la implementación y el registro antes de cambiarlas; las cifras de ideas de producto no sustituyen las reglas vigentes.

## Laberinto

- Lee primero el [README de laberinto1](../../juegos/Laberintos/laberinto1/README.md), fuente de las reglas y la calibración comunes, y el de [laberinto2](../../juegos/Laberintos/laberinto2/README.md).
- Juegos: ID `laberinto1` («Laberinto suicida 1») e ID `laberinto2` («Laberinto suicida 3»; el título no sigue al ID), categoría `mazes`.
- Código compartido en `juegos/Laberintos/`: `maze-levels.js` (id, label y puntos de los 7 niveles), `maze-core.js` (reglas y generación), `maze-game.js` (UI y rondas), `maze.css`. Cada juego aporta solo `index.html` y `maze-config.js` (`gameId` y niveles con pesos y límites).
- Partida por rondas como la calculadora: 3 laberintos de 2:30 (mismo tiempo en todos los laberintos). Se juegan siempre las 3; ganar suma los `points` del nivel y perder da 0. Provisional tras cada ronda y `settleProvisionalScore` una sola vez al final.
- Puntos: very-easy 30, easy 50, easy-medium 90, medium 140, medium-hard 230, hard 300, very-hard 500 (hard y very-hard aún sin generador).
- Salidas aparentes (`exitApproaches`, decisión del usuario): very-easy y easy 2 (esquina), easy-medium y medium 3 (borde inferior), medium-hard 4 (interior). Solo una es real; cada falsa tiene su propio pasillo de al menos `minDecoyLength` celdas.
- La pista (`hint: true`, solo medium-hard) marca con un círculo cian la casilla central de la ruta más corta.
- Localizados en los cinco idiomas desde 2026-10-24: textos en `Textos/<IDIOMA>/Games/laberinto/laberinto.md` (claves `laberinto.*`, `laberinto1.*`, `laberinto2.*`, cards `games.laberinto1|2.*`, niveles `laberinto.level.<id>`). `maze-game.js` solo pide claves; las etiquetas `label` de `maze-levels.js` solo alimentan el indicador de debug. Los títulos están traducidos («Suicide Maze», «Labyrinthe suicide», «Лабиринт-самоубийца», «自杀迷宫»): pendiente de que el usuario confirme si prefiere conservar el nombre en español.
- La dificultad se sortea en cada ronda; rechazar un candidato del generador no vuelve a sortear el nivel. Conserva el formato de laberinto compartido entre generador y renderer descrito en el README.
- Validación específica: `node --test tests/maze.cjs`.

## Réplica de bloques (borrador)

- ID `tetrareplica`, ruta `juegos/Tetris/tetrareplica/`. Lógica pura y probada en `tetrareplica-core.js` (`window.NSG_TETRA_CORE`, también `require`able); `tetrareplica.js` solo pinta y traduce entradas. Pruebas: `node --test tests/tetrareplica.cjs`.
- Tablero 10×12, sin borrado de líneas. Figuras: catálogo fijo de 20 en `CATALOGUE_HEIGHTS` (alturas por columna, escalonadas, 28-36 casillas); una al azar por partida, distinta de la anterior. Si se cambia `buildCatalogue`, la prueba exige que coincida con el catálogo incrustado.
- Una pieza cada 3,5 s, caída 800 ms/fila (`CONFIG` en el core; valores de borrador, el nivel se ajustará). La pieza controlada y la que borra K es siempre la más antigua. Una pieza detenida solo por otra en caída espera; solo se fija al apoyarse en suelo o piezas fijas.
- Victoria: casillas fijadas == figura (en posición absoluta, sin importar con qué piezas). Derrota: casilla fuera de la figura o `solve()` demuestra que ya no se puede completar (búsqueda con alcanzabilidad real y tope de 3000 nodos; si lo supera no se castiga). También si la pila llega a la salida.
- **Pantalla de juego grande** (decisión del usuario: el tablero importa más que el texto): `body.tetra-page` usa una sola columna ancha; la cabecera se reduce a título y puntuación (sin eyebrow ni descripción), el panel pierde su fila de marca y el reloj, la barra y las casillas van en una sola línea. Los dos tableros (10 columnas, misma casilla en ambos) miden `--board-h` = alto visible − 250 px (mín. 300, máx. 820); los canvas están a 44 px por casilla para que no se vean borrosos. Los botones táctiles solo salen sin ratón (`pointer: coarse`) y la pista de teclado se oculta en alturas bajas. Comprobado con capturas en 1920×1080, 1366×768 y 500 px de ancho. Card: dificultad 9.
- **Vista previa** (decisión del usuario): al empezar, la figura de la izquierda se ve sola **20 s** (`CONFIG.previewMs`) antes de que caiga ninguna pieza; el tablero de la derecha está vacío, no corre el reloj ni los puntos y las teclas no hacen nada. Un banner arriba del panel (`#preview`) explica el motivo y, en los últimos 5 s, cuenta de 5 a 0; el 0 se queda ~0,7 s al empezar la caída y el banner desaparece. La pausa/salida (`mode === 'preview'`) congela la cuenta atrás. Está en las instrucciones de la card (`tetrareplica.rulePreview`, con `{{seconds}}`).
- Puntos: `floor(elapsed·70/32000)` (tiempo de juego, la pausa no cuenta) + 150 al ganar. **Perder no da ningún punto** (decisión del usuario): solo se llama a `addPendingScore` al ganar. Giro: solo ↑ y W (no hay tecla F).
- Sin dificultad variable (no carga `difficulty-debug.js`). Textos con claves `tetrareplica.*` en `Textos/<IDIOMA>/Games/tetrareplica/tetrareplica.md`, traducidos a los cinco idiomas (fr/ru/zh-Hans traducidos el 2026-10-24).

## Francotirador

- ID `francotirador`, ruta `juegos/Francotirador/francotirador/` (variantes 2 y 3 más abajo). Lógica pura y probada en `francotirador-core.js` (`window.NSG_SNIPER_CORE`, también `require`able); `francotirador.js` solo dibuja, traduce entradas y lleva el flujo. Pruebas: `node --test tests/francotirador.cjs`.
- Partida (decisión del usuario): **5 rondas de 5 disparos**. Cada ronda sortea su nivel con la misma probabilidad (Fácil, Medio, Difícil, sin pesos), una distancia (redondeada a 10 m), un lugar para el Coriolis y un paisaje. Los 5 disparos de una ronda comparten diana, distancia, lugar y paisaje. Card: dificultad 8.75 (decisión del usuario; antes 10).
- Diana: círculo central y **3 anillos** (radios 0,3 / 0,8 / 1,4 / 2 m; 100 / 50 / 25 / 10 puntos; fuera, 0). Máximo 2500 con 25 disparos. **1500 puntos o más entre las 5 rondas dan 25.000**; por debajo, nada (se llama una sola vez a `addPendingScore(25000)` al terminar; no hay provisional ni pago parcial). En secuencia «ganar» = llegar a 1500.
- Constantes a afinar tras jugar: todo está en `CONFIG` del core (`passScore`, `zones`, `shotSeconds`, y por nivel `windMax`, `gust`, `tremor`, distancias). `gust` escala la volatilidad del viento mientras vuela la bala: con la del diseño original (1) el Difícil era imposible incluso leyendo el viento a la perfección. **Decisión del usuario: el viento y las condiciones varían poco durante la ronda** (Fácil 0,4, Medio 0,5, Difícil 0,6). También pidió **mucho menos temblor y más fluido**: amplitud 0,15-0,40 mil, frecuencias lentas (≤ 2,1 Hz), latido sin saltos; la respiración sigue importando (sin ella baja ~10 puntos de pase).
- Calibración con jugadores simulados (`tests/francotirador.cjs`, última prueba de la sección de calibración): experto ≈ 74 % de partidas ganadas, bueno ≈ 71 %, medio ≈ 38 %, descuidado 0 %. Quitar respiración, barra de concentración o Coriolis baja el resultado. **Son modelos, no jugadores: ajustar con partidas reales.**
- Controles (escritorio primero, táctil pendiente): ratón o flechas/WASD apuntan (teclado: 0,25 mil/s que sube a 2,45 mil/s en 0,7 s); espacio o clic izquierdo disparan; Mayús, C o clic derecho contienen la respiración. Sin Alt (choca con el navegador). Sin sonido ni ayuda de deriva (el usuario no los pidió). La entrada pasa por `ACTIONS` (`fire`, `breath`, `aimTo`) para añadir táctil sin tocar las reglas.
- Lenguaje (decisión del usuario): explicar como a un niño, sin radianes ni senos; las unidades de la mira se llaman **marcas** (1 marca = 1 mil, interno). Lo esencial son **cuatro cosas a la vez: apuntar, aguantar la respiración, disparar cuando la marca de la barra de concentración cruza el centro y corregir el viento** (decisión del usuario: las instrucciones no pueden decir que bastan tres pasos; el viento es crucial). Aparecen siempre bajo el visor (`.sniper-steps`, 4 columnas) y la guía empieza por ahí. El paso del viento debe dejar claro, sin saber medirlo, que hay que apuntar al lado contrario de hacia donde sopla y que a veces se apunta fuera de la diana («si sopla hacia la derecha, apunta a la izquierda»). Deriva y Coriolis son el detalle fino.
- Guía de tiro: al entrar a la página se abre una **card grande con X** (`#tutorial`) con esos pasos y la lectura del viento; Escape o la X la cierran (Escape se intercepta antes que `quit-confirm`) y queda la antesala normal (reglas + «Empezar partida» + «Ver guía de tiro», que la reabre). No reaparece al «Jugar de nuevo».
- Paisaje: capa CSS `.sniper-scene` con masas low poly desenfocadas (desierto, bosque o playa) generadas por ronda en `buildScene()`; el centro queda despejado para la diana.
- Pausa: reloj, viento, bala y respiración se congelan; en la pantalla entre rondas también hay aviso de salida. Abandonar no concede nada.
- Dificultad variable: carga `debug/difficulty-debug.js` y `setCurrent(round.tier)` con el nivel real de la ronda.
- Datos (brújula y todas las variables) en una **franja encima del visor** (decisión del usuario: no girar la cabeza), con el resultado del último disparo a su derecha; no se superponen a la mira. Pendiente: táctil. Textos en `Textos/<IDIOMA>/Games/francotirador/francotirador.md`, ya en los cinco idiomas. Dificultad final en el registro: `'7-10'` (de 10), decisión del usuario.

### Francotirador 2 y 3 (variantes)

- IDs `francotirador2` y `francotirador3`, páginas en `juegos/Francotirador/francotirador2/` y `francotirador3/` con solo `index.html`: cargan `../francotirador/francotirador.{css,js}` y `francotirador-core.js` y declaran su versión en `<body data-sniper="…">`. `core.configFor(id)` aplica `VARIANTS` sobre `CONFIG`; la mecánica, los puntos por zona (100/50/25/10) y los niveles no cambian.
- **Francotirador 2** (decisión del usuario): una diana que va de izquierda a derecha y vuelve, **2 disparos por ronda**, **25 s** por disparo (+5), recompensa **50.000** (doble). Máximo 1000; para ganar **600**. Card: dificultad 9.25.
- **Francotirador 3**: dos dianas que van de izquierda a derecha en sentidos contrarios y se cruzan, **4 disparos por ronda**, **33 s** por disparo (+8 sobre la 2), recompensa **100.000** (doble que la 2). Máximo 2000; para ganar **1200**. Card: dificultad 10.
- Objetivo = 60 % del máximo de la partida, igual que los 1500 de 2500 de la 1 (decisión del usuario: mantener la proporción; 2 disparos por ronda compensan la dificultad de las dianas móviles). `shotsPerRound` y `passScore` van en `VARIANTS`.
- Movimiento (`CONFIG.targets`): senoide `amplitude` 5 marcas, `period` 16 s (≈ 2 marcas/s, por debajo del teclado rápido de 2,45); la 3 desfasa media vuelta la segunda diana. Fase aleatoria por ronda; el reloj de las dianas corre también entre disparos y se congela con la pausa. Francotirador 1 no gasta números aleatorios extra.
- **Decisión de diseño mía (confirmar con el usuario):** el disparo acierta donde estaba la diana **al apretar el gatillo**, sin adelantarse a pesar del vuelo de la bala. El agujero queda ligado a su diana y se mueve con ella; con dos dianas puntúa la más cercana. Velocidad, amplitud y juzgar al disparar o al impactar son parámetros a afinar tras jugar.
- Textos: mismas claves `francotirador.*`; `rule1`, `rule2`, `rule5html`, `tutorialPulse1` y `tutorialScore1html` llevan `{{shots}}`, `{{totalShots}}`, `{{max}}`, `{{goal}}`, `{{seconds}}` y `{{points}}`, que `francotirador.js` rellena en los elementos marcados con `data-vars`. Propios de cada versión: `games.francotirador2|3.*`, `francotirador2|3.{title,description,rule,tutorialMoving}`. Pruebas: final de `tests/francotirador.cjs`.

## Flujo de modificación

1. Identifica la versión afectada, su registro y sus dependencias directas.
2. Lee las skills de los contratos que cambia la tarea, sin cargar todas las implementaciones de la familia por defecto.
3. Conserva el comportamiento de variantes anteriores salvo petición explícita; valida consumidores si tocas un compartido.
4. Actualiza los textos con claves, entrega el inglés por familia y señala las traducciones pendientes según [localizacion](../localizacion/SKILL.md).
