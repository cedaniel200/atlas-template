# ADOPTION — existing project

> For repositories with code and history. The ritual **never replaces anything without a diff**.

---

## Before you start

1. **Clean tree**: `git status --porcelain` must be empty.
2. **Own branch**: create `chore/bootstrap` (or a `.worktrees/bootstrap` worktree). **Do not run on `main`.**
3. **Backup**: the ritual copies to `.template/backups/<timestamp>/` before merging.

---

## 1. Copy the harness without overwriting

Copy only what is missing from the template:

| File | If it already exists |
|---|---|
| `AGENTS.md` | **Template base**: backup, replace with the template's `AGENTS.md`, migrate project content to `docs/project-context.md` |
| `openspec/config.yaml` | Merge `context:` and `rules:` |
| `openspec/specs/`, `adr/` | Keep the project's |
| `.agents/skills/`, `.template/agents/` | Keep the project's; add the template's with a prefix or as a pack |
| `README.md` | **Keep it**; the bootstrap asks whether to append the missing sections from `.template/PROJECT-README.md` |
| `docs/README.md` | Merge: keep the project's index and link the harness sections |
| Adapters (`.opencode/`, `.claude/`) | Preserve; adapt only what collides |

---

## 2. Run the ritual

Open the project and ask:

> **“Set up this project”**

The bootstrap detects **brownfield** and inventories before touching anything.

---

## 3. Inventory (read-only)

| Detected | Recorded |
|---|---|
| Build/tooling | Profile and real commands |
| Tests, lint, coverage, mutation | Quality menu |
| CI and deployment | QA environment |
| `AGENTS.md`, `CLAUDE.md`, `.cursorrules` | Existing rules to migrate to `docs/project-context.md` |
| `openspec/` | Existing specs, changes and config |
| Project agents and skills | What to keep and what to adapt |
| `.env`, secrets | Names only; **never values** |

The result is written to `.template/adoption-report.md` (and summarized in `docs/template-adoption.md` if the project uses it):

```markdown
# Harness adoption

## Detected
## Reused
## Merged
## Conflicting
## Pending
```

---

## 3.1 Automated inventory (optional)

```bash
node .template/scripts/inventariar-adopcion.mjs --template <pristine-template-path>
```

Classifies each template file as `nuevo` / `igual` / `distinto`, copies the `distinto` ones to
`.template/backups/adopcion-<timestamp>/` and writes `.template/adoption-report.md`.
The agent decides the conflict policy; the script **does not merge**.

## 4. Conflict policy

```text
backup → diff → merge → user confirmation
```

| Situation | Action |
|---|---|
| Identical file | Keep it |
| Project file is more complete | Keep the project's; note it in the report |
| Template file is more complete | Propose replacement with a diff |
| Both have content | Manual merge; never automatic |
| Project `AGENTS.md` | Replace with the **template base** (backup); project content moves to `docs/project-context.md` |
| Project `README.md` | Keep it; only append missing sections if the user accepts |

**Never** overwrite existing specs, ADRs or business rules.

---

## 5. Validate and review

```bash
openspec doctor
openspec schema which spec-driven-with-adr
openspec context
git status
```

Review the full `chore/bootstrap` diff. You merge it; the agent does not push or open a PR unless you ask.

---

## 6. First change

The harness is configured. From here, the flow is the one in [`QUICKSTART.md`](QUICKSTART.md):
explore → propose → apply → QA → review → close.

---

## Rollback

| What | How |
|---|---|
| A whole phase | `git revert <commit>` |
| A merged file | Restore from `.template/backups/<timestamp>/` |
| The whole bootstrap | `git revert` the `chore/bootstrap` commits |

---

## What not to do

- Do not run the ritual on `main` or a shared branch.
- Do not replace existing specs or ADRs.
- Do not copy `.env` or credentials.
- Do not force push or rewrite history.
- Do not leave the adoption report as debt: review it before merging.
