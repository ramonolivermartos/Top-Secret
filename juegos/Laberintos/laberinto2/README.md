# Laberinto suicida 3

Project ID and folder: `laberinto2`; in-game title: «Laberinto suicida 3».
Localized (es, en, fr, ru, zh-Hans) game in the `mazes` category; texts live in `Textos/<LANG>/Games/laberinto/laberinto.md`. It shares rules, rounds,
scoring and code with [laberinto1](../laberinto1/README.md): three rounds of
150 seconds, tier points on escape, nothing on a dead end or timeout.

Only Medium and Medium–Hard mazes appear. Medium–Hard has four apparent exit
approaches (interior exit) and shows a hint: a small cyan circle on the middle
cell of the shortest correct route.

| Tier | Probability | Grid | Solution steps | Minimum turns | Minimum wrong branches | Approaches | Minimum decoy | Return circuits | Points | Hint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Medium | 45% | 18×18 | 126–210 | 40 | 12 | 3 | 24 | 5 | 140 | – |
| Medium–Hard | 55% | 24×24 | 170–300 | 60 | 16 | 4 | 30 | 6 | 230 | yes |

Medium–Hard was planned as 21×21 with 211–300 steps, but three decoy corridors
leave too little room on that board: almost no candidate reached 211 steps.
24×24 with 170–300 steps keeps a rejection rate similar to Medium and generates
in about 0.2 s. These bounds are provisional and adjustable in `maze-config.js`.
