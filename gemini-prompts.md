# Prompts

Help me create a prompt that i can use with gemini agy ... 

I want to build a website that demonstrates this project.

- It should display the PLC code saved in this repo
- The code should work Schneider Electric M580
- Create a graphical representation of the project

Research the best graphical tools to use to do graphical demo's of the PLC project - e.g. mermaid or cytoscape - ideally the graphics should be dynamic and update as i update the PLC code.

## 1. **Automated Conveyor Belt System**

**What it does:** Sort products by color/weight, control motor speed, emergency stop logic.

```
┌─────────────────────────────────────────────────┐
│                  PLC (Allen-Bradley/Siemens)    │
├─────────────────────────────────────────────────┤
│ INPUTS:  Color sensor, weight sensor, E-stop    │
│ OUTPUTS: Motor VFD, solenoid diverter, alarm    │
│ LOGIC:   Ladder diagram for sorting/routing     │
└────────────┬────────────────────────────────────┘
             │
    ┌────────┼────────┐
    │        │        │
  MOTOR   SENSOR   DIVERTER
  (VFD)   (RGB)   (Solenoid)
```

**Key skills:** Basic I/O, timer/counter logic, conditional branching.

---

Here is a structured, production-ready prompt you can copy and paste directly to an AI agent (like Gemini) to build your website demonstrator.

---

### **Copy-Paste Prompt for AI Agent**

```markdown
I am building a web application to showcase my Industrial Automation / PLC project. I need your help drafting the architecture, code, and UI components for this portfolio application.

Here are the project requirements and context:

### **1. Target Hardware & Environment**
* **PLC Hardware:** Schneider Electric Modicon M580.
* **Programming Environment:** Schneider EcoStruxure Control Expert (Unity Pro).
* **Primary Language:** Structured Text (ST) / IEC 61131-3.

### **2. System Domain: Automated Conveyor Belt System**
* **Inputs:** * RGB Color Sensor (`Sensor_Color`: INT / Enum)
  * Weight Load Cell Sensor (`Sensor_Weight`: REAL)
  * Hardware Emergency Stop (`E_Stop`: BOOL - Safety High / Normally Closed logic)
  * Photoelectric Part Detectors (`Sensor_PartDetect`: BOOL)
* **Outputs:**
  * Motor VFD Control (`VFD_Speed_Ref`: REAL, `VFD_Run`: BOOL)
  * Solenoid Diverter Gate (`Actuator_Diverter`: BOOL)
  * System Alarm Beacon (`Alarm_Tower`: DWORD / Bitmask)
* **Control Logic Requirements:**
  * Emergency Stop interlocking with immediate VFD cut-off and alarm state.
  * Weight and color threshold checking to trigger the sorting diverter arm.
  * Variable speed control via VFD based on line throughput and part queuing.

---

### **3. Website Core Features & UI Requirements**

1. **Code Showcase Panel:**
   * A syntax-highlighted editor/viewer displaying the native Schneider M580 Structured Text (`.ST`) implementation.
   * Visual indicator mapping variables (Inputs/Outputs/Internal Memory) to their current simulated states.

2. **Dynamic Graphical Simulation / Visualization Panel:**
   * I need a dynamic, web-based graphical representation of the conveyor belt, sensors, diverter, and PLC IO states.
   * **Tool Evaluation & Recommendation:** Please recommend and implement the best graphical visualization library for this exact use case (e.g., **Mermaid.js**, **Cytoscape.js**, **React Flow**, **JointJS**, or native **HTML5 Canvas / SVG / D3.js**).
   * **Requirement:** The visual state MUST dynamically update based on the PLC simulation state or code variable updates (e.g., conveyor moves when `VFD_Run = TRUE`, diverter actuates when `Actuator_Diverter = TRUE`, Red background pulse when `E_Stop = TRUE`).

---

### **Your Task:**
1. **PLC Code:** Provide the clean, well-commented Schneider Electric M580 Structured Text (`.ST`) code block for this system.
2. **Graphical Tool Selection:** Briefly analyze the pros/cons of **Mermaid.js**, **Cytoscape.js**, and **React Flow / Canvas** for dynamic PLC UI rendering, and recommend the top choice.
3. **Web Application Implementation Plan:** Provide a complete step-by-step tech stack recommendation (e.g., React/Vue, Tailwind CSS, State Management) and the code to wire up the UI, state machine, and dynamic graphics.

```

---

### Quick Tooling Overview (For Your Reference)

When evaluating graphical tools for your website:

* **Mermaid.js:** Best for static sequence diagrams or simple flowcharts. Hard to animate smoothly in real-time.
* **Cytoscape.js:** Excellent for network graphs, topology, and node-link relationships, but less intuitive for animated physical layouts (like moving conveyor belts).
* **React Flow / JointJS:** Great for node-based ladder logic or block diagram visualizers.
* **HTML5 Canvas / SVG + D3.js:** Ideal for dynamic physical simulations (conveyor belts moving, light sensors turning green/red, parts sliding down lanes).

> which graphical tools will consume more tokens during development ?

When developing with an AI assistant, the token consumption depends directly on the **code density, boilerplate requirements, and iteration complexity** of each tool.

---

## **Token Consumption Ranking (Highest to Lowest)**

### **1. HTML5 Canvas / SVG + D3.js (Highest Token Consumption)**

