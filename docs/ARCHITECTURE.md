# C++ and WebAssembly Analytics Architecture

Gym Log uses React for the interface and IndexedDB for storage. A separate C++17 core computes workout metrics from recorded sets. The same core runs natively and in the browser through WebAssembly.

The project keeps the existing personal workout PWA while demonstrating how to isolate the C++ code, handle numeric edge cases, define a contract between languages, and verify the code in both environments. There are no comparative benchmarks for runtime or memory use. With a small workout history, initializing and calling WebAssembly may take longer than the calculation itself.

## Responsibilities and Data Flow

```text
IndexedDB (Dexie)
    ↓ WorkoutSession / WorkoutSet
TypeScript: filter by exercise, completed sessions, and date range
    ↓ weightKg / reps / whether a weight was entered
WebAssembly C ABI
    ↓
C++ Accumulator: maximum weight, maximum reps, estimated 1RM, and volume
    ↓ metric values and availability
TypeScript: convert kg/lb and format dates and values for display
    ↓
React / Recharts
```

`native/include/gym/analytics_core.hpp` declares the public C++ types and `gym::Accumulator`. The implementation is in `native/src/analytics_core.cpp`, and the native tests are in `native/tests/analytics_core_test.cpp`. The browser adapter is in `src/native/analyticsEngine.ts`, and the app ships `public/wasm/gym-core.wasm`. The core has no dependencies on the browser, the DOM, IndexedDB, clocks, files, or the network.

`createAnalyticsEngine` verifies that the WASM module has zero external imports, exports the required functions, and reports the expected ABI version. It creates a separate WASM instance for each engine. The app waits for initialization before displaying the React interface. If loading fails, the app leaves workout records intact and shows a retry screen. It does not fall back to a separate JavaScript implementation.

TypeScript handles date interpretation, date ranges that account for month ends, separate sessions on the same day, display units, and text formatting. The C++ core always receives weights in kilograms. Analytics does not infer the user's body weight and treats bodyweight, added-weight, and assisted exercises separately from standard weighted exercises.

## ABI Version 1

The C ABI passes only numbers between JavaScript and C++. JavaScript never reads C++ object layouts or pointers.

| Export | Contract |
|---|---|
| `gym_abi_version() -> int` | Returns `1` for this ABI version. |
| `gym_reset(int load_type)` | Clears the accumulator and selects the load type. |
| `gym_add_set(double weight_kg, double reps, int has_weight)` | Adds one set. A value of 0 for `has_weight` means no weight was entered. Any other value means a weight was entered. |
| `gym_has_metric(int metric) -> int` | Returns 1 when the metric is available and 0 otherwise. |
| `gym_metric(int metric) -> double` | Returns the metric value, or 0 if unavailable. Check availability separately. |
| `gym_volume() -> double` | Sums weight × reps for sets with positive, finite weights and rep counts. This raw total is independent of metric availability for the current load type. |
| `gym_total_reps() -> double` | Returns the total reps across valid recorded sets. |
| `gym_recorded_count() -> double` | Returns the number of valid recorded sets. |

Load types are `0: weighted`, `1: bodyweight`, `2: bodyweightAdded`, and `3: assisted`. Metrics are `0: maxWeight`, `1: maxReps`, `2: estimated1RM`, and `3: volume`. After a reset with an invalid load type, the accumulator ignores sets until the next valid reset. For an invalid metric ID, both the availability check and the value return 0.

For each calculation, call `gym_reset`, call `gym_add_set` for each set, then query `gym_has_metric` and `gym_metric`. Each WASM instance holds one accumulator. Complete the sequence synchronously before starting another calculation on the same instance. Separate instances created in TypeScript have independent state.

## Metric Rules and Missing Values

A missing metric differs from a numeric zero. For example, 0 kg of assistance is a valid result. The JavaScript wrapper checks `gym_has_metric` and returns `undefined` when a metric is missing. If multiplying positive inputs underflows to zero, the volume metric is still available.

