# Just Shoot It

A tactical first-person shooter that runs entirely in the browser: no backend, no database, no API keys.

**Version:** 1.0 (in-game build 7)

**Play:** https://ygold121.github.io/lab1/

You attack one of two maps, choosing from the menu:

- **de_timberline**: a Dust 2–style layout overgrown by forest.
- **de_jaffa**: a Mirage-style layout in the old port city of Jaffa. T spawn is in the east and CT spawn in the south-west by the sea. A is reached by A Ramp, Palace, Jungle/Connector and CT. B is reached by Apartments, Short and Market. Window watches over Mid.

You start with a Glock-19 and carry the bomb. Plant it at **A** or **B** and keep it alive for 40 seconds, or take out every defender. The defender bots also carry Glocks. They hold the sites, react to gunfire and footsteps, call out your position, and rush to defuse once the bomb is down. The first side to win 5 rounds takes the match.

## Money and the buy menu

You earn cash for kills, for planting the bomb, and at the end of every round (more for a win; losses pay a bonus that grows with each loss in a row, up to $16,000 total). Press `B` during the freeze time, or in spawn during the first 20 seconds, to buy:

| Weapon | Price | Notes |
| --- | --- | --- |
| Glock-19 | $200 | Starting pistol |
| Desert Eagle | $700 | Hard-hitting pistol, 7 rounds |
| MP5 | $1,500 | Full-auto SMG, $600 per kill |
| AK-47 | $2,700 | Full-auto rifle, one-shot headshots |
| AWP | $4,750 | Scoped sniper rifle (right click to scope) |
| Kevlar + Helmet | $1,000 | Halves incoming damage |

If you survive a round you keep your guns and armor. If you die, you start the next round with a Glock.

## Difficulty

Difficulty controls the bots' aim and reactions, and also the money and weapons:

- **Easy:** you start with $2,500 and earn 50% more per kill. Defenders stick to pistols and SMGs and never wear armor.
- **Normal:** you start with $800. Defenders move up to SMGs from round 2 and rifles from round 3, and some wear armor.
- **Hard:** you start with $800 and earn less per kill. From round 2 the defenders carry rifles and an AWP, all in armor.

## Hebrew announcer

Key moments get a Hebrew voice line and banner: "איזה פצצה!" when the bomb is planted, "בול בראש!" for headshot kills, "יאללה, יאללה!" at round start, and more. The lines are spoken by the browser's built-in speech synthesis, so they need a Hebrew system voice (Windows, macOS, iOS and Android have one). Without one, the lines only show on screen. Turn it off with **Announcer → Off** in the menu.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Left click | Shoot |
| Right click (hold) | Aim down sights (scope with the AWP) |
| `E` (hold, in a bombsite) | Plant the bomb |
| `R` | Reload |
| `F` | Pick up a dropped weapon (walking over one picks it up when that slot is empty) |
| `B` | Buy menu (number keys to buy) |
| `1` / `2` / `Q` / mouse wheel | Primary / pistol / last weapon / swap |
| `Space` | Jump |
| `Shift` | Walk quietly (bots can't hear you) |
| `C` | Crouch |
| `Tab` | Scoreboard |
| `Esc` | Pause |

## How it's built

- [Three.js](https://threejs.org/) 0.160, loaded from a CDN through an import map, with no build step.
- All textures are drawn procedurally on canvas, and all sounds are synthesized with WebAudio, so there are no asset files.
- `src/world.js`: map definitions (layout, props, zones, defender spots), collision, ray casting, A* path finding, scenery per theme
- `src/bots.js`: defender AI (hold, investigate, engage, defuse)
- `src/main.js`: player, rounds, bomb, money, buy menu, HUD
- `src/weapons.js`: weapon stats, prices, economy and bot loadouts per difficulty
- `src/viewmodel.js`: first-person weapons and hands
- `src/voice.js`: Hebrew announcer lines (Web Speech API)
- `src/fx.js`, `src/audio.js`, `src/textures.js`: effects, sound, textures

### Publishing an update

GitHub Pages lets browsers cache files for 10 minutes, so every script and sound is loaded with a `?v=N` version tag. Before committing a change, run:

```sh
sh tools/bump-version.sh
```

This bumps the version everywhere at once, and browsers download the new build right away. The menu shows the build number in the bottom-left corner, so you can check which version you're running.

To run it locally, serve the folder over HTTP (ES modules won't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
