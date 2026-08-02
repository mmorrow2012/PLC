#!/usr/bin/env node
// Generates _site/index.html, the landing/navigation page for the multi-app
// GitHub Pages site — one card per project linking to whichever agent demos
// have actually been built (from _site/built.json, written by build-all.mjs).
// Regenerated on every deploy, so it grows automatically as projects land.
//
// Usage: node scripts/build-hub.mjs (run after scripts/build-all.mjs)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const siteDir = path.join(repoRoot, "_site");

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "prompts", "manifest.json"), "utf8")
);

const builtPath = path.join(siteDir, "built.json");
const built = existsSync(builtPath)
  ? JSON.parse(readFileSync(builtPath, "utf8"))
  : [];

const builtByProject = new Map();
for (const entry of built) {
  if (!builtByProject.has(entry.slug)) builtByProject.set(entry.slug, new Set());
  builtByProject.get(entry.slug).add(entry.agent);
}

// Agent Branding Config (Logos, Labels, Colors)
const agentConfig = {
  gemini: {
    label: "Gemini Antigravity CLI",
    logoSvg: `<svg width="16" height="16" viewBox="0 0 100 100" fill="none"><defs><linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#38bdf8"/><stop offset="50%" stop-color="#818cf8"/><stop offset="100%" stop-color="#c084fc"/></linearGradient></defs><path d="M50 15 C50 35 35 50 15 50 C35 50 50 65 50 85 C50 65 65 50 85 50 C65 50 50 35 50 15 Z" fill="url(#gemGrad)"/></svg>`,
    cssClass: "agent-gemini",
  },
  claude: {
    label: "Claude Code",
    logoSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/></svg>`,
    cssClass: "agent-claude",
  },
  copilot: {
    label: "GitHub Copilot",
    logoSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
    cssClass: "agent-copilot",
  },
};

function agentLink(project, agentKey) {
  const cfg = agentConfig[agentKey] || { label: agentKey, logoSvg: "", cssClass: "" };
  const isBuilt = builtByProject.get(project.slug)?.has(agentKey);

  return isBuilt
    ? `<a class="agent-link agent-link--live ${cfg.cssClass}" href="./${project.slug}/${agentKey}/">
        <span class="agent-icon">${cfg.logoSvg}</span>
        <span class="agent-name">${cfg.label}</span>
        <span class="badge-status">LIVE →</span>
       </a>`
    : `<div class="agent-link agent-link--pending ${cfg.cssClass}">
        <span class="agent-icon">${cfg.logoSvg}</span>
        <span class="agent-name">${cfg.label}</span>
        <span class="badge-status pending">NOT BUILT YET</span>
       </div>`;
}

const cards = manifest.projects
  .map(
    (project) => `
      <article class="card">
        <div class="card-header">
          <span class="project-num">P${project.number}</span>
          <h2>${project.title}</h2>
        </div>
        <div class="agent-links">
          ${manifest.agents.map((agentKey) => agentLink(project, agentKey)).join("\n          ")}
        </div>
      </article>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Industrial PLC Portfolio — Multi-Agent Demonstrators</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: #090d12;
    color: #f0f6fc;
    padding: 2.5rem 1.5rem 4rem;
  }
  header { max-width: 1080px; margin: 0 auto 3rem; text-align: center; }
  h1 { font-size: 2.2rem; margin: 0 0 0.75rem; font-weight: 800; letter-spacing: -0.02em; background: linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #34d399 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  header p.subtitle { color: #94a3b8; font-size: 1.1rem; margin: 0 auto; max-width: 800px; line-height: 1.6; }

  .grid {
    max-width: 1080px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.25rem;
    align-items: stretch;
  }
  .card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 12px;
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s ease, border-color 0.2s ease;
  }
  .card:hover { border-color: #38bdf855; transform: translateY(-2px); }
  .card-header { margin-bottom: 1.25rem; }
  .project-num { display: inline-block; font-size: 0.75rem; font-weight: 800; font-family: monospace; padding: 0.2rem 0.5rem; background: #1e293b; color: #38bdf8; border-radius: 4px; margin-bottom: 0.5rem; }
  .card h2 { font-size: 1.05rem; margin: 0; font-weight: 700; line-height: 1.4; color: #f8fafc; }
  
  .agent-links {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: auto;
  }
  .agent-link {
    font-size: 0.85rem;
    padding: 0.65rem 0.85rem;
    border-radius: 8px;
    display: flex;
    items-center;
    align-items: center;
    justify-content: space-between;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s ease;
  }
  .agent-icon { display: flex; align-items: center; justify-content: center; margin-right: 0.6rem; shrink: 0; }
  .agent-name { flex: 1; text-align: left; }
  .badge-status { font-size: 0.725rem; font-family: monospace; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
  .badge-status.pending { opacity: 0.6; font-weight: 500; font-size: 0.675rem; }

  /* Agent Distinct Colors */
  /* 1. Gemini Antigravity CLI */
  .agent-gemini.agent-link--live {
    background: linear-gradient(135deg, #0369a1 0%, #4c1d95 100%);
    color: #f0f9ff;
    border: 1px solid #38bdf888;
    box-shadow: 0 0 10px rgba(56, 189, 248, 0.15);
  }
  .agent-gemini.agent-link--live:hover { border-color: #38bdf8; background: linear-gradient(135deg, #0284c7 0%, #5b21b6 100%); }
  .agent-gemini.agent-link--pending {
    background: #082f4940;
    border: 1px dashed #0284c744;
    color: #38bdf8aa;
  }

  /* 2. Claude Code */
  .agent-claude.agent-link--live {
    background: linear-gradient(135deg, #b45309 0%, #78350f 100%);
    color: #fffbeb;
    border: 1px solid #f59e0b88;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.15);
  }
  .agent-claude.agent-link--live:hover { border-color: #fbbf24; background: linear-gradient(135deg, #d97706 0%, #92400e 100%); }
  .agent-claude.agent-link--pending {
    background: #451a0340;
    border: 1px dashed #d9770644;
    color: #f59e0baa;
  }

  /* 3. GitHub Copilot */
  .agent-copilot.agent-link--live {
    background: linear-gradient(135deg, #047857 0%, #064e3b 100%);
    color: #ecfdf5;
    border: 1px solid #34d39988;
    box-shadow: 0 0 10px rgba(52, 211, 153, 0.15);
  }
  .agent-copilot.agent-link--live:hover { border-color: #34d399; background: linear-gradient(135deg, #059669 0%, #065f46 100%); }
  .agent-copilot.agent-link--pending {
    background: #022c2240;
    border: 1px dashed #05966944;
    color: #34d399aa;
  }
</style>
</head>
<body>
  <header>
    <h1>Industrial PLC Portfolio</h1>
    <p class="subtitle">Nine industrial automation demos, each built independently by Claude Code, Gemini Antigravity CLI, and GitHub Copilot</p>
  </header>
  <main class="grid">${cards}
  </main>
</body>
</html>
`;

writeFileSync(path.join(siteDir, "index.html"), html);
console.log(`Wrote hub page for ${manifest.projects.length} project(s), ${built.length} live demo(s).`);
