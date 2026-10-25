---
name: pausa
description: Integrar navegación por teclado, foco, confirmación de salida y pausa completa de los juegos.
---

# Teclado, foco y pausa

Patrón del overlay: [interfaz (4)](../interfaz/SKILL.md). Puntuación al salir:
[guardado (3)](../guardado/SKILL.md). Pausa narrativa y prioridad de Escape:
[secretos (11.3)](../secretos/SKILL.md). Validación: `tests/keyboard-regressions.cjs`.

## 10. Navegación 100% por teclado (directiva general obligatoria)

- El aviso de salida debe atrapar Tab/Shift+Tab y las flechas dentro de
  sus botones, bloquear el fondo con `inert` y restaurar el foco al cancelar.
- La pausa incluye todos los temporizadores, también mensajes y la espera
  posterior a la última ronda. No se conceden puntos mientras está abierta.
- Abandonar descarta solo los puntos de la partida en curso; los puntos de
  partidas ya terminadas se conservan. Los enlaces de vuelta durante una
  partida deben mostrar la misma confirmación que Escape.
- En campos de búsqueda, izquierda/derecha siguen moviendo el cursor de texto.

**Todo el proyecto debe poder jugarse sin tocar el ratón.** Esto no es
opcional por juego: es una directriz general que aplica al menú y a
cualquier minijuego nuevo.

- **Overlays con botones** (inicio, fin de partida, confirmaciones): el
  botón que "anima a seguir" (empezar, jugar de nuevo, seguir jugando)
  siempre debe quedar preseleccionado (`focus()`), y las flechas ←/→ deben
  permitir cambiar al otro botón. Patrón ya implementado, copiarlo tal cual
  (ver punto 4, "Accesibilidad por teclado del overlay").
- **Menú principal**: al cargar, se enfoca automáticamente la primera card
  destacada. Las flechas ↑↓←→ navegan espacialmente entre los elementos
  interactivos (botones de idioma, buscador, botón de guardar, cards y
  filas de la lista) usando la posición real en pantalla, no solo el orden
  del DOM (ver `focusNearest` en `scripts/menu.js`). Si añades elementos
  interactivos nuevos al menú, inclúyelos en `getNavTargets()`.
- **Salir de una partida con Escape — `scripts/quit-confirm.js`**: todo
  juego con un estado de "partida en curso" debe cargar este script
  (después de `i18n.js`, antes de `<id>.js`) y llamar, al final de su
  propio script, a:

  ```js
  if (window.NSG_QUIT_CONFIRM) {
    window.NSG_QUIT_CONFIRM.init({
      isActive: () => /* true si hay algo que perder ahora mismo */,
      getScore: () => /* puntuación actual en riesgo, para mostrarla */,
      onPause: pauseGame,   // debes implementarla: para el intervalo del juego
      onResume: resumeGame, // debes implementarla: lo reanuda donde estaba
      menuHref: '../../../index.html',
    });
  }
  ```

  Comportamiento esperado (ya implementado en calculadora y snake, cópialo
  igual en juegos nuevos):
  - Si `isActive()` es `false` (estás en el overlay inicial o en el de fin
    de partida), Escape navega directo al menú: no hay nada que perder.
  - Si `isActive()` es `true`, Escape **paraliza el juego** (`onPause`) y
    muestra un aviso a pantalla completa con la puntuación actual y dos
    botones: "Seguir jugando" (preseleccionado, primario) y "Volver al
    menú" (secundario). Las flechas ←/→ cambian entre ellos; Escape otra
    vez cancela el aviso (equivale a "Seguir jugando").
  - Si el jugador confirma "Volver al menú", se navega sin más: **la
    puntuación de esa partida se pierde** porque nunca se llegó a llamar a
    `addPendingScore` (eso solo ocurre en el `endGame()` normal del
    juego). Esto es intencionado y es la misma filosofía que el guardado
    manual del menú: lo que no se "confirma" (ganar la partida / guardar
    progreso) se puede perder si sales antes de tiempo.
  - Si el jugador cancela, `onResume()` debe reanudar el juego **en el
    mismo punto exacto** en el que estaba, desplazando los relojes
    internos (p. ej. `roundEnd += pausedMs`) el tiempo exacto que ha
    durado el aviso, para que no se "coma" segundos de la cuenta atrás.
  - Mientras el juego está en pausa, sus propios listeners de teclado
    (mover la serpiente, pulsar teclas de la calculadora...) deben
    ignorarse con una variable `paused` propia del juego, para que no se
    cuelen acciones de fondo mientras el aviso está abierto.

En juegos por rondas, el provisional debe descartarse al abandonar y liquidarse
solo al cerrar legítimamente la partida mediante `settleProvisionalScore`.
Los resultados de azar aplicados con `applyScoreDelta` siguen el contrato de
guardado; no reviertas puntuaciones de partidas ya terminadas.
