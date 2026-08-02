#!/usr/bin/env node
// Renders the scaffold + logic prompts for one project (both agents) and
// opens the 4 GitHub issues that drive it, labeled for the agent crons to
// pick up. Called by hand to kick off project 1, and automatically by
// .github/workflows/pause-issue-closed.yml when a pause issue is closed.
//
// Usage: node scripts/create-project-issues.mjs <projectNumber>
// Requires: `gh` CLI authenticated with repo write access (GH_TOKEN in CI).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../prompts/lib/render.mjs";
import { projectLabel } from "./lib/repo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.join(__dirname, "..", "prompts");

const projectNumber = Number(process.argv[2]);
if (!Number.isInteger(projectNumber)) {
  console.error("Usage: node scripts/create-project-issues.mjs <projectNumber>");
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(path.join(promptsDir, "manifest.json"), "utf8")
);
const project = manifest.projects.find((p) => p.number === projectNumber);
if (!project) {
  console.error(`No project ${projectNumber} in prompts/manifest.json`);
  process.exit(1);
}

const scaffoldTemplate = readFileSync(
  path.join(promptsDir, "templates", "scaffold.md"),
  "utf8"
);
const logicTemplate = readFileSync(
  path.join(promptsDir, "templates", "logic", `${project.logicTemplate}.md`),
  "utf8"
);

const tmpDir = mkdtempSync(path.join(tmpdir(), "plc-issue-"));
const pLabel = projectLabel(project.slug);

function createIssue({ title, body, labels }) {
  const bodyFile = path.join(tmpDir, `${title.replace(/[^\w]+/g, "-")}.md`);
  writeFileSync(bodyFile, body);
  const args = ["issue", "create", "--title", title, "--body-file", bodyFile];
  for (const label of labels) args.push("--label", label);
  execFileSync("gh", args, { stdio: "inherit" });
}

for (const agent of manifest.agents) {
  const scaffoldBody = render(scaffoldTemplate, {
    PROJECT_DIR: `projects/${project.slug}`,
    AGENT: agent,
    DOMAIN_FILE: project.domainFile,
  });
  createIssue({
    title: `[P${project.number}] ${project.title} — Scaffold (${agent})`,
    body: scaffoldBody,
    labels: [`agent:${agent}`, pLabel, "stage:scaffold", "status:ready"],
  });

  const logicBody = render(logicTemplate, { AGENT: agent });
  createIssue({
    title: `[P${project.number}] ${project.title} — Logic (${agent})`,
    body: logicBody,
    labels: [`agent:${agent}`, pLabel, "stage:logic", "status:ready"],
  });
}

console.log(`Opened 4 issues for project ${project.number} (${project.title}).`);
