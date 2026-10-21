---
name: git-workflow
description: "Git flow for changes: isolated branch/worktree, incremental commits, pull request and post-merge cleanup."
license: MIT
---

# Git workflow

## Start

```bash
git checkout main
git pull origin main
```

Branches and worktrees are created from an up-to-date `main`.

## Change cycle

### 1. Isolate

```bash
git worktree add .worktrees/<change> -b feature/<change>
cd .worktrees/<change>
```

All work for the change (artifacts, code, reports) happens inside that worktree.

### 2. Commit

One logical change = one commit (see `conventional-commits`). An agent commits after each approved
step; it never accumulates work.

### 3. Close

1. Verify design → code consistency.
2. Update documentation if business rules changed.
3. Open the pull request:

```bash
gh pr create --base main --head feature/<change> --title "<type>: <change>"
```

4. The user reviews and merges.

### 4. Post-merge

```bash
git branch -d feature/<change>
git worktree remove .worktrees/<change>
```

## Integration branches

When `main` must stay stable, use an integration branch:

```
main
  └── feat/<stage>
        ├── feat/<stage>-part-1
        └── feat/<stage>-part-2
```

Partial PRs target the integration branch; the merge to `main` happens once at the end.

## Rules

- `main` is always clean and up to date.
- Never commit secrets.
- Do not rewrite history of shared branches. `--force-with-lease` only on your own, unmerged branches.
- Role byline on agent commits: `By <role>.`
- A worktree per change; no two changes in the same worktree.
