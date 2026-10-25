---
name: desarrollo
description: Servir el proyecto, generar catálogos, importar traducciones, ejecutar pruebas y entregar cambios.
---

# Desarrollo y validación

## Ejecución, accesos y generación

Todos los comandos se ejecutan desde la raíz. Servir por HTTP (los secretos pueden usar `fetch`):

```sh
python -m http.server 8000 --bind 127.0.0.1
```

Abrir `http://127.0.0.1:8000/`. La app es estática: para ejecutarla no hace falta backend ni credenciales. Guardado y preferencias viven en el navegador; el progreso se guarda manualmente desde el menú.

Solo al cambiar las fuentes de traducción/secretos, regenerar:

```sh
python scripts/build-translations.py
```

- Valida (en los cinco idiomas, mismas claves y `{{variables}}` que `ES`) y genera `scripts/localization-data.js`, `scripts/secrets-data.js` y `scripts/messages-data.js`; no editarlos a mano. También actualiza la columna de puntuación de la guía narrativa. Falla con un mensaje claro si una traducción falta o no coincide.
- Sincronización con Drive: `python scripts/textos.py status | stamp | push | pull-secrets`. Los comandos que escriben simulan por defecto (`--apply` ejecuta) y nunca borran. Es un paso explícito de desarrollo, no una dependencia de ejecución; el navegador no lee Drive. Reglas y flujos en [Textos/CONVENTIONS.md](../../Textos/CONVENTIONS.md).
- La carpeta se llama `Textos/` en el repositorio y en Drive, y el generador usa esa misma grafía (también en las rutas del catálogo): no existe un árbol `textos/`.

## Validación y entrega entre agentes

Pruebas sin dependencias npm (Node con soporte para `node:test`; Python 3, invocado como `python` en Windows: ver el entorno en [AGENTS.md](../../AGENTS.md)):

```sh
node --test tests/*.cjs
python tests/secret-sequence.py
python tests/textos.py
```

Para un cambio local, seleccionar la prueba pertinente con `node --test tests/maze.cjs` (o `difficulty.cjs`, `keyboard-regressions.cjs`, `localization.cjs`, `i18n-audit.cjs`, `music-options.cjs`, `player.cjs`, `secrets-history.cjs`, `welcome.cjs`). Comprobar sintaxis de JS modificado con `node --check ruta/al/archivo.js`.

- Si cambian contratos compartidos, ejecutar las pruebas afectadas y revisar las variantes que los usan. No instalar un framework de pruebas para cambios menores.
- Las pruebas JS usan Node/VM y dobles de DOM: no sustituyen comprobar visualmente en navegador inicio → partida → pausa → final/replay, teclado/táctil, responsive y textos cuando corresponda.
- Comprobar las herramientas disponibles en la sesión; si falta Node o navegador, indicar qué no se pudo verificar. No presentar una prueba de sintaxis como validación jugable.
- Terminar con un resumen breve: qué cambió, archivos relevantes, verificaciones realizadas y pendientes concretos. Registrar las decisiones duraderas en la documentación pertinente para que el siguiente agente no dependa del historial del chat.
