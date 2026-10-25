# Textos

Fuente de todos los textos del juego, en Markdown, con el español (`ES`) como idioma de origen. Las reglas de estructura, nombres, formatos y flujos están en **[CONVENTIONS.md](CONVENTIONS.md)**: es la única especificación y se mantiene idéntica en Drive.

Resumen:

- `<IDIOMA>/Common`, `Games/<juego>`, `Messages`, `Player` y `Secrets` (idiomas `ES`, `EN`, `FR`, `RU`, `ZH`).
- `python scripts/build-translations.py` valida (mismas claves y `{{variables}}` que `ES` en los cinco idiomas) y genera `scripts/localization-data.js`, `scripts/secrets-data.js` y `scripts/messages-data.js`. No se editan a mano.
- `python scripts/textos.py status | stamp | push | pull-secrets` sincroniza con Drive.
- El navegador no lee Drive: la importación es un paso de desarrollo explícito. Hay que recargar la página tras regenerar el catálogo.
- `tests/i18n-audit.cjs` comprueba que toda clave usada por el código existe en los cinco idiomas y que no hay texto fijo en las páginas de juego.
