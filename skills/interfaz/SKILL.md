---
name: interfaz
description: Diseñar y modificar UI compartida, overlays, CSS responsive y controles multidispositivo.
---

# Interfaz y responsive

Para teclado y confirmación de salida, consulta [pausa (10)](../pausa/SKILL.md);
para cards narrativas, [secretos (11.2–11.3)](../secretos/SKILL.md).
Los límites sobre archivos compartidos se interpretan según [AGENTS.md](../../AGENTS.md).

## 4. Convenciones de UI compartidas (de `styles/common.css`)

Reutiliza estas clases en vez de crear versiones propias:

- **Layout de página de juego**: `<body class="game-page">`, `<main class="layout">`
  con una sección `.intro` (texto + `.score-card`) y un `.panel` (la caja
  blanca del juego en sí).
- **Volver al menú**: enlace `<a class="text-link back-link" href="../../../index.html">`
  en la sección `.intro`.
- **Overlay de explicación / fin de partida**: un único `<div class="game-overlay" id="intro-overlay">`
  dentro del `.panel`, que se reutiliza para dos momentos:
  1. Al cargar la página: reglas del juego + botón `.btn.btn-primary#start-btn` ("Empezar...").
  2. Al terminar la partida: se regenera su `innerHTML` con un resumen y
     `<div class="overlay-actions">` con dos botones:
     `<button class="btn btn-primary" id="replay-btn">Jugar de nuevo</button>`
     y `<button class="btn btn-secondary" id="menu-btn">Volver al menú</button>`
     (este último navega con `window.location.href = '../../../index.html'`).
- **Mostrar/ocultar el overlay**: usa siempre `introOverlay.style.display = 'none' | 'flex'`,
  **nunca** el atributo `hidden` (hay una regla CSS `.game-overlay { display: flex }`
  con la misma especificidad que `[hidden]{display:none}` y gana la cascada,
  así que `hidden` no oculta nada realmente).
- **Clase `is-intro` en el `.panel`**: añádela/quítala en el elemento con
  `id` del panel para mostrar/ocultar el contenido de juego detrás del
  overlay. `common.css` ya oculta por ti (`visibility:hidden`) estos
  selectores cuando el panel tiene `is-intro`: `.score-card`, `.challenge`,
  `.display`, `.keys`, `.board-wrap`, `.game-message`, `.rounds-indicator`,
  `.keyboard-hint`. Si tu juego tiene un contenedor nuevo que deba ocultarse
  durante el overlay, añade su selector a esa misma lista en `common.css`.
- **Accesibilidad por teclado del overlay**: tras construir o mostrar el
  overlay, enfoca el botón principal y permite cambiar entre botones con
  flechas. Patrón usado en ambos juegos (cópialo tal cual):

  ```js
  function focusOverlayPrimaryButton() {
    const btn = introOverlay.querySelector('.btn-primary') || introOverlay.querySelector('.btn');
    if (btn) btn.focus();
  }

  introOverlay.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const buttons = Array.from(introOverlay.querySelectorAll('.btn'));
    if (buttons.length < 2) return;
    event.preventDefault();
    const currentIndex = buttons.indexOf(document.activeElement);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  });
  ```

  Llama a `focusOverlayPrimaryButton()` tanto al cargar el script (overlay
  inicial) como justo después de regenerar el overlay de fin de partida.
- **Cronómetro/barra de progreso**: estructura `.challenge > .challenge-label + strong#target + .timer-track > #timer-bar + #countdown`,
  con clases `warning`/`danger` en `#timer-bar` según umbrales de tiempo
  restante. Reutilízala si tu juego tiene cuenta atrás; si no aplica, puedes
  prescindir de `.challenge` por completo.
- **Mensajes de estado**: `<p class="game-message" id="message">`, con
  `message.className = 'game-message success' | 'game-message failure' | ''`.
- **Botones genéricos**: `.btn`, `.btn-primary`, `.btn-secondary` (no crear
  estilos de botón nuevos salvo necesidad visual concreta).

### 4.1 Arquitectura responsive y multidispositivo (directiva general)

El menú y los minijuegos deben priorizar **legibilidad, eficiencia y
jugabilidad** en escritorio, tablet y móvil, preparando el futuro empaquetado
con Electron y herramientas móviles. Empaquetar no resuelve el responsive.

**Separación de responsabilidades:**

