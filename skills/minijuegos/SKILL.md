---
name: minijuegos
description: Crear minijuegos y variantes, estructurar carpetas e integrar los contratos compartidos.
---

# Contrato de interfaz — estructura y alta de minijuegos

Este contrato describe cómo se comunican los juegos con la pantalla principal
(menú) y el sistema de guardado. Para crear un juego, consulta esta skill y las
integraciones enlazadas: no hace falta leer `index.html`, `scripts/menu.js` ni
`scripts/storage.js` completos salvo que quieras modificar esos componentes.

## Integraciones que consultar

- [Menú y registro (2)](../menu/SKILL.md).
- [Guardado y puntuación (3)](../guardado/SKILL.md).
- [UI y responsive (4/4.1)](../interfaz/SKILL.md).
- [Textos y mensajes (7/7.1/7.2/9)](../localizacion/SKILL.md).
- [Audio (8)](../audio/SKILL.md).
- [Teclado y pausa (10)](../pausa/SKILL.md).
- [Secretos (11)](../secretos/SKILL.md).
- [Familias existentes](../familias/SKILL.md) y [dificultad variable (1.2)](../dificultad/SKILL.md) cuando correspondan.

Los siguientes archivos se consideran **terminados y estables**. No deberían
necesitar cambios para añadir un juego nuevo (salvo el registro descrito en
el punto 2):

- `index.html`
- `scripts/menu.js`
- `scripts/storage.js`
- `scripts/i18n.js`
- `scripts/audio.js` / `scripts/music-data.js`
- `scripts/messages-data.js`
- `scripts/quit-confirm.js`
- `styles/common.css` (solo lectura: se reutiliza, no se reescribe)

Estas restricciones evitan cambios incidentales al añadir juegos. Se aplica el
alcance de [AGENTS.md](../../AGENTS.md) cuando la tarea requiere cambiar arquitectura
o componentes compartidos, incluidas las excepciones de UI y registro.

## 1. Estructura de carpetas de un juego

Cada juego vive en una carpeta autocontenida dentro de su categoría:

```
juegos/<categoria>/<id-del-juego>/
  index.html
  <id-del-juego>.css
  <id-del-juego>.js
```

`<id-del-juego>` debe ser un slug corto en minúsculas (`calculadora`, `snake`)
y es el mismo `id` que se usa en el registro de juegos (ver punto 2) y en las
llamadas a `markGamePlayed` (ver punto 3). Desde esa profundidad, las rutas
hacia archivos compartidos de la raíz usan `../../../`.

**Excepciones existentes:** `calculadora` vive en `calculadora1/` y `allin` en
`allin1/`; conserva sus IDs persistidos y nombres de archivos reales. Consulta
[familias](../familias/SKILL.md) antes de usar una variante como base.

### 1.1 Familias de minijuegos y variantes

Una **familia** agrupa un juego base y sus variantes. El usuario indicará
cuándo un nuevo minijuego pertenece a una familia y qué versión sirve de
base; no deducir cambios de mecánica o dificultad solo por su numeración.

Familias actuales (estos nombres no cambian los IDs ni las rutas existentes):

| Familia | Carpeta existente | Versiones actuales |
|---|---|---|
| `snake` | `juegos/SnakeContainer/` | Snake, Snake 2 y Snake 3 |
| `calculadora` | `juegos/Calculadora/` | Calculadora 1, 2, 3 y 4 |
| `allIn` | `juegos/All-inContainer/` | All in 1 |
| `francotirador` | `juegos/Francotirador/` | Francotirador, 2 y 3 (las variantes reutilizan el código de `francotirador/`) |

Los laberintos (`laberinto1`, `laberinto2`) están en `juegos/Laberintos/` y comparten
motor, interfaz y CSS; su estado se documenta en
[familias](../familias/SKILL.md) y en el README del juego.

- Antes de crear una variante, identificar con la indicación del usuario el
  juego base, el comportamiento compartido y las diferencias solicitadas
  (reglas, nivel, puntuación, presentación o contenido).
