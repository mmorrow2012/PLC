#!/usr/bin/env node
// Renders the scaffold + logic prompts for projects and opens GitHub issues
// labeled for agent runs.
//
// Usage:
//   node scripts/create-project-issues.mjs <projectNumber|all> [agentFilter]
//   Examples:
//     node scripts/create-project-issues.mjs 1 copilot   (creates P1 issues for copilot)
//     node scripts/create-project-issues.mjs all copilot (creates P1..P9 issues for copilot)
//     node scripts/create-project-issues.mjs 1           (creates P1 issues for all agents)

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "../prompts/lib/render.mjs";
import { projectLabel } from "./lib/repo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.join(__dirname, "..", "prompts");

const targetArg = process.argv[2];
const agentFilter = process.argv[3];

if (!targetArg) {
  console.error("Usage: node scripts/create-project-issues.mjs <projectNumber|all> [agentFilter]");
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(path.join(promptsDir, "manifest.json"), "utf8")
);

const targetProjects = targetArg === "all"
  ? manifest.projects
  : [manifest.projects.find((p) => p.number === Number(targetArg))].filter(Boolean);

if (targetProjects.length === 0) {
  console.error(`No project matching '${targetArg}' in prompts/manifest.json`);
  process.exit(1);
}

const agentsToProcess = agentFilter
  ? [agentFilter]
  : manifest.agents;

const scaffoldTemplate = readFileSync(
  path.join(promptsDir, "templates", "scaffold.md"),
  "utf8"
);

const tmpDir = mkdtempSync(path.join(tmpdir(), "plc-issue-"));

function createIssue({ title, body, labels }) {
  const bodyFile = path.join(tmpDir, `${title.replace(/[^\w]+/g, "-")}.md`);
  writeFileSync(bodyFile, body);
  const args = ["issue", "create", "--title", title, "--body-file", bodyFile];
  for (const label of labels) args.push("--label", label);
  try {
    execFileSync("gh", args, { stdio: "inherit" });
  } catch (err) {
    console.error(`Failed to create issue '${title}':`, err.message);
  }
}

let totalOpened = 0;

for (const project of targetProjects) {
  const logicTemplate = readFileSync(
    path.join(promptsDir, "templates", "logic", `${project.logicTemplate}.md`),
    "utf8"
  );
  const pLabel = projectLabel(project.slug);

  for (const agent of agentsToProcess) {
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

    totalOpened += 2;
  }
}

console.log(`Successfully opened ${totalOpened} GitHub issue(s) for ${targetProjects.length} project(s).`);
