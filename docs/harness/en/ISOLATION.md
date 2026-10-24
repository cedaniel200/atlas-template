# ISOLATION — where a change is written

> The invariant is the **branch**, not the worktree: no change artifact, code, report or documentation
> is written or committed on the base branch. The worktree is the default mechanism; a simple feature
> branch is an exception the human requests.

---

## Default: a worktree per change

```bash
git worktree add .worktrees/<change> -b feature/<change>
cd .worktrees/<change>
```

All the work of the change happens there: proposal, specs, design, code, QA and review reports, and
documentation. No two changes share a worktree.

---

## Two-phase check

At session start you do not always know whether the session will write:

1. **Inform** — report the current branch, whether the working directory is a worktree and the active
   change. Informing creates nothing and asks nothing.
2. **Recheck before the first write** — if the branch is the base branch, isolate the change or stop and
   ask. A session that starts in read-only mode repeats the check before writing.

---

## Simple branch exception

A feature branch in the main checkout replaces the worktree only when **all** of these hold:

- the human asks for it explicitly;
- the working tree is clean;
- the change branch is the same in the project and its submodules (no mixed branch state);
- the exception is recorded in the change (one line in `design.md` or `tasks.md`);
- the branch is never the base branch.

If any condition fails, use a worktree or stop and ask. The pre-commit guard still blocks any commit on
the base branch; see [`HOOKS.md`](HOOKS.md).

---

## Preconditions by role

| Role | Before writing | If the branch is the base branch |
|---|---|---|
| `analyst` | Creating or writing change artifacts | Isolate the change or stop |
| `engineer` | Starting implementation | Stop; it never creates the branch or worktree |
| `reviewer` | Writing the review report | Stop; the report is written in the change worktree |
| `qa-analyst` | Writing the QA report | Stop and ask to isolate |
| `doc-writer` | Writing documentation, even when invoked directly | Stop and ask to isolate |

---

## Bootstrap exception

The initial setup (`.atlas/BOOTSTRAP.md`) does not use a change worktree: it runs on its own
`chore/bootstrap` branch, one commit per phase, and the user merges.