- Conservar los contratos de guardado, pausa, secretos, entrada y responsive
  en todas las variantes. Cada minijuego publicado mantiene su propio ID,
  registro y entrada jugable según la estructura existente.
- Reutilizar lógica, estilos y textos comunes de la familia cuando sea
  práctico; expresar diferencias mediante configuración si simplifica el
  código. Evitar copiar implementaciones completas que después deban
  corregirse por separado, sin forzar una abstracción para mecánicas distintas.
- No modificar el comportamiento de las versiones anteriores al añadir una
  variante. Si se cambia código compartido, verificar las versiones afectadas.
- Aplicar el flujo del punto 7.1 a cada variante: textos en español en
  `Textos/ES/Games/<familia>/` y traducción a los otros cuatro idiomas en el
  mismo cambio, distinguiendo textos compartidos y específicos de cada
  versión y reutilizando las traducciones existentes para los que no cambien.
- La pertenencia a una familia no implica un desbloqueo por niveles ni una
  progresión automática: esas reglas solo se añaden si el usuario las define.

## 5. Qué NO debe hacer un juego nuevo

- No leer ni escribir `localStorage`/`sessionStorage` directamente: todo pasa
  por `window.NSG`.
- No modificar `scripts/menu.js` ni la lógica de selección de destacados.
- No añadir juegos "a mano" en `index.html`: siempre vía `scripts/games-data.js`.
- No duplicar el CSS base (botones, overlay, panel, layout): importar
  `../../../styles/common.css` y añadir solo un `<id-del-juego>.css` con los
  estilos específicos del tablero/UI propia del juego.

## 6. Checklist para dar de alta un juego nuevo

1. Crear `juegos/<categoria>/<id>/index.html`, `<id>.css`, `<id>.js` siguiendo el punto 1 y 4.
2. Cargar en el `<head>`, en este orden: `../../../styles/common.css`,
   `../../../styles/secrets.css`, `<id>.css`, `../../../scripts/storage.js`,
    `../../../scripts/localization-data.js`, `../../../scripts/i18n.js`,
   `../../../scripts/music-data.js`, `../../../scripts/audio.js`,
   `../../../scripts/messages-data.js`, `../../../scripts/quit-confirm.js`,
   `../../../scripts/secrets-data.js` y `../../../scripts/secrets.js`.
   Cargar siempre `../../../debug/difficulty-debug.js` (indicador de dificultad de debug; con dificultad variable, además `create`/`setCurrent`)
   antes de `<id>.js`, que se carga siempre al final. Usar `defer` en los scripts.
3. Implementar el flujo: overlay inicial → `startGame()` → partida → `endGame()` → overlay final con replay/menú.
4. Llamar a `markGamePlayed('<id>')` al empezar y `addPendingScore(puntos)` cuando corresponda puntuar.
   Para rondas, liquidar con `settleProvisionalScore`; para azar con pérdidas,
   usar `applyScoreDelta`, sin duplicar la suma (ver punto 3).
5. Añadir el objeto del juego a `scripts/games-data.js` (cambio de registro en archivo compartido).
6. Si usas una ilustración nueva, añadir su `if` en `illustrationMarkup` de `menu.js` y su CSS en `common.css`.
7. Implementar `pauseGame`/`resumeGame`, publicar el adaptador común
   `window.NSG_GAME_CONTROL = { isActive, pause, resume }` para los secretos
   y registrar `window.NSG_QUIT_CONFIRM.init({...})` (ver punto 10).
   El juego debe poder pausarse y salir con Escape sin tocar el ratón.
8. Validar la jugabilidad responsive y los métodos de entrada según el punto
   4.1, incluyendo cambios de tamaño durante una partida.
9. Seguir el flujo de textos del punto 7.1 (español, cuatro traducciones, `build-translations.py`, `textos.py stamp` y `push`) y las comprobaciones de [desarrollo](../desarrollo/SKILL.md).
