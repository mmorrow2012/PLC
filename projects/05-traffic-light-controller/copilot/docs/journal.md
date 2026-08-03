## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a Vite + React 18 + TypeScript workspace under `code/` with the required Zustand, Monaco editor, and lucide-react dependencies.
- Pinned versions to stay close to existing copilot project scaffolds while updating `postcss` to `^8.5.18` to avoid known advisories.
- Kept `vite.config.ts` at the default starter shape with only the React plugin and no `base` path.
- Added a dark-mode `industrial` Tailwind palette to match the repository's other PLC demonstrator scaffolds.

**Trade-offs / deviations from prompt:**
- Added the standard Vite `index.html` file required for the app shell to boot, even though it was not explicitly listed in the requested tree.
- Removed extra files from the fresh Vite template (`public/`, `README.md`, `App.css`, split tsconfig files, and lint config) to keep the scaffold focused on the requested structure.
- Left `trafficLightLogic.st` empty as requested; the React components and store currently provide compile-safe placeholders only.
