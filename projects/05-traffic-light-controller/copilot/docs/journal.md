## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace with Tailwind CSS v3 and Zustand for PLC-focused state management.
- Added required runtime dependencies: `react`, `react-dom`, `zustand`, `@monaco-editor/react`, and `lucide-react`.
- Kept `vite.config.ts` on the default starter shape with only the React plugin and no `base` setting.
- Configured Tailwind with a dark-mode industrial color theme to match the requested demonstrator style.

**Trade-offs / deviations from prompt:**
- Added standard Vite `index.html` and `src/vite-env.d.ts` files so `npm run dev` works cleanly with TypeScript.
- Chose pinned semver ranges aligned with existing copilot project scaffolds in this repository.
