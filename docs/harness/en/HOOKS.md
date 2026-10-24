# HOOKS — commit guards

> The harness ships its git hooks in `.githooks/`. They run before every commit, in every agent host,
> and do not depend on the agent runtime.

---

## What runs on commit

`git commit` runs `.githooks/pre-commit`, a **dispatcher**. It executes every executable file in
`.githooks/pre-commit.d/` in lexicographic order and aborts at the first failure:

| Guard | What it checks | When it blocks |
|---|---|---|
| `10-worktree-guard.sh` | Current branch against the base branch | Any commit on the base branch |
| `20-gitleaks.sh` | Staged changes for secrets | A secret is found (a missing gitleaks only warns) |

The dispatcher is not edited when a guard is added: a new executable file in `pre-commit.d/` runs
automatically. Each guard owns its skip semantics.

---

## What the isolation guard blocks

The invariant is the **branch**: change artifacts, code, reports and documentation are never committed
on the base branch. The guard determines the base with `origin/HEAD`; if it is missing, a local `main`;
then a local `master`.

| State | Behavior |
|---|---|
| Repository without commits | Warns; the first commit is allowed |
| Detached HEAD (for example a submodule at a tag) | Warns; no intervention |
| Base branch undeterminable | Warns; no intervention |
| Current branch ≠ base | No intervention |
| Current branch = base | **Blocks with exit 1** |

The message adapts to what is staged. If the paths belong to `openspec/changes/<change>/`, it proposes
the worktree of that change:

```bash
git worktree add .worktrees/<change> -b feature/<change>
cd .worktrees/<change>
```

For any other content (code, configuration, documentation) it proposes a feature branch and a pull
request.

There is **no escape variable** of the harness. If a human decides to commit on the base branch, git's
own mechanisms are their decision; the harness does not document them as a feature.

> The guard is not skipped when gitleaks is missing: `20-gitleaks.sh` warns and exits 0, but
> `10-worktree-guard.sh` still runs.

See the isolation policy in [`ISOLATION.md`](ISOLATION.md).

---

## Activate the hooks

Git runs hooks only when `core.hooksPath` points to them. Per clone:

```bash
git config core.hooksPath .githooks
```

| Situation | What happens |
|---|---|
| New project | The bootstrap activates it only if no path is configured or it is already `.githooks` |
| Existing project | The updater **checks and warns** with the exact command; it never writes git configuration |
| Foreign path (husky, lefthook…) | It is preserved; chain the harness hooks from your own hook |

To chain them from a foreign `pre-commit`:

```sh
exec "$(git rev-parse --show-toplevel)/.githooks/pre-commit" "$@"
```

---

## A new repository

A repository without commits has no base branch to protect, so the guard warns and lets the **first**
commit through. From then on, commits on the base branch are blocked: create the change branch or
worktree first. The initial setup (`chore/bootstrap`) already runs on its own branch.

---

## Add a guard

1. Create an executable file in `.githooks/pre-commit.d/` with a numeric prefix (`30-my-check.sh`).
2. Use POSIX `sh`; do not depend on bash.
3. Exit `0` to pass and non-zero to abort the commit. Print why.
4. Add a test in `.atlas/scripts/githooks.test.mjs`.

No change to `pre-commit` is needed.
