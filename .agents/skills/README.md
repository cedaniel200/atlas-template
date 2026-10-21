# Skills

Skills are reusable procedures the agent loads when a task matches their description.

## Location

```
.agents/skills/<name>/SKILL.md
```

`.agents/skills/` is read natively by OpenCode and Codex. Claude Code reads `.claude/skills/`, which the
bootstrap links to this directory.

Optional packs live in `.template/packs/` and are copied here only when activated.

## Frontmatter

```yaml
---
name: <kebab-case, matches the directory>
description: <when to use it, one or two sentences>
license: MIT
compatibility: <optional: runtime requirement>
metadata: <optional: string-to-string map>
---
```

- `name` and `description` are **required**. The description is loaded in every session: keep it short
  and specific (it decides whether the skill is triggered).
- `metadata` values must be strings (quote them).
- Tool-specific behavior goes in `metadata`, never as a new top-level field.
- Do not add slash-command syntax to the body: command wrappers are generated per host.

## Writing rules

- **One procedure per skill.** If it has two goals, split it.
- **No domain terms.** Use placeholders (`<entity>`) and mark examples as replaceable.
- **No hardcoded commands.** Read them from `AGENTS.md` (`## Commands`) or the stack profile.
- **No duplication of the Skill Registry.** Reference `AGENTS.md` instead.
- **Keep it short.** Move long detail to a sibling reference file (`*.md`) and link it.
- **Language**: `language.agent` (English by default); project-facing docs use `language.user`.

## Third-party skills

When adding a skill from another repository:

1. Preserve its `license` field and copyright.
2. Add the source and license to `THIRD-PARTY-NOTICES.md`.
3. Do not rewrite the body unless necessary; if you do, note it in the license table.
