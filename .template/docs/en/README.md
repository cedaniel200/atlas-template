# Harness documentation (internal)

> This folder is for **maintainers and contributors** of the template, not for projects that adopt it.
> If you only use the harness, you can remove `.template/docs/` (the bootstrap asks).

---

## What the harness is

A portable set of instructions, procedures and OpenSpec configuration that turns a coding agent into a
disciplined workflow: explore → propose → apply → QA → review → close.

It is **agnostic** of:

- **Domain**: no business terms are baked in.
- **Architecture**: the project declares its own stance.
- **Host tool**: OpenCode, Claude Code and Codex are supported.
- **Stack**: commands come from a profile, not from the prompts.

---

## Components

| Path | What it is | Ownership |
|---|---|---|
| `.template/agents/` | Canonical role prompts, no host frontmatter | managed |
| `.agents/skills/` | Portable procedures loaded on demand | managed |
| `openspec/schemas/spec-driven-with-adr/` | Vendored OpenSpec schema | managed |
| `.template/hosts/<host>/` | Host adapter templates | managed |
| `.template/profiles/` | Stack data: commands, paths, quality | managed |
| `.template/packs/` | Optional procedural knowledge | managed |
| `.template/state.json` | Bootstrap inputs and status | owned after setup |
| `.template/manifest.json` | Generated files, hashes and ownership | generated |
| `AGENTS.md` | Project contract: architecture, commands, limits | owned |
| `.template/BOOTSTRAP.md` | First-session ritual | managed |
| `docs/` | Documentation (harness, usage, project) | mixed |

---

## How it works

```text
.template/BOOTSTRAP.md
  ├── detects the host and creates its adapter
  ├── interrogates the user (language, stack, quality, architecture, limits)
  ├── fills AGENTS.md + openspec/config.yaml + docs
  └── validates the contract and sets state.json to configured

AGENTS.md
  └── the contract every agent reads: commands, structure, architecture, do-not-touch, preferences
```

The detailed procedures live in skills, so `AGENTS.md` stays a contract instead of a manual.

---

## Design principles

1. **Single source of truth**: `AGENTS.md` for the project, OpenSpec specs for behavior, ADRs for decisions.
2. **Procedures on demand**: skills load only when their trigger matches.
3. **No hidden stack**: no command, path or version is hardcoded in a prompt.
4. **No architecture mandate**: the project declares its stance; the prompts follow it.
5. **Deterministic setup**: the bootstrap fills placeholders; it does not synthesize behavior.
6. **Reversible changes**: one commit per phase, no deletion without consent.

---

## Where to go

- Extend the harness: [`extending.md`](extending.md)
- Update a configured project: [`updating.md`](updating.md)
- Use the harness: [`../../../docs/harness/en/QUICKSTART.md`](../../../docs/harness/en/QUICKSTART.md)
- Host differences: [`../../../docs/harness/en/COMPATIBILITY.md`](../../../docs/harness/en/COMPATIBILITY.md)
