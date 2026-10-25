# Nivel de dificultad visible para debug

**Todo minijuego** muestra en rojo, en la parte superior de su panel, la dificultad
a la que se está jugando (no la valoración de la tarjeta del menú):

- Con varios niveles posibles por ronda o partida, el nivel actual, que se actualiza
  cada vez que se selecciona uno nuevo.
- De dificultad fija (Calculadora, All in, Réplica…), el texto «Fija»; lo pone el propio
  módulo sin tocar el script del juego.

## Apagarlo todo (interruptor global)

En `debug/difficulty-debug.js`, poner `const ENABLED = false;` (la primera constante del
archivo). Desaparecen todos los mensajes de debug de dificultad de todos los juegos, los de
nivel variable y los fijos; no hay que tocar ningún juego ni ninguna página. Para recuperarlos,
`true`. `tests/difficulty.cjs` comprueba que el interruptor lo apaga todo.

## Directiva al crear un minijuego

Cargar siempre `debug/difficulty-debug.js` en su `index.html`, antes del script del juego
(`tests/difficulty.cjs` falla si una página publicada no lo carga). Si el juego tiene niveles
variables, además crear el indicador con `create(panel, tiers)` y llamar a `setCurrent(tier)`
(ver abajo); si no, no hay nada más que hacer.

## Estructura común

Cada nivel debe ser un objeto con:

- `id`: identificador estable y único dentro del minijuego.
- `label`: nombre legible del nivel.
- Los demás campos son propios del juego (probabilidad, enemigos, puntos, etc.).

Ejemplo: `{ id: 'medium', label: 'Medio', weight: 40, baseScore: 130 }`.

## Integración obligatoria para juegos con niveles variables

1. Cargar `debug/difficulty-debug.js` antes del script del juego y usar
   `styles/common.css` para el estilo compartido.
2. Crear una instancia con
   `const difficultyDebug = window.NSG_DIFFICULTY_DEBUG.create(panel, tiers)`.
3. Al seleccionar la dificultad, llamar a `difficultyDebug.setCurrent(tier)`
   con el objeto seleccionado de esa misma lista. Debe ser el nivel que realmente
   gobierna las mecánicas, no un segundo sorteo para el indicador.

El módulo no crea indicador de niveles para listas con menos de dos niveles (el juego queda con el indicador «Fija»). El indicador
es independiente de los mensajes temporales del juego y no altera la partida.
Los tres Snake son la implementación de referencia; comparten los metadatos
`id` y `label` en `juegos/SnakeContainer/difficulty-levels.js` y cada variante
define sus propias probabilidades y parámetros.
