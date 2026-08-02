// Shared template rendering used by prompts/generate.mjs (local prompt files)
// and scripts/create-project-issues.mjs (GitHub issue bodies).

// Strip the leading "<!-- GENERATED SOURCE TEMPLATE ... -->" comment line
// that documents the template file itself — it never belongs in output.
export function stripSourceComment(template) {
  return template.replace(/^<!--.*-->\n/, "");
}

export function render(template, vars) {
  return Object.entries(vars).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, value),
    stripSourceComment(template)
  );
}
