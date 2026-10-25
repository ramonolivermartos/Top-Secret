# Convenciones de textos y flujo de trabajo

Esta es la **única especificación** de cómo se nombran, organizan y sincronizan los textos del juego. La siguen Claude Code (proyecto del juego) y Claude web (proyecto de secretos). Existe idéntica en el repositorio (`Textos/CONVENTIONS.md`) y en Drive (`My Drive/Ramon Oliver/Top Secret/Textos/CONVENTIONS.md`).

## 1. Principios

1. **El español (`ES`) es la fuente de todo.** Los demás idiomas (`EN`, `FR`, `RU`, `ZH`) se traducen directamente desde `ES`, nunca desde otra traducción. El inglés es un idioma más, no un pivote.
2. **Todo texto fuente vive en Markdown** dentro de `Textos/`. El código no contiene textos; el navegador carga un catálogo generado (`scripts/localization-data.js`), nunca Drive.
3. **Repositorio y Drive son copias idénticas**: mismas carpetas, mismos nombres y mismo contenido. Lo comprueba `python scripts/textos.py status`.
4. **Cada tipo de texto tiene un único responsable** (sección 6). Quien no es responsable no lo edita.
5. **Nada se borra sin estar cubierto.** Lo retirado se archiva fuera de `Textos/`.

## 2. Estructura

```text
Textos/
├── CONVENTIONS.md            esta especificación
├── README.md                 resumen y comandos
├── translation-state.json    lo gestiona la herramienta; no se edita
├── Directives/               guía narrativa y secuencia de umbrales (solo secretos)
└── <ES|EN|FR|RU|ZH>/
    ├── Common/               interfaz compartida: common.md, menu.md, welcome.md, sequence.md, secrets-page.md
    ├── Games/<juego>/        <juego>.md: todos los textos del juego y sus cards
    ├── Messages/             victory.md, defeat.md (50 frases cada uno)
    ├── Player/               descriptions.md (descripciones del jugador)
    └── Secrets/              secreto_NNN.md
```

Carpetas de idioma: `ES`, `EN`, `FR`, `RU`, `ZH` (chino simplificado, código `zh-Hans` en el código). `<juego>` es la familia: `allin`, `calculadora`, `snake`, `laberinto`, `tetrareplica`, `francotirador`. Un juego nuevo crea `Games/<juego>/<juego>.md` en los cinco idiomas.

## 3. Formatos

