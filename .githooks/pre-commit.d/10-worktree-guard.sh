#!/bin/sh
# Worktree guard — blocks commits on the base branch.
#
# The invariant is the branch, not the worktree: no commit lands on the base
# branch. A worktree is the default mechanism; a human-requested feature branch
# is the documented exception. There is no escape variable.
#
# The guard never blocks when there is no base branch to protect: a repository
# without commits, a detached HEAD (a submodule pinned to a tag) or an
# undeterminable base branch. Those cases only warn.
#
# The message adapts to what is staged: change artifacts propose the worktree of
# that change; anything else proposes a feature branch and a pull request.

avisar() {
    echo "⚠️  worktree-guard: $1"
}

# No commits yet: the base branch is not defined. The first commit is allowed.
if ! git rev-parse --verify --quiet HEAD >/dev/null 2>&1; then
    avisar "no commits yet, so there is no base branch to protect. Commit allowed."
    exit 0
fi

# Detached HEAD (for example a submodule checked out at a tag): no branch.
rama=$(git symbolic-ref --quiet --short HEAD 2>/dev/null || true)
if [ -z "$rama" ]; then
    avisar "detached HEAD, so there is no base branch to protect. Commit allowed."
    exit 0
fi

# Base branch: origin/HEAD first, then a local main, then a local master.
base=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)
base=${base#origin/}
if [ -z "$base" ]; then
    if git show-ref --verify --quiet refs/heads/main; then
        base=main
    elif git show-ref --verify --quiet refs/heads/master; then
        base=master
    fi
fi

if [ -z "$base" ]; then
    avisar "could not determine the base branch (no origin/HEAD, main or master). Commit allowed."
    exit 0
fi

# Only the base branch is protected.
[ "$rama" = "$base" ] || exit 0

# Name of the change whose artifacts are staged, if any. Only the staged paths
# matter, not the whole tree.
cambio=$(git diff --cached --name-only | while IFS= read -r ruta; do
    dentro=${ruta#openspec/changes/}
    if [ "$dentro" != "$ruta" ]; then
        parte=${dentro%%/*}
        if [ "$parte" != "$dentro" ]; then
            printf '%s\n' "$parte"
            break
        fi
    fi
done)

echo "❌ Commit blocked: you are on the base branch '$base'."
if [ -n "$cambio" ]; then
    echo "   The artifacts of change '$cambio' are staged on the base branch."
    echo "   Isolate the change in its worktree and commit from there:"
    echo ""
    echo "     git worktree add .worktrees/$cambio -b feature/$cambio"
    echo "     cd .worktrees/$cambio"
    echo ""
    echo "   Then run the commit again."
else
    echo "   Changes are never committed on the base branch; it only receives merges."
    echo "   Work on a feature branch and open a pull request:"
    echo ""
    echo "     git checkout -b feature/<change>"
    echo ""
    echo "   Then commit, push and open the pull request."
fi
exit 1
