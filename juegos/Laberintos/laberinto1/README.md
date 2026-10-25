# Laberinto suicida 1

Localized (es, en, fr, ru, zh-Hans) game in the `mazes` category; texts live in `Textos/<LANG>/Games/laberinto/laberinto.md`. A game has three rounds of
150 seconds each, like the calculator. Every round draws a tier and generates a
different layout from the previous one. The maze is only revealed when its timer
starts; studying it is part of the two-and-a-half-minute round. All three rounds
are always played: escaping scores the tier points, a dead end or timeout scores
nothing. Points are published as provisional after each round and settled once
when the game ends. Pausing hides the maze and stops the timer and the break
between rounds.

The original 12×12 layout is the Easy reference.

Shared code lives in `juegos/Laberintos/`: `maze-levels.js` (id, label and
points), `maze-core.js` (rules and generator), `maze-game.js` (UI and rounds)
and `maze.css`. This folder only has `index.html` and `maze-config.js`.

Every cell is reachable. Additional corridors form cycles that can lead back
to already visited cells. The permanent trail still blocks re-entry.
Having no unvisited neighboring cell loses the round immediately.

The exit has 2 apparent approaches in Very easy and Easy (corner exit) and
3 in Easy–Medium and Medium (exit on the bottom edge). Exactly one is reachable
from the entrance without crossing the exit first. Every other approach leads
into its own decoy corridor attached only to the exit, so it cannot be used to
win. Return circuits cannot reconnect decoys to the playable area. Each false
approach has a continuous route of at least 8 / 12 / 18 / 24 cells, measured
from the false approach away from the exit (the exit cell is not counted).

The tier is never rerolled when a candidate is rejected.

| Tier | Probability | Grid | Solution steps | Minimum turns | Minimum wrong branches | Approaches | Minimum decoy | Return circuits | Points |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Very easy | 5% | 8×8 | 15–35 | 5 | 3 | 2 | 8 | 2 | 30 |
| Easy | 15% | 12×12 | 36–75 | 12 | 5 | 2 | 12 | 3 | 50 |
| Easy–Medium | 30% | 15×15 | 76–125 | 25 | 8 | 3 | 18 | 4 | 90 |
| Medium | 50% | 18×18 | 126–210 | 40 | 12 | 3 | 24 | 5 | 140 |

These are provisional calibration bounds, adjustable after playtesting.
The solution metrics are measured again after adding cycles (using a shortest
route). The red difficulty debug label appears when each maze is revealed.
To tune the game, adjust `maze-config.js`; points live in `../maze-levels.js`.
The renderer and movement use the same
`{ width, height, passages, entrance, exit, hint }` format; `passages[cell]`
lists the adjacent cells reachable through open corridors. Tiers use the shared
`id` and `label` contract defined in `Directives/Difficulty_Debug.md`.
