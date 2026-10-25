---
name: localizacion
description: Textos en Markdown con español como fuente, traducción a los cinco idiomas, sincronización con Drive, menús y botones de idioma, mensajes de victoria/derrota.
---

# Localización y mensajes

**Especificación única:** [Textos/CONVENTIONS.md](../../Textos/CONVENTIONS.md) (estructura, nombres, formatos, flujos). Es la misma que usa Claude web y existe idéntica en Drive; **no la dupliques aquí**: si cambia una convención, cambia ese archivo y sincroniza con `python scripts/textos.py push`.
Generación y sincronización: [desarrollo](../desarrollo/SKILL.md). Narrativa y secretos: [secretos (11)](../secretos/SKILL.md). Responsive: [interfaz (4.1)](../interfaz/SKILL.md).
Pruebas: `node --test tests/localization.cjs` y `python tests/textos.py`.

## 7. Idiomas y flujo de localización — `scripts/i18n.js`

La interfaz admite **español (`es`), inglés (`en`), chino simplificado (`zh-Hans`), ruso (`ru`) y francés (`fr`)**. Las carpetas de `Textos/` son `ES`, `EN`, `FR`, `RU`, `ZH`. El idioma se guarda en `localStorage` (clave interna de `i18n.js`) y el selector solo vive en el menú principal; las páginas de juego leen el idioma ya elegido.

- **El español es la fuente.** Todo texto nuevo nace en `Textos/ES/` (Markdown con un bloque `json`). `i18n.js` ya no contiene textos: solo los resuelve desde el catálogo generado. No editar a mano `scripts/localization-data.js`, `scripts/secrets-data.js` ni `scripts/messages-data.js`.
- Carga `../../../scripts/localization-data.js` antes de `../../../scripts/i18n.js` en el `<head>` del juego (después de `storage.js`).
- Texto **estático** en el HTML: `data-i18n="clave"` (`textContent`), `data-i18n-html="clave"` (`innerHTML`, solo si el texto lleva etiquetas), `data-i18n-placeholder="clave"`, `data-i18n-aria-label="clave"`.
- Texto **generado desde JS**: `window.NSG_I18N.t('clave', { variable: valor })`; las plantillas usan `{{variable}}`.
- Al final del script de juego, `window.NSG_I18N.applyStaticTranslations(document)` una vez.
- `window.NSG_I18N.getLang()` devuelve `es`, `en`, `zh-Hans`, `ru` o `fr` (por ejemplo para `NSG_MESSAGES.random(lang, kind)`, punto 9).
- Reutiliza `common.*` (volver al menú, jugar de nuevo, «¿Cómo se juega?»…) en lugar de duplicar. Claves por juego: `calc.*`, `snake.*`, `tu-juego.*`; cards del menú: `games.<id>.title` y `games.<id>.description`.

### 7.1 Flujo al crear o cambiar un minijuego, menú, ventana o botón

Los textos de interfaz, reglas, cards, mensajes, overlays, pistas y etiquetas de accesibilidad entran **en los cinco idiomas a la vez**, dentro del mismo cambio: ya no se espera a una entrega externa.

1. Implementa usando solo claves; la lógica no depende del idioma.
2. Escribe los textos en español en `Textos/ES/Games/<juego>/<juego>.md` (o en `Common/` si son compartidos o pertenecen al menú) y traduce las mismas claves a `EN`, `FR`, `RU` y `ZH`, directamente desde el español, conservando claves, `{{variables}}` y etiquetas HTML. Un juego nuevo crea su archivo en los cinco idiomas.
3. `python scripts/build-translations.py` falla si algún idioma no tiene exactamente las claves y variables de `ES`; no se puede dar un juego por cerrado con idiomas pendientes.
4. `python scripts/textos.py stamp` registra que las traducciones corresponden al español actual. Si después cambia un texto en español, `python scripts/textos.py status` marca como obsoletas las traducciones de esa clave: revisa los cuatro idiomas y vuelve a sellar.
5. Ejecuta las pruebas y actualiza Drive: `python scripts/textos.py push` (simulación) y `push --apply` tras revisar la lista.
6. Valida variables, tipografías, saltos de línea, legibilidad y ausencia de recortes en las distribuciones admitidas.

**Menús, botones y selector de idioma:** cualquier botón, etiqueta, `aria-label`, `placeholder` o ventana nuevos siguen este mismo flujo. El selector de idioma lee los nombres de `NSG_I18N.languages` (cada idioma en su propia lengua). Un idioma nuevo se añade en `LANGUAGES` de `scripts/build-translations.py`, en `languages` de `scripts/i18n.js` y con todo el catálogo traducido a la vez (ver CONVENTIONS, sección 7). Los laberintos son prototipos solo en inglés (`localized: false`) y quedan fuera.

### 7.2 Secretos y narrativa

- Los secretos los escribe y traduce Claude web en Drive (`Textos/<IDIOMA>/Secrets/secreto_NNN.md`). Cuando el usuario lo pida, recógelos con `python scripts/textos.py pull-secrets` (simulación) y `--apply`. No los escribas, reescribas ni traduzcas tú, y no modifiques los relatos aportados.
- Un secreto tiene una sola identidad y un solo umbral, el de `Directives/sequence_to_9999550.txt`. El generador solo publica los secretos que existen en los cinco idiomas; los incompletos se avisan. No hay mecánica de subida de nivel ni cambia el umbral por añadir idiomas.
- El primer secreto (Yeti) es `secreto_001.md` y su umbral es 150 puntos.

## 9. Mensajes de ánimo / felicitación

`Textos/<IDIOMA>/Messages/victory.md` y `defeat.md` (50 frases por idioma, numeradas) alimentan `window.NSG_MESSAGES`: `window.NSG_MESSAGES.random(lang, 'victory' | 'defeat')`. `scripts/messages-data.js` lo genera `build-translations.py` (respaldo `es`/`en` para páginas sin catálogo, como los laberintos); no se edita a mano.

- Carga `../../../scripts/messages-data.js` en el `<head>` (después de `audio.js`).
- Juegos **por rondas**: el mensaje solo en el overlay de fin de partida, junto al resultado. `victory` si el jugador gana al menos la mitad de las rondas (en las calculadoras, 3 o más de 6), `defeat` en caso contrario. Clase compartida `.flavor-message` (texto pequeño, cursivo, máximo 2 líneas).
- Juegos **sin rondas** (como Snake): una vez, en el overlay de fin de partida.
- Si cambias los `.md` de mensajes, regenera con `python scripts/build-translations.py`; no transcribas frases a mano.
