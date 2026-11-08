# Portfolio and Interview Guide

This repository contains a personal workout tracker built as a progressive web app (PWA), with an analytics core written in C++17 and compiled to WebAssembly. The app records weights and reps, shows workout history and progress, and stores data in the browser's IndexedDB.

When sharing the project in a job application, include the source link, instructions for running it, what you verified, why you made key design choices, and your test results.

## Sample project description

> This personal workout tracker lets you record weights and reps, review past workouts, and track your progress. The React and TypeScript app handles the interface and stores records in IndexedDB. It calls a C++17 analytics core in the browser through WebAssembly. The meaning of a metric depends on whether an exercise is bodyweight, uses added weight, or is assisted. The app distinguishes a missing weight from a valid weight of 0 kg, and tests check that the analytics match the existing JavaScript implementation.

Add a specific example of what you verified or changed and how it works.

## Technical topics to discuss

| Topic | What to explain | What to check for yourself |
|---|---|---|
| C++ analytics core | Analytics are separate from the UI and storage. The same core runs natively and in WebAssembly. | Can you trace the `Accumulator` state and see what changes when you add a set? |
| ABI | The interface passes numeric values and flags that indicate whether a metric is available. | Can you explain the order of calls in `reset → add_set → has_metric / metric`? |
| Missing values | A missing weight and a valid weight of 0 kg are distinct. | Can you give examples of 0 kg of assistance, an omitted weight, and a bodyweight exercise? |
| Numeric edge cases | The 1RM estimate applies to sets of 1 to 12 reps. The code handles `NaN` and `Infinity` inputs separately from overflow during calculation. | Can you use the tests to check what happens at 12 and 13 reps, with no sets, and with extreme values? |
| Memory use | The accumulator processes sets one at a time and uses O(1) extra memory. | Can you explain the memory used by the accumulator, the WASM instance, and the workout history array? |
| State management | Each WASM instance has its own accumulator. Calls for separate calculations on the same instance must run without interleaving. | Can you explain why two separate instances cannot change each other's results? |
| Offline use | The app and the WASM module are cached as static assets. | Can you explain what happens when you go offline after the first online visit versus opening the app for the first time offline? |
| Regression tests | The test suite covers the C++ core, the compiled WASM module, the existing JavaScript implementation, storage, and workout history. | Can you run the commands in the README and build a minimal reproduction if something fails? |

See the [architecture notes](ARCHITECTURE.md) for design details.

## Checks before applying

1. Run the app using the instructions in the README.
2. Log sets for weighted, bodyweight, added-weight, and assisted exercises. Check how their analytics differ.
3. Reload the page and check that the records are still there. Edit a past record and check that the analytics update.
4. Open the production build while online, then check that it starts and shows analytics offline.
5. Run `npm run test:native`, `npm run verify:wasm`, `npm test`, and `npm run build`. Record your environment and results. If you change the C++ code, run `npm run build:wasm` with the pinned Zig 0.15.2 toolchain before repeating the checks.

## Performance and scope

The project has no JavaScript versus WASM performance benchmarks yet. For a fair comparison, use the same data and calculation rules for both implementations. Record the initialization time, call overhead, dataset size, number of repetitions, and test environment.

C++ calculates the metrics, React displays them, and IndexedDB stores records locally. When discussing the design, explain how those responsibilities are separated, how the languages communicate, and how you integrate and test the C++ core in the existing app. Cloud sync and automatic backups of workout records are outside the current scope.

## AI assistance

Codex assisted with the code, tests, and documentation for the analytics extension. In a job application, name the tools you used, explain which parts you can describe and modify yourself, and give specific examples of what you verified or improved.
