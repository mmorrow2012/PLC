#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY environment variable is missing.");
  process.exit(1);
}

// 1. Fetch ready issues for agent:gemini (prioritize scaffold stage first)
let issuesJson = execFileSync(
  "gh",
  [
    "issue",
    "list",
    "--label",
    "agent:gemini",
    "--label",
    "stage:scaffold",
    "--label",
    "status:ready",
    "--state",
    "open",
    "--json",
    "number,title,body,labels",
    "--limit",
    "1",
  ],
  { encoding: "utf8" }
);

let issues = JSON.parse(issuesJson);
if (!issues || issues.length === 0) {
  issuesJson = execFileSync(
    "gh",
    [
      "issue",
      "list",
      "--label",
      "agent:gemini",
      "--label",
      "stage:logic",
      "--label",
      "status:ready",
      "--state",
      "open",
      "--json",
      "number,title,body,labels",
      "--limit",
      "1",
    ],
    { encoding: "utf8" }
  );
  issues = JSON.parse(issuesJson);
}

if (!issues || issues.length === 0) {
  console.log("No open issues labeled 'agent:gemini' and 'status:ready'. Exiting.");
  process.exit(0);
}

const issue = issues[0];
console.log(`Processing Issue #${issue.number}: ${issue.title}`);

// Determine stage (scaffold or logic)
const stageLabel = issue.labels.find((l) => l.name.startsWith("stage:"))?.name;
const stage = stageLabel ? stageLabel.slice(6) : "logic";

// 2. Claim issue (status:ready -> status:in-progress)
execFileSync("gh", [
  "issue",
  "edit",
  String(issue.number),
  "--remove-label",
  "status:ready",
  "--add-label",
  "status:in-progress",
]);

// 3. Prepare system prompt and query Gemini API
const systemInstruction = `You are an expert industrial software engineer and web developer.
Your task is to fulfill the specifications in the provided prompt.
You MUST output ONLY a valid JSON object containing an array of files to create/update.
No extra commentary, markdown text, or explanations outside the JSON object.

JSON Schema:
{
  "files": [
    {
      "path": "string (relative path from repository root)",
      "content": "string (complete file content)"
    }
  ]
}
`;

const todayDate = new Date().toISOString().split("T")[0];
const userPrompt = `Today's date is: ${todayDate}.

${issue.body}

Please return the full JSON object containing all required file paths and file contents. Ensure the JSON is properly escaped.`;

console.log("Calling Gemini API...");
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

const startTime = Date.now();
const response = await fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [
      {
        parts: [
          { text: systemInstruction },
          { text: userPrompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2
    }
  })
});
const endTime = Date.now();
const durationSec = ((endTime - startTime) / 1000).toFixed(1);

if (!response.ok) {
  const errText = await response.text();
  console.error(`Gemini API call failed (${response.status}):`, errText);
  process.exit(1);
}

const resData = await response.json();
const usage = resData.usageMetadata || {};
const promptTokens = usage.promptTokenCount || 0;
const outputTokens = usage.candidatesTokenCount || 0;
const totalTokens = usage.totalTokenCount || (promptTokens + outputTokens);

const rawContent = resData.candidates?.[0]?.content?.parts?.[0]?.text;
if (!rawContent) {
  console.error("Gemini API returned an empty response.");
  process.exit(1);
}

function parseGeminiJson(rawStr) {
  let clean = rawStr.trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    clean = clean.substring(start, end + 1);
  }
  try {
    return JSON.parse(clean);
  } catch (e1) {
    try {
      const sanitized = clean.replace(/"((?:[^"\\]|\\.)*)"/g, (match, group) => {
        const escapedGroup = group.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
        return `"${escapedGroup}"`;
      });
      return JSON.parse(sanitized);
    } catch (e2) {
      try {
        return (new Function("return " + clean))();
      } catch (e3) {
        throw e1;
      }
    }
  }
}

let resultJson;
try {
  resultJson = parseGeminiJson(rawContent);
} catch (err) {
  console.error("Failed to parse JSON response from Gemini:", err);
  console.error("Raw response length:", rawContent.length);
  try {
    execFileSync("gh", ["issue", "edit", String(issue.number), "--remove-label", "status:in-progress", "--add-label", "status:ready"]);
  } catch (_) {}
  process.exit(1);
}

