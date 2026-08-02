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



