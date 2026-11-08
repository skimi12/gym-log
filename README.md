# Gym Log

Log your weights and reps, look up your last workout, and see your progress on a chart. Gym Log saves your records in your browser's IndexedDB.

On the analytics screen, TypeScript passes the weight and reps for each set to C++, and React displays the results. The C++ code runs in the browser as WebAssembly. For example, if you lift 60 kg for 5 reps and 55 kg for 8 reps, your heaviest set is 60 kg, your highest rep count is 8, and your total volume is 740 kg × reps (60 × 5 + 55 × 8).

The calculations are in [`native/src/analytics_core.cpp`](native/src/analytics_core.cpp). See [Architecture and testing](docs/ARCHITECTURE.md) for more detail.

## Features

- Log weights, reps, and sets with autosave. Copy entries from your last workout or resume an interrupted session.
- Search and sort 133 built-in exercises, save favorites, and add your own exercises.
- View, edit, or delete past workouts.
- Chart your heaviest weight, highest rep count, estimated one-rep max (1RM), and workout volume over time.
- Switch between kg and lb and between light and dark themes. Track bodyweight, weighted bodyweight, and assisted exercises.
- Add the app to your iPhone Home Screen, use it offline, and get notified when an update is available.

## Development on Windows

Install a stable version of Node.js, then open this folder in PowerShell or Windows Terminal.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite in your browser. To access the development server from an iPhone on the same network, use `npm run dev -- --host`. Use HTTPS when testing installation as a PWA or checking the service worker on an iPhone.

## Build

```bash
npm run build
```

The build writes the static files to `dist`.

If you deploy with Sites, this command also generates the deployment worker:

```bash
npm run build:sites
```

## Tests

```bash
npm run test
```

The browser-facing tests load the bundled WebAssembly directly. In addition to testing workout logging and analytics, they cover all four load types, missing values, boundary cases, large sets of workout data, and retries after initialization fails.

## C++ implementation

### Native tests

Install Node.js and a C++17 compiler (GCC or Clang). On Windows, you can use MinGW GCC from MSYS2.

```bash
npm run test:native
```

To choose a compiler, set the `CXX` environment variable to its executable path. You can also run the tests with CMake. They require no additional libraries.

```bash
cmake -S . -B build/cmake -DCMAKE_BUILD_TYPE=Release
cmake --build build/cmake
ctest --test-dir build/cmake --output-on-failure
```

### Rebuild WebAssembly

For regular web development, use the bundled `public/wasm/gym-core.wasm`. If you change the C++ source, rebuild it with the C++ compiler included in [Zig 0.15.2](https://ziglang.org/download/). Zig is a build tool for the C++ code.

```bash
npm run build:wasm
npm run test:native
npm test
npm run build
```

If Zig is not on your `PATH`, set the `ZIG` environment variable to its executable path. The build records SHA-256 hashes for the C++ source and the generated WASM in `native/wasm-manifest.json`. Both `npm test` and `npm run build` check these hashes and stop if the source or binary is out of sync.

There are no benchmarks comparing WebAssembly and JavaScript performance.

## Preview the production build locally

```bash
npm run preview
```

## Use Gym Log on iPhone

Gym Log is a progressive web app (PWA). To deploy it, upload the `dist` directory created by `npm run build` to a static host that supports HTTPS, such as Cloudflare Pages, Vercel, Netlify, or GitHub Pages. The app does not depend on any provider-specific APIs.

Set the build command to `npm run build` and the publish directory to `dist`. The app does not use URL paths for routing, so you usually do not need rewrite rules for a single-page app.

Open the deployed URL in Safari on your iPhone:

1. Tap the Share button.
2. Tap **Add to Home Screen**.
3. Check the name and tap **Add**.
4. Open the app from its Home Screen icon.

Open the app once while online so it can cache the files it needs. You can then log workouts, view your history, and check your progress offline. When a new version is available, the app shows an update prompt. You can apply the update after your workout ends.

## Data storage

Workouts, exercises, favorites, and settings are stored in the current browser's IndexedDB. The app does not send this data to a server or back it up to the cloud.

Clearing Safari history and website data, deleting this site's data, or resetting your device can erase your records. Version 1 does not support backups or CSV export.

## Tech stack

- React + TypeScript + Vite
- C++17 / WebAssembly for set-by-set analytics, with no external runtime dependencies or network calls
- Dexie.js and dexie-react-hooks for IndexedDB
- Recharts for analytics charts
- lucide-react for icons
- vite-plugin-pwa for the web app manifest and service worker
- Vitest for unit tests

The app stores weights in kilograms and converts them to pounds for display when needed. For barbells, enter the total weight including the bar. For dumbbells, enter the weight of one dumbbell. For machines and cables, enter the weight shown on the equipment.
