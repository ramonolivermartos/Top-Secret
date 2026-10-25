# Directivas generales

- [Nivel de dificultad visible para debug](Difficulty_Debug.md): estructura
  compartida e indicador obligatorio para minijuegos con dificultad variable.
- [Pasos de configuración inicial](Welcome_Setup.md): distingue preferencias
  (con fila en Opciones) de identidad (nombre del jugador, sin fila en Opciones).

# Progresión de secretos

`sequence_to_9999550.txt` es la fuente única de umbrales: 633 entradas,
con índice desde 1. Se conserva la secuencia suministrada, sin recalcularla.

- `secreto_NNN.md` (tres dígitos) identifica el secreto NNN en todos los idiomas;
  el idioma lo da la carpeta. Es el único nombre admitido.
- El secreto x se activa cuando la puntuación global **iguala o supera**
  el valor de la entrada x. No se desplazan índices si faltan relatos.
- El Yeti es el primero: **150 puntos**. El antiguo umbral de prueba de
  400 queda retirado. Después vienen 600, 1.205 y 2.410 puntos.
- Son hitos narrativos equivalentes a un «final boss», sin añadir combate.
- La suma global, la pausa, la cola de varios secretos y las reglas actuales
  de repetición siguen siendo las del módulo común de secretos.

Claude web deposita las versiones en Drive como `Textos/<IDIOMA>/Secrets/secreto_NNN.md`;
se recogen con `python scripts/textos.py pull-secrets --apply` (ver
[Textos/CONVENTIONS.md](../Textos/CONVENTIONS.md)). El generador registra los relatos
presentes en los cinco idiomas, deriva sus umbrales y genera `scripts/secrets-data.js`
y el catálogo localizado. No genera relatos vacíos para los 633 índices.
Esta carpeta se refleja en Drive (`Textos/Directives/`) con la guía narrativa y la secuencia.

