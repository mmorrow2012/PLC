# GitHub Integration, Workflows & Architecture Notes

This document captures key architecture decisions, setup procedures, and operational comparisons for managing the PLC benchmark repository, GitHub Actions automation, GitHub Projects (V2) tracking, and GitHub Pages deployments.

---

## 1. Agent Runner Execution: GitHub Actions (Cloud) vs. Local WSL

When executing agent runs against project issues (e.g., scaffolding and domain logic generation), the harness can be run either via cloud-based GitHub Actions workflows or locally inside WSL.

### Performance & Operational Comparison

| Parameter | ⚡ Local WSL Execution | ☁️ GitHub Actions Workflow |
| :--- | :--- | :--- |
| **Startup Overhead** | **~0 seconds** (instant execution) | **15–30 seconds** (VM setup, Node environment, `git checkout`) |
| **API Latency** | ~10–15 seconds | ~10–15 seconds (same Gemini API call) |
| **Build & Dependencies** | **Fast** (reuses local `node_modules` cache) | 15–20 seconds (clean `npm install` on VM runner) |
| **Trigger Mechanism** | Direct manual execution (`node scripts/run-gemini-agent.mjs`) | Scheduled cron (15-min interval), issue event, or dispatch |
| **Total Runtime per Issue** | ⚡ **15–25 seconds** | ☁️ **45–75 seconds** |
| **Authentication** | Local environment / `GEMINI_API_KEY` | GitHub Repository Secret (`GEMINI_API_KEY`) |

### Key Takeaways
- **Local WSL** is **2x–3x faster** for active development, rapid testing, and immediate feedback.
- **GitHub Actions** provides hands-free background automation without requiring a local machine/terminal to stay open.

### Issue Prioritization & Claim Logic
- **Issue Ordering**: Default GitHub issue listings (`gh issue list`) order by newest created. To maintain proper build sequencing, the runner script ([`scripts/run-gemini-agent.mjs`](../scripts/run-gemini-agent.mjs)) explicitly queries and completes **`stage:scaffold`** issues before processing **`stage:logic`** issues.
- **State Lifecycle**: `status:ready` ➔ `status:in-progress` ➔ `status:complete` (issue closed).

---

## 2. Custom Domain & GitHub Pages Setup (`plc.coldwire.uk`)

### Configuration Overview
- **Deployment Model**: GitHub Pages driven by GitHub Actions ([`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)).
- **Custom Domain**: `plc.coldwire.uk`
- **Base Pathing**:
  - Default GitHub Pages (`username.github.io/repo`): Asset base path `/PLC/<slug>/<agent>/`.
  - Custom Domain (`plc.coldwire.uk`): Asset base path `/<slug>/<agent>/`.

### DNS & Repository Requirements
1. **DNS CNAME Record**:
   - Host / Name: `plc`
   - Target / Points to: `mmorrow2012.github.io`
2. **Root `CNAME` File**:
   - Must exist in the repository root containing `plc.coldwire.uk`.
   - Copied into `_site/CNAME` during build via [`scripts/build-all.mjs`](../scripts/build-all.mjs).
3. **GitHub Pages Source**:
   - Settings ➔ Pages ➔ Source set to **GitHub Actions** (bypassing default Jekyll/Static starter templates).
4. **HTTPS Certificate Provisioning**:
   - When a custom domain is first added, GitHub automatically requests a TLS/SSL certificate from Let's Encrypt.
   - During the 10–20 minute validation window, GitHub displays *"Enforce HTTPS — Unavailable for your site because your domain is not properly configured to support HTTPS"*.
   - This state is temporary; once Let's Encrypt completes verification, **Enforce HTTPS** becomes available and can be enabled.

---

## 3. GitHub Projects (V2) & Fork Setup Notes

### Repository Fork & Issues Behavior
- **Default Fork Behavior**: GitHub automatically disables the **Issues** tab on forked repositories (`mmorrow2012/PLC`).
- **Required Action**: Issues must be explicitly enabled via **Repo Settings ➔ General ➔ Features ➔ Check "Issues"**.

### GitHub Projects (V2) Board Setup
Because default `gh` CLI OAuth tokens do not include the `project` scope, project board configuration is performed via GitHub UI:

1. **Board Creation**:
   - Create a new V2 Project board titled `"PLC Multi-Agent Lab"`.
2. **Custom Single-Select Fields**:
   - **`Agent`**: `Gemini`, `Claude`
   - **`Project`**: `01-conveyor-system`, `02-three-tank`, `03-parking-gate`, `04-greenhouse`, `05-traffic-light`, `06-bottling-line`
3. **Auto-Add Workflows**:
   - Navigation: Project Board ➔ `...` menu ➔ **Workflows** ➔ **Auto-add to project**.
   - Filter query: `is:issue,pr label:agent:gemini` (or `label:agent:gemini`).
   - Automatically routes new Gemini issues onto the project board.
