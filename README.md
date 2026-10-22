# Materia Medica

An open-world 3D naturalist game that runs in the browser. Explore an endless,
procedurally generated chain of islands and fill your field journal with the
real plants, fungi and animals behind some of medicine's biggest discoveries.

No timers, no enemies, no fail states. Wander at your own pace.

## Play

```bash
npm install
npm run dev      # then open the URL it prints (usually http://localhost:5173)
```

To build a static version: `npm run build` (output goes in `dist/`, which runs from any web host).

**GitHub Pages:** the included workflow (`.github/workflows/deploy.yml`) publishes the game
whenever `main` is updated. Turn it on once under *Settings → Pages → Source: GitHub Actions*.

Add `?seed=12345` to the URL to explore a specific world.

## Controls

| Key | Action |
| --- | --- |
| `W A S D` / arrows | Walk |
| Mouse | Look (click the game to capture the mouse; or drag) |
| Scroll | Zoom camera |
| `Shift` | Run (uses stamina) |
| `Space` | Jump |
| `C` | Sneak on/off. Animals let you get closer |
| `E` | Sample a plant · **hold** to observe an animal |
| `Q` | Sense the nearest unrecorded species (compass ◆ + minimap) |
| `J` | Field journal |
| `M` | Toggle minimap |
| `H` | Controls |
| `Esc` | Pause |

Touch screens get a virtual joystick, drag-to-look and on-screen buttons.

## The world

- **Endless terrain**, streamed in 64 m chunks around you, built from seeded simplex noise
  (continents, hills, softened ridged mountains, domain warping).
- **Ten biomes:** open water, coastal sands, wetland, grassland, dry meadow, broadleaf
  woodland, conifer forest, misty "cloud slopes", highland rock and snowfields.
- **Day/night cycle** with sunsets, stars, a moon, drifting clouds and a lantern at night.
- **Wildlife** that grazes, wanders and runs away if you sprint toward it.
- **Procedural ambience** (wind, birdsong, crickets), all made with WebAudio. There are no sound files.
- Progress **saves automatically** in your browser (localStorage).

## The Materia Medica: 15 species

| Species | Where | Why it matters |
| --- | --- | --- |
| Foxglove *(Digitalis purpurea)* | Grassland, woodland edges | Cardiac glycosides; Withering, 1785 |
| White willow *(Salix alba)* | Wetlands | Salicin, which led to aspirin; COX acetylation |
| Pacific yew *(Taxus brevifolia)* | Conifer forest | Paclitaxel, which stabilises microtubules |
| Sweet wormwood *(Artemisia annua)* | Dry meadows | Artemisinin; Tu Youyou, Nobel 2015 |
| Madagascar periwinkle *(Catharanthus roseus)* | Beaches | Vincristine/vinblastine, which block microtubule assembly |
| Penicillium mould *(Penicillium rubens)* | Logs in broadleaf woods | Penicillin, β-lactams and PBPs |
| Fly agaric *(Amanita muscaria)* | Conifer forest | The source of the name "muscarinic" receptors; muscimol acts on GABA-A |
| Cinchona *(Cinchona officinalis)* | Cloud slopes | Quinine and quinidine |
| Snowdrop *(Galanthus nivalis)* | Near the snowline | Galantamine, an acetylcholinesterase inhibitor |
| Red deer *(Cervus elaphus)* | Grassland, woods | Antler regeneration |
| European rabbit *(Oryctolagus cuniculus)* | Grassland, meadows | Pasteur's rabies vaccine; the pyrogen test |
| Red fox *(Vulpes vulpes)* | Woods, open country (often at dusk) | Oral rabies vaccine baits; tapetum lucidum |
| Common frog *(Rana temporaria)* | Wetlands, shores | Temporin peptides; Loewi's acetylcholine experiment |
| Common swift *(Apus apus)* | The sky, by day | 10 months airborne; one-way avian lungs |
| Common eastern firefly *(Photinus pyralis)* | Grass & woods at night | Firefly luciferase in research and imaging |

Each journal entry covers natural history, the medical connection and how it works
(the mechanism, or the physiology for animals). The text is written for curious players,
not as medical advice.

## Accessibility & comfort

Settings (from the title screen or pause menu) include look sensitivity, invert-Y,
view distance, resolution, shadows, day length, volume, minimap, specimen glow, and a
**reduced motion** mode. Reduced motion is on by default if your system asks for it.
Opening the journal or any menu pauses the world.

## Project layout

```
src/
  main.js              game loop, state & UI wiring
  core/                noise, input, camera, settings/save, audio
  world/               worldgen (height + biomes), terrain chunks, vegetation, sky, water, clouds/fireflies
  entities/            player, creatures, low-poly models
  game/                species data, specimen models & placement
  ui/                  HUD (compass, minimap, prompts) and the field journal
```
