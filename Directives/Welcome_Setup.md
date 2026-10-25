# Pasos de configuración inicial (bienvenida)

La bienvenida (`index.html`, `scripts/welcome.js`) encadena pasos de configuración
tras la pantalla de presentación. Cada paso declara su tipo con `data-setup` en su
`<section class="welcome-page">`:

| Tipo | `data-setup` | ¿Fila en Opciones del menú? | Ejemplos |
|---|---|---|---|
| Preferencia | `preference` | **Sí**, obligatoria y sincronizada con la bienvenida | Idioma, tipo de música |
| Identidad | `identity` | **No**: no se crea ningún apartado en Opciones | Nombre del jugador |

## Reglas

1. Una **preferencia** es un ajuste que el jugador puede querer cambiar en cualquier
   momento: debe existir también en `#options-menu` y leer/escribir el mismo valor
   guardado que la bienvenida.
2. Una **identidad** se elige solo en la bienvenida. No genera fila en Opciones
   ("Nombre" no aparece en el menú). Se guarda como preferencia local y la
   bienvenida la ofrece rellenada en cada nueva sesión para confirmarla o cambiarla.
3. Orden: primero las preferencias, después las identidades. El último paso de
   identidad termina la bienvenida.
4. Numeración visible `NN / total` en cada paso; al añadir uno, actualizar todas.

## Paso de nombre (identidad)

- Máximo 15 unidades. Cada carácter latino, cirílico, número o símbolo cuenta 1;
  cada ideograma chino cuenta 2 (máximo 7), porque ocupa el ancho de dos letras.
  El ruso usa el mismo límite que los idiomas latinos: el cirílico tiene el mismo ancho.
- Admite ASCII imprimible (letras, números, símbolos y espacio), letras latinas con
  tilde (`À-ÿ`, `Œ`, `œ`), cirílico, ideogramas chinos y el punto medio `·`.
- Se recortan los espacios de los extremos y se agrupan los interiores.
- Errores: vacío, caracteres no admitidos, solo símbolos (sin letra ni número) y
  demasiado largo. Claves `welcome.nameError*` en `Textos/<IDIOMA>/Common/welcome.md`.
- Al enviar un nombre válido: **1,75 s** hasta que nombre y descripción aparecen en
  pantalla; **2 s** después se muestra el menú con ambos arriba a la izquierda
  (`#player-badge`).
- La descripción sale de `Textos/<IDIOMA>/Player/descriptions.md` (lista numerada,
  misma numeración en los cinco idiomas). Se sortea al cambiar de nombre y se
  conserva mientras el nombre no cambie; al cambiar de idioma se traduce la misma entrada.
- Implementación: `scripts/player.js` (`window.NSG_PLAYER`). Pruebas: `tests/player.cjs`
  y `tests/welcome.cjs`.
