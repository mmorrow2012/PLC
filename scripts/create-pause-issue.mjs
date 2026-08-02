#!/usr/bin/env node
// Opens the human-review "pause" issue for a completed project, linking
// straight to both agents' live demo and journal.md. Closing this issue is
// what advances the pipeline to the next project (see
// .github/workflows/pause-issue-closed.yml).
//
// Called automatically by .github/workflows/project-issues-complete.yml once
// all 4 of a project's scaffold/logic issues are closed.
//
// Usage: node scripts/create-pause-issue.mjs <projectNumber>

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoSlug, projectLabel } from "./lib/repo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectNumber = Number(process.argv[2]);
if (!Number.isInteger(projectNumber)) {
  console.error("Usage: node scripts/create-pause-issue.mjs <projectNumber>");
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, "..", "prompts", "manifest.json"), "utf8")
);
const project = manifest.projects.find((p) => p.number === projectNumber);
if (!project) {
  console.error(`No project ${projectNumber} in prompts/manifest.json`);
  process.exit(1);
}

const [owner, repo] = getRepoSlug().split("/");
const pagesBase = `https://${owner}.github.io/${repo}`;

const lines = [
  `Project **${project.number} — ${project.title}** is fully built by both agents. Review both deliverables below, then close this issue to open Project ${project.number + 1}'s issues.`,
  "",
  "| Agent | Live demo | Journal |",
  "| --- | --- | --- |",
];

for (const agent of manifest.agents) {
  const demo = `${pagesBase}/${project.slug}/${agent}/`;
  const journal = `https://github.com/${owner}/${repo}/blob/main/projects/${project.slug}/${agent}/docs/journal.md`;
  lines.push(`| ${agent} | [demo](${demo}) | [journal.md](${journal}) |`);
}

lines.push(
  "",
  "**To continue:** close this issue once you're satisfied with both deliverables. That triggers the next project's issues automatically. Leave it open to pause the pipeline indefinitely."
);

const isLastProject = projectNumber === Math.max(...manifest.projects.map((p) => p.number));
if (isLastProject) {
  lines.push(
    "",
    "_This is the last project in the manifest — closing this issue will not open any further project issues._"
  );
}

const title = `[Pause] Review Project ${project.number} — ${project.title}`;
const args = [
  "issue",
  "create",
  "--title",
  title,
  "--body",
  lines.join("\n"),
  "--label",
  "type:pause",
  "--label",
  projectLabel(project.slug),
];

execFileSync("gh", args, { stdio: "inherit" });
console.log(`Opened pause issue for project ${project.number}.`);
