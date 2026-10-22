# Optional packs

A pack groups **procedural knowledge** —skills and agents— that cannot be expressed as a command or a
path. **It is not discovered automatically**: it lives outside `.agents/skills/` and `.atlas/agents/`,
so it consumes no context in sessions where it does not apply.

**There is no base catalog.** A pack exists only if the project creates it with `crear-pack.mjs` from
`_templates/pack/`; the project provides the content. It can be created at any time.

## Admission rule

Before creating a pack, classify the knowledge:

| Type | Example | Where it goes |
|---|---|---|
| **Workflow** (invariant across stacks) | how to propose, do TDD, review | **Core** |
| **Configuration data** | test command, port, paths, CRAP threshold | **Profile** (`.atlas/profiles/`) |
| **Technology procedure** | how to measure CRAP in Gradle, React testing patterns, MASVS checklist | **Pack** |

> If the "pack" would only contain commands and paths, **it is not a pack: it is a profile**.

**Example:** `bootRun`, the port and `health` go in the profile/stack; how to test a controller or
protect an endpoint goes in a pack.

**A pack is never required** for ATLAS to work. Without a pack, the agent uses the profile and the core
process; with a pack, it gains depth.

## Structure and manifest

```
.atlas/packs/<pack>/
  pack.yaml
  README.md
  skills/<name>/SKILL.md
  agents/<role>.md
  docs/<template>.md
```

```yaml
# pack.yaml
name: <id>
version: 0.1.0
description: <text>
requires: []          # profiles or packs it depends on
skills: []            # skill ids included
agents: []            # roles included
notes: |
  Pack adjustments or warnings.
```

- `requires` validates coherence (a Java pack is not activated with a Python profile).
- The pack version is independent from the ATLAS version.
- Each skill keeps its `license` and is registered in `THIRD-PARTY-NOTICES.md`.

## Activation

1. When packs exist in `.atlas/packs/`, the bootstrap reads their `pack.yaml` and proposes the ones that
   fit the `state.stacks` profiles.
2. The user chooses.
3. The bootstrap copies the content to `.agents/skills/` and `.atlas/agents/`, records the id in
   `state.stacks[].packs` (and in the `state.packs` union) and the skills in `AGENTS.md` § Skill Registry.
   Only active packs consume context.

Deactivating a pack = remove its id from `state.stacks[].packs` and `state.packs`, and delete its copied
files (or restore them from this directory). On update, **only active packs are updated**.

## Create a pack

```bash
node .atlas/scripts/crear-pack.mjs --id <id> --description "<text>"
```

It creates the skeleton from `_templates/pack/` (it does not overwrite without `--force`). The template
uses `{{ID}}`/`{{DESCRIPTION}}`; the script resolves them. Then:

1. Add skills in `skills/<name>/SKILL.md` and agents in `agents/<role>.md`, or leave the pack empty if
   there is no content yet.
2. Activate it in `state.stacks[].packs` and `state.packs`.
3. Copy its skills to `.agents/skills/` and register them in `AGENTS.md § Skill Registry`.
4. Validate: `node .atlas/scripts/validar-contrato.mjs` (it requires `pack.yaml` for every active pack).

## What a pack is NOT

- It is not a copy of the profile (that is data).
- It is not a core variant (that is duplication).
- It is not required for any stack: if it does not exist, ATLAS keeps working.
