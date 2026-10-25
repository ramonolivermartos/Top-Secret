# No Sense Games — guía para agentes

## Contexto y forma de trabajar

- Responde al usuario en español. Proyecto de minijuegos web con HTML, CSS y JavaScript vanilla; scripts clásicos con `defer` y APIs globales `window.NSG_*`.
- No hay `package.json`, framework, bundler ni instalación npm. Python 3 genera los catálogos; Node.js ejecuta las pruebas JS. Electron/Steam son planes futuros.
- Este archivo es la entrada común de instrucciones del proyecto. Los contratos detallados y procedimientos están en [skills/](skills/README.md).
- Antes de editar, revisa `git status --short` y los archivos implicados. Conserva trabajo previo, también archivos sin seguimiento: puede proceder del usuario u otro agente.
- Busca primero por ruta o símbolo; lee solo el juego afectado y sus dependencias directas. Evita recorrer todos los juegos, catálogos generados, relatos y música para una tarea local.
- Mantén los cambios acotados y sigue el estilo del archivo (habitualmente dos espacios, comillas simples, punto y coma e IIFE en JS). Reutiliza APIs y estilos existentes.
- Si cambia un contrato, actualiza su skill; si cambia el mapa o el flujo general, actualiza esta guía. Mantén una única especificación detallada por componente.

## Alcance y autonomía

- Puedes crear juegos completos, añadir familias, refactorizar y cambiar la arquitectura, incluidos menú, módulos compartidos, estructura de carpetas y herramientas, cuando lo pida el usuario o sea necesario para cumplir la tarea.
- Las convenciones describen la base actual. Las indicaciones de «estable», «solo lectura» o «no modificar» del contrato evitan cambios incidentales al añadir juegos; no bloquean una tarea de arquitectura o una modificación explícita de esos componentes.
- Ejecuta los cambios necesarios de principio a fin. No pidas permiso por cada archivo compartido. Consulta al usuario cuando falte una decisión de producto (mecánica, puntuación, alcance) que no pueda deducirse del encargo.
- En cambios arquitectónicos, identifica consumidores, adapta las llamadas y las pruebas afectadas, conserva progreso persistido o implementa su migración, y actualiza la documentación. Conserva el comportamiento de los juegos salvo los cambios solicitados.
- Introduce dependencias o herramientas cuando exista una necesidad concreta del encargo; explica brevemente la decisión y documenta los nuevos comandos. El stack actual no es una restricción permanente.

## Skills: cargar según la tarea

Antes de modificar un componente, **lee su `SKILL.md` usando las herramientas de lectura de archivos**. Son guías locales: esta carpeta no presupone que el cliente las descubra o registre automáticamente. No cargues todas por defecto; sigue los enlaces relacionados solo cuando afecten al encargo. Las rutas de código escritas entre comillas invertidas parten de la raíz del proyecto.

| Tarea o componente mencionado | Skill | Puntos de entrada |
|---|---|---|
| Juego nuevo o variante | [minijuegos](skills/minijuegos/SKILL.md) | `juegos/<familia>/<juego>/` |
| Menú, cards, registro, bienvenida, nombre del jugador | [menu](skills/menu/SKILL.md) | `index.html`, `scripts/menu.js`, `scripts/games-data.js`, `scripts/welcome.js`, `scripts/player.js`, `Directives/Welcome_Setup.md` |
| Guardado, puntuación, fin de partida | [guardado](skills/guardado/SKILL.md) | `scripts/storage.js` → `window.NSG` |
| CSS, overlays, responsive, táctil | [interfaz](skills/interfaz/SKILL.md) | `styles/common.css`, CSS del juego |
| Teclado, foco, pausa, salida | [pausa](skills/pausa/SKILL.md) | `scripts/quit-confirm.js`, `NSG_GAME_CONTROL` |
| Traducciones, mensajes de ánimo/felicitación | [localizacion](skills/localizacion/SKILL.md) | `Textos/CONVENTIONS.md`, `Textos/`, `scripts/i18n.js`, `scripts/build-translations.py`, `scripts/textos.py` |
| Música, selector, pistas | [audio](skills/audio/SKILL.md) | `scripts/audio.js`, `scripts/music-data.js`, `music/` |
| Secretos, narrativa, umbrales, pantalla de Secretos | [secretos](skills/secretos/SKILL.md) | `scripts/secrets.js`, `scripts/secrets-gallery.js`, `secretos/index.html`, `styles/secrets*.css`, `Directives/`, `narrativa.md` |
| Calculadoras, Snake, All in, laberinto, Réplica, Francotirador | [familias](skills/familias/SKILL.md) | Mapa y excepciones de cada familia |
| Secuencia millonaria, juego aleatorio | [secuencia](skills/secuencia/SKILL.md) | `scripts/sequence.js`, `scripts/menu-modes.js`, estado en `scripts/storage.js` |
| Dificultad variable, indicador debug | [dificultad](skills/dificultad/SKILL.md) | `Directives/Difficulty_Debug.md`, `debug/difficulty-debug.js` |
| Servir, generar, probar, entregar | [desarrollo](skills/desarrollo/SKILL.md) | `tests/`, herramientas Python/Node |
| Empaquetado Electron solicitado | [electron](skills/electron/SKILL.md) | Propuesta futura y ejemplos de migración |

Para un juego nuevo, sigue las integraciones de `minijuegos`. Para puntuación/fin de partida, consulta también `pausa` y `secretos`; para overlays de secretos, `interfaz` y `secretos`; para traducciones de relatos, `localizacion` y `secretos`.

## Contratos esenciales

