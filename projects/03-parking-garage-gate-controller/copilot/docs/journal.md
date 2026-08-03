## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace with Tailwind CSS v3 (dark-mode industrial theme) and Zustand for state management.
- Pinned dependency versions to match the existing copilot project scaffolds: `@monaco-editor/react ^4.7.0`, `lucide-react ^0.344.0`, `react ^18.2.0`, `react-dom ^18.2.0`, `zustand ^4.5.2`, `vite ^8.2.0`, `typescript ^5.3.3`, `tailwindcss ^3.4.1`.
- Added `overrides` block for `dompurify ^3.4.12` to address known advisory (consistent with sibling copilot projects).
- Used ESM-style `postcss.config.js` (`export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`) per Tailwind v3 docs.
- Added `vite-env.d.ts` for Vite client type reference, required for TypeScript to recognise `import.meta.env`.

**Trade-offs / deviations from prompt:**
- Added standard Vite `index.html` (required entry point for Vite dev server; not listed in the structure but implicit).
- Added `vite-env.d.ts` under `src/` (not explicitly requested but required for a clean TypeScript compile under strict mode with Vite).
- No deployment/base-path settings were added to `vite.config.ts` — the repo-level workflow supplies `--base` at build time.
- `softPlcEngine.ts` skeleton exports a typed `SoftPlcEngine` interface and a `plcEngine` singleton matching the structure used in the other copilot project scaffolds; the tick function is a no-op placeholder.
