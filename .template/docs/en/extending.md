# Extending the harness

> Everything here is **canonical**: change it once, and the bootstrap propagates it to new projects.

---

## Add a skill

1. Create `.agents/skills/<name>/SKILL.md`.
2. Frontmatter:

```yaml
---
name: <kebab-case, matches the folder>
description: <when to use it; loaded every session>
license: MIT
compatibility: <optional>
metadata: <optional string map>
---
```

3. Rules:
   - One procedure per skill.
   - No domain terms; use `<placeholders>`.
   - No hardcoded commands: read them from `AGENTS.md`.
   - No slash-command syntax; wrappers are generated per host.
   - Keep it short; move long detail to a sibling reference file.
4. Register it in `AGENTS.md` § Skill Registry.
5. If it comes from another repository, preserve its license and add it to `THIRD-PARTY-NOTICES.md`.

---

## Add an agent

1. Create `.template/agents/<role>.md` with the prompt body and **no host frontmatter**.
2. Name it by role, not by architecture (`analyst`, not `ddd-analyst`).
3. The bootstrap generates the adapters:
   - OpenCode: `.opencode/agent/<role>.md` (`description`, `mode: all`).
   - Claude Code: `.claude/agents/<role>.md` (`name`, `description`).
   - Codex: no subagents; the role is emulated through `AGENTS.md`.
4. Register the role in `AGENTS.md` § Roles.

---

## Add a pack

A pack exists only for **procedural knowledge that cannot be expressed as a command or a path**.

```text
.template/packs/<pack>/
  pack.yaml
  README.md
  skills/<name>/SKILL.md
  .template/agents/<role>.md
```

```yaml
name: <pack>
version: 0.1.0
description: <what it provides>
provides: [skills/<name>]
requires: [profile:<profile>]
stack_hints: [<stack>]
license: MIT
```

- It is **not** discovered automatically; the bootstrap copies it into `.agents/skills/` and `.template/agents/`.
- It is never required for the core to work.
- Register it in the pack catalog and in `THIRD-PARTY-NOTICES.md` if it vendors third-party content.

---

## Add a profile

A profile is **data**, not procedure. See `.template/profiles/README.md` for the schema.

- Only commands, paths, tool names and thresholds.
- No framework-specific values under a toolchain name (e.g., no Spring paths in a `java-gradle` profile).
- If a command does not exist, leave `""` and note it; never invent one.
- Validate the YAML and run the commands before committing.

---

## Add a host adapter

1. Create `.template/hosts/<host>/` with the files the host needs at the project root.
2. Document the adapter in `.template/hosts/README.md`.
3. Update `docs/harness/en/COMPATIBILITY.md` with the capability matrix and any degradation.
4. The bootstrap must be able to create the adapter without destroying other hosts' files.

---

## Verification checklist

```bash
# skills
for f in .agents/skills/*/SKILL.md; do sed -n '1,5p' "$f"; done
# agent references
grep -rn "ddd-\|opencode\|claude" .template/agents/ .agents/skills/ || true
# profiles
python3 -c "import yaml,glob;[yaml.safe_load(open(f)) for f in glob.glob('.template/profiles/*.yaml')]"
# contract
openspec doctor && openspec context
```
