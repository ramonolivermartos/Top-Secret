## Alicientes

EL JUEGO SE LLAMARÁ: **TODA LA VERDAD***

- Buena música sin cpyright que te mantenga jugando (Habrá un selector de tipo de música para jugar)

- En la prsentación, debajo de cada pantalla de selección de opciones, hay un mensaje explicando brevemente de qué va el juego

- El juego avanzará según niveles, y cada jugo completado se añadirá a la lista

- Inventar teorías de la conspiración extravagantes que se desbloquean al conseguir x puntos. Serán textos absurdamente largos que se almacenarán

- Cuando se llega a 5000000 se recibe un texto de Albert Camus

- Cuando haya 20 juegos implementaremos un sistema en el menu principal que se llamará ronda express, en el cual el jugador recibirá, uno después de otro, 10 minijuegos que debe superar con exito (en los juegos con rondas su resulttado debe ser superior al 50% de victorias apra ganar y en  los juegos de una sola ronda la dificultad no bajara de media, sera media 30%, meda-alta 40%, alta 20%, muy alta 10%)

- Decidir cuantos puntos da cada nivel, por ejemplo si se completa un minijuego de 8.5 sobre -> 210 puntos, para uno de 6/8 sobre 10 -> 120 puntos, para uno de 4/6 sobre 10 -> 80 puntos (4/6 sobre 10 es el minimo)

- Crar un par de juegos en los que lo que manda es el puro y llano azar, sin más y cuanto menos probable sea que gane, más puntos se llevará, pero estos juegos tienen un handicap, pueden borrar puntos globales. Igual ganas como máximo 5000 puntos, pero puedes perder hasta un máximo de 2500

- Se dictará lo que dicen los mensajes de animo o desanimo con diferentes voces. La voz se podrá elegir como "compañero de viaje" en el menu de configuracion

- 150, 600, 1205, 2410, 3890, 4170, 5120, 6585, 7190, 8255, 8950, 9730, 10500

- Hayque hacerlo responsive
  **Resolución interna fija + Escalado (Aspect Ratio Locking):** El juego se renderiza internamente a una resolución fija (por ejemplo, $1280 \times 720$ píxeles). Luego, mediante CSS, se escala para que llene la pantalla del dispositivo, añadiendo pequeñas franjas negras a los lados (letterboxing) si las proporciones de la pantalla no coinciden.

- **UI adaptable con CSS (Flexbox / Grid):** Para los menús, botones flotantes, barras de vida o inventarios, sí puedes usar un diseño *responsive* tradicional de CSS. Así, los botones se pegan automáticamente a las esquinas de la pantalla del móvil, sin importar si es estrecha o ancha.

- **Librerías de ayuda:** Si usas un framework de juegos como **Phaser**, este viene con sistemas de escala automáticos diseñados específicamente para resolver este dolor de cabeza en distintas pantallas.