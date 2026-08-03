## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded the workspace from the default Vite React + TypeScript starter, then trimmed it down to the required multi-app portfolio structure.
- Pinned React 18, Vite 8, TypeScript 5, Tailwind CSS v3, Zustand 4.5, `@monaco-editor/react` 4.7, and `lucide-react` 0.344 to match the existing copilot project pattern in this repository.
- Added a small industrial dark-mode Tailwind theme and minimal skeleton React/Zustand/soft-PLC exports so `npm install`, `npm run build`, and `npm run dev` can start cleanly.
- Kept `vite.config.ts` at the default Vite starter shape with no deployment-specific `base` setting.

**Trade-offs / deviations from prompt:**
- Added standard Vite support files `index.html` and `src/vite-env.d.ts` because they are required for the starter app to compile correctly.
- Removed unneeded starter demo assets/files (`public`, sample CSS/assets, split tsconfig files, starter README, oxlint config) so the generated scaffold matches the requested project layout more closely.
- Included a `dompurify` override matching another copilot scaffold in this repository as a defensive dependency-resolution safeguard, even though this scaffold does not yet use it directly.
