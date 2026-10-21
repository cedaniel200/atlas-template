---
name: conventional-commits
description: Use for ALL commits — enforces incremental commits with Conventional Commits prefixes and descriptive messages in the project language.
license: MIT
---

# Conventional Commits

## Overview

Make small, incremental commits after each completed logical change. Use standardized prefixes to make
the history navigable and allow selective reverts.

## When to Use

**Always.** Every commit follows this convention, from the first change to the end of the session.

## Golden rule: one logical change = one commit

Commit immediately after completing ONE atomic change:

- ✅ Spec written → `docs: especificación de registro de <entidad>`
- ✅ Test implemented → `test: rechazar identificador duplicado`
- ✅ Code implemented → `feat: registrar <entidad>`
- ✅ ADR created → `docs: ADR 0001 - decisiones de persistencia`
- ✅ Refactor → `refactor: extrae validación de identificador a método`
- ❌ Do NOT accumulate: "add spec, test, code, ADR and fix bug" in a single commit

## Prefixes

| Prefix | When to use | Example |
|---|---|---|
| `feat:` | New domain feature (code) | `feat: registrar <evento> con múltiples elementos` |
| `test:` | New or modified tests | `test: rechazar transición en estado inválido` |
| `docs:` | Specs, ADRs, documentation (no code) | `docs: especificación de estados del ciclo de vida` |
| `refactor:` | Structural change without functional change | `refactor: extrae máquina de estados a método privado` |
| `fix:` | Bug fix | `fix: validar identificador nulo antes de comparar` |
| `chore:` | Config, build, project files | `chore: actualiza configuración del linter` |

## Workflow

1. Make one atomic change
2. `git add <files>`
3. `git commit -m "<prefix>: <descriptive message>"`
4. Repeat

Do not wait until the end of the session to commit. Incremental commits allow reverting specific
changes without affecting the rest.

## Role byline (when the commit is executed by an agent)

Commits executed by an agent carry the role as a byline at the end of the body:

```text
git commit -m "feat: registrar <evento> con múltiples elementos

By <role>."
```

- Only when the commit is executed by an agent. User commits do not carry a byline.
- The byline goes in the **body**, never in the title (the title keeps the conventional prefix).
- Examples: `By analyst.`, `By engineer.`, `By qa-analyst.`