| Case | Calculation |
|---|---|
| Recorded set | A set counts if its rep count is finite and greater than zero. Maximum reps and volume accept fractional reps to match the previous behavior. |
| Standard weighted exercise | Maximum weight and volume use only positive, finite weights. |
| Estimated 1RM | Calculates `weight × (1 + reps / 30)` for positive, finite weights and whole rep counts from 1 to 12. Sets of 13 or more reps are excluded. |
| Bodyweight | Provides only maximum reps. It does not assume a body weight for maximum weight, estimated 1RM, or volume. |
| Bodyweight with added weight | Provides maximum added weight and maximum reps. A missing, non-finite, or negative weight on a recorded set counts as zero added weight. |
| Assisted | Provides maximum reps and the lowest non-negative assistance weight. Lower assistance means a harder set. |

The core handles NaN and Infinity according to each metric's input rules. **Finite inputs can still produce an infinite result.** Multiplication or addition can overflow to Infinity for extreme values, as it did in the previous JavaScript implementation. The UI enforces its own input limits separately from the core's numeric rules.

## Memory and Runtime Constraints

The core keeps running maxima, minima, totals, and flags for metric availability. It processes each set as it arrives and does not retain the sets. Processing n sets takes O(n) time and uses O(1) additional memory in the accumulator. Native calculations require neither heap allocation nor an input array. The ABI passes no strings, pointers, or shared input buffers, so neither language needs to free memory allocated by the other.

The WASM build sets both the initial and maximum linear memory to 128 KiB and the stack to 16 KiB. The accumulator's O(1) bound covers only its own state. The app also uses memory for the WASM module, the history arrays in TypeScript, IndexedDB, and the chart data. The app must handle initialization failures, unsupported browsers, and corrupt caches separately from calculation errors.

## Storage, Offline Use, and Updates

WebAssembly is a static asset served from the same origin as the app. `vite.config.ts` includes the `wasm` extension in the Service Worker cache settings. In a production build, the Service Worker precaches the WASM file so that analytics can load offline after the first successful online load and cache setup.

The app continues to use its existing IndexedDB schema. The analytics integration requires no record migration, server, external API, or cloud sync. If the app moves to a new hostname, records stored under the original origin do not move automatically. For each release, check that the JavaScript adapter and WASM binary are compatible and distribute the update through the app's existing prompt.

## Testing

- **Native C++.** Test which metrics each load type supports, missing versus zero values, initialization, input validation, Epley formula boundaries, and extreme values.
- **WebAssembly.** Load the compiled WASM binary and verify the exports, ABI version, values passed between C++ and JavaScript, and isolation between instances. The native tests cover the core, while these tests exercise the browser integration boundary.
- **Compatibility with the previous JavaScript implementation.** Check that typical inputs and edge cases produce the same metric values and availability. State the tolerances for floating-point comparisons and how to handle Infinity.
- **App regressions.** Run the existing tests for the database, workout history, exercises, units, dates, date ranges, and analytics.
- **Production build.** Check that the TypeScript, Vite, and PWA build steps pass and that the output contains the WASM asset and its cache entry.

## Builds and Artifact Integrity

```sh
npm run test:native
npm run build:wasm
npm run verify:wasm
npm test
npm run build
```

`test:native` uses the C++17 compiler specified by `CXX` and defaults to `g++`. `build:wasm` uses the pinned Zig 0.15.2 toolchain. Set the `ZIG` environment variable to specify the executable. The repository includes the compiled WASM binary so that app development that does not touch C++ can proceed without the C++ toolchain.

`build:wasm` records the SHA-256 hashes of the sources and compiled binary, the binary size, the compiler, and the ABI version in `native/wasm-manifest.json`. `verify:wasm` checks the hashes and binary size, then loads the actual WASM to verify imports, exports, and the ABI version. Both `npm test` and `npm run build` run this check to catch a stale binary after a C++ change. It checks consistency between the repository's files. It does not verify third-party signatures.

The README and pull request record the checks that were run. The test plan covers the environments listed above and does not establish browser-wide compatibility or a performance advantage.
