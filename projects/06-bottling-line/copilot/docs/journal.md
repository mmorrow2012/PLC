## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace with Tailwind CSS v3 and Zustand for the bottling-line demonstrator.
- Added the required runtime dependencies: `react`, `react-dom`, `zustand`, `@monaco-editor/react`, and `lucide-react`.
- Kept `vite.config.ts` at the default Vite starter shape with only the React plugin and no `base` path.
- Configured Tailwind with a dark-mode industrial color theme for the shared portfolio UI style.

**Trade-offs / deviations from prompt:**
- Added standard Vite `index.html` and `src/vite-env.d.ts` files so `npm install` and `npm run dev` work cleanly with TypeScript.
- Pinned dependency ranges to match the existing Copilot scaffolds already present in this repository.
