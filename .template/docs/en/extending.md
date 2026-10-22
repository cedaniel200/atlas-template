# Extending the harness

> Everything here is **canonical**: change it once, and the bootstrap propagates it to new projects.

---

## Add a skill

1. Create `.agents/skills/<name>/SKILL.md`.
   > `.opencode/skills/` is OpenCode's native path and takes precedence over `.agents/skills/`.
   > Use it only for host-specific skills; shared skills belong in `.agents/skills/` so they are
   > not shadowed by a duplicate ID.
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
5. Regenerate the manifest (`node .template/scripts/generar-manifiesto.mjs --host <host>`) and validate
   (`node .template/scripts/validar-manifiesto.mjs`).
6. If it comes from another repository, preserve its license and add it to `THIRD-PARTY-NOTICES.md`.

---

## Add an agent

1. Create `.template/agents/<role>.md` with the prompt body and **no host frontmatter**.
2. Name it by role, not by architecture (`analyst`, not `ddd-analyst`).
3. The renderer (`renderizar-adaptadores.mjs`) generates the adapters:
   - OpenCode: `.opencode/agent/<role>.md` (`description`, `mode: all`).
   - Claude Code: `.claude/agents/<role>.md` (`name`, `description`).
   - Codex: no subagents; the role is emulated through `AGENTS.md`.
   - Multi-stack: `engineer-<stack>` per stack with `STACK_CONTEXT`; `state.stacks` is the source.
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
- Activate it in `state.stacks[].packs` (the union goes to `state.packs`); the bootstrap copies only active packs and registers their skills in `AGENTS.md § Skill Registry`.
- Version: `pack.yaml`; an update only refreshes active packs.

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

## Adoption and README

- `adoptar-agents.mjs` migrates an existing `AGENTS.md` to the base + `docs/project-context.md`.
- `combinar-readme.mjs` appends to the existing README only the sections missing from `PROJECT-README.md`.

---

## Skill governance

- **Structure (progressive disclosure):** `SKILL.md` = **core** (when, steps, rules, checklist and a
  **reference index**); `references/*.md` = examples, anti-patterns and long checklists read **only
  when needed**. The core must say **when** to read each reference. **Own skills only** with long
  reference material; **not** external ones (`generatedBy`), which are updated from the tool.
- **Language:** body and `description` in **English** (`language.agent`). The `description` includes
  trigger examples in **several languages** (`update the template`, `actualiza el arnés`), because the
  user may ask in any language: the agent must match the **intent**, not the exact wording.

- Every skill is registered in `AGENTS.md` § Skill Registry; an unregistered skill is orphaned.
- Validate discovery with `ls .agents/skills/*/SKILL.md` and, if the host allows it, restart and check
  that it appears.
- Mark core skills as `managed` in the manifest; pack skills as optional.
- Before modifying an existing skill, search who invokes it
  (`grep -rn "<skill>" .template/agents .agents/skills docs`) and warn about possible breakage.
- There is no skill versioning yet: if the change is incompatible, document the migration in the commit.

## Verification checklist

```bash
# skills
for f in .agents/skills/*/SKILL.md; do sed -n '1,5p' "$f"; done
# agent references (informational: never fails)
grep -rn "ddd-\|opencode\|claude" .template/agents/ .agents/skills/ || true
# profiles (gate): structural with no dependencies; `npm i yaml` adds real parsing
node .template/scripts/validar-perfiles.mjs
# placeholder contract (gate)
node .template/scripts/validar-contrato.mjs
# context cost (informational: flags files that bloat the harness)
node .template/scripts/medir-contexto.mjs
# contract
openspec doctor && openspec context
```

> **Declared dependencies only.** Every harness check uses Git, Node 20+, OpenSpec CLI and a POSIX
> shell. If it needs another tool, it must **detect it and warn**; never assume it.
> A check that cannot run must not pretend it passed.

## Context cost (maintenance diagnostic)

`medir-contexto.mjs` is **not a gate** and does not run in the bootstrap: it is a **maintenance**
tool to check that the harness does not bloat and to compare before/after a change. A team may use it
if it adds its own skills, agents or packs.

```bash
node .template/scripts/medir-contexto.mjs          # readable report
node .template/scripts/medir-contexto.mjs --json   # comparable baseline
```

What it measures (**static** estimate, no conversation or tool outputs):

| Group | What it includes |
|---|---|
| Session base | AGENTS.md + skill descriptions + host config |
| Minimum bootstrap | BOOTSTRAP + AGENTS + PLACEHOLDERS + profiles + host |
| Full bootstrap | the above + the agent prompts (5 core + 2 optional) |
| Per agent | base + prompt + **core** (`SKILL.md`) of the skills it mentions |
| Ceiling | the whole harness loaded at once (**includes** on-demand references) |

**How to read it:** `~4 chars/token` proxy (Spanish may reach ~3.5 → +15%). Target budget:
**base ≤ 4k**, **per agent ≤ 14k** (the 5 external OpenSpec skills are a fixed cost: they are not optimized without forking them). If it grows, attack the biggest contributor first: long skills →
progressive disclosure; `AGENTS.md` → move reference material to linked docs.

## Add a stack

1. Add a row to `state.stacks` (`id`, `profile`, `paths`, commands, `packs`).
2. Fill `AGENTS.md` § Stacks (`{{STACKS_TABLE}}`); include `Install`, `Build`, `Run`, `Test`, `Lint` and `Quality`.
3. Run `renderizar-adaptadores.mjs`: `engineer-<id>` is generated per stack.
4. Activate the stack's packs (`state.stacks[].packs`) and copy only their skills/agents.

Optional packs live in [`.template/packs/`](../../packs/README.md) and consume no context until
activated. A stack without a pack uses the profile and the core process.

## Core vs pack

- **Core**: `.agents/skills/` (workflow; always installed).
- **Pack**: `.template/packs/<id>/` (technology or procedure; copied only when active in `state.stacks[].packs`).
- **Version**: the pack in `pack.yaml`; the core follows the template version.
