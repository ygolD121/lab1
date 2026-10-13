# Just Shoot It

A tactical first-person shooter that runs entirely in the browser: no backend, no database, no API keys.

**Play:** https://ygold121.github.io/lab1/

You attack **de_timberline**, a Dust 2–style layout overgrown by forest. You're armed with a Glock-19 and carry the bomb. Plant it at **A** or **B** and keep it alive for 40 seconds, or take out every defender. The defender bots also carry Glocks. They hold the sites, react to gunfire and footsteps, call out your position, and rush to defuse once the bomb is down. The first side to win 5 rounds takes the match.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Left click | Shoot |
| Right click (hold) | Aim down sights |
| `E` (hold, in a bombsite) | Plant the bomb |
| `R` | Reload |
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
- `src/main.js`: player, rounds, bomb, HUD
- `src/viewmodel.js`: first-person Glock and hands
- `src/fx.js`, `src/audio.js`, `src/textures.js`: effects, sound, textures

To run it locally, serve the folder over HTTP (ES modules won't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
