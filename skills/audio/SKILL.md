---
name: audio
description: Integrar música de menú y juegos, categorías, preferencias y nuevas pistas.
---

# Audio

Puntos de entrada: `scripts/audio.js`, `scripts/music-data.js`, `music/`.
Para etiquetas traducidas del selector, consulta [localizacion](../localizacion/SKILL.md).
Prueba pertinente: `node --test tests/music-options.cjs`.

## 8. Música — `scripts/audio.js` + `scripts/music-data.js`

- La tarjeta **Opciones** del menú agrupa idioma y tipo de música. El catálogo
  `NSG_MUSIC.types` define cada tipo (`labelKey`, `folder`, `menuTrack`,
  `gameTracks`); actualmente `epic` es «Aventura épica», en `music/epic/`.
- `NSG_AUDIO.getMusicType()` / `setMusicType(id)` leen y guardan la preferencia
  global (`nsg_music_type_v1`). Los juegos usan automáticamente esa categoría
  mediante `initGameMusic`; no seleccionan carpetas ni guardan preferencias.
  Cada categoría conserva su tema fijo del menú y su lista aleatoria de juegos.

- Carga `../../../scripts/music-data.js` y `../../../scripts/audio.js` en el
  `<head>` de tu juego (después de `i18n.js`).
- Al final de tu script, llama a:
  `if (window.NSG_AUDIO && window.NSG_MUSIC) window.NSG_AUDIO.initGameMusic('../../../');`
  Esto elige una pista aleatoria (de las que NO son la del menú) y la deja
  sonando en bucle hasta que se navegue a otra página (volver al menú, por
  ejemplo). No hace falta pararla manualmente ni gestionar el `<audio>`: la
  función ya se encarga del autoplay (con reintento en la primera
  interacción del usuario si el navegador lo bloquea).
- El menú principal usa `initMenuMusic('')` en vez de `initGameMusic`, con
  una pista fija que nunca cambia. Un juego nuevo no debería tocar esto.
- Si añades mp3 nuevos a `/music/<tipo>/`, actualiza `scripts/music-data.js`
  (listado de archivos + pista fija del menú) a partir de los nombres reales
  del directorio, para evitar errores de tipeo con tildes/emoji en los nombres
  de archivo. Conserva la intención del contrato original de evitar transcribir
  manualmente esos nombres; no presupongas un generador que no se haya localizado.

- **Secuencia millonaria:** mientras exista una secuencia (`NSG.getSequence()`), los minijuegos reutilizan la misma pista y la reanudan por donde iba; ver [secuencia](../secuencia/SKILL.md).
