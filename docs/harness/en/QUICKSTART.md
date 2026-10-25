# QUICKSTART — new project

> **ATLAS** is the template for AI-driven development with SDD: specs first, gated agents and a
> setup that saves you from starting from scratch.
> For new projects; if you already have code, use [`ADOPTION.md`](ADOPTION.md).

---

## Requirements

- **Git**
- **Node.js 20+** and **OpenSpec CLI** (`npm i -g @fission-ai/openspec`)
- **POSIX shell** (`sh`, `grep`, `diff`). On **Windows**: Git Bash or WSL
- One host: **OpenCode**, **Claude Code**, **Codex** or **Cursor**
- Optional: Docker, Context7 (MCP), Engram (memory)

---

## 1. Create the project from ATLAS

```bash
npx degit <user>/atlas-template my-project
cd my-project
rm -rf .git && git init
```

If you cloned instead of using `degit`, remove ATLAS history and start a new one.

> The project `README.md` is generated from `.atlas/PROJECT-README.md`; ATLAS has no root README.

---

## 2. Open the host and ask for the ritual

Open the project and say:

> **“Set up this project”**

The agent reads `AGENTS.md`, sees `.atlas/state.json` is `pending`, and runs `.atlas/BOOTSTRAP.md`.

| Host | What happens |
|---|---|
| **OpenCode** | Creates `opencode.json` from `.atlas/hosts/opencode/` and generates command wrappers |
| **Claude Code** | Creates `.claude/agents/` and the `.claude/skills` symlink; `CLAUDE.md` already points to `AGENTS.md` |
| **Codex** | Reads `AGENTS.md` and `.agents/skills/` natively; there are no subagents |
| **Cursor** | Creates `.cursor/agents/` and `.cursor/mcp.json` only if missing; reads `AGENTS.md` and `.agents/skills/` natively |

---

## 3. Answer the questionnaire

The ritual asks, in rounds:

| Round | What |
|---|---|
| **0 — Language** | Documentation (`language.user`) and skills/prompt language |
| **1 — Identity and stacks** | Name, description, stack(s), structure, base package; profile generated on demand; one row per stack |
| **2 — Commands & quality** | Build, run, test, lint, coverage, mutation, CRAP, QA environment |
| **3 — Architecture, domain and boundaries** | Stance, domain, do-not-touch, git, docs, memory, OpenSpec, orchestration, contribution and README |
| **4 — Optional agents** | `mentor` and `business-strategist`, one by one: optional and outside the delivery cycle |

> **No catalog:** the profile is created with `crear-perfil.mjs` from `_templates/profile.yaml`; packs
> only if you need them (`crear-pack.mjs`).

If you do not know a command, answer `TBD`: the agent records it in `AGENTS.md` § Pending. **It never
invents one.**

---

## 4. Review what was generated

The ritual ends with a gate. Check:

```bash
openspec doctor                              # OpenSpec root: ok
openspec schema which spec-driven-with-adr   # Source: project
openspec context                             # no warnings
ls .agents/skills/*/SKILL.md                 # ≥1 skill
ls .cursor/agents/*.md                       # Cursor only: one adapter per active role + engineer-<stack>
```

Review the bootstrap branch diff: `AGENTS.md`, `openspec/config.yaml`, the host adapter and `docs/`
should reflect your answers.

---

## 5. What you can ask the agent

Once the ritual is done, ask in your own words. If the agent infers the action from intent, **it will
ask for explicit confirmation before acting**.

| Ask… | What it does |
|---|---|
| “In this session we will work on X” / “continue X” | Loads context, checks `openspec/changes/` and starts or resumes explore/propose |
| “Run two independent specs in parallel (experimental)” | Follow `parallel-run.md` and ask for confirmation |
| “Add a stack or profile for X” | Creates the profile, updates `state.stacks`/`AGENTS.md` and regenerates the adapter |
| “Add an implementer for X” | Creates the stack and `engineer-<id>` |
| “Create a pack for X” | Creates the skeleton and activates it |
| “Minimize ATLAS” | Archives what is not used with `minimizar.mjs` |
| “Update ATLAS” | Runs `update-harness` |
| “Measure context” | Runs `medir-contexto.mjs` |

