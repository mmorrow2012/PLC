## Scaffold — 2026-08-03
<!-- METRICS:scaffold -->

**Decisions:**
- Scaffolded a minimal Vite + React 18 + TypeScript workspace under `code/` so `npm install` and Vite startup/build commands have the standard expected entry points.
- Aligned most dependency ranges with the sibling conveyor-system demonstrator scaffold, while bumping build-tool versions where needed to avoid known advisories in older Vite/PostCSS releases.
- Added an npm override for `dompurify` so the Monaco editor dependency graph resolves to a patched sanitizer release.
- Kept `vite.config.ts` at the default React starter shape with no `base` path so the repository-level Pages workflow can inject `--base` at build time.
- Added `index.html` in `code/` because Vite requires it for `npm run dev`, even though it was not explicitly listed in the tree.

**Trade-offs / deviations from prompt:**
- The prompt requested exact directory/file outputs primarily under `code/`, but a working Vite scaffold also needs `index.html`; this was added as the smallest necessary deviation to satisfy the compile/run requirement.
- Added `src/plc/conveyorLogicSource.ts` so the code viewer can ship starter PLC text without needing custom Vite raw-file import handling for `.st` files.
- `ARCHITECTURE.md`, `PLC_LOGIC.md`, and `conveyorLogic.st` were left empty placeholders as requested, while the TypeScript and React files contain only starter-safe skeleton logic.
