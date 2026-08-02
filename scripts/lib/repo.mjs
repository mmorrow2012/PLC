// Resolves "owner/repo" for building GitHub/Pages URLs. In Actions this is
// always set via GITHUB_REPOSITORY; falling back to `git remote` lets the
// same scripts run locally for manual/dry-run use.
import { execFileSync } from "node:child_process";

export function getRepoSlug() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;

  const url = execFileSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
  }).trim();
  const match = url.match(/[:/]([^/]+)\/([^/]+?)(\.git)?$/);
  if (!match) throw new Error(`Could not parse owner/repo from remote: ${url}`);
  return `${match[1]}/${match[2]}`;
}

export function projectLabel(slug) {
  return `project:${slug.slice(0, 2)}`;
}