| Contenido | Archivo | Formato |
| --- | --- | --- |
| Interfaz y juegos | `Common/*.md`, `Games/<juego>/*.md` | Un bloque ```` ```json ```` con pares `"clave": "texto"`. Lo que está fuera del bloque es contexto para quien traduce. |
| Mensajes | `Messages/victory.md`, `Messages/defeat.md` | Lista numerada del 1 al 50 sin huecos, una frase por número. |
| Descripciones del jugador | `Player/descriptions.md` | Lista numerada desde 1, **la misma numeración en los cinco idiomas** (la entrada N es el mismo personaje). En `ES`, `EN` y `FR`, como máximo tres palabras en alfabeto latino; `RU` y `ZH` se adaptan libremente. |
| Secretos | `Secrets/secreto_NNN.md` | Relato en Markdown íntegro, UTF-8. Primera línea: título. Sin HTML crudo. **450–550 palabras** en `ES`, `EN` y `FR`; `RU` y `ZH` quedan exentos del límite de palabras (son la traducción, en su alfabeto, de un texto que ya tiene el número esperado), prosa continua **sin listas**. El tono y las reglas de contenido están en la guía narrativa, sección «Secret format and tone standard». |

Todos los archivos son UTF-8. Los finales de línea (LF o CRLF) no importan.

## 4. Claves de interfaz

- Formato `<espacio>.<nombre>`: `snake.rule1`, `francotirador.hudWind`, `menu.saveButton`. El espacio es el juego o la zona (`common`, `menu`, `welcome`, `secrets`, `sequence`).
- Las cards del menú son `games.<id>.title` y `games.<id>.description`, con el `id` del registro `scripts/games-data.js`.
- Sufijo `html` si el texto lleva etiquetas (`rule4html`); conservar las etiquetas tal cual. Textos para lectores de pantalla: prefijo `aria` o `ariaLabel`.
- Las variables se escriben `{{nombre}}` y son idénticas en todos los idiomas.
- Una clave debe existir **en los cinco idiomas con las mismas variables**; si no, `build-translations.py` falla. Reutilizar `common.*` en lugar de duplicar un texto.
- Una clave no se renombra ni se reparte entre archivos sin migrar todos los idiomas a la vez. Cada clave aparece en un único archivo.

## 5. Flujo A — juegos, menús, ventanas y botones (responsable: Claude Code)

1. Escribe los textos en español en el `.md` que corresponda y usa solo claves en el código (`data-i18n*`, `NSG_I18N.t`).
2. Traduce esas claves a `EN`, `FR`, `RU` y `ZH` en el mismo cambio. Cualquier botón, menú o ventana nuevos entran en los cinco idiomas a la vez.
3. `python scripts/build-translations.py` valida y genera el catálogo; `python scripts/textos.py stamp` registra que las traducciones corresponden al español actual.
4. `node --test tests/*.cjs` y `python tests/secret-sequence.py`.
5. `python scripts/textos.py push` (simulación) y, revisada la lista, `push --apply` para actualizar Drive.
6. Si luego se cambia un texto en español, `python scripts/textos.py status` marca como obsoletas las traducciones de esa clave hasta que se revisen y se vuelva a sellar.

## 6. Flujo B — secretos (responsable: Claude web)

Claude web escribe en Drive **solo** `Textos/<IDIOMA>/Secrets/secreto_NNN.md`, en los cinco idiomas.

1. El índice NNN (tres dígitos, desde 001) es el de `Directives/sequence_to_9999550.txt`; el umbral sale de ahí. No se salta ni se reutiliza ningún índice.
2. Se escribe el original en `ES` (canon) y se traduce directamente a `EN`, `FR`, `RU`, `ZH` siguiendo `Directives/Conspiracy_Secrets_Master_Guide_and_Tracker.md`: tono institucional con humor absurdo, referencias a la región de cada idioma, lo absurdo siempre posible administrativamente, 450–550 palabras en ES, EN y FR (RU y ZH exentos del recuento) y sin listas. `pull-secrets` avisa (sin bloquear) de los que se salgan del rango o lleven listas.
3. Los cinco archivos tienen **el mismo nombre**. Un secreto con algún idioma ausente no se importa.
4. Claude web **no puede editar archivos que ya existen en Drive**: no actualiza la guía narrativa. Su mensaje de entrega indica ID, título y cualquier incidencia, y **Claude Code actualiza el registro de la guía** (progreso, tabla de secretos, cambios) al recogerlo. No toca nada más de `Textos/`.
5. La longitud admite una tolerancia de 20 palabras fuera del rango (ES, EN, FR); si se pasa de eso, Claude Code **no lo importa y te lo pregunta** (`--accept NNN` si se queda tal cual). Claude Code **no analiza el contenido ni la calidad** de los secretos (referencias, tono, traducción): eso lo revisa el usuario. Solo importa, valida lo mecánico (nombres, índices, cinco idiomas, formato) y actualiza el registro. El usuario pide a Claude Code que lo recoja: `python scripts/textos.py pull-secrets` (simulación), `pull-secrets --apply`. La herramienta valida nombres e índices, **no sobrescribe** un secreto ya integrado (avisa de un conflicto) y regenera el catálogo.
6. Mensaje de entrega de Claude web: `ID`, `Título`, `Umbral`, `Idiomas`, `Recogida` (comando a ejecutar, con `--overwrite NNN` si sustituye a uno ya integrado) e `Incidencias`. Con él se actualiza el registro de la guía.
7. Un secreto ya integrado no se modifica en Drive sin avisar. Como Claude web no puede reemplazar un archivo existente, una corrección se sube con el mismo nombre solo si el usuario ha borrado antes la versión anterior en Drive; después se recoge con `--overwrite NNN`.

## 7. Idioma nuevo

Se añade la carpeta a `LANGUAGES` en `scripts/build-translations.py`, el código en `scripts/i18n.js` (selector) y se traduce todo el catálogo de una vez; el generador no deja publicar un idioma incompleto.

## 8. Comandos

```sh
python scripts/build-translations.py          # validar y generar el catálogo
python scripts/textos.py status               # paridad, traducciones obsoletas, secretos y diferencias con Drive
python scripts/textos.py stamp                # sellar traducciones al español actual
python scripts/textos.py push [--apply]       # repositorio -> Drive
python scripts/textos.py pull-secrets [--apply] [--overwrite NNN]   # Drive -> repositorio (solo Secrets/)
```

La carpeta de Drive es `~/My Drive/Ramon Oliver/Top Secret/Textos`; se cambia con `--drive` o con la variable `NSG_DRIVE_TEXTOS`. Los comandos que escriben simulan por defecto y nunca borran.
