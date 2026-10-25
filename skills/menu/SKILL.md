---
name: menu
description: Modificar menú, registro de juegos, cards, ilustraciones, búsqueda y bienvenida.
---

# Menú y registro

Puntos de entrada: `index.html`, `scripts/menu.js`, `scripts/games-data.js`,
`scripts/welcome.js`. Para navegación, consulta [pausa (10)](../pausa/SKILL.md);
para estilos, [interfaz](../interfaz/SKILL.md); para textos, [localizacion](../localizacion/SKILL.md).

## 2. Registro de juegos (`scripts/games-data.js`)

El menú no tiene los juegos escritos a mano: los lee de un array global
`window.NSG_GAMES`. Para dar de alta un juego nuevo, añade **solo un objeto**
a ese array:

```js
{
  id: 'nombre-del-juego',       // slug único, coincide con la carpeta y con markGamePlayed()
  title: 'Título visible',
  description: 'Descripción corta (1-2 frases) para la card y la lista.',
  difficulty: 7,                 // número 0-10 (admite decimales, ej. 8.5), o null si aún no aplica
  href: 'juegos/<categoria>/nombre-del-juego/index.html',
  illustration: 'calc' | 'snake' | 'soon' | 'otro-id-que-definas',
  locked: false,                 // true solo para placeholders "Próximamente"
}
```

**Estado actual del registro:** el ejemplo anterior es esquemático (las opciones
de `illustration` representan alternativas, no una expresión JS para copiar).
Las entradas actuales usan objetos por idioma en `title` y `description`, y
algunas dificultades son cadenas (`'6-8.5'`, `'?'`). El laberinto añade `category`.
Conserva los formatos reales y las excepciones de ID/carpeta documentadas en
[familias](../familias/SKILL.md). Las traducciones de cards usan las claves
`games.<id>.title` y `games.<id>.description`.

- `illustration` selecciona qué bloque de marcado dibuja `scripts/menu.js`
  (función `illustrationMarkup`). Si añades un juego con una ilustración
  CSS nueva, hay que añadir un `if (game.illustration === 'tu-id')` ahí y su
  CSS correspondiente en `styles/common.css` (sección "Ilustración ...").
  Esta es la única razón legítima para tocar `menu.js`/`common.css` al
  añadir un juego; si no quieres tocarlos, reutiliza una ilustración
  existente o usa `'soon'` como genérica.
- El menú se encarga solo de: elegir 4 cards destacadas (con al menos 2 no
  jugadas), renderizar la lista completa y filtrarla con el buscador. No
  necesita saber nada más de tu juego.

El límite anterior evita cambios incidentales al registrar juegos; también se
admiten las integraciones de UI del punto 4 y las modificaciones compartidas
necesarias para el encargo según [AGENTS.md](../../AGENTS.md).

## Cards de modos

El encabezado tiene una barra superior (jugador + Opciones + botón **Secretos**, en `.menu-topbar`; este último enlaza a la pantalla de Secretos, ver [secretos 11.6](../secretos/SKILL.md)) y una fila de tres cards: **Juego aleatorio**, progreso y **Secuencia millonaria** (`scripts/menu-modes.js`, `styles/menu-modes.css`). Reglas y estado en [secuencia](../secuencia/SKILL.md). Sus botones están en `getNavTargets()`.

## Validación del componente

- Conserva foco inicial en la primera card, navegación espacial (`focusNearest`) y registro de nuevos controles en `getNavTargets()`.
- En el buscador, izquierda/derecha siguen moviendo el cursor.
- Si cambias bienvenida, revisa `tests/welcome.cjs`; para navegación, `tests/keyboard-regressions.cjs`; para opciones, `tests/music-options.cjs`.
- Pasos de bienvenida: cada `data-step` declara `data-setup="preference"` (con fila en Opciones) o `"identity"` (sin fila). Reglas en [Directives/Welcome_Setup.md](../../Directives/Welcome_Setup.md). Orden actual: presentación → idioma → música → nombre → revelación (1,75 s) → menú (2 s después).
- Jugador: `scripts/player.js` (`window.NSG_PLAYER`, clave `nsg_player_v1`) valida y guarda nombre y descripción; `#player-badge` los muestra arriba a la izquierda del menú y `renderAll()` los retraduce al cambiar de idioma. Pruebas: `tests/player.cjs`.
- Prueba búsqueda, cards, lista, opciones y guardado por teclado y táctil en las distribuciones afectadas.
