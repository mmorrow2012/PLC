#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoSlug } from "./lib/repo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const authToken = process.env.COPILOT_GITHUB_TOKEN || process.env.GH_TOKEN;
if (!authToken) {
  console.log("COPILOT_GITHUB_TOKEN is not set. Skipping Copilot runner.");
  process.exit(0);
}

const repoSlug = getRepoSlug();
const [owner, repo] = repoSlug.split("/");
const baseBranch = process.env.COPILOT_BASE_BRANCH || "main";
const modelOverride = (process.env.COPILOT_MODEL_OVERRIDE || "").trim().toLowerCase();
const maxAssignments = Math.max(
  1,
  Number.parseInt(process.env.COPILOT_MAX_ASSIGNMENTS || "1", 10) || 1
);

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "prompts", "manifest.json"), "utf8")
);

function runGh(args, options = {}) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      GH_TOKEN: authToken,
    },
    ...options,
  });
}

function runGhJson(args) {
  return JSON.parse(runGh(args));
}

function listReadyIssues(stage) {
  const issues = runGhJson([
    "issue",
    "list",
    "--label",
    "agent:copilot",
    "--label",
    `stage:${stage}`,
    "--label",
    "status:ready",
    "--state",
    "open",
    "--json",
    "number,title,labels",
    "--limit",
    "100",
  ]);

  return issues.sort((a, b) => a.number - b.number);
}

function nextReadyIssue() {
  const scaffoldIssues = listReadyIssues("scaffold");
  if (scaffoldIssues.length > 0) return scaffoldIssues[0];

  const logicIssues = listReadyIssues("logic");
  if (logicIssues.length > 0) return logicIssues[0];

  return null;
}

function getProjectNumber(issue) {
  const label = issue.labels.find((item) => item.name.startsWith("project:"))?.name;
  return Number.parseInt(label?.slice(8) || "1", 10);
}

function getProject(issue) {
  const projectNumber = getProjectNumber(issue);
  return (
    manifest.projects.find((item) => item.number === projectNumber) ||
    manifest.projects[0]
  );
}

function getStage(issue) {
  return issue.labels.find((item) => item.name.startsWith("stage:"))?.name?.slice(6) || "logic";
}

function selectModel(issue) {
  if (modelOverride && modelOverride !== "auto") return modelOverride;
  if (modelOverride === "auto") return "auto";

  const stage = getStage(issue);
  const projectNumber = getProjectNumber(issue);

  if (stage === "scaffold") return "gpt-5.4";
  if (projectNumber >= 7) return "claude-opus-4.6";
  return "claude-sonnet-4.5";
}

function buildCustomInstructions(issue, model) {
  const project = getProject(issue);
  const stage = getStage(issue);

  return [
    `Work only inside projects/${project.slug}/copilot/.`,
    "Follow the repository's multi-app layout and do not modify other agent directories.",
    "Keep repo-level workflows and shared scripts intact unless the issue explicitly requires changes there.",
    stage === "scaffold"
      ? "Prioritize a compiling scaffold with the required docs, code skeletons, and package setup."
      : "Implement the requested PLC logic, UI, docs, and build-journal updates within the scaffolded Copilot project.",
    `Use the assigned model (${model}) unless the task is re-run later with a different override.`,
  ].join(" ");
}

function claimIssue(number) {
  runGh([
    "issue",
    "edit",
    String(number),
    "--remove-label",
    "status:ready",
    "--add-label",
    "status:in-progress",
  ]);
}

function revertClaim(number) {
  try {
    runGh([
      "issue",
      "edit",
      String(number),
      "--remove-label",
      "status:in-progress",
      "--add-label",
      "status:ready",
    ]);
  } catch (error) {
    console.warn(`Failed to revert claim for issue #${number}: ${error.message}`);
  }
}

function assignIssueToCopilot(issue, model) {
  const payload = {
    assignees: ["copilot-swe-agent[bot]"],
    agent_assignment: {
      target_repo: repoSlug,
      base_branch: baseBranch,
      custom_instructions: buildCustomInstructions(issue, model),
      custom_agent: "",
      model,
    },
  };

  runGh(
    [
      "api",
      "--method",
      "POST",
      "-H",
      "Accept: application/vnd.github+json",
      "-H",
      "X-GitHub-Api-Version: 2022-11-28",
      `/repos/${owner}/${repo}/issues/${issue.number}/assignees`,
      "--input",
      "-",
    ],
    { input: JSON.stringify(payload) }
  );
}

function assignWithFallback(issue, preferredModel) {
  try {
    assignIssueToCopilot(issue, preferredModel);
    return preferredModel;
  } catch (error) {
    if (preferredModel === "auto") throw error;

    console.warn(
      `Assignment with model ${preferredModel} failed for issue #${issue.number}; retrying with auto.`
    );
    assignIssueToCopilot(issue, "auto");
    return "auto";
  }
}

function commentOnIssue(number, model) {
  runGh([
    "issue",
    "comment",
    String(number),
    "--body",
    `Assigned to GitHub Copilot cloud agent on \`${baseBranch}\` using model \`${model}\` via the Copilot runner workflow.`,
  ]);
}

let assignedCount = 0;

for (let index = 0; index < maxAssignments; index += 1) {
  const issue = nextReadyIssue();
  if (!issue) break;

  const model = selectModel(issue);
  console.log(`Assigning issue #${issue.number} (${issue.title}) with model ${model}`);

  claimIssue(issue.number);

  try {
    const assignedModel = assignWithFallback(issue, model);
    try {
      commentOnIssue(issue.number, assignedModel);
    } catch (error) {
      console.warn(`Assigned issue #${issue.number} but failed to add comment: ${error.message}`);
    }
    assignedCount += 1;
  } catch (error) {
    revertClaim(issue.number);
    throw error;
  }
}

if (assignedCount === 0) {
  console.log("No ready Copilot issues found.");
} else {
  console.log(`Assigned ${assignedCount} Copilot issue(s).`);
}
