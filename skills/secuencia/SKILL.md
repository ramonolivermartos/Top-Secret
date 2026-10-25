---
name: secuencia
description: Secuencia millonaria y juego aleatorio del menú; estado de la secuencia, puntos, música y cómo integrar un minijuego.
---

# Secuencia millonaria y juego aleatorio

Archivos: `scripts/sequence.js` (`window.NSG_SEQUENCE`), `scripts/menu-modes.js`
(cards y ventanas del menú), `styles/sequence.css`, `styles/menu-modes.css`, y el
estado de sesión en `scripts/storage.js`. Pruebas: `node --test tests/sequence.cjs`.

## Reglas (decididas por el usuario)

- **Juego aleatorio** (card a la izquierda de la de progreso): sortea un minijuego, lo muestra en una ventana y «Empezar» navega a él. Después todo es normal: puntos propios del juego, sin bonus.
- **Secuencia millonaria** (card a la derecha): 5 minijuegos distintos al azar, cada uno con la dificultad que sortee el propio juego. Un juego por rondas cuenta como uno y hay que **ganar todas sus rondas** (calculadoras: 6; laberintos: 3).
- «Ganar» por juego: Snake ≥ 17 segmentos, Réplica la figura completa, All in encontrar la moneda, Francotirador llegar a 1500 puntos entre sus 5 rondas.
- Premio: 5 × 5.000 + 10.000 al completarla = **35.000**, cobrado solo al final con `NSG.awardSequencePoints`. Perder un minijuego o abandonar = **0** (también lo ya superado).
- Dentro de la secuencia los puntos propios de los juegos **no cuentan**: `addPendingScore`, `applyScoreDelta`, `setProvisionalScore` y `settleProvisionalScore` no suman mientras exista el estado. All in no apuesta puntos propios.
- **All in** (`plan`): solo entra si el jugador tiene ≥ 5.000 puntos al empezar (`canBet`) **y** con un 5 % de probabilidad por secuencia; si entra, es **siempre el 5.º**. Los otros cuatro se sortean uniformes y sin repetir. En la banda de su página sale «Nada como depender de la suerte…» (`sequence.allInWarning`); no aparece en las reglas del menú (decisión del usuario).
- **Perder en All in:** además de 0 puntos de secuencia, se restan 20.000 (4 × 5.000) del total real (pendiente y guardado, sin bajar de 0) con `NSG.applySequencePenalty`. Perder en otros juegos solo da 0. **Ganar All in** (último juego) paga **60.000 en total** en vez de 35.000 (`ALL_IN_REWARD`); el aviso lo anuncia junto a la penalización.
- En el juego aleatorio suelto (`pickOne`), All in solo puede salir con ≥ 5.000 puntos.
- Solo se sortean juegos no bloqueados con `href` (incluye laberintos y Réplica).

## Estado (`sessionStorage`, clave `nsg_sequence_v1`)

`{ games: [{id, href}], index, phase: 'pending' | 'playing', music }`. API en `window.NSG`: `getSequence`, `saveSequence`, `updateSequence`, `clearSequence`, `awardSequencePoints`.

- `markGamePlayed(id)` pasa a `playing` si `id` es el esperado; si no, cancela la secuencia.
- Al cargar una página de juego con `phase === 'playing'` (recarga) se cancela: no se puede reintentar.
- El menú cancela cualquier secuencia pendiente al cargar (`discardAbandoned`) y avisa «abandonaste…».
- `quit-confirm.js` cambia su aviso mientras hay secuencia. Los laberintos (sin quit-confirm) lo hacen en su pausa.

## Música

`audio.js` guarda en `music` `{type, track, time}`: la pista de la secuencia se elige en el primer juego y los siguientes la reanudan donde iba (`pagehide` guarda el tiempo). Hay un pequeño corte al cambiar de página: es una navegación completa.

## Integrar un minijuego nuevo

1. En su `index.html`: `styles/sequence.css` tras `common.css` y `scripts/sequence.js` tras `storage.js`.
2. Al terminar, con la pantalla final ya construida: `if (window.NSG_SEQUENCE) window.NSG_SEQUENCE.finish({ won, overlay })`, con `won` según las reglas de arriba. Si hay secuencia, sustituye los botones de `.overlay-actions` por «Siguiente minijuego» / «Volver al menú» y añade el resultado.
3. Llamar a `markGamePlayed(id)` solo al empezar de verdad (ya es contrato).

## Pendiente

- Textos `sequence.*`, `menu.sequence.*` y `menu.random.*`: en `Textos/<IDIOMA>/Common/sequence.md` y `menu.md`, ya en los cinco idiomas (ver [localizacion](../localizacion/SKILL.md)). `sequence.js` ya no lleva textos de respaldo: todas las páginas de juego cargan `localization-data.js` e `i18n.js` antes que él.
- Verificado a mano en Chrome: menú, ventanas, banda y pantalla final de Snake/Calculadora en secuencia. Sin verificar: recorrido completo de 5 juegos, continuidad real de la música y móvil táctil.
