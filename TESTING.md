# Testing

DaDaQuest has three intended Playwright paths. Use the smallest one that matches the change.

## Daily Iteration

For most local edits:

```bash
npm run test:fast
```

`test:fast` uses the Vite dev server on Chromium only and runs the smallest high-signal checks:
- deterministic smoke boot
- Era 5 menu/progression lock visibility
- Level 5 Era 5 HUD + weapon/music sanity

If you are rerunning often, keep the dev server hot in another terminal:

```bash
npm run dev:test
```

Then rerun `npm run test:fast`, `npm run test:level5`, or `npm run test:era5` without rebuilding.

## Targeted Runs

Use these when you are touching a specific gameplay area:

```bash
npm run test:level5
npm run test:era5
```

- `test:level5` runs the tagged Level 5 controller/camera/readability checks.
- `test:era5` runs the tagged Level 5–9 progression and Era 5 gameplay checks.

To run an even narrower slice, pass a grep or file directly:

```bash
npx playwright test --config playwright.dev.config.mjs --project=chromium -g "@level5"
npx playwright test --config playwright.dev.config.mjs --project=chromium -g "level 7"
npx playwright test --config playwright.dev.config.mjs tests/runtime-levels.spec.js --project=chromium
```

## Before Larger Pushes

For major gameplay, progression, camera, save, HUD, or audio changes:

```bash
npm run build && npm run preview -- --host 127.0.0.1 --port 4173
npm run test:full
```

`test:full` uses a production build plus preview server and runs the full Chromium regression suite. This is the path to use before pushing larger gameplay changes.

## Screenshots

Screenshot capture is intentionally separate from gameplay regression:

```bash
npm run test:screenshot
```

Use it when changing visuals, composition, or docs/screenshots. It uses a production build and preview server, but it is not part of the default daily loop.

## Headed Debugging

For manual inspection:

```bash
npm run test:headed -- -g "@level5"
```

The headed path uses the dev-server-backed Playwright config so it starts faster than the full preview path.
