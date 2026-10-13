# Just Shoot It

A tactical first-person shooter that runs entirely in the browser: no backend, no database, no API keys.

**Version:** 1.0 (in-game build 9)

**Play:** https://ygold121.github.io/lab1/

You play on one of two maps, chosen from the menu:

- **de_timberline**: a Dust 2–style layout overgrown by forest.
- **de_jaffa**: a Mirage-style layout in the old port city of Jaffa. T spawn is in the east and CT spawn in the south-west by the sea. A is reached by A Ramp, Palace, Jungle/Connector and CT. B is reached by Apartments, Short and Market. Window watches over Mid.

You play alone against a team of bots. A match is **10 rounds**. When you press Deploy, the game picks your side at random: terrorist (T) or counter-terrorist (CT). After round 5 it's **halftime**: you and the bots switch sides, and everyone's money and gear start over (starting money and a Glock, no armor or kit). Each score stays with its team, so after halftime yours moves to the other side of the scoreboard. Whoever has won more rounds after 10 wins the match, and 5–5 is a draw. A full-screen card tells you which side you're on ("YOU ARE A TERRORIST" / "YOU ARE A COUNTER-TERRORIST") at the start of the match and again at halftime. At the end, a **VICTORY**, **DEFEAT** or **DRAW** screen shows the final score, a strip with each round's result and the side you played it on, and your kills, deaths, K/D and headshot percentage. The bots carry pistols, SMGs or rifles depending on the difficulty and the round (see below), react to gunfire and footsteps, and call out your position.

**Terrorists:** you start with a Glock-19 and carry the bomb. Plant it at **A** or **B** (hold `E` on the site) and keep it alive for 40 seconds, or take out every counter-terrorist. The counter-terrorist bots hold the sites and rush to defuse once the bomb is down. You hold your gun like the terrorist bots do: one-handed and tipped sideways, which costs you a little accuracy.

**Counter-terrorists:** you start at CT spawn and the terrorist bots attack. Each round they pick a bombsite and push it, some taking detours through other parts of the map. One of them carries the bomb on its back. Terrorists hold their guns out in one hand, tipped sideways, which makes them a little less accurate. If the carrier dies, the bomb drops and another terrorist goes back for it. After planting, the terrorists spread out to guard the bomb. Hold `E` next to the bomb to defuse it: 10 seconds, or 5 with a defuse kit. Moving or letting go starts the defuse over, and the terrorists hear it. You win if you kill every terrorist before they plant, if time runs out without a plant, or if you defuse the bomb. Once the bomb is down, killing the terrorists isn't enough: you still have to defuse it.

## Money and the buy menu

You earn cash for kills, for planting the bomb, and at the end of every round (more for a win; losses pay a bonus that grows with each loss in a row, up to $16,000 total). Press `B` during the freeze time, or in spawn during the first 20 seconds, to buy:

| Weapon | Price | Notes |
| --- | --- | --- |
| Glock-19 | $200 | Starting pistol |
| Desert Eagle | $700 | Hard-hitting pistol, 7 rounds |
| MP5 | $1,500 | CT only: full-auto SMG, $600 per kill |
| Uzi | $1,200 | T only, in place of the MP5: fast-firing SMG, 32 rounds, $600 per kill |
| AK-47 | $2,700 | T only: full-auto rifle, one-shot headshots |
| Tavor TAR-21 | $3,000 | T only: bullpup rifle with a red-dot sight |
| M4A1 | $2,900 | CT only, in place of the AK-47: full-auto rifle. Press `X` to attach or remove a suppressor (M4A1-S) |
| AWP | $4,750 | Scoped sniper rifle (right click to scope) |
| Kevlar + Helmet | $1,000 | Halves incoming damage until it wears out |
| Defuse Kit | $400 | CT only: defuse in 5 seconds instead of 10 |