- **Lógica:** reglas, estado, turnos y puntuación independientes del DOM,
  de las dimensiones de pantalla y de las APIs de plataforma.
- **Presentación:** representa ese estado y adapta la distribución al espacio.
  Redimensionar la ventana o cambiar de orientación no reinicia la partida
  ni altera sus reglas, puntuación o progreso.
- **Entrada:** ratón, teclado y táctil se traducen a las mismas acciones
  semánticas (por ejemplo, «seleccionar carta 3»). Esta separación debe
  permitir incorporar mando después sin reescribir las reglas.
- **Plataforma:** guardado, audio, pantalla completa y futuras integraciones
  nativas se encapsulan en adaptadores. Reutiliza las APIs compartidas
  existentes; no disperses dependencias de Electron o móvil en los juegos.

Esta separación puede hacerse con funciones o módulos sencillos: no exige
un framework nuevo ni una estructura de archivos compleja.

**Prioridad de plataformas:** el primer objetivo de cada juego es que sea
plenamente jugable en ordenador (teclado y ratón). La adaptación táctil y
móvil se aborda después, pero el código debe dejarle el camino liso: lógica
sin dependencia de dimensiones, entradas traducidas a acciones semánticas y
distribución que no asuma un único tamaño. No se bloquea la entrega de un
juego por no tener aún la versión móvil acabada; se indica como pendiente.

**Distribución y escalado:**

- Usa HTML/CSS responsive (Grid, Flexbox, tamaños fluidos con límites) para
  menús, botones, cards, indicadores y overlays. No escales toda la interfaz
  desde una resolución fija como 1280 × 720.
- Conserva proporciones o coordenadas lógicas fijas solo en las zonas de
  juego que lo necesiten (por ejemplo, un tablero). El escalado y las franjas
  laterales/superiores son opciones para esas zonas, no la solución general.
  El tamaño visual no debe cambiar la dificultad ni las reglas del tablero.
- Diseña distribuciones amplia, compacta y vertical cuando el contenido lo
  requiera, compartiendo estado y lógica. Primero reduce decoración y
  espacios sobrantes; después reorganiza o pliega contenido secundario.
  No resuelvas la falta de espacio haciendo ilegibles cartas o controles.
- Elige los puntos de cambio por el espacio que necesita el contenido,
  considerando **ancho y altura** del viewport o contenedor en píxeles CSS.
  No uses pulgadas, marcas o detección de dispositivos como criterio.
- Centraliza tamaños y espaciados mediante variables CSS y reutiliza las
  convenciones compartidas. Respeta las restricciones de edición de
  `common.css`: los ajustes específicos pertenecen al CSS del juego.
- Contempla ventanas bajas, barras del navegador móvil, unidades de viewport
  dinámicas como `dvh` cuando proceda y zonas seguras (`safe-area-inset-*`).
  Evita alturas mínimas rígidas que dejen controles fuera de la pantalla.
- Define las orientaciones admitidas por cada juego. Los menús y textos
  largos pueden tener scroll; durante la partida, la información y los
  controles esenciales deben permanecer accesibles. Los overlays deben
  permitir leer su contenido y alcanzar sus acciones en pantallas pequeñas.

**Interacción y portabilidad:**

- Proporciona objetivos táctiles cómodos (44–48 píxeles CSS como referencia),
  aunque el icono visible sea menor, con separación para evitar pulsaciones
  accidentales. Ninguna información o acción esencial depende de `hover`.
- Mantén la navegación completa por teclado del punto 10 y el foco visible
  y coherente al reorganizar la interfaz. Las acciones esenciales también
  deben estar disponibles mediante controles táctiles.
- No incorpores Phaser u otro motor solo para resolver responsive. Úsalo
  cuando las necesidades reales del juego justifiquen sus sistemas; el motor
  tampoco sustituye el diseño de la interfaz adaptable.
- La elección de un empaquetador móvil puede hacerse más adelante: conserva
  la independencia entre lógica, presentación, entrada y plataforma.

**Validación de la interfaz:** comprueba pantalla amplia, ventana compacta
y de poca altura, tablet y móvil vertical/horizontal según las orientaciones
admitidas. Revisa inicio, partida, pausa y fin, textos ES/EN, lectura de cards,
objetivos táctiles, foco, ausencia de recortes y conservación de la partida
al redimensionar. Antes de extender un patrón a todos los juegos, valídalo
en uno representativo.
