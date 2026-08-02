#!/usr/bin/env node
// Builds every scaffolded project/agent app under projects/*/*/code and
// assembles them into _site/<slug>/<agent>/ for a single multi-app GitHub
// Pages deployment. Skips any project/agent that hasn't been scaffolded yet
// (no package.json) — the site grows as projects land, nothing to configure
// per project. Run by .github/workflows/deploy-pages.yml.
//
// Usage: node scripts/build-all.mjs

import {
  existsSync,
  mkdirSync,
  cpSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoSlug } from "./lib/repo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "prompts", "manifest.json"), "utf8")
);

const hasCname = existsSync(path.join(repoRoot, "CNAME"));
const repoName = getRepoSlug().split("/")[1];
const siteDir = path.join(repoRoot, "_site");
mkdirSync(siteDir, { recursive: true });
if (hasCname) {
  cpSync(path.join(repoRoot, "CNAME"), path.join(siteDir, "CNAME"));
}

const built = [];

for (const project of manifest.projects) {
  for (const agent of manifest.agents) {
    const codeDir = path.join(repoRoot, "projects", project.slug, agent, "code");
    if (!existsSync(path.join(codeDir, "package.json"))) {
      console.log(`Skipping ${project.slug}/${agent} — not scaffolded yet.`);
      continue;
    }

    const base = hasCname
      ? `/${project.slug}/${agent}/`
      : `/${repoName}/${project.slug}/${agent}/`;
    console.log(`Building ${project.slug}/${agent} with base ${base}`);
    execFileSync("npm", ["ci"], { cwd: codeDir, stdio: "inherit" });
    execFileSync("npm", ["run", "build", "--", "--base", base], {
      cwd: codeDir,
      stdio: "inherit",
    });

    const distDir = path.join(codeDir, "dist");
    if (!existsSync(distDir)) {
      console.warn(`No dist/ produced for ${project.slug}/${agent}, skipping copy.`);
      continue;
    }

    const outDir = path.join(siteDir, project.slug, agent);
    mkdirSync(outDir, { recursive: true });
    cpSync(distDir, outDir, { recursive: true });
    built.push({
      number: project.number,
      slug: project.slug,
      title: project.title,
      agent,
    });
  }
}

writeFileSync(path.join(siteDir, "built.json"), JSON.stringify(built, null, 2));
console.log(`Built ${built.length} app(s).`);