Detail: [`.atlas/docs/en/extending.md`](../../../.atlas/docs/en/extending.md).

---

## 6. First change

1. **Explore** — describe the idea; the `analyst` asks and clarifies.
2. **Propose** — `proposal`, `specs`, `design`, `adr` and `tasks` are produced one by one with your approval.
3. **Implement** — the `engineer` applies TDD per task.
4. **QA** — the `qa-analyst` designs scenarios and runs them against the environment.
5. **Review** — the `reviewer` checks architecture, security and quality.
6. **Close** — documentation, pull request and human review.
7. **Archive** — you approve `archive` + sync; it is committed inside the PR.
8. **Merge** — you merge; then clean up.

The archive goes **inside the PR, before merge**. If the PR was already merged without archive, open a
new archive branch and PR; do not rewrite `main`.

Checklist before merge:

- [ ] The PR is reviewed.
- [ ] `archive` + sync is committed in the PR.
- [ ] After merge, clean up the branch and worktree.

The `analyst` asks at the start whether to orchestrate the cycle or let you invoke each phase.

### Optional: block merge without archive

If your repo has CI, branch protection or hooks and you want to harden the close, paste this into the
`analyst`:

> “Check once whether this repo has CI, branch protection or hooks. If a mechanism exists, propose and,
> with my approval, configure the strongest control possible so nothing merges while
> `openspec/changes/<change>/` is still active. Use only what already exists; do not install anything or
> change settings without permission. If there is no mechanism or permission, do not fake it: we
> continue with the manual flow.”

The template does not detect or configure this by default; it only runs when you ask for it.

---

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `openspec: command not found` | CLI not installed | `npm i -g @fission-ai/openspec` |
| `Schema not found` | Missing `openspec/schemas/` | Restore the vendored schema |
| Skills do not appear | Wrong path or host not restarted | Check `.agents/skills/*/SKILL.md` and restart |
| `AGENTS.md` changed after `openspec init` | The CLI rewrote it | Restore the backup and merge manually |
| `openspec init` writes skills to `.opencode/skills` | OpenCode's native path, with precedence over `.agents/skills` | Do not delete the directory: it can host team skills. If IDs collide, you decide (see below) |
| The gate fails | Commands or sections still `TBD` | Complete them in `AGENTS.md` |
| Cursor does not list the agents | Wrong path or host not restarted | Check `.cursor/agents/*.md` and restart Cursor |
| Cursor has no `opsx-*` commands | OpenSpec was initialized for another tool | Run `openspec init --tools cursor` (back up `AGENTS.md` and merge) |

If `openspec init` leaves duplicate IDs between `.opencode/skills/` and `.agents/skills/`, you decide:

- **Keep the CLI copy**: the host's native space, but it shadows the canonical skills and they will not
  receive their improvements.
- **Delete only those IDs**: the canonical one wins and behaviour matches every host, but you must
  repeat it after each `openspec init`.

Delete only the duplicate IDs if you want to keep your own skills. The project owns the tradeoff.

---

## Next

- Existing project → [`ADOPTION.md`](ADOPTION.md)
- Tools and MCP → [`TOOLS.md`](TOOLS.md)
- Quality and CRAP → [`QUALITY.md`](QUALITY.md)
- Host compatibility → [`COMPATIBILITY.md`](COMPATIBILITY.md)
- Glossary → [`GLOSSARY.md`](GLOSSARY.md)
- Extend the harness (skills/agents/packs) → [`../../../.atlas/docs/en/extending.md`](../../../.atlas/docs/en/extending.md) · [`../../../.atlas/packs/README.md`](../../../.atlas/packs/README.md)
- Project README → generated from `.atlas/PROJECT-README.md`; ATLAS has no root README (the landing is `docs/README.md`).
