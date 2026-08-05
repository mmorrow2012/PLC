#!/usr/bin/env node
// Picks up the next open issue labeled agent:claude + status:ready, has the
// real Claude Code CLI implement it end-to-end (non-interactively, with
// permission checks bypassed) inside projects/<slug>/claude/, verifies the
// build, commits, pushes to main, and closes the issue. Run on a schedule by
// .github/workflows/claude-runner.yml, mirroring scripts/run-gemini-agent.mjs
// and scripts/run-copilot-agent.mjs for the other two agents in this demo.
//
// Usage: node scripts/run-claude-agent.mjs

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoSlug } from "./lib/repo.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const claudeOauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
const authToken = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!anthropicApiKey && !claudeOauthToken) {
  console.log("Neither ANTHROPIC_API_KEY nor CLAUDE_CODE_OAUTH_TOKEN is set. Skipping Claude runner.");
  process.exit(0);
}
if (!authToken) {
  console.log("GH_TOKEN is not set. Skipping Claude runner.");
  process.exit(0);
}

const repoSlug = getRepoSlug();
const modelOverride = (process.env.CLAUDE_MODEL_OVERRIDE || "").trim();
const maxBudgetUsd = process.env.CLAUDE_MAX_BUDGET_USD || "8";

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "prompts", "manifest.json"), "utf8")
);

function runGh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    env: { ...process.env, GH_TOKEN: authToken },
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
    "agent:claude",
    "--label",
    `stage:${stage}`,
    "--label",
    "status:ready",
    "--state",
    "open",
    "--json",
    "number,title,body,labels",
    "--limit",
    "100",
  ]);
  return issues.sort((a, b) => a.number - b.number);
}

function nextReadyIssue() {
  const scaffold = listReadyIssues("scaffold");
  if (scaffold.length > 0) return { issue: scaffold[0], stage: "scaffold" };

  const logic = listReadyIssues("logic");
  if (logic.length > 0) return { issue: logic[0], stage: "logic" };

  return null;
}

const picked = nextReadyIssue();
if (!picked) {
  console.log("No open issues labeled 'agent:claude' and 'status:ready'. Exiting.");
  process.exit(0);
}

const { issue, stage } = picked;
console.log(`Processing Issue #${issue.number}: ${issue.title}`);

const projectLabelName = issue.labels.find((l) => l.name.startsWith("project:"))?.name;
const projNumber = projectLabelName ? Number.parseInt(projectLabelName.slice(8), 10) : 1;
const project = manifest.projects.find((p) => p.number === projNumber) || manifest.projects[0];
const slug = project.slug;
const projectDir = `projects/${slug}/claude`;

function selectModel() {
  if (modelOverride && modelOverride !== "auto") return modelOverride;
  if (stage === "scaffold") return "claude-sonnet-5";
  return projNumber >= 7 ? "claude-opus-5" : "claude-sonnet-5";
}
const model = selectModel();
console.log(`Using model ${model} for stage ${stage} (project ${projNumber}).`);

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

claimIssue(issue.number);

const todayDate = new Date().toISOString().split("T")[0];
const userPrompt = `Today's date is ${todayDate}. This is GitHub issue #${issue.number} in ${repoSlug}.

${issue.body}`;

const systemAppend = [
  `Work only inside ${projectDir}/. Do not create, modify, or delete files outside that directory — leave every other project's copilot/, gemini/, and claude/ directories, shared scripts, and workflow files untouched.`,
  "You are running non-interactively in a GitHub Actions runner with permission checks bypassed for this session. Do not ask for confirmation — carry the task through to completion yourself.",
  `Before finishing, run npm install and npm run build inside ${projectDir}/code/ and fix any errors so the build succeeds.`,
  "Do not run git add, git commit, git push, or open a pull request — a separate automation step commits and pushes your changes after you finish.",
].join(" ");

console.log("Running Claude Code...");
const startTime = Date.now();

let rawOutput;
try {
  rawOutput = execFileSync(
    "claude",
    [
      "--print",
      "--output-format",
      "json",
      "--model",
      model,
      "--permission-mode",
      "bypassPermissions",
      "--max-budget-usd",
      String(maxBudgetUsd),
      "--append-system-prompt",
      systemAppend,
      userPrompt,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...(anthropicApiKey ? { ANTHROPIC_API_KEY: anthropicApiKey } : {}),
        ...(claudeOauthToken ? { CLAUDE_CODE_OAUTH_TOKEN: claudeOauthToken } : {}),
      },
      maxBuffer: 1024 * 1024 * 50,
      timeout: 25 * 60 * 1000,
      stdio: ["ignore", "pipe", "inherit"],
    }
  );
} catch (err) {
  console.error("Claude Code invocation failed:", err.message);
  if (err.stdout) console.error("--- stdout ---\n" + err.stdout.toString());
  if (err.stderr) console.error("--- stderr ---\n" + err.stderr.toString());
  revertClaim(issue.number);
  process.exit(1);
}

