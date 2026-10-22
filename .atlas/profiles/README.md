# Stack profiles

A profile is **data**, not procedure: it describes how a stack is built, run and validated.
**There is no catalog**: the bootstrap creates only the profile the project needs from
`_templates/profile.yaml`, and the user validates the commands.

## How it is created

```bash
node .atlas/scripts/crear-perfil.mjs --id <id> --language <language> \
  [--runtime <runtime>] [--package-manager <manager>] [--source <path>] [--tests <path>]
```

1. The script copies `_templates/profile.yaml` to `<id>.yaml` (it does not overwrite without `--force`).
2. Fill in the commands with real values; if one does not apply, use `""` plus a note.
3. Validate: `node .atlas/scripts/validar-perfiles.mjs`.
4. Add the stack to `state.stacks` and `AGENTS.md § Stacks`.
5. Regenerate adapters: `node .atlas/scripts/renderizar-adaptadores.mjs`.

This can be done **at any time**, not only during the bootstrap.

## Why they exist

Without profiles, every stack would repeat the same commands in every project. With profiles,
**any stack is supported** with ~40 lines of YAML; packs are reserved for real procedural knowledge.
Because they are generated on demand, there are no files nobody uses.

## Profile or pack: how to decide

| You need… | It goes in… | Example |
|---|---|---|
| How the stack runs | **Profile** + stack | `./gradlew build`, `npm test`, port, health |
| How to do something with a technology | **Pack** | testing Spring controllers, MASVS checklist |
| A workflow rule for everyone | **Core** | TDD, small PR, gates |

**Example — Spring Boot:**

- **Profile `java-gradle` + stack:** build/test/run commands, `8080`, `/actuator/health` (data).
- **Pack `spring-boot` (optional):** testing, security and observability conventions (procedure).

## Schema

```yaml
name: <id>                     # kebab-case, matches the file name
description: <text>

stack:
  language: <language>
  runtime: <runtime>
  package_manager: <manager>

structure:
  source: <path>
  tests: <path>

commands:                      # executable strings; use "" when not applicable
  install: ""
  build: ""
  run: ""
  test: ""
  test_unit: ""
  lint: ""
  lint_tests: ""
  typecheck: ""
  static_analysis: ""
  quality: ""                  # the gate that must pass before commit
  coverage: ""
  mutation: ""
  crap: ""

quality:
  crap_threshold: 6            # per-method threshold (see docs/harness/<lang>/QUALITY.md)
  coverage_min: null
  tools: []
  suggested: []

qa:
  docker: false
  service_name: ""
  app_port: ""
  health_path: ""
  metrics_path: ""

notes: |
  Manual adjustments or profile warnings.
```

## Profile placeholders

They are resolved when the profile is **instantiated** (questionnaire answers). The closed list is in
[`../PLACEHOLDERS.md`](../PLACEHOLDERS.md).

| Placeholder | Field |
|---|---|
| `PACKAGE_MANAGER` | `stack.package_manager` |
| `RUN_APP_COMMAND` | `commands.run` |
| `SERVICE_NAME` | `qa.service_name` |
| `APP_PORT` | `qa.app_port` |
| `HEALTH_PATH` | `qa.health_path` |
| `METRICS_PATH` | `qa.metrics_path` |

A field that does not apply is `""` (never omitted or invented). Project placeholder derivations:
`HEALTH_URL = http://localhost:<APP_PORT><HEALTH_PATH>`.

**Empty ≠ composite:** if `health_path` or `app_port` is `""`, the project receives `HEALTH_URL = N/A`
(never build a URL with an empty path). Same for `metrics_path`/`service_name` → `N/A`.

## Rules

- **Data only.** No instructions for the agent (those are skills).
- **Nothing invented.** If a command is unknown, use `""` plus a note in `notes`; never guess one.
- **No framework leaks.** A toolchain profile contains no framework-specific paths or commands:
  those values are placeholders resolved in the questionnaire.
- **A profile does not activate packs**: it only reports the recommendation.
- Values are validated by running the command, not by reading documentation.

## Examples and template

- `_templates/profile.yaml` is the **template** used by `crear-perfil.mjs`. It is not validated as a profile.
- The template uses generation markers (`{{ID}}`, `{{LANGUAGE}}`, …) that are not profile placeholders:
  `crear-perfil.mjs` resolves them. The draft starts with `TODO` in runtime/paths; complete them.
- `_examples/` contains two **illustrative** profiles: they show the YAML shape, not a catalog.
  If one fits, use it as a reference; do not copy it verbatim.

| File | Illustrates |
|---|---|
| `_templates/profile.yaml` | Skeleton for generating a profile |
| `_examples/java-gradle.yaml` | JVM toolchain (Gradle, Checkstyle, PIT, CRAP) |
| `_examples/node-ts.yaml` | Node/TS toolchain (lint, typecheck, coverage) |

The project creates its profile with `crear-perfil.mjs`; `_examples/` is reference only.
