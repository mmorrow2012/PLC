# Architecture — Wastewater Treatment Plant Demonstrator

A browser-hosted soft-PLC that executes the control program from
[`PLC_LOGIC.md`](./PLC_LOGIC.md) against a simulated physical plant, with a live
IEC 61131-3 Ladder/FBD monitor, a SCADA mimic and an HMI faceplate.

---

## 1. Layering

```
┌──────────────────────────────────────────────────────────────────────┐
│  React UI                                                            │
│  ControlPanel.tsx   Visualizer.tsx   CodeViewer.tsx ─┬─ LadderDiagram│
│  (HMI faceplate)    (SCADA mimic)    (tabs)          └─ Monaco (.ST) │
└─────────────────┬────────────────────────────────────────────────────┘
                  │ zustand selectors (read)   HMI actions (write)
┌─────────────────▼────────────────────────────────────────────────────┐
│  store/usePlcStore.ts — the process image                            │
│  inputs · outputs · internal(%MW/%M) · plant · disturbances · forces  │
└─────────────────▲────────────────────────────────────────────────────┘
                  │ applyScan()
┌─────────────────┴────────────────────────────────────────────────────┐
│  plc/softPlcEngine.ts — cyclic MAST task, 50 ms                      │
│    1 advance plant with LAST scan's outputs  (scan causality)        │
│    2 READ INPUTS   — build the input image from the instruments      │
│    3 apply forces to the input image                                 │
│    4 EXECUTE LOGIC — runWastewaterLogic()                            │
│    5 apply forces to the output image                                │
│    6 WRITE OUTPUTS — publish the new process image                   │
└──────┬─────────────────────────────────────────┬─────────────────────┘
       │                                         │
┌──────▼───────────────────────┐   ┌─────────────▼──────────────────────┐
│ plc/wastewaterLogic.ts       │   │ plc/plantSimulation.ts             │
│ PURE control logic — the     │   │ PURE first-order physical model.   │
│ port of wastewaterLogic.st.  │   │ Never read by the control logic.   │
│ No I/O, no module state.     │   │ Sources every %IW and float switch.│
└──────────────────────────────┘   └────────────────────────────────────┘
```

The hard rule is the split between the two bottom boxes: **control logic never reads
the plant model, and the plant model never reads internal PLC memory.** They only
communicate through the process image, exactly as a real controller talks to a real
process through its I/O cards. That is what makes the ST source a faithful description
of what is actually executing.

---

## 2. File map

| File | Role |
| --- | --- |
| `plc/types.ts` | Tag interfaces, `TAG_ADDRESS` memory map, engineering constants. Single source of truth for setpoints, shared by logic, HMI and docs. |
| `plc/wastewaterLogic.st` | The IEC 61131-3 Structured Text source — 4 DFBs + `PROGRAM WastewaterPlant`. Ships to the browser via Vite's `?raw` loader. |
| `plc/wastewaterLogic.ts` | Section-for-section TypeScript port of the `.st` file. |
| `plc/plantSimulation.ts` | Hydraulic/water-quality plant model. |
| `plc/softPlcEngine.ts` | The scan loop. |
| `plc/ladderProgram.ts` | Declarative LD/FBD network model + power-flow evaluator. |
| `plc/tagMap.ts` | Flattens the process image into the flat dictionary the ladder evaluates against. |
| `store/usePlcStore.ts` | Zustand store holding the process image and HMI actions. |
| `components/LadderDiagram.tsx` | SVG renderer for `ladderProgram.ts` with live power-flow animation. |
| `components/CodeViewer.tsx` | Tabbed Ladder/FBD ↔ Structured Text monitor. |
| `components/Visualizer.tsx` | SVG SCADA mimic + the 4-step demo card. |
| `components/ControlPanel.tsx` | HMI faceplate: E-Stop, start/stop/reset, setpoints, weir controls, forcing. |

---

## 3. Scan-cycle causality

`advancePlant()` is called with the **previous** scan's output image, not the one the
current scan is about to compute. This reproduces real controller behaviour: the
contactors written at the end of scan *N* drive the process that scan *N+1*'s input
card observes. Getting this backwards produces a simulation with no transport delay,
where a level responds within the same scan that commanded the pump — which would
quietly hide exactly the kind of race a scan-based controller can suffer.

