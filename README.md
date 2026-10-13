# Just Shoot It

A tactical first-person shooter that runs entirely in the browser: no backend, no database, no API keys.

**Play:** https://ygold121.github.io/lab1/

You attack **de_timberline**, a Dust 2–style layout overgrown by forest. You start with a Glock-19 and carry the bomb. Plant it at **A** or **B** and keep it alive for 40 seconds, or take out every defender. The defender bots also carry Glocks. They hold the sites, react to gunfire and footsteps, call out your position, and rush to defuse once the bomb is down. The first side to win 5 rounds takes the match.

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

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Left click | Shoot |
| Right click (hold) | Aim down sights (scope with the AWP) |
| `E` (hold, in a bombsite) | Plant the bomb |
| `R` | Reload |
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
- `src/world.js`: map grid, props, collision, ray casting, A* path finding, scenery
- `src/bots.js`: defender AI (hold, investigate, engage, defuse)
- `src/main.js`: player, rounds, bomb, money, buy menu, HUD
- `src/weapons.js`: weapon stats, prices, economy and bot loadouts per difficulty
- `src/viewmodel.js`: first-person weapons and hands
- `src/fx.js`, `src/audio.js`, `src/textures.js`: effects, sound, textures

To run it locally, serve the folder over HTTP (ES modules won't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