const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

let result;
try {
  result = JSON.parse(rawOutput.trim());
} catch (err) {
  console.error("Failed to parse Claude Code JSON output:", err.message);
  revertClaim(issue.number);
  process.exit(1);
}

if (result.is_error) {
  console.error("Claude Code reported an error:", result.result || result.subtype);
  revertClaim(issue.number);
  process.exit(1);
}

console.log(
  `Claude Code finished in ${durationSec}s (${result.num_turns} turns, $${(result.total_cost_usd || 0).toFixed(4)}).`
);

const status = execFileSync("git", ["status", "--porcelain", "--", projectDir], {
  cwd: repoRoot,
  encoding: "utf8",
});
if (!status.trim()) {
  console.error(`No changes were made under ${projectDir}/. Treating as a failed run.`);
  revertClaim(issue.number);
  process.exit(1);
}

const codeDir = path.join(repoRoot, projectDir, "code");
if (existsSync(path.join(codeDir, "package.json"))) {
  try {
    console.log(`Verifying build in ${codeDir}...`);
    execFileSync("npm", ["install"], { cwd: codeDir, stdio: "inherit" });
    execFileSync("npm", ["run", "build"], { cwd: codeDir, stdio: "inherit" });
  } catch (err) {
    console.warn("Warning: build verification failed:", err.message);
  }
}

const journalPath = path.join(repoRoot, projectDir, "docs", "journal.md");
if (existsSync(journalPath)) {
  let journalText = readFileSync(journalPath, "utf8");
  const marker = `<!-- METRICS:${stage} -->`;
  if (journalText.includes(marker)) {
    const usage = result.usage || {};
    const inputTokens =
      (usage.input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0) +
      (usage.cache_read_input_tokens || 0);
    const metricsBlock = [
      marker,
      `- **Execution Duration:** ${durationSec} seconds`,
      `- **Model:** ${model}`,
      `- **Turns:** ${result.num_turns ?? "n/a"}`,
      `- **Input Tokens:** ${inputTokens.toLocaleString()}`,
      `- **Output Tokens:** ${(usage.output_tokens || 0).toLocaleString()}`,
      `- **Estimated Cost:** $${(result.total_cost_usd || 0).toFixed(4)}`,
    ].join("\n");
    journalText = journalText.replace(marker, metricsBlock);
    writeFileSync(journalPath, journalText, "utf8");
    console.log(`Updated metrics in ${journalPath}`);
  }
}

console.log("Committing changes to git...");
try {
  execFileSync("git", ["add", "."], { cwd: repoRoot, stdio: "inherit" });
  execFileSync(
    "git",
    ["commit", "-m", `[Claude Agent] Fulfill Issue #${issue.number}: ${issue.title}`],
    { cwd: repoRoot, stdio: "inherit" }
  );

  let pushed = false;
  for (let attempt = 1; attempt <= 3 && !pushed; attempt += 1) {
    try {
      execFileSync("git", ["push", "origin", "HEAD:main"], { cwd: repoRoot, stdio: "inherit" });
      pushed = true;
    } catch (pushErr) {
      if (attempt === 3) throw pushErr;
      console.warn(`Push attempt ${attempt} failed, rebasing onto latest main and retrying...`);
      execFileSync("git", ["fetch", "origin", "main"], { cwd: repoRoot, stdio: "inherit" });
      execFileSync("git", ["rebase", "origin/main"], { cwd: repoRoot, stdio: "inherit" });
    }
  }
} catch (err) {
  console.error("Git commit/push failed:", err.message);
  revertClaim(issue.number);
  process.exit(1);
}

try {
  // Pushes made with GH_TOKEN don't trigger other workflows' `on: push`
  // (GitHub suppresses that to avoid infinite workflow loops), so
  // deploy-pages.yml would never see this commit on its own. Kick it
  // off explicitly.
  runGh(["workflow", "run", "deploy-pages.yml"]);
  console.log("Triggered Pages deploy.");
} catch (err) {
  console.warn("Warning: failed to trigger Pages deploy:", err.message);
}

console.log(`Closing Issue #${issue.number}...`);
runGh(["issue", "edit", String(issue.number), "--remove-label", "status:in-progress"]);

const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  cwd: repoRoot,
  encoding: "utf8",
}).trim();

runGh([
  "issue",
  "close",
  String(issue.number),
  "--comment",
  `Completed by the Claude Code agent runner. Delivered in commit: ${shortSha}.\nModel: ${model} | Execution time: ${durationSec}s | Turns: ${result.num_turns ?? "n/a"} | Estimated cost: $${(result.total_cost_usd || 0).toFixed(4)}`,
]);

console.log(`Issue #${issue.number} successfully completed!`);
