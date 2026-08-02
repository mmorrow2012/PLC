```markdown
I am building a web-based portfolio demonstrator for an industrial automation / PLC project inside this repository (`PLC`).

Please scaffold the project workspace and build setup under `projects/01-conveyor-system/gemini/`. 

### 1. Requirements
1. Create the complete directory structure and generate all configuration files.
2. Initialize skeleton source files with basic TypeScript types and exports so `npm install` and `npm run dev` compile without errors.
3. Include setup and GitHub Pages deployment configuration.

### 2. File & Directory Structure

projects/01-conveyor-system/gemini/
├── docs/
│   ├── ARCHITECTURE.md             # Empty placeholder for architecture notes
│   └── PLC_LOGIC.md                # Empty placeholder for PLC I/O tag docs
└── code/
    ├── .github/
    │   └── workflows/
    │       └── deploy.yml          # GitHub Pages static deployment workflow
    ├── src/
    │   ├── components/
    │   │   ├── CodeViewer.tsx      # Skeleton component export
    │   │   ├── Visualizer.tsx      # Skeleton component export
    │   │   └── ControlPanel.tsx    # Skeleton component export
    │   ├── store/
    │   │   └── usePlcStore.ts      # Skeleton Zustand store export
    │   ├── plc/
    │   │   ├── conveyorLogic.st    # Empty Structured Text file
    │   │   └── softPlcEngine.ts    # Skeleton scan-loop engine export
    │   ├── App.tsx                 # Basic layout shell importing skeleton components
    │   ├── main.tsx
    │   └── index.css
    ├── package.json                # Dependencies: React 18, Vite, TypeScript, Tailwind, Zustand, @monaco-editor/react
    ├── vite.config.ts
    ├── tsconfig.json
    └── tailwind.config.js          # Dark-mode industrial theme setup

Please output all base configuration files and code skeletons inside `projects/01-conveyor-system/gemini/code/`.
```
