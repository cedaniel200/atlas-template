# QUICKSTART — new project

> For projects starting from scratch. If you already have code, use [`ADOPTION.md`](ADOPTION.md).

---

## Requirements

- **Git**
- **Node.js 20+** and **OpenSpec CLI** (`npm i -g @fission-ai/openspec`)
- One host: **OpenCode**, **Claude Code** or **Codex**
- Optional: Docker, Context7 (MCP), Engram (memory)

---

## 1. Copy the template

```bash
npx degit <user>/<repo> my-project
cd my-project
rm -rf .git && git init
```

If you cloned instead of using `degit`, remove the template history and start a new one.

---

## 2. Open the host and ask for the ritual

Open the project and say:

> **“Set up this project”**

The agent reads `AGENTS.md`, sees `.template/state.json` is `pending`, and runs `.template/BOOTSTRAP.md`.

| Host | What happens |
|---|---|
| **OpenCode** | Creates `opencode.json` from `.template/hosts/opencode/` and generates command wrappers |
| **Claude Code** | Creates `.claude/agents/` and the `.claude/skills` symlink; `CLAUDE.md` already points to `AGENTS.md` |
| **Codex** | Reads `AGENTS.md` and `.agents/skills/` natively; there are no subagents |

---

## 3. Answer the questionnaire

The ritual asks, in rounds:

| Round | What |
|---|---|
| Language | Documentation (`language.user`) and skills/prompt language |
| Identity | Name, description, stack, structure, base package |
| Commands & quality | Build, run, test, lint, coverage, mutation, CRAP, QA environment |
| Architecture & limits | Declared stance, domain, do-not-touch rules |
| Preferences | Persistent memory, OpenSpec commands (`user`/`agent`/`ask`), orchestration |

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
```

Review the bootstrap branch diff: `AGENTS.md`, `openspec/config.yaml`, the host adapter and `docs/`
should reflect your answers.

---

## 5. First change

1. **Explore** — describe the idea; the `analyst` asks and clarifies.
2. **Propose** — `proposal`, `specs`, `design`, `adr` and `tasks` are produced one by one with your approval.
3. **Implement** — the `engineer` applies TDD per task.
4. **QA** — the `qa-analyst` designs scenarios and runs them against the environment.
5. **Review** — the `reviewer` checks architecture, security and quality.
6. **Close** — documentation, pull request and a single human review.
7. **Merge** — you merge; then archive and clean up.

The `analyst` asks at the start whether to orchestrate the cycle or let you invoke each phase.

---

## Common problems

| Symptom | Likely cause | Fix |
|---|---|---|
| `openspec: command not found` | CLI not installed | `npm i -g @fission-ai/openspec` |
| `Schema not found` | Missing `openspec/schemas/` | Restore the vendored schema |
| Skills do not appear | Wrong path or host not restarted | Check `.agents/skills/*/SKILL.md` and restart |
| `AGENTS.md` changed after `openspec init` | The CLI rewrote it | Restore the backup and merge manually |
| The gate fails | Commands or sections still `TBD` | Complete them in `AGENTS.md` |

---

## Next

- Existing project → [`ADOPTION.md`](ADOPTION.md)
- Tools and MCP → [`TOOLS.md`](TOOLS.md)
- Quality and CRAP → [`QUALITY.md`](QUALITY.md)
- Host compatibility → [`COMPATIBILITY.md`](COMPATIBILITY.md)
