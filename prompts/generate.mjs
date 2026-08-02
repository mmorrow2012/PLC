#!/usr/bin/env node
// Renders the scaffold + logic prompts for every project x agent combination
// from prompts/templates/ using prompts/manifest.json as the single source of
// truth. Re-run after editing a template or the manifest; never hand-edit the
// generated prompts/*.md files directly.
//
// Usage: node prompts/generate.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { render } from "./lib/render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, "manifest.json"), "utf8")
);

const scaffoldTemplate = readFileSync(
  path.join(__dirname, "templates", "scaffold.md"),
  "utf8"
);

function generatedNotice(sourcePath) {
  return `<!-- GENERATED FILE: do not edit directly. Source: ${sourcePath} + prompts/manifest.json. Regenerate with: node prompts/generate.mjs -->\n`;
}

let count = 0;

for (const project of manifest.projects) {
  const logicTemplatePath = `prompts/templates/logic/${project.logicTemplate}.md`;
  const logicTemplate = readFileSync(
    path.join(__dirname, "templates", "logic", `${project.logicTemplate}.md`),
    "utf8"
  );

  for (const agent of manifest.agents) {
    const scaffoldOut = render(scaffoldTemplate, {
      PROJECT_DIR: `projects/${project.slug}`,
      AGENT: agent,
      DOMAIN_FILE: project.domainFile,
    });
    writeFileSync(
      path.join(__dirname, `repo-setup-prompt-${project.number}-${agent}.md`),
      generatedNotice("prompts/templates/scaffold.md") + scaffoldOut
    );
    count++;

    const logicOut = render(logicTemplate, { AGENT: agent });
    writeFileSync(
      path.join(
        __dirname,
        `${project.logicTemplate}-logic-prompt-${project.number}-${agent}.md`
      ),
      generatedNotice(logicTemplatePath) + logicOut
    );
    count++;
  }
}

console.log(`Rendered ${count} prompt files.`);