- **Registro:** añadir juegos en `window.NSG_GAMES`, nunca cards a mano en `index.html`. No deducir reglas de una variante por su número: usar la base y diferencias indicadas por el usuario.
- **Reutilización:** al añadir un juego, partir de menú, storage, audio, i18n y CSS comunes. Ampliar o refactorizar esos módulos cuando la tarea lo necesite; actualizar sus consumidores y contratos. CSS específico en el juego; patrones realmente compartidos en la capa común.
- **Puntuación:** los juegos no acceden directamente a `localStorage`/`sessionStorage` ni llaman a `commitSave()`. Usar `NSG.markGamePlayed(id)` al empezar de verdad y `addPendingScore(puntos)` al puntuar. Juegos por rondas: `setProvisionalScore` y `settleProvisionalScore`, sin duplicar puntos. Azar con pérdidas: `applyScoreDelta`. Comprobar que existe `window.NSG`.
- **Pausa:** exponer `window.NSG_GAME_CONTROL = { isActive, pause, resume }` e integrar `NSG_QUIT_CONFIRM.init(...)`. Pausar todos los temporizadores, transiciones entre rondas y entradas; reanudar donde estaba. Escape y enlaces de salida comparten confirmación durante la partida.
- **Secretos:** los gestiona el módulo global (cada secreto se obtiene una vez y queda en el historial de la pantalla de Secretos); nunca comprobar umbrales desde cada juego ni llamar a `NSG_SECRETS.check()`. La secuencia de `Directives/` es la fuente de umbrales; el primero es 150. No inventar umbrales ni relatos.
- **UI:** reutilizar layout, botones y overlay comunes; ocultar `.game-overlay` con `style.display`, no `hidden`. Teclado completo, foco visible y restaurado; controles táctiles y responsive en ancho y alto. Redimensionar no reinicia ni altera la partida.
- **Textos:** usar claves `data-i18n*` / `NSG_I18N.t`, reutilizar `common.*` y conservar `{{variables}}`. Idiomas: `es`, `en`, `fr`, `ru`, `zh-Hans` (carpeta `ZH`).
- **Flujo de textos:** el español es la fuente y vive en Markdown (`Textos/ES/…`). Al crear o cambiar un juego, menú, ventana o botón, escribe los textos en español, tradúcelos tú a `EN`, `FR`, `RU` y `ZH` en el mismo cambio, ejecuta `build-translations.py`, `textos.py stamp` y actualiza Drive con `textos.py push`. Los **secretos** son la excepción: los escribe y traduce Claude web en Drive; recógelos solo cuando el usuario lo pida (`textos.py pull-secrets`). No reescribas relatos aportados. Reglas únicas en [Textos/CONVENTIONS.md](Textos/CONVENTIONS.md).

## Entorno del usuario: Windows

El usuario trabaja en **Windows 11** (PowerShell y Git Bash). Todo comando, prueba y herramienta debe funcionar ahí además de en Linux/macOS:

- Python se invoca como `python`: en Windows `python3` suele ser el alias vacío de la Microsoft Store. Los ejemplos usan `python`; en Linux/macOS sustitúyelo por `python3` si hace falta.
- Nunca rutas fijas de sistema como `/tmp`: usa `tempfile`/`os.tmpdir()` sin `dir=`.
- En Node, rutas de archivo con `path.join`; para comparar o calcular rutas del proyecto (URLs, `src` de HTML, rutas relativas en pruebas) usa `path.posix`, porque `path.join` mete `\` en Windows.
- Git Bash interpreta comillas invertidas y `$` dentro de comillas dobles: para editar archivos usa las herramientas de edición, no `node -e "..."` ni `sed` con plantillas JS.
- Los finales de línea y las mayúsculas de rutas pueden diferir entre sistemas (ver `Textos/` más abajo).

Las pruebas cargan las dependencias locales de cada juego en el orden de su `index.html` (`tests/keyboard-regressions.cjs`): un script nuevo del juego se declara en su página y las pruebas lo recogen sin listas manuales.

## Rutas y comprobaciones rápidas

- Cada juego tiene su `index.html`; desde `juegos/<familia>/<juego>/`, los recursos de raíz se alcanzan con `../../../`. Respeta mayúsculas y nombres existentes.
- El registro en `scripts/games-data.js` es la referencia para IDs y enlaces. La primera calculadora tiene ID `calculadora`, pero carpeta `calculadora1`. No renombres IDs persistidos para hacerlos coincidir con carpetas.
- La carpeta se llama `Textos/` en el repositorio, en Drive y en el generador (catálogo incluido). No existe un árbol `textos/`: no crees uno. Estructura, formatos y sincronización con Drive: [Textos/CONVENTIONS.md](Textos/CONVENTIONS.md).
- `debug/difficulty-debug.js` se carga en todos los juegos y su indicador de dificultad es obligatorio (variable: nivel real; fija: «Fija»). Un único interruptor, `ENABLED` en ese archivo, apaga todos los mensajes (`tests/difficulty.cjs`). Todos los juegos publicados están localizados en los cinco idiomas, laberintos incluidos; `tests/i18n-audit.cjs` falla si aparece texto fijo fuera de `Textos/`.
- Las ideas de producto están en [narrativa.md](narrativa.md); consulta su contexto en la skill de secretos antes de convertirlas en reglas implementadas.

Desde la raíz:

```sh
python -m http.server 8000 --bind 127.0.0.1
node --test tests/*.cjs
python tests/secret-sequence.py
```

Abrir `http://127.0.0.1:8000/`. Para un cambio local, ejecuta las pruebas pertinentes; consulta [desarrollo](skills/desarrollo/SKILL.md) para generación, importación y validación visual.

Termina con un resumen breve de cambios, verificaciones y pendientes concretos. Registra las decisiones duraderas en la skill pertinente para que el siguiente agente no dependa del historial del chat.
