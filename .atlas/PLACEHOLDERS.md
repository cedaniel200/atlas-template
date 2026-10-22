# Placeholder contract

> **Closed list.** A placeholder that is not in this document **does not exist** and cannot be used.
> Every placeholder in the contract must be **defined** in the project, with a **value** or **`N/A`**.
> This document is the single source; `AGENTS.md` and `profiles/README.md` reference it.

## The two systems

| System | What it provides | Where |
|---|---|---|
| **Profile** | **Data** about the stack: commands, paths, port, threshold | `.atlas/profiles/` |
| **Pack** | Optional **procedure** (skills/agents) that does not fit in a command | `.atlas/packs/` |

A pack is **never** a requirement. What every project needs are the **contract placeholders**,
resolved with the chosen profile plus the questionnaire answers.

## The three states

| State | Meaning | What the agent does |
|---|---|---|
| **Concrete value** | It exists and applies | Uses it |
| **`N/A`** | It exists in the contract, but the stack does not have it | **Skips the step and declares it**; never runs `N/A` |
| **Undefined** | It is not in the contract → it does not exist | **Does not use it**; if needed, stops and asks to extend the contract |

---

## 1. Profile placeholders

They are resolved when the profile is **instantiated** (questionnaire answers). In the YAML, a field
that does not apply is `""` (never omitted or invented).

| Placeholder | Profile field | Required? | Can it be `""`? |
|---|---|---|---|
| `PACKAGE_MANAGER` | `stack.package_manager` | yes | no |
| `RUN_APP_COMMAND` | `commands.run` | no | yes |
| `SERVICE_NAME` | `qa.service_name` | no | yes |
| `APP_PORT` | `qa.app_port` | no | yes |
| `HEALTH_PATH` | `qa.health_path` | no | yes |
| `METRICS_PATH` | `qa.metrics_path` | no | yes |

---

## 2. Project placeholders

They are written to `AGENTS.md`, `openspec/config.yaml`, `README.md` and consumed by the prompts.
All of them must be defined (value or `N/A`).

| Placeholder | Origin | Can it be `N/A`? |
|---|---|---|
| `PROJECT_NAME` | answer | no |
| `ONE_LINE_DESCRIPTION` | answer | no |
| `STACK_SUMMARY` | profile + answer | no |
| `DOMAIN_SUMMARY` | answer | no |
| `PACKAGE_BASE` | answer | yes |
| `LANGUAGE_USER` | answer | no |
| `LANGUAGE_AGENT` | answer | no |
| `ARCHITECTURE_SUMMARY` | answer | no |
| `ARCHITECTURE_NOTES` | answer | yes |
| `PROJECT_STRUCTURE` | profile | no |
| `C4_CONTEXT` | answer | yes |
| `ADRS_NOTE` | answer | yes |
| `LICENSE` | answer | yes |
| `QUICK_START` | profile + answer | no |
| `DEV_COMMANDS` | profile | no |
| `INSTALL_COMMAND` | profile | yes |
| `BUILD_COMMAND` | profile | yes |
| `RUN_APP_COMMAND` | profile | yes |
| `TEST_COMMAND` | profile | yes |
| `LINT_MAIN_COMMAND` | profile | yes |
| `LINT_TEST_COMMAND` | profile | yes |
| `STATIC_ANALYSIS_COMMAND` | profile | yes |
| `QUALITY_COMMAND` | profile | yes |
| `COVERAGE_COMMAND` | profile | yes |
| `MUTATION_COMMAND` | profile | yes |
| `CRAP_COMMAND` | profile | yes |
| `CRAP_THRESHOLD` | profile | yes |
| `QA_ENVIRONMENT` | answers | yes |
| `SERVICE_NAME` | profile | yes |
| `APP_PORT` | profile | yes |
| `HEALTH_URL` | derived | yes |
| `STACKS_TABLE` | derived from `state.stacks` (Markdown table) | yes (no stacks) |
| `STACK_CONTEXT` | derived from `state.stacks[i]` (agent block) | yes (single-stack) |
| `METRICS_PATH` | profile | yes |
| `DO_NOT_TOUCH` | answer | yes |
| `MEMORY` | answer | yes |
| `OPENSPEC_COMMANDS_POLICY` | answer | no |
| `ORCHESTRATION_POLICY` | answer | no |
| `TBD_ITEMS` | answers | yes |

> `RUN_APP_COMMAND`, `SERVICE_NAME`, `APP_PORT` and `METRICS_PATH` exist in **both** layers: the profile
> provides them as data and the project receives them as placeholders.

### Derivations (profile → project)

| Profile | Project |
|---|---|
| `commands.install` / `build` / `run` / `test` / `lint` / … | `*_COMMAND` |
| `quality.crap_threshold` | `CRAP_THRESHOLD` |
| `qa.service_name` | `SERVICE_NAME` |
| `qa.app_port` | `APP_PORT` |
| `qa.health_path` | `HEALTH_URL = http://localhost:<APP_PORT><HEALTH_PATH>` (or `N/A` when there is no health) |
| `qa.metrics_path` | `METRICS_PATH` |

### Empty rule (mechanics)

An empty field in the profile is **not composed**: it becomes `N/A` in the project.

| Profile | Project |
|---|---|
| `qa.health_path: ""` or `qa.app_port: ""` | `HEALTH_URL = N/A` — **never** compose `http://localhost:<port>` with an empty path |
| `qa.app_port: ""` | `APP_PORT = N/A` |
| `qa.metrics_path: ""` | `METRICS_PATH = N/A` |
| `qa.service_name: ""` | `SERVICE_NAME = N/A` |
| `commands.<x>: ""` | `<X>_COMMAND = N/A` |

`N/A` **is not empty**: it is a contract value the agent interprets as "not applicable" (it skips the
step and declares it).

---

## Verification rule

`node .atlas/scripts/validar-contrato.mjs` checks that:

1. Every `{{...}}` used in `AGENTS.md`, `openspec/config.yaml`, `.atlas/PROJECT-README.md`,
   `.atlas/agents/` and `.agents/skills/` is in the **project** list.
2. Every `{{...}}` used in profiles is in the **profile** list.
3. The `AGENTS.md` § Placeholders table does not declare keys outside the contract.

If it fails, **do not invent**: extend this contract and document where the value comes from.
---

## 3. Stacks (multi-stack)

`state.stacks` is the single source. Each stack:

```json
{
  "id": "python",
  "profile": "python",
  "paths": ["backend/"],
  "install": "pip install -r requirements.txt",
  "build": "",
  "run": "uvicorn app:app --reload",
  "test": "pytest",
  "lint": "ruff check .",
  "quality": "ruff check . && pytest",
  "packs": []
}
```

- `id` is required and unique; the adapter is `engineer-<id>`.
- `profile` references `.atlas/profiles/<id>.yaml` (or a project profile).
- `packs` are the active packs for that stack; `state.packs` is the union.
- Every stack is rendered as `engineer-<id>`, even when there is only one.
- `AGENTS.md` § Stacks is filled from `state.stacks` (`{{STACKS_TABLE}}`).

The `§ Stacks` table includes the commands so the contract is self-contained:

```markdown
| Stack | Profile | Paths | Install | Build | Run | Test | Lint | Quality | Packs |
|---|---|---|---|---|---|---|---|---|---|
| `python` | `python` | `backend/` | `pip install -r requirements.txt` | — | `uvicorn app:app` | `pytest` | `ruff check .` | `ruff check . && pytest` | — |
```
