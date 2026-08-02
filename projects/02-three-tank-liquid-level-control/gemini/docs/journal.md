## Scaffold — 2026-08-02
<!-- METRICS:scaffold -->

**Decisions:**
- Set up React 18, Vite 5, Tailwind CSS, Zustand, and Monaco Editor dependencies for browser-based PLC code display and visualization.
- Configured Tailwind CSS with custom industrial dark theme palette.
- Kept `vite.config.ts` as standard Vite starter default without hardcoded base path as required.

**Trade-offs / deviations from prompt:**
- Added `postcss.config.js` and standard HTML starter shell to support standard Tailwind CSS setup.
