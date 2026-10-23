# Parallel runs (experimental)

> **Experimental.** This is not the default flow and it has no stability guarantee. It is a protocol
> for the agent when the user explicitly asks to implement independent changes or units in parallel.
> The human requests and approves; the agent orchestrates.

---

## When to use it

Only when **all** of these are true:

- The changes/units are independent, or the contract between them is already frozen (API/schema).
- Each unit has **disjoint paths** or its own worktree/branch.
- The user explicitly confirms the parallel run.

Do not use it for two specs that touch the same files, or for dependent work without a contract.

## Roles

- **analyst**: orchestrator. Creates the plan, assigns claims, integrates, validates and reports.
- **implementers**: one agent per unit. They only write inside their claimed paths and append progress.
- **qa-analyst / reviewer**: run **after integration**, not per parallel agent.

## State directory

```text
.atlas/run/<change>/          # gitignored, local runtime state
├── plan.json
├── claims.json
├── journal.ndjson
├── agents/<agent>/status.json
└── handoff/<unit>.md
```

### `plan.json`

```json
{
  "change": "demo",
  "units": [
    { "id": "hello", "agent": "agent-a", "paths": ["agents/a/hello.py"], "depends_on": [] },
    { "id": "sum", "agent": "agent-b", "paths": ["agents/b/sum.py"], "depends_on": [] }
  ]
}
```

- `id` unique; `agent` unique per unit; `paths` non-empty; `depends_on` references existing units.
- No cycles.

### `claims.json`

```json
{
  "claims": [
    { "unit": "hello", "agent": "agent-a", "paths": ["agents/a/hello.py"] },
    { "unit": "sum", "agent": "agent-b", "paths": ["agents/b/sum.py"] }
  ]
}
```

- One claim per unit; the agent must match the plan.
- Claims of different units cannot overlap (same path or one inside the other).

### `agents/<agent>/status.json`

```json
{ "agent": "agent-a", "unit": "hello", "state": "done", "updated_at": "2026-01-01T00:00:00Z" }
```

`state`: `pending`, `running`, `blocked` or `done`.

### `journal.ndjson`

One JSON object per line, append-only:

```json
{"ts":"2026-01-01T00:00:00Z","event":"started","unit":"hello","agent":"agent-a","message":"start"}
```

`event`: `started`, `progress`, `blocked`, `handoff` or `done`.

### `handoff/<unit>.md`

Short summary for the orchestrator: what changed, tests run, open questions, and what the integrator
must know. Required when the unit is `done`.

## Rules

- **One owner per path.** Never write outside the claimed paths.
- **Atomic writes**: write a temporary file and rename; never edit a shared file in place.
- **Append-only journal**; do not rewrite previous lines.
- **Blocked** requires a journal entry with the reason and a status update.
- **Done** requires tests, a status update, a `done` event and a handoff.
- If a claim conflicts, stop and ask the human; do not invent a resolution.
- The analyst integrates; parallel agents do not merge or open PRs.

## Lifecycle

- Create the directory at the start of the parallel run.
- Keep it across sessions until integration, QA and review are complete.
- Delete it after archive/merge (or when the change is abandoned): `rm -rf .atlas/run/<change>`.
- It is gitignored and never part of the OpenSpec artifacts or the PR.

## Validation

```bash
node .atlas/scripts/validar-run.mjs --change <change>
```

Checks units, claims, overlaps, statuses, handoffs, journal events and dependencies.

## Bounded example

Two units, two agents, two disjoint files:

- `agent-a` → `agents/a/hello.py` with `hello() -> "hello"`.
- `agent-b` → `agents/b/sum.py` with `sum(a, b) -> a + b`.

Both append their starts, progress and done events; the analyst runs `validar-run.mjs`, integrates and
runs the tests. This is the smallest useful parallel run; do not use it as a template for large,
coupled changes.
