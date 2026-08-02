# Tooling Decisions

Distilled from the tooling discussion in [`gemini-chat.md`](../gemini-chat.md). These are the standing defaults for every project demonstrator built in this repo, chosen to balance AI-agent token efficiency, development speed, and room to grow into more complex projects.

## Recommended Stack

| Category | Tool | Alternative Considered | Why |
| --- | --- | --- | --- |
| **PLC Logic Engine** | TypeScript scan-cycle loop (~50ms `setInterval`) | MatIEC + WebAssembly | Runs the soft-PLC logic as plain TS state updates — cheap to generate/debug. Wasm gives true IEC 61131-3 execution but drags in compiler toolchains, Emscripten glue, and memory-pointer debugging; revisit only if raw `.ST` upload/compile becomes a real requirement. |
| **Graphical Demo** | Interactive SVG (React components bound to state) | HTML5 Canvas, Mermaid.js, Cytoscape.js, React Flow, JointJS | SVG attributes (color, transform, class) bind directly to state with moderate code. Canvas needs hand-rolled render loops and hit-testing (highest token cost); Mermaid/Cytoscape are declarative but can't do dynamic physical animation (moving belts, actuator motion). |
| **Frontend Framework** | React + Vite | Next.js, Svelte | Fast HMR, zero server overhead, static-hosting friendly. |
| **Styling** | Tailwind CSS (dark-mode industrial/SCADA aesthetic) | — | Pre-styled primitives (switches, status badges) avoid custom CSS. |
| **State Management** | Zustand | Redux, React Context | High-frequency tag updates (`VFD_Run`, sensor values) without re-render overhead; store definitions are near-zero boilerplate. |
| **Code Viewer** | Monaco Editor (`@monaco-editor/react`) | CodeMirror, Prism.js | Authentic VS Code look with custom IEC 61131-3 syntax rules (`VAR`, `END_VAR`, `IF`, `TON`, ...). Costs more setup tokens than CodeMirror/Prism, accepted for the portfolio-demo payoff. |
| **Hosting & CI/CD** | GitHub Pages / Vercel via GitHub Actions | Docker + Render/AWS | Zero-cost static hosting, deploys straight from the repo on push. |

## Rejected / Deferred Options and Why

- **WebAssembly / MatIEC**: highest realism (true IEC runtime) but highest token cost and slowest to build — deferred until a project actually needs to compile unedited `.ST` files in-browser.
- **HTML5 Canvas + D3.js**: most flexible for physical simulation but every moving part (belt, light, falling item) is hand-written procedural code — highest token consumption of the graphics options.
- **Mermaid.js / Cytoscape.js**: cheapest token cost, but capped at static diagrams/graph topology — can't animate a physical SCADA/HMI scene, so ruled out once "dynamic visual state" became a hard requirement.

## Repo & Multi-Agent Organization

- **One canonical mono-repo**, not one repo (or branch) per coding agent. Separate repos per agent (`P1-GEMINI`, `P1-CLAUDE`) fragment history and duplicate boilerplate.
- **Directory layout**, isolating each agent's output so parallel runs never collide on the same files:
  ```
  PLC/
  ├── research/                     # this file, vendors.md, etc.
  ├── prompts/                      # standalone prompts per project/agent
  └── projects/
      ├── 01-conveyor-system/
      │   ├── gemini/{code,docs}/
      │   └── claude/{code,docs}/
      ├── 02-three-tank-liquid-level-control/
      │   ├── gemini/{code,docs}/
      │   └── claude/{code,docs}/
      └── ...
  ```
- **GitHub Projects (V2) board** tracks *who* (agent) is doing *what*, with custom fields `Project` (e.g. `01-conveyor-system`), `Agent` (`Gemini`, `Claude`, ...), and `Component` (`Soft-PLC Engine`, `UI/Visualizer`, `Monaco Editor`, `Docs`) — instead of encoding the agent into the repo/branch name.
- **Two-prompt pattern per project/agent**: a scaffolding prompt (directory structure, configs, skeleton files that compile) followed by a feature-implementation prompt (domain logic, state, visualizer, docs). Keeps each prompt focused and lets you compare agents' output at each stage.
