<!-- GENERATED FILE: do not edit directly. Source: prompts/templates/scaffold.md + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->
```markdown
I am building a web-based portfolio demonstrator for an industrial automation / PLC project inside this repository (`PLC`).

Please scaffold the project workspace and build setup under `projects/06-bottling-line/claude/`.

### 1. Requirements
1. Create the complete directory structure and generate all configuration files.
2. Initialize skeleton source files with basic TypeScript types and exports so `npm install` and `npm run dev` compile without errors.
3. Do **not** add any deployment configuration or a `base` path in `vite.config.ts` — this project is published as part of a shared multi-app GitHub Pages site by a repo-level workflow, which sets the correct `--base` at build time. Leave `vite.config.ts` at its default Vite starter configuration.
4. Create `docs/journal.md` as a build journal. Add a `## Scaffold — <today's date>` heading, followed on its own line by the literal marker `<!-- METRICS:scaffold -->` (leave this exact line untouched — an external process fills in timing/cost data under it), then a `**Decisions:**` section and a `**Trade-offs / deviations from prompt:**` section documenting the scaffolding choices actually made (dependency versions pinned, any deviation from the structure below, etc.).

### 2. File & Directory Structure

projects/06-bottling-line/claude/
├── docs/
│   ├── ARCHITECTURE.md             # Empty placeholder for architecture notes
│   ├── PLC_LOGIC.md                # Empty placeholder for PLC I/O tag docs
│   └── journal.md                  # Build journal — stage 1 (scaffold) entry, see Requirement 4
└── code/
    ├── src/
    │   ├── components/
    │   │   ├── CodeViewer.tsx      # Skeleton component export
    │   │   ├── Visualizer.tsx      # Skeleton component export
    │   │   └── ControlPanel.tsx    # Skeleton component export
    │   ├── store/
    │   │   └── usePlcStore.ts      # Skeleton Zustand store export
    │   ├── plc/
    │   │   ├── bottlingLineLogic.st     # Empty Structured Text file
    │   │   └── softPlcEngine.ts    # Skeleton scan-loop engine export
    │   ├── App.tsx                 # Basic layout shell importing skeleton components
    │   ├── main.tsx
    │   └── index.css
    ├── package.json                # Dependencies: React 18, Vite, TypeScript, Tailwind, Zustand, @monaco-editor/react
    ├── vite.config.ts
    ├── tsconfig.json
    └── tailwind.config.js          # Dark-mode industrial theme setup

Please output all base configuration files and code skeletons inside `projects/06-bottling-line/claude/code/`.
```