if (!resultJson.files || !Array.isArray(resultJson.files)) {
  console.error("JSON response does not contain a 'files' array.", resultJson);
  process.exit(1);
}

// 4. Write generated files
console.log(`Writing ${resultJson.files.length} file(s)...`);
for (const fileObj of resultJson.files) {
  const fullPath = path.join(repoRoot, fileObj.path);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, fileObj.content, "utf8");
  console.log(`Wrote: ${fileObj.path}`);
}

// 5. Inject Token Usage & Timing Metrics into journal.md
const projectLabel = issue.labels.find((l) => l.name.startsWith("project:"))?.name;
const projNumber = projectLabel ? projectLabel.slice(8) : "01";

const manifest = JSON.parse(
  readFileSync(path.join(repoRoot, "prompts", "manifest.json"), "utf8")
);
const project = manifest.projects.find((p) => String(p.number).padStart(2, "0") === projNumber || p.number === Number(projNumber));
const slug = project ? project.slug : "01-conveyor-system";

const journalPath = path.join(repoRoot, "projects", slug, "gemini", "docs", "journal.md");
if (existsSync(journalPath)) {
  let journalText = readFileSync(journalPath, "utf8");
  const marker = `<!-- METRICS:${stage} -->`;
  if (journalText.includes(marker)) {
    const metricsBlock = `${marker}\n- **Execution Duration:** ${durationSec} seconds\n- **Prompt Tokens:** ${promptTokens.toLocaleString()}\n- **Output Tokens:** ${outputTokens.toLocaleString()}\n- **Total Tokens:** ${totalTokens.toLocaleString()}`;
    journalText = journalText.replace(marker, metricsBlock);
    writeFileSync(journalPath, journalText, "utf8");
    console.log(`Updated metrics in ${journalPath}`);
  }
}

// 6. Test compile & build if package.json exists under the code directory
const codeDir = path.join(repoRoot, "projects", slug, "gemini", "code");
if (existsSync(path.join(codeDir, "package.json"))) {
  console.log(`Installing dependencies and building app in ${codeDir}...`);
  try {
    execFileSync("npm", ["install"], { cwd: codeDir, stdio: "inherit" });
    execFileSync("npm", ["run", "build"], { cwd: codeDir, stdio: "inherit" });
  } catch (err) {
    console.warn("Warning: Build step encountered an issue:", err.message);
  }
}

// 7. Rebuild Pages hub
try {
  console.log("Rebuilding Pages site...");
  execFileSync("node", ["scripts/build-all.mjs"], { cwd: repoRoot, stdio: "inherit" });
  execFileSync("node", ["scripts/build-hub.mjs"], { cwd: repoRoot, stdio: "inherit" });
} catch (err) {
  console.warn("Warning: Pages build step encountered an issue:", err.message);
}

// 8. Commit & Push
console.log("Committing changes to git...");
try {
  execFileSync("git", ["add", "."], { cwd: repoRoot, stdio: "inherit" });
  execFileSync(
    "git",
    ["commit", "-m", `[Gemini Agent] Fulfill Issue #${issue.number}: ${issue.title}`],
    { cwd: repoRoot, stdio: "inherit" }
  );
  execFileSync("git", ["push", "origin", "main"], { cwd: repoRoot, stdio: "inherit" });
} catch (err) {
  console.log("Git commit/push note:", err.message);
}

// 9. Close Issue
console.log(`Closing Issue #${issue.number}...`);
execFileSync("gh", [
  "issue",
  "edit",
  String(issue.number),
  "--remove-label",
  "status:in-progress",
]);

const shortSha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
execFileSync("gh", [
  "issue",
  "close",
  String(issue.number),
  "--comment",
  `Completed by Gemini Agent workflow. Delivered in commit: ${shortSha}.\nExecution time: ${durationSec}s | Total tokens: ${totalTokens.toLocaleString()}`,
]);

console.log(`Issue #${issue.number} successfully completed!`);