* **Why it consumes the most tokens:** * Requires explicit procedural code for physical rendering loops (`requestAnimationFrame`), coordinate math, hit detection, animation states, and variable bindings.
* Debugging animation glitches or state synchronization requires feeding large snippets of custom JavaScript back and forth to the AI model.
* Lacks pre-built domain abstractions, meaning every moving visual element (conveyor belt, sensor status light, falling item) must be written from scratch.



### **2. React Flow / JointJS (High Token Consumption)**

* **Why it consumes high tokens:**
* Requires custom React node components, state handlers, edge definitions, hooks, and style objects.
* Integrating dynamic updates with PLC variable states requires boilerplate state management code (e.g., Redux, Zustand, or React hooks), leading to verbose prompt exchanges.



### **3. Cytoscape.js (Moderate Token Consumption)**

* **Why it consumes moderate tokens:**
* Uses structured configuration objects (JSON arrays for elements, styles, and layouts).
* While more compact than raw HTML5 Canvas code, defining style rules, dynamic classes, and event listeners still generates moderate code volume.



### **4. Mermaid.js (Lowest Token Consumption)**

* **Why it consumes the least tokens:**
* Uses an extremely concise declarative text syntax (e.g., `graph TD; A-->B`).
* An entire dynamic state or flowchart can be represented in 10 to 20 lines of text.


* Modifying or generating Mermaid syntax requires minimal prompt tokens and brief AI outputs.

---

| Graphical Tool | Code Complexity / Boilerplate | AI Iteration Loop | Overall Token Impact |
| --- | --- | --- | --- |
| **HTML5 Canvas / D3.js** | Very High (Custom render logic, physics, animation loops) | Heavy code blocks per prompt | **Highest** |
| **React Flow / JointJS** | High (Custom UI nodes, state wiring, hook management) | Moderate to large component files | **High** |
| **Cytoscape.js** | Medium (JSON element structures and layout scripts) | Config-focused updates | **Moderate** |
| **Mermaid.js** | Low (Declarative text-based graph markup) | Single-line or short block updates | **Lowest** |


---

> what other tooling decisions do we need to make ?

Beyond choosing the graphical visualization library, building a full web demonstrator for an industrial PLC project requires decisions across **five key technical areas**:

---

### **1. PLC Simulation Engine Architecture**

How will the web application actually evaluate the Schneider Electric M580 Structured Text (`.ST`) logic?

* **Option A: JS/TS Mock State Machine (Fastest / Lowest Complexity)**
* *How it works:* Write a lightweight JavaScript/TypeScript loop that mimics the PLC scan cycle (e.g., 50ms interval) to update I/O tags.
* *Best for:* Portfolio demos where you want simple, predictable interactive controls without full IEC compiler overhead.


* **Option B: WebAssembly / Open-Source IEC Compiler (Highest Realism)**
* *How it works:* Compile C-translated IEC 61131-3 code (using tools like `matiec`) into WebAssembly (Wasm) to run a true deterministic scan cycle in the browser.
* *Best for:* Industrial-grade accuracy if you want to support raw, un-parsed `.ST` file compilation directly in the browser.



---

### **2. Frontend Web Framework & Styling**

* **Framework:** **React (with Vite)** or **Next.js** for modern component management and fast iteration.
* **Styling & UI Components:** **Tailwind CSS** combined with **shadcn/ui** or **Mantine**. Industrial dashboard layouts (SCADA/HMI style) benefit heavily from dark-mode-first component suites.

---

### **3. Code Viewer & Syntax Highlighting**

To display and edit Schneider M580 Structured Text (`.ST`) code cleanly on the site:

* **Monaco Editor (`@monaco-editor/react`):** The engine powering VS Code. Supports custom language definitions (IEC 61131-3 keywords like `VAR`, `END_VAR`, `IF`, `THEN`, `TON`), variable hover tooltips, and line-by-line breakpoint debugging.
* **Prism.js / CodeMirror:** Lighter alternatives if read-only syntax highlighting is all you need.

---

### **4. State Management & Real-Time Sync**

How the simulated PLC memory tags communicate with the UI and visualization panel:

* **Client-Side State:** **Zustand** or **React Context**. Lightweight state stores allow the PLC scan engine loop to push tag updates (`VFD_Run`, `Sensor_Color`, `E_Stop`) cleanly to both the code viewer and the visualizer without frame-rate lag.
* **Event Loop:** A custom `useInterval` hook or `requestAnimationFrame` controller serving as the virtual PLC timer/scan clock.

---

### **5. Hosting & CI/CD Deployment**

* **GitHub Pages / Vercel / Netlify:** Free static site hosting with instant deployment directly from your GitHub repository via GitHub Actions.

---

### **Summary of Tooling Decision Matrix**

| Tool Category | Recommended Tool | Alternative Tool | Trade-off / Notes |
| --- | --- | --- | --- |
| **PLC Logic Engine** | TypeScript Scan Loop | MatIEC + WebAssembly | JS/TS loop is vastly easier to maintain; Wasm gives true IEC runtime accuracy. |
| **Frontend Stack** | React + Vite | Next.js / Svelte | React + Vite offers rapid startup and zero server overhead for static hosting. |
| **Code Editor** | Monaco Editor | CodeMirror / Prism.js | Monaco gives an authentic IDE look and custom Structured Text highlighting. |
| **State Store** | Zustand | React Context | Zustand handles high-frequency scan updates without triggering unnecessary re-renders. |
| **Hosting & CI/CD** | GitHub Pages / Vercel | Docker + Render | Static hosting keeps the project zero-cost and easy to showcase on GitHub. |

---

*(Note: All tables and formatting above comply strictly with GitHub Flavored Markdown rules for seamless copying into your repository.)*

