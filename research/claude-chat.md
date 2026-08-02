# Claude Planning Log

Decisions agreed while planning the PLC repo's build pipeline with Claude Code, in the same spirit as [`gemini-chat.md`](gemini-chat.md) but distilled rather than pasted raw (this was a live tool-driven session, not a copy-pasted chat transcript).

## Repo Reorganization

- `vendors.md` → `research/vendors.md`.
- `gemini-chat.md` → `research/gemini-chat.md` (kept as-is; it's the raw planning transcript, not to be edited).
- Tooling decisions distilled out of `gemini-chat.md` into `research/tooling.md` (stack table + rationale + rejected options + repo/agent org model).
- `README.md` left untouched for now — will be revisited once the projects actually exist.
- Added a root `.gitignore` (node_modules, build output, env files, editor/OS cruft) ahead of the first scaffold run.

## Prompts

- Created scaffold + logic prompt pairs for all 6 project ideas from the README (previously only project 1, conveyor, existed), following the two-prompt pattern (`repo-setup-prompt-N` → scaffolding, `<domain>-logic-prompt-N` → feature implementation) and the `projects/NN-name/<agent>/{code,docs}` structure agreed in `gemini-chat.md`.
- Each project got its own I/O tag map and control logic rules, written to match the README's one-line domain description and Schneider M580 / IEC 61131-3 conventions used in project 1.
- Split every prompt into `-gemini` and `-claude` variants (24 files total) — identical content, output path swapped between `.../gemini/...` and `.../claude/...` — so both agents can build the same project independently without colliding on files.

## Prompts → GitHub Issues

- **Templates consolidated** (done): `prompts/templates/scaffold.md` (one file, `{{PROJECT_DIR}}`/`{{AGENT}}`/`{{DOMAIN_FILE}}` placeholders) + `prompts/templates/logic/*.md` (one per project, `{{AGENT}}` placeholder) + `prompts/manifest.json` (slug, title, domain filename, logic-template key per project). `prompts/generate.mjs` renders all 24 local prompt files from these; `prompts/lib/render.mjs` holds the shared placeholder-substitution logic reused by the issue-creation script below.
- **Issue granularity: 4 issues per project** (2 agents × {scaffold, logic}), **not all 24 up front** — superseded by the pause-gate design below, which creates each project's issues just-in-time.
- **Labels:** `agent:claude` / `agent:gemini`, `project:01`…`project:06`, `stage:scaffold` / `stage:logic`, `status:ready` → `status:in-progress` (claim mechanism, not yet consumed by anything since the cron runners aren't built), `type:pause`. Seeded once via `scripts/create-labels.mjs` (not yet run).
- **GitHub Projects (V2) board does not configure itself from issues.** Still a one-time manual step: create the board, add its built-in auto-add-by-label workflow rules (e.g. `agent:claude` label → add to project, set Agent field = Claude). Not yet done.

## Pause Gate Between Projects (implemented)

Rather than create all 24 issues up front and have the cron claim logic reason about cross-project ordering, issue creation is event-driven and only one project's issues exist at a time:

- `scripts/create-project-issues.mjs <N>` renders that project's scaffold + logic templates for both agents and opens the 4 issues via `gh issue create`, labeled `agent:*`, `project:0N`, `stage:*`, `status:ready`.
- `.github/workflows/project-issues-complete.yml` runs on every `issues: closed` event; if the closed issue isn't itself a pause issue, it checks whether all non-pause issues carrying that project's label are now closed, and if so (and no pause issue exists yet) runs `scripts/create-pause-issue.mjs <N>`.
- `scripts/create-pause-issue.mjs <N>` opens a `type:pause` issue linking directly to both agents' live demo URL and `docs/journal.md`, so review is one click away.
- `.github/workflows/pause-issue-closed.yml` runs on `issues: closed`; if the closed issue has `type:pause`, it computes the next project number from `prompts/manifest.json` and calls `create-project-issues.mjs` again — or does nothing if it was the last project.
- **Close, not delete, is the pause signal** — deleting a GitHub issue is admin-only, irreversible, and erases the review record; closing is the same one-click gesture and keeps history.

## Hosting & Navigation Hub (implemented)

- GitHub Pages serves one site per repo, not one per folder — so every project's scaffold prompt originally asking the agent to write its own `deploy.yml` would have had 12 workflows fighting over the same Pages deployment. Fixed: **scaffold template no longer includes any deploy config**; agents are explicitly told to leave `vite.config.ts` at its default (no hardcoded `base`).
- **Single Pages site, one subpath per project/agent** (e.g. `/PLC/01-conveyor-system/gemini/`), built by a repo-level `scripts/build-all.mjs` — walks every scaffolded `projects/*/*/code` app, builds it with `--base /<repo>/<slug>/<agent>/`, copies `dist/` into `_site/<slug>/<agent>/`. Skips anything not scaffolded yet, so the site just grows as projects land.
- `scripts/build-hub.mjs` generates `_site/index.html` from `prompts/manifest.json` + `_site/built.json` — a card per project linking to whichever agent demos exist, "not built yet" otherwise. This *is* the requested "navigate between every project/agent deliverable" site — it isn't a separate one-off built at the end, it's regenerated on every deploy.
- `.github/workflows/deploy-pages.yml` runs both scripts on push to `main` (or manual dispatch) and publishes via `actions/deploy-pages`. Requires a one-time manual repo setting: **Settings → Pages → Source: GitHub Actions**.
- This hub/aggregator is treated as repo infrastructure, built directly rather than through the agent-race issue pipeline.

## Next: Coding Race (Claude vs. Gemini)

- Two GitHub Actions **scheduled workflows**, not Claude Code's native scheduler for one side and an external cron for the other — chosen deliberately for a symmetric harness (same cadence, same claim/branch/PR logic) so the comparison between agents isn't muddied by differing trigger reliability/latency.
- Each cronjob's loop: query open issues with its `agent:*` label and `status:ready` → claim the oldest one (flip to `status:in-progress`) → fresh branch → run the CLI non-interactively against the issue body as the prompt → push → open a PR that closes the issue.
- Needs both agents' API keys as repo secrets, and a token scoped for `contents:write`, `pull-requests:write`, `issues:write`.
- Plan to dry-run one issue by hand before turning the schedule on.

## Next: Build Journal per Project/Agent

- Add `docs/journal.md` to the scaffold structure (alongside the existing `ARCHITECTURE.md` / `PLC_LOGIC.md` placeholders) for every `projects/NN-name/<agent>/` workspace.
- **One entry per stage** (scaffold, logic) — matches the 24-issue/2-stage structure; each stage's PR only ever touches its own section.
- **Decisions/trade-offs are agent-authored**; **time and token cost are harness-captured**, not self-reported — an agent generating its own journal text has no reliable visibility into its own running token total, so asking it to guess would make the numbers fiction and useless for comparing Claude vs. Gemini.
- Format: the agent writes a stage heading and a `<!-- METRICS:stage -->` marker it leaves untouched, plus its "Decisions" and "Trade-offs / deviations from prompt" sections. The workflow step, immediately after the agent's run completes, inserts the measured duration and token usage (parsed from the CLI's structured non-interactive output — Claude Code's `--output-format json`, Gemini CLI's equivalent) directly under that marker.

## Next: Coding Race (Claude vs. Gemini)

Agreed direction, not yet built:

- Two GitHub Actions **scheduled workflows**, not Claude Code's native scheduler for one side and an external cron for the other — chosen deliberately for a symmetric harness (same cadence, same claim/branch/PR logic) so the comparison between agents isn't muddied by differing trigger reliability/latency.
- Each cronjob's loop: query open issues with its `agent:*` label and `status:ready` → claim the oldest one (flip to `status:in-progress`) → fresh branch → run the CLI non-interactively against the issue body as the prompt → push → open a PR that closes the issue.
- Needs both agents' API keys as repo secrets, and a token scoped for `contents:write`, `pull-requests:write`, `issues:write`.
- Plan to dry-run one issue by hand before turning the schedule on.

## Build Journal per Project/Agent (in templates, not yet exercised)

- `docs/journal.md` is created by the scaffold prompt and appended to by the logic prompt for every `projects/NN-name/<agent>/` workspace.
- **One entry per stage** (scaffold, logic) — matches the 2-stage issue structure; each stage's PR only ever touches its own section.
- **Decisions/trade-offs are agent-authored**; **time and token cost are harness-captured**, not self-reported — an agent generating its own journal text has no reliable visibility into its own running token total, so asking it to guess would make the numbers fiction and useless for comparing Claude vs. Gemini.
- Format: the agent writes a stage heading and a `<!-- METRICS:stage -->` marker it leaves untouched, plus its "Decisions" and "Trade-offs / deviations from prompt" sections. Nothing yet fills in the metrics under that marker — that's part of the still-unbuilt cron runner workflows above.

## Status

**Implemented:** prompt templates + manifest + generator (`prompts/`); pause-gate issue automation (`scripts/create-project-issues.mjs`, `scripts/create-pause-issue.mjs`, `.github/workflows/project-issues-complete.yml`, `.github/workflows/pause-issue-closed.yml`); label seeding script (`scripts/create-labels.mjs`, not yet run); multi-app hosting + navigation hub (`scripts/build-all.mjs`, `scripts/build-hub.mjs`, `.github/workflows/deploy-pages.yml`). All verified locally (script syntax, a dry-run build producing a correct empty-state hub page, YAML parses cleanly) but nothing has been exercised against the live repo yet.

**Not yet built:**
- The two agent-runner cron workflows that actually invoke Claude Code / Gemini CLI against a claimed issue (needs API key secrets).
- The `<!-- METRICS:stage -->` injection step (depends on the cron runners existing).
- The GitHub Projects (V2) board and its auto-add-by-label automation (manual one-time UI setup).
- Enabling GitHub Pages with source "GitHub Actions" in repo settings (manual one-time UI setup).

**Not yet done (deliberately, pending a go-ahead):** running `scripts/create-labels.mjs` and `scripts/create-project-issues.mjs 1` — both are live, repo-visible actions (real labels/issues created on GitHub) rather than local file changes, so they weren't run automatically as part of this implementation pass.
