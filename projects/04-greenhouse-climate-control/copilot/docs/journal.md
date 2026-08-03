## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace with Tailwind CSS v3 and Zustand for state management.
- Pinned dependency versions matching the existing copilot project pattern (React 18.2, Zustand 4.5, @monaco-editor/react 4.7, lucide-react 0.344).
- Added required UI/runtime dependencies: `react`, `react-dom`, `zustand`, `@monaco-editor/react`, and `lucide-react`.
- Included `dompurify` override to `^3.4.12` matching other copilot projects to address known advisories.
- Dark-mode industrial Tailwind theme extended with `industrial` colour palette for consistent UI across projects.

**Trade-offs / deviations from prompt:**
- Added standard Vite `index.html` and `src/vite-env.d.ts` files required for `npm run dev` to compile cleanly with TypeScript.
- No deployment or `base` path added to `vite.config.ts`; the repo-level workflow supplies `--base` at build time.
- `postcss.config.js` uses `export default` (ESM) to match `"type": "module"` in `package.json`.
