## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace with Tailwind CSS v3 and Zustand for state management.
- Pinned dependency versions to match existing project scaffolds in this repository for consistency.
- Added required UI/runtime dependencies: `react`, `react-dom`, `zustand`, `@monaco-editor/react`, and `lucide-react`.

**Trade-offs / deviations from prompt:**
- Added standard Vite `index.html` and `vite-env.d.ts` files to ensure `npm run dev` starts cleanly with TypeScript.
- No deployment/base-path settings were added to `vite.config.ts`.
