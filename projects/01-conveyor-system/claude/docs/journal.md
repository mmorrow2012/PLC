## Scaffold — 2026-08-05
<!-- METRICS:scaffold -->
- **Execution Duration:** 196.4 seconds
- **Model:** claude-sonnet-5
- **Turns:** 53
- **Input Tokens:** 1,359,707
- **Output Tokens:** 12,958
- **Estimated Cost:** $0.8856

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace under `code/` with the exact directory layout requested (components, store, plc, docs placeholders).
- Pinned dependency ranges to versions already validated in the sibling `01-conveyor-system` scaffolds (React 18.2, TypeScript 5.3, Tailwind 3.4, Zustand 4.5, `@monaco-editor/react` 4.6) to keep the install graph predictable.
- `npm install` against the initial Vite 5.1 / `@vitejs/plugin-react` 4.2 pins surfaced a moderate `dompurify` advisory (via `monaco-editor`) and a moderate `esbuild` advisory (via `vite`). Added an `overrides` entry pinning `dompurify` to `^3.4.12` and bumped `vite` to `^8.2.0` with `@vitejs/plugin-react` `^6.0.5` (and `postcss` to `^8.5.18` for compatibility) to reach `npm audit` reporting 0 vulnerabilities.
- Left `vite.config.ts` at the default `@vitejs/plugin-react` starter shape with no `base` path, per the requirement that the repo-level Pages workflow injects `--base` at build time.
- Gave `tailwind.config.js` a dark-mode industrial color palette (`industrial` slate/cyan tones) and monospace font stack, applied via `class` dark mode and used directly in `App.tsx`/`index.html`.
- Kept all skeleton components, the Zustand store, and the soft-PLC scan-loop engine minimal and typed so `npm install` and `npm run dev`/`build` succeed without any real control logic yet.

**Trade-offs / deviations from prompt:**
- Added `index.html` and `postcss.config.js` in `code/` — not listed in the prompt's tree, but both are required for Vite's dev server and the Tailwind PostCSS pipeline to function.
- `conveyorLogic.st` was left empty as requested; `CodeViewer.tsx` therefore mounts the Monaco editor with an empty default value rather than importing PLC source text, avoiding the need for a custom raw-text loader at this stage.
- `ARCHITECTURE.md` and `PLC_LOGIC.md` were left empty placeholders as requested.

## Logic Implementation — 2026-08-05
<!-- METRICS:logic -->
- **Execution Duration:** 770.6 seconds
- **Model:** claude-sonnet-5
- **Turns:** 66
- **Input Tokens:** 3,767,890
- **Output Tokens:** 65,712
- **Estimated Cost:** $2.9176

