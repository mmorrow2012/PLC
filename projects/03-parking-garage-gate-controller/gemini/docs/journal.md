## Scaffold — 2026-08-02
<!-- METRICS:scaffold -->

**Decisions:**
- Initialized React 18 with Vite, TypeScript, Tailwind CSS, Zustand, Lucide React, and `@monaco-editor/react`.
- Formatted dark industrial HMI design theme with clear status indicators for inputs and outputs.
- Separated SoftPLC scan loop engine logic execution from React components via Zustand store.
- Left `vite.config.ts` without custom base path per repository publishing workflow rules.

**Trade-offs / deviations from prompt:**
- Configured standard PostCSS and Tailwind pipeline for industrial status styling.
- Standardized file layouts to allow clean TypeScript compilation and seamless dev server execution.
