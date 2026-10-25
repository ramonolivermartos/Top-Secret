---
name: guardado
description: Integrar puntuación, marcador provisional, pérdidas de azar y guardado mediante window.NSG.
---

# Guardado y puntuación

Consulta también [pausa (10)](../pausa/SKILL.md) y [secretos (11)](../secretos/SKILL.md)
al cambiar fin de partida o puntuación por rondas. La migración futura está en
[electron](../electron/SKILL.md).

## 3. API de guardado (`window.NSG`, de `scripts/storage.js`)

Cada página de juego debe cargar los scripts compartidos **antes** de su propio
script, con rutas relativas desde `juegos/<categoria>/<id>/`:

```html
<script src="../../../scripts/storage.js" defer></script>
<script src="<id-del-juego>.js" defer></script>
```

Esto expone `window.NSG` con estos métodos (son los únicos que un juego debe
usar; no accedas a `localStorage`/`sessionStorage` directamente):

| Método | Cuándo usarlo |
|---|---|
| `window.NSG.markGamePlayed(id)` | Nada más pulsar "Empezar" (al arrancar la partida de verdad, no al cargar la página). Marca el juego como "ya jugado" para el algoritmo de destacados del menú. |
| `window.NSG.addPendingScore(amount)` | Solo cuando el jugador **gana** (o completa una partida con puntuación legítima). Suma puntos a un total "pendiente de guardar" en `sessionStorage`; no toca el guardado persistente todavía. |
| `window.NSG.applyScoreDelta(delta)` | Solo para juegos de azar que puedan **perder** puntos globales. Aplica una ganancia o pérdida: las pérdidas se descuentan primero de lo pendiente y después del guardado, y el total nunca baja de cero. |
| `window.NSG.setProvisionalScore(amount)` | Para juegos con marcador local por rondas: publica el total provisional de esa partida para el cálculo global de secretos, sin guardarlo todavía. |
| `window.NSG.settleProvisionalScore(amount)` | Al cerrar esa partida, transfiere su puntuación a pendiente y elimina el provisional de forma atómica, sin contarla dos veces. |
| `window.NSG.getSequence()` / `awardSequencePoints(n)` | Solo para la Secuencia millonaria ([secuencia](../secuencia/SKILL.md)): mientras hay una secuencia, `addPendingScore`, `applyScoreDelta` y el provisional no suman. Los juegos no las llaman. |
| `window.NSG.getSecretsTotal()` | Total guardado + pendiente + provisional, reservado para la comprobación global de secretos. |
| `window.NSG.getSecretsHistory()` / `addSecretsHistory(ids)` | Solo para el módulo de secretos ([secretos 11.4](../secretos/SKILL.md)): historial permanente de secretos obtenidos, guardado al instante y sin relación con «Guardar progreso». Los juegos no lo usan. |
| `window.NSG.getDisplayTotal()` | Si necesitas mostrar el total acumulado dentro del propio juego (normalmente no hace falta; el menú ya lo muestra). |
| `window.NSG.hasUnsavedProgress()` | Igual que arriba, solo si quieres replicar el indicador de "sin guardar". |
| `window.NSG.TARGET_SCORE` | Constante `1000000`, el objetivo global. Normalmente no se usa fuera del menú. |

Reglas importantes:

- **Un juego nunca llama a `commitSave()`**. Ese botón vive solo en el menú
  ("Guardar progreso"). Los juegos solo añaden a la puntuación pendiente con
  `addPendingScore`; es el jugador quien decide guardar desde el menú.
  La única excepción son los juegos de azar con penalización, que usan
  `applyScoreDelta` para aplicar también la pérdida.
- `addPendingScore`, `applyScoreDelta`, `markGamePlayed` y los cambios del
  marcador provisional publican automáticamente el estado global para el
  módulo de secretos. No añadas llamadas a `NSG_SECRETS.check()` en el juego.
- En juegos con puntos acumulados por rondas, publica `setProvisionalScore`
  después de cada ronda y usa `settleProvisionalScore` al terminar la partida.
  Expón `NSG_GAME_CONTROL` usando las funciones de pausa/reanudación del juego;
  la lógica y los umbrales siguen siendo exclusivamente globales.
- Si tu juego no tiene concepto de "ganar" claro (p. ej. es solo un marcador
  que sube siempre), decide junto al usuario si cada partida suma puntos o
  solo las que terminan en victoria (en Snake, por ejemplo, solo se puntúa
  si ganas).
- Comprueba que `window.NSG` existe antes de usarlo (`if (window.NSG) ...`)
  por si algún día el script se carga en un contexto sin storage.js.