**Decisions:**
- Wrote `conveyorLogic.st` as a single `PROGRAM ConveyorLogic` POU (rather than a `FUNCTION_BLOCK`) with four ordered rung blocks — safety interlock, speed ramp, part sorting, annunciation — evaluated in that fixed priority order every scan, matching the M580 MAST task model described in the prompt.
- Added `Cmd_Start`, `Cmd_Stop`, `Cmd_ManualReset`, and `Speed_Setpoint` as operator/HMI input tags beyond the prompt's I/O table, since a Start/Stop/Reset/speed-setpoint interface is required to actually operate the line; documented these in `PLC_LOGIC.md §2` alongside the required tags.
- Implemented the E-Stop interlock as a scan-priority-one rule (`IF NOT E_Stop THEN EStopFaultLatched := TRUE`) evaluated before the Start/Stop seal-in, so `VFD_Run` is forced false in the same scan the fault occurs, with `R_TRIG`-gated `Cmd_ManualReset` (only accepted while `E_Stop = TRUE`) as the explicit resume path — no auto-restart on E-Stop restoration.
- Modeled `VFD_Speed_Ref` as a 2-second linear soft-start ramp to `Speed_Setpoint` while `VFD_Run = TRUE`, dropping to 0% immediately on stop/fault, using `TON.ET` converted via `TIME_TO_DINT`/`DINT_TO_REAL` (a standard Unity Pro conversion idiom) rather than an unsupported `TIME_TO_REAL`.
- Ported `conveyorLogic.st` line-for-line into `src/plc/plcLogic.ts` as a pure `runConveyorLogic()` function (edge detection modeled with explicit `prev*` fields instead of `R_TRIG` FBs, timers modeled as elapsed/remaining-ms counters instead of `TON` FBs) so the browser demonstrator's control behavior is traceable back to the ST source rather than being an independent reimplementation.
- Built `beltSimulation.ts` as a small physical-process model (part advancement, sensor-crossing detection, discharge) separate from `plcLogic.ts`, so the scan engine's "read inputs / execute / write outputs" phases stay clearly separated and each half stays independently testable.
- Expanded `usePlcStore.ts` into a full memory image: `inputs`/`outputs`/`internal`/`commands` mirror the ST program's variable blocks, `parts` holds the simulated belt contents, `forces` implements Control-Expert-style forced I/O overrides (applied last, after logic, in `applyScan`), and `systemReset()` provides a full simulation reset distinct from the PLC's own `Cmd_ManualReset` fault-clear path.
- Modeled HMI pushbuttons (`Cmd_Start`/`Cmd_Stop`/`Cmd_ManualReset`) as one-shot pulses: the store sets the bit true, `softPlcEngine` consumes and clears it within the same tick it's read, reproducing momentary-contact behavior without requiring the UI to track press/release.
- `Visualizer.tsx` renders the belt, sensor, diverter, and alarm tower as inline SVG with a `requestAnimationFrame`-driven tread animation (mutating a ref's `style.transform` directly instead of React state) so belt-motion smoothness is decoupled from the 50ms store update rate; a full-viewport red pulsing overlay renders whenever `E_Stop = FALSE`, plus a separate amber "reset required" banner when the fault is latched but the circuit has already been restored.
- `CodeViewer.tsx` imports `conveyorLogic.st` via Vite's `?raw` loader (declared in a new `vite-env.d.ts`) so the exact source file is what's displayed, and uses Monaco decorations keyed off live store state to highlight the safety/speed/sorting rung blocks as they become active — the "read-only execution indicators" called for in the prompt.
- `ControlPanel.tsx` starts/stops the shared `plcEngine` singleton on mount/unmount and exposes E-Stop trip/restore, manual reset, start/stop, a speed-setpoint slider, part spawning (color + weight), forced-override toggles for the four output tags, and a system reset.

**Trade-offs / deviations from prompt:**
- The diverter solenoid's 750ms dwell timer and the part's simulated belt-transit time from the sensor (60% position) to the diverter (78% position) are not physically synchronized against `Speed_Setpoint` — at low speeds a part would physically take longer to arrive than the dwell holds in a strict real-world model. The demonstrator deliberately decouples the diverter arm's visual swing (driven directly by the `Actuator_Diverter` output tag, so it always reflects the true PLC output) from the rejected part's rendered exit path (driven by the part's own `rejected` flag once past position 78%), since exact physical synchronization across the full speed range isn't meaningful for a browser visualization and would require either an unrealistically short belt or a variable dwell time not present in the prompt's spec. This is called out in `ARCHITECTURE.md §4`.
- `Sensor_Color = 3` (Special/Blue) is treated as non-reject (passes straight to the accept lane, distinguished only by color) since the prompt's rule 2 only calls for diverting "out-of-spec or designated reject items" and Special is not designated reject; this is documented in `PLC_LOGIC.md §5`.
- Added four operator command tags (`Cmd_Start`, `Cmd_Stop`, `Cmd_ManualReset`, `Speed_Setpoint`) not present in the prompt's I/O table — necessary to make the safety/run state machine and speed control operable at all, and documented as such rather than silently introduced.
- `usePlcStore`'s forced-override table only covers the four physical output tags plus `E_Stop` (via `setEStop`'s force check) rather than every possible tag, since forcing `Sensor_Color`/`Sensor_Weight`/`Sensor_PartDetect` independently of the belt simulation would fight the physics model on the very next scan; this is a deliberate scope limit rather than an oversight.
