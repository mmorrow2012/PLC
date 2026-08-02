#!/usr/bin/env node
// One-time setup: creates every label the issue/automation pipeline depends
// on. Safe to re-run — existing labels are left untouched, only missing ones
// are created. Requires the `gh` CLI authenticated with repo write access.
//
// Usage: node scripts/create-labels.mjs

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(__dirname, "..", "prompts", "manifest.json"), "utf8")
);

const labels = [
  { name: "agent:gemini", color: "4285F4", description: "Claimed/worked by the Gemini CLI cron" },
  { name: "agent:claude", color: "D97757", description: "Claimed/worked by the Claude Code cron" },
  { name: "agent:copilot", color: "059669", description: "Claimed/worked by GitHub Copilot" },
  { name: "stage:scaffold", color: "C5DEF5", description: "Repo/environment scaffolding stage" },
  { name: "stage:logic", color: "5319E7", description: "Domain logic implementation stage" },
  { name: "status:ready", color: "0E8A16", description: "Unclaimed, ready for a cron to pick up" },
  { name: "status:in-progress", color: "FBCA04", description: "Claimed by a cron run, work underway" },
  { name: "type:pause", color: "B60205", description: "Human review gate between projects" },
  ...manifest.projects.map((p) => ({
    name: `project:${p.slug.slice(0, 2)}`,
    color: "BFD4F2",
    description: p.title,
  })),
];

function existingLabels() {
  const out = execFileSync(
    "gh",
    ["label", "list", "--json", "name", "--limit", "200"],
    { encoding: "utf8" }
  );
  return new Set(JSON.parse(out).map((l) => l.name));
}

const existing = existingLabels();
let created = 0;

for (const label of labels) {
  if (existing.has(label.name)) continue;
  execFileSync("gh", [
    "label",
    "create",
    label.name,
    "--color",
    label.color,
    "--description",
    label.description,
  ]);
  console.log(`Created label: ${label.name}`);
  created++;
}

console.log(`Done. Created ${created} new label(s), ${labels.length - created} already existed.`);
