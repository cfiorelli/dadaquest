# Da Da Quest

A short comedic 2D platformer where a baby crawls, climbs, swings, and wobbles across the house to find Da Da on the rooftop garden.

## Play Online

After deploying to GitHub Pages the game is available at:
`https://<your-github-username>.github.io/<repo-name>/`

## Local Development

```bash
npm install
npm run dev
```
Then open http://localhost:3000 in your browser.

## Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Controls

| Key | Action |
|-----|--------|
| Left / Right | Move (crawl / walk) |
| Up / Down | Climb up/down on walls |
| Space | Jump / release swing / interact |
| R | Restart current scene |
| D | Toggle debug overlay (hitboxes & state) |
| Enter or Space | Advance on title/end screens |

## Scenes

1. **The Crib** — Wake up, climb the crib walls, grab the mobile and swing to the dresser. Pick up the onesie for stamina. Exit left.
2. **Escape Bedroom** — Sneak past Mom at the piano (she has headphones on). Touch her = back to the crib!
3. **Kitchen** — Avoid the slippery puddles near the sourdough starter. Slip = reset to kitchen entrance.
4. **Stairs** — Climb the ascending stair steps. Don't wake the chihuahua! (Pushback only, no full reset.)
5. **Rooftop Garden** — Mount the rocking horse and hold Right for 2 seconds to ride to the window. Climb up and reach Da Da!

## Mechanics

- **Stamina** (1–4 stars): Depleted by wall-climbing and swing-pumping. Hits 0 → forced 3-second nap.
- **Forced Nap**: Also triggers if you spend too long in one section (every ~30 seconds).
- **Onesie Pickup** (Scene 1): +1 stamina (capped at 4).

## Enabling GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select **GitHub Actions**.
4. Push to `main` — the workflow will build and deploy automatically.
5. Your game will be live at `https://<username>.github.io/<repo>/`.

## Architecture

```
src/
  main.js           # Phaser game config + scene list
  gameConfig.js     # Constants (sizes, colors, player tuning)
  scenes/
    BootScene.js    # Generates all textures via Phaser Graphics
    TitleScene.js
    CribScene.js
    BedroomScene.js
    KitchenScene.js
    StairsScene.js
    RooftopScene.js
    EndScene.js
  entities/
    PlayerBaby.js   # State machine: CRAWL | AIR | WALL_CLIMB | SWING | NAP
  ui/
    HUD.js          # Stamina icons, speech bubbles, floating text, zzz
  audio/
    sfx.js          # WebAudio procedural SFX (no external files)
  utils/
    pendulum.js     # Simple pendulum physics for the mobile swing
    state.js        # Stamina helpers + STATE constants
```

## No External Assets

All art is drawn at runtime with Phaser Graphics → textures.
All sound effects are generated with WebAudio API.
Zero external network calls. Fully self-contained.
