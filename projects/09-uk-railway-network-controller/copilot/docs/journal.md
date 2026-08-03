## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace with Tailwind CSS v3 and Zustand to keep the PLC demo app compiling with the required UI and state dependencies.
- Added the requested runtime packages: `react`, `react-dom`, `zustand`, `@monaco-editor/react`, and `lucide-react`.
- Kept `vite.config.ts` at the default Vite starter shape with only the React plugin and no `base` setting.
- Added a dark-mode industrial Tailwind theme extension for the requested railway control interface styling.

**Trade-offs / deviations from prompt:**
- Added standard Vite support files `index.html` and `src/vite-env.d.ts` so `npm run dev` and TypeScript tooling start cleanly.
- Reused dependency versions aligned with existing copilot scaffolds already present in this repository.
