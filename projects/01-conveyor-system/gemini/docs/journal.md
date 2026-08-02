## Scaffold — 2025-05-18
<!-- METRICS:scaffold -->

**Decisions:**
- Initialized Vite + React + TypeScript workspace under `projects/01-conveyor-system/gemini/code/` with an industrial dark theme styled using Tailwind CSS.
- Pinned core dependencies: `@monaco-editor/react` for ST code display, `zustand` for SoftPLC memory & I/O state management, and `lucide-react` for status icons.
- Created modular component structure (`CodeViewer`, `Visualizer`, `ControlPanel`) linked via Zustand state store.
- Abstracted the SoftPLC scan cycle into `softPlcEngine.ts` to simulate continuous cyclic execution.

**Trade-offs / deviations from prompt:**
- Kept `vite.config.ts` without custom `base` parameter as requested to permit automated build-time injection.
- Included `vite-env.d.ts` to facilitate raw loading of `.st` Structured Text files.
