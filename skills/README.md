# Skills del proyecto

La entrada general es [AGENTS.md](../AGENTS.md). Cada carpeta contiene un
`SKILL.md` con nombre, descripción, ámbito y procedimiento. Se consultan mediante
lectura de archivos cuando la tarea afecta a ese componente; no requieren un
plugin ni un registro automático del cliente.

## Mapa del contrato consolidado

Se conserva la numeración de las secciones del contrato de interfaz para poder
localizar sus referencias cruzadas aunque ahora estén repartidas entre skills.
Las referencias a «punto N» se resuelven con esta tabla. El apéndice de Electron
tiene numeración propia y sus referencias son locales.

| Sección original | Destino |
|---|---|
| Contexto, autonomía y contratos esenciales de la guía breve | [AGENTS.md](../AGENTS.md) |
| Introducción, 1/1.1 (estructura/familias), 5 (límites), 6 (alta) | [minijuegos](minijuegos/SKILL.md) |
| 1.2 (debug) | [dificultad](dificultad/SKILL.md) |
| 2 (registro y menú) | [menu](menu/SKILL.md) |
| 3 (guardado) | [guardado](guardado/SKILL.md) |
| 4/4.1 (UI y responsive) | [interfaz](interfaz/SKILL.md) |
| 7/7.1/7.2 (idiomas y flujo), 9 (mensajes) | [localizacion](localizacion/SKILL.md) |
| 8 (música) | [audio](audio/SKILL.md) |
| 10 (teclado y pausa) | [pausa](pausa/SKILL.md) |
| 11/11.1–11.5 (secretos y aceptación) | [secretos](secretos/SKILL.md) |
| Apéndice completo de migración del guardado a Electron | [electron](electron/SKILL.md) |
| Secuencia millonaria y juego aleatorio (nuevo) | [secuencia](secuencia/SKILL.md) |
| Mapa de juegos y excepciones de la guía breve | [familias](familias/SKILL.md) |
| Ejecución, generación, validación y entrega de la guía breve | [desarrollo](desarrollo/SKILL.md) |

Los contratos y sus ejemplos se mantienen aquí como especificación detallada.
Las notas de estado actual aclaran discrepancias del contrato anterior (debug,
registro, generación de mensajes y propuesta Electron). Las ideas originales
de [narrativa.md](../narrativa.md) permanecen en su archivo.

## Mantenimiento

- Actualiza la skill del componente al cambiar su contrato y conserva ejemplos y criterios de aceptación útiles.
- Enlaza documentos existentes de `Directives/` y READMEs de juegos; evita duplicar especificaciones que ya tienen dueño.
- Si creas una skill, usa `skills/<nombre>/SKILL.md`, añade `name` y `description` en el frontmatter y enlázala desde `AGENTS.md`.
- Mantén en `AGENTS.md` solo orientación global, invariantes e índice. Las instrucciones específicas se leen bajo demanda.
