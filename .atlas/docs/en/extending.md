# Extending the harness

> Everything here is **canonical**: change it once, and the bootstrap propagates it to new projects.
>
> **These instructions are for the agent.** The human requests the change and approves; the agent runs
> the scripts, edits the state and validates. Manual mode is at the end as an alternative.

---

## Hot operations

After the bootstrap there is no need to repeat the ritual. Validate at the end with
`validar-contrato.mjs`, `validar-perfiles.mjs`, `renderizar-adaptadores.mjs` and `medir-contexto.mjs`.

| You ask… | The agent does… |
|---|---|
| Add a stack or profile | `crear-perfil.mjs` → fill in the commands → `state.stacks` + `AGENTS.md § Stacks` → `renderizar-adaptadores.mjs` |
| Add an implementer agent | It is the same `engineer` with a new stack: `state.stacks` + `engineer-<id>` |
| Add a pack | `crear-pack.mjs` → skills/agents → activate in `state.stacks[].packs` and `state.packs` |
| Remove a stack or pack | Remove from `state.stacks`/`state.packs` → `renderizar-adaptadores.mjs` (cleans adapters) → regenerate the manifest |

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
5. Regenerate the manifest (`node .atlas/scripts/generar-manifiesto.mjs --host <host>`) and validate
   (`node .atlas/scripts/validar-manifiesto.mjs`).
6. If it comes from another repository, preserve its license and add it to `THIRD-PARTY-NOTICES.md`.

---

## Add an agent

1. Create `.atlas/agents/<role>.md` with the prompt body and **no host frontmatter**.
2. Name it by role, not by architecture (`analyst`, not `ddd-analyst`).
3. The renderer (`renderizar-adaptadores.mjs`) generates the adapters:
   - OpenCode: `.opencode/agent/<role>.md` (`description`, `mode: all`).
   - Claude Code: `.claude/agents/<role>.md` (`name`, `description`).
   - Codex: no subagents; the role is emulated through `AGENTS.md`.
   - Every stack: `engineer-<stack>` with `STACK_CONTEXT` (single-stack included); `state.stacks` is the source.
4. If the role is **optional**, start the prompt with `<!-- optional-role -->` and record it in
   `state.optional_agents` (the bootstrap asks in Round 4). Without that id its adapter is not rendered.
5. Register the role in `AGENTS.md` § Roles.

---

## Add a pack

A pack exists only for **procedural knowledge that cannot be expressed as a command or a path**.

```text
.atlas/packs/<pack>/
  pack.yaml
  README.md
  skills/<name>/SKILL.md
  agents/<role>.md
```

```yaml
name: <pack>
version: 0.1.0
description: <what it provides>
requires: []
skills: [<skill-id>]
agents: [<role>]
notes: |
  Pack adjustments or warnings.
```

- Create it with `node .atlas/scripts/crear-pack.mjs --id <id> --description "<text>"`.
- It is **not** discovered automatically; the bootstrap copies it into `.agents/skills/` and `.atlas/agents/`.
- It is never required for the core to work.
- Register it in `THIRD-PARTY-NOTICES.md` if it vendors third-party content.
- Activate it in `state.stacks[].packs` (the union goes to `state.packs`); the bootstrap copies only active packs and registers their skills in `AGENTS.md § Skill Registry`.
- Version: `pack.yaml`; an update only refreshes active packs.

---

## Add a profile

A profile is **data**, not procedure. Start from `_templates/profile.yaml` with `crear-perfil.mjs`;
the schema keys are `name`, `description`, `stack`, `structure`, `commands`, `quality` and `qa`.

- Create it with `node .atlas/scripts/crear-perfil.mjs --id <id> --language <language>`; the script starts from `_templates/profile.yaml`.
- Only commands, paths, tool names and thresholds.
- No framework-specific values under a toolchain name (e.g., no Spring paths in a `java-gradle` profile).
- If a command does not exist, leave `""` and note it; never invent one.
- Validate the YAML and run the commands before committing.

---

## Add a stack

A stack = profile + paths + commands + packs. It can be added **at any time**:

1. Create the profile if it does not exist (`crear-perfil.mjs`) and fill in the commands.
2. Add the row to `state.stacks` and `AGENTS.md § Stacks`.
3. Generate the adapter: `node .atlas/scripts/renderizar-adaptadores.mjs` → `engineer-<id>`.
4. Validate: `validar-contrato.mjs`, `validar-perfiles.mjs` and `medir-contexto.mjs`.
5. Regenerate the manifest: `node .atlas/scripts/generar-manifiesto.mjs`.

Remove a stack: drop the row, regenerate adapters (the stale one is deleted) and regenerate the manifest.
Never edit `engineer-<id>.md` by hand: it is regenerated.

---

## Add a host adapter

1. Create `.atlas/hosts/<host>/` with the files the host needs at the project root.
2. Document the adapter in `.atlas/hosts/README.md`.
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
  (`grep -rn "<skill>" .atlas/agents .agents/skills docs`) and warn about possible breakage.
- There is no skill versioning yet: if the change is incompatible, document the migration in the commit.

## Verification checklist

```bash
# skills
for f in .agents/skills/*/SKILL.md; do sed -n '1,5p' "$f"; done
# agent references (informational: never fails)
grep -rn "ddd-\|opencode\|claude" .atlas/agents/ .agents/skills/ || true
# profiles (gate): structural with no dependencies; `npm i yaml` adds real parsing
node .atlas/scripts/validar-perfiles.mjs
# placeholder contract (gate)
node .atlas/scripts/validar-contrato.mjs
# context cost (informational: flags files that bloat the harness)
node .atlas/scripts/medir-contexto.mjs
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
node .atlas/scripts/medir-contexto.mjs          # readable report
node .atlas/scripts/medir-contexto.mjs --json   # comparable baseline
```

What it measures (**static** estimate, no conversation or tool outputs):

| Group | What it includes |
|---|---|
| Session base | AGENTS.md + skill descriptions + host config |
| Minimum bootstrap | BOOTSTRAP + AGENTS + PLACEHOLDERS + config + base README + active host |
| Full bootstrap | the above + active agent prompts |
| Per agent | base + prompt + **core** (`SKILL.md`) of the skills it mentions |
| Ceiling | the whole harness loaded at once (**includes** on-demand references) |

Not measured: maintainer READMEs, `_templates`, `_examples` or inactive hosts.
`node .atlas/scripts/medir-contexto.mjs --all` also measures all textual harness content
(documentation, templates, examples, legal and optional agents). It is not the cost of a session.

**How to read it:** `~4 chars/token` proxy (Spanish may reach ~3.5 → +15%). Target budget:
**base ≤ 4k**, **per agent ≤ 14k** (the 5 external OpenSpec skills are a fixed cost: they are not optimized without forking them). If it grows, attack the biggest contributor first: long skills →
progressive disclosure; `AGENTS.md` → move reference material to linked docs.

## Core vs pack

- **Core**: `.agents/skills/` (workflow; always installed).
- **Pack**: `.atlas/packs/<id>/` (technology or procedure; copied only when active in `state.stacks[].packs`).
- **Version**: the pack in `pack.yaml`; the core follows the template version.

## Manual mode (alternative)

If you prefer to run the commands yourself, use the same scripts and validations. The result must pass
`validar-contrato.mjs`, `validar-perfiles.mjs` and `medir-contexto.mjs`.