You buy in your own spawn (T spawn as a terrorist, CT spawn as a counter-terrorist). If you survive a round you keep your guns, armor and kit. If you die, you start the next round with a Glock.

**Dropped weapons:** a bot drops its gun when it dies, with the ammo it had left, marked by an orange ring on the ground. Walk over it to pick it up if that slot is empty, or press `F` to swap it for the gun you're holding (yours drops where you stand). Dropped guns are cleared at the start of each round.

## Difficulty

Difficulty controls the bots' aim and reactions, and also the money and weapons:

- **Easy:** you start with $2,500 and earn 50% more per kill. The bots stick to pistols and SMGs and never wear armor.
- **Normal:** you start with $800. The bots move up to SMGs from round 2 and rifles from round 3, and some wear armor.
- **Hard:** you start with $800 and earn less per kill. From round 2 the bots carry rifles and an AWP, all in armor.

## Hebrew announcer

Key moments get a Hebrew voice line and banner: "איזה פצצה!" when the bomb is planted, "בול בראש!" for headshot kills, "יאללה, יאללה!" at round start, and more. The lines are spoken by the browser's built-in speech synthesis, so they need a Hebrew system voice (Windows, macOS, iOS and Android have one). Without one, the lines only show on screen. Turn it off with **Announcer → Off** in the menu.

## Sounds

- **Gunshots:** your guns play a recorded gunshot. The bots' guns use a generic synthesized shot, so you can tell your fire from theirs.
- **Shouts:** there are four recorded shouts. When you die, one of them always plays. When you kill a bot, one plays a third of the time. Each of the four is equally likely.
- **"Move":** standing still for 5 seconds during a live round plays a recorded "move" clip, and it repeats while you stay still. It doesn't play while you're planting the bomb.

## Controls

Keys work on any keyboard layout, including Hebrew (tested in Firefox): the game reads the physical key position, and typed characters can't trigger browser shortcuts while you play.


| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Left click | Shoot |
| Right click (hold) | Aim down sights (scope with the AWP) |
| `E` (hold) | Terrorist: plant the bomb on a bombsite. Counter-terrorist: defuse the bomb |
| `R` | Reload |
| `X` | M4 only: attach or remove the suppressor. Suppressed shots make no gunshot sound, show no muzzle flash or tracer, and bots only hear them up close. They do slightly less damage, with a little less recoil and spread |
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
- All textures are drawn procedurally on canvas. Most sounds are synthesized with WebAudio. The recorded clips (gunshot, four shouts, "move") are WAV files in `assets/`.
- `src/world.js`: map definitions (layout, props, zones, CT holding spots), collision, ray casting, A* path finding, scenery per theme
- `src/bots.js`: bot AI for both teams (counter-terrorists hold, investigate, fight and defuse; terrorists push a site, plant, recover a dropped bomb and guard it)
- `src/main.js`: player, rounds, sides, bomb, money, buy menu, HUD
- `src/weapons.js`: weapon stats, prices, economy and bot loadouts per difficulty
- `src/viewmodel.js`: first-person weapons and hands
- `src/voice.js`: Hebrew announcer lines (Web Speech API)
- `src/pickups.js`: weapons dropped on the ground and picking them up
- `src/fx.js`, `src/audio.js`, `src/textures.js`: effects, sound (including loading the recorded clips), textures
- `tools/bump-version.sh`: raises the cache-busting version before a release (see below)

### Publishing an update

GitHub Pages lets browsers cache files for 10 minutes, so every script and sound is loaded with a `?v=N` version tag. Before committing a change, run:

```sh
sh tools/bump-version.sh
```

This bumps the version everywhere at once, and browsers download the new build right away. The menu shows the build number in the bottom-left corner, so you can check which version you're running.

For quick testing, add `?rounds=N` to the address to shorten the match, for example `?rounds=1` to go straight to the result screen after one round.

To run it locally, serve the folder over HTTP (ES modules won't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000
```