The same reasoning drives the momentary-pushbutton handling. A fast UI click can press
and release inside one 50 ms scan interval, so `pressPushbutton()` queues the tag in
`pendingPulses`; the engine clears it only *after* the logic has executed, guaranteeing
every press is seen by at least one full scan.

---

## 4. The Ladder/FBD monitor

`ladderProgram.ts` describes the six networks as data — contacts, comparison boxes,
parallel branches, DFB bodies and coils — and exposes `evaluateNode` / `evaluateRung`.
`LadderDiagram.tsx` walks that structure, threading power left-to-right through each
rung and colouring every wire segment by whether current actually reaches it. A
contact drawn in green is conducting *and* has power arriving at it; a coil is green
when its tag is genuinely set. Parallel branches OR their outputs back onto the main
rail exactly as they do on a real rung.

Describing the networks as data rather than hand-drawn SVG means the monitor cannot
drift out of sync with the logic in the way a hand-drawn picture would — the same tag
names drive both.

The monitor samples the store on a **100 ms timer** rather than subscribing to every
scan. A network carries a few hundred SVG nodes, no operator can read a 20 Hz
animation, and a real online monitor polls the CPU at a comparable rate — this keeps
the diagram off the render path that the SCADA mimic genuinely needs at full rate.

The **Structured Text** tab uses Monaco with live decorations over the executing POU.
The line ranges come from parsing `(* #REGION name *)` markers out of the `.st` source
at load time, so editing a comment in the ST file cannot silently rot the highlight the
way hard-coded line numbers would.

---

## 5. Plant simulation — what is *not* control logic

Everything in `plantSimulation.ts` is process, not program:

```
raw sewage ─▶ Equalization ─[influent pumps/VFD]─▶ Primary Clarifier
                                                        │ overflow weir
                                 ┌──────────────────────┴────────────┐
                                 ▼                                   ▼
                           Aeration A                          Aeration B
                                 └────────[transfer weir]────────────┘
                                                ▼
                                      Secondary Clarifier
                                       │ RAS pump    │ motorised weir gate
                                       └─▶ aeration  └─▶ outfall
```

Vessels are integrators with plan areas; weirs discharge proportionally to head above
crest; dissolved oxygen integrates transfer-in against biological uptake; turbidity is
a first-order lag toward a load-driven equilibrium that coagulant dosing pulls down.

Three simulation-only additions are **not** PLC I/O and are labelled as such in the HMI:

* **Raw catchment influent slider** — storm loading. This is the disturbance the whole
  control scheme exists to reject.
* **Storm / toxic shock injection** — a one-shot turbidity spike, so the >25 NTU consent
  trip can be demonstrated on demand instead of only under sustained overload.
* **Manual storm bypass penstock** — a hand-wound field valve draining the equalization
  basin. This one is load-bearing, not decoration: during a `%I0.4` flooding trip the
  influent pumps are inhibited, so without a manual drain the basin can only keep
  filling and the trip becomes unclearable. A real works has exactly this penstock for
  exactly this reason.

The gate's mechanical travel is commissioned ~5 % faster than the PLC's 4 s close
timer, so the gate physically seats before the timer derives `ClosedLS` — the same
margin you would dial into a real travel-timeout setting.

---

## 6. I/O forcing

The HMI exposes a Control Expert style animation table. Forces are applied to the input
image **before** the logic executes and to the output image **after** it solves, which
is where a real CPU applies them — forcing an input the logic never sees would be
theatre. Only discrete channels are forceable; analog channels are driven by the plant
model and the control algorithm, and forcing them would be meaningless on real hardware
too.

---

## 7. Verification

The control logic and plant model are pure and dependency-free, so they were compiled
standalone and driven headless through **21 behavioural assertions** across six
scenarios: flood trip → bypass drain → acknowledged reset → restart; E-Stop with full
gate seating and contactor mutual exclusion; lead/lag duty rotation on pump-call
drop-out; turbidity vetoing discharge without tripping, and recovering via coagulant
dosing; DO setpoint tracking up and down; and manual weir jog overriding the AUTO
permit. All 21 pass. `npm run build` (`tsc && vite build`) compiles with 0 TypeScript
errors and `npm install` reports 0 vulnerabilities.
