---
name: dificultad
description: Modificar niveles variables, probabilidades y el indicador de dificultad de los minijuegos.
---

# Dificultad y debug

## 1.2 Carpeta `debug`

El contrato original describía `debug/` como scripts temporales de pruebas y
depuración, ajenos a la lógica de los juegos y a los scripts compartidos.
**Excepción vigente:** `debug/difficulty-debug.js` se carga en **todos** los juegos y su
indicador es obligatorio (nivel real en los de dificultad variable, «Fija» en los demás); no lo
retires como limpieza. Para quitar todos los mensajes de debug de golpe, `const ENABLED = false;` en
ese archivo (ver la directiva).

## Procedimiento

1. Lee [Directives/Difficulty_Debug.md](../../Directives/Difficulty_Debug.md), fuente de la estructura y las reglas del indicador.
2. Distingue la dificultad de la card del menú del nivel real elegido por ronda o partida. Los juegos de dificultad fija solo cargan el módulo y muestran «Fija» automáticamente.
3. Cada nivel tiene `id` estable, `label` legible y sus parámetros propios. Los tres Snake comparten metadatos en `juegos/SnakeContainer/difficulty-levels.js`.
4. Carga `debug/difficulty-debug.js` antes del script del juego (en todos los juegos) y usa el estilo de `styles/common.css`.
5. Crea `window.NSG_DIFFICULTY_DEBUG.create(panel, tiers)` y llama a `setCurrent(tier)` con el mismo nivel que gobierna las mecánicas, no con un segundo sorteo.
6. Comprueba que el nivel aparece en rojo en la parte superior, cambia al seleccionar el nivel real y es independiente de los mensajes temporales. El módulo no crea indicador para listas con menos de dos niveles.

Francotirador sortea el nivel (`easy`, `medium`, `hard`, misma probabilidad) en cada una de sus 5 rondas; los niveles viven en `CONFIG.tiers` de `juegos/Francotirador/francotirador/francotirador-core.js`, con sus parámetros de calibración (ver [familias](../familias/SKILL.md)).

Para los laberintos, los metadatos comunes (`id`, `label`, `points`) están en
`juegos/Laberintos/maze-levels.js` y cada juego define pesos y límites en su `maze-config.js`;
consulta también el [README de laberinto1](../../juegos/Laberintos/laberinto1/README.md);
para localizar variantes, [familias](../familias/SKILL.md).
