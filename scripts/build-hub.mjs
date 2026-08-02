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

function agentLink(project, agent) {
  const isBuilt = builtByProject.get(project.slug)?.has(agent);
  const label = agent.charAt(0).toUpperCase() + agent.slice(1);
  return isBuilt
    ? `<a class="agent-link agent-link--live" href="./${project.slug}/${agent}/">${label} →</a>`
    : `<span class="agent-link agent-link--pending">${label} (not built yet)</span>`;
}

const cards = manifest.projects
  .map(
    (project) => `
      <article class="card">
        <h2>P${project.number} &middot; ${project.title}</h2>
        <div class="agent-links">
          ${manifest.agents.map((agent) => agentLink(project, agent)).join("\n          ")}
        </div>
      </article>`
  )
  .join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>PLC Portfolio — Claude vs Gemini</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: #0b0f14;
    color: #e6edf3;
    padding: 2.5rem 1.5rem 4rem;
  }
  header { max-width: 960px; margin: 0 auto 2.5rem; }
  h1 { font-size: 1.75rem; margin: 0 0 0.5rem; }
  header p { color: #8b98a5; margin: 0; }
  .grid {
    max-width: 960px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  .card {
    background: #131a22;
    border: 1px solid #22303c;
    border-radius: 10px;
    padding: 1.25rem;
  }
  .card h2 { font-size: 1rem; margin: 0 0 1rem; font-weight: 600; }
  .agent-links { display: flex; gap: 0.75rem; flex-wrap: wrap; }
  .agent-link {
    font-size: 0.875rem;
    padding: 0.4rem 0.75rem;
    border-radius: 6px;
  }
  .agent-link--live {
    background: #0e8a16;
    color: #fff;
    text-decoration: none;
  }
  .agent-link--live:hover { background: #0b6d11; }
  .agent-link--pending {
    background: transparent;
    border: 1px dashed #3a4753;
    color: #8b98a5;
  }
</style>
</head>
<body>
  <header>
    <h1>PLC Portfolio</h1>
    <p>Six industrial automation demos, each built independently by Claude Code and Gemini CLI.</p>
  </header>
  <main class="grid">${cards}
  </main>
</body>
</html>
`;

writeFileSync(path.join(siteDir, "index.html"), html);
console.log(`Wrote hub page for ${manifest.projects.length} project(s), ${built.length} live demo(s).`);
