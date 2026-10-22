# Contrato de placeholders

> **Lista cerrada.** Un placeholder que no está en este documento **no existe** y no puede usarse.
> Todo placeholder del contrato debe quedar **definido** en el proyecto, con un **valor** o con **`N/A`**.
> Este documento es la fuente única; `AGENTS.md` y `profiles/README.md` lo referencian.

## Los dos sistemas

| Sistema | Qué aporta | Dónde |
|---|---|---|
| **Perfil** | **Datos** del stack: comandos, rutas, puerto, umbral | `.template/profiles/` |
| **Pack** | **Procedimiento** opcional (skills/agentes) que no cabe en un comando | `.template/packs/` |

Un pack **nunca** es requisito. Lo que todo proyecto necesita son los **placeholders del contrato**,
que se resuelven con el perfil elegido + las respuestas del cuestionario.

## Los tres estados

| Estado | Significado | Qué hace el agente |
|---|---|---|
| **Valor concreto** | Existe y aplica | Lo usa |
| **`N/A`** | Existe en el contrato, pero el stack no lo tiene | **Omite el paso y lo declara**; nunca ejecuta `N/A` |
| **No definido** | No está en el contrato → no existe | **No lo usa**; si lo necesita, se detiene y pide ampliar el contrato |

---

## 1. Placeholders de perfil

Se resuelven al **instanciar** el perfil (respuestas del cuestionario). En el YAML, un campo que no
aplica es `""` (nunca se omite ni se inventa).

| Placeholder | Campo del perfil | ¿Obligatorio? | ¿Puede ser `""`? |
|---|---|---|---|
| `PACKAGE_MANAGER` | `stack.package_manager` | sí | no |
| `RUN_APP_COMMAND` | `commands.run` | no | sí |
| `SERVICE_NAME` | `qa.service_name` | no | sí |
| `APP_PORT` | `qa.app_port` | no | sí |
| `HEALTH_PATH` | `qa.health_path` | no | sí |
| `METRICS_PATH` | `qa.metrics_path` | no | sí |

---

## 2. Placeholders de proyecto

Se escriben en `AGENTS.md`, `openspec/config.yaml`, `README.md` y los consumen los prompts.
Todos deben quedar definidos (valor o `N/A`).

| Placeholder | Origen | ¿Puede ser `N/A`? |
|---|---|---|
| `PROJECT_NAME` | respuesta | no |
| `ONE_LINE_DESCRIPTION` | respuesta | no |
| `STACK_SUMMARY` | perfil + respuesta | no |
| `DOMAIN_SUMMARY` | respuesta | no |
| `PACKAGE_BASE` | respuesta | sí |
| `LANGUAGE_USER` | respuesta | no |
| `LANGUAGE_AGENT` | respuesta | no |
| `ARCHITECTURE_SUMMARY` | respuesta | no |
| `ARCHITECTURE_NOTES` | respuesta | sí |
| `PROJECT_STRUCTURE` | perfil | no |
| `C4_CONTEXT` | respuesta | sí |
| `ADRS_NOTE` | respuesta | sí |
| `LICENSE` | respuesta | sí |
| `QUICK_START` | perfil + respuesta | no |
| `DEV_COMMANDS` | perfil | no |
| `INSTALL_COMMAND` | perfil | sí |
| `BUILD_COMMAND` | perfil | sí |
| `RUN_APP_COMMAND` | perfil | sí |
| `TEST_COMMAND` | perfil | sí |
| `LINT_MAIN_COMMAND` | perfil | sí |
| `LINT_TEST_COMMAND` | perfil | sí |
| `STATIC_ANALYSIS_COMMAND` | perfil | sí |
| `QUALITY_COMMAND` | perfil | sí |
| `COVERAGE_COMMAND` | perfil | sí |
| `MUTATION_COMMAND` | perfil | sí |
| `CRAP_COMMAND` | perfil | sí |
| `CRAP_THRESHOLD` | perfil | sí |
| `QA_ENVIRONMENT` | respuestas | sí |
| `SERVICE_NAME` | perfil | sí |
| `APP_PORT` | perfil | sí |
| `HEALTH_URL` | derivado | sí |
| `STACKS_TABLE` | derivado de `state.stacks` (tabla Markdown) | sí (sin stacks) |
| `STACK_CONTEXT` | derivado de `state.stacks[i]` (bloque del agente) | sí (single-stack) |
| `METRICS_PATH` | perfil | sí |
| `DO_NOT_TOUCH` | respuesta | sí |
| `MEMORY` | respuesta | sí |
| `OPENSPEC_COMMANDS_POLICY` | respuesta | no |
| `ORCHESTRATION_POLICY` | respuesta | no |
| `TBD_ITEMS` | respuestas | sí |

> `RUN_APP_COMMAND`, `SERVICE_NAME`, `APP_PORT` y `METRICS_PATH` existen en **las dos** capas: el perfil
> los aporta como dato y el proyecto los recibe como placeholder.

### Derivaciones (perfil → proyecto)

| Perfil | Proyecto |
|---|---|
| `commands.install` / `build` / `run` / `test` / `lint` / … | `*_COMMAND` |
| `quality.crap_threshold` | `CRAP_THRESHOLD` |
| `qa.service_name` | `SERVICE_NAME` |
| `qa.app_port` | `APP_PORT` |
| `qa.health_path` | `HEALTH_URL = http://localhost:<APP_PORT><HEALTH_PATH>` (o `N/A` si no hay health) |
| `qa.metrics_path` | `METRICS_PATH` |

### Regla de vacío (mecánica)

Un campo vacío en el perfil **no se compone**: se traduce en `N/A` en el proyecto.

| Perfil | Proyecto |
|---|---|
| `qa.health_path: ""` o `qa.app_port: ""` | `HEALTH_URL = N/A` — **nunca** se compone `http://localhost:<puerto>` con path vacío |
| `qa.app_port: ""` | `APP_PORT = N/A` |
| `qa.metrics_path: ""` | `METRICS_PATH = N/A` |
| `qa.service_name: ""` | `SERVICE_NAME = N/A` |
| `commands.<x>: ""` | `<X>_COMMAND = N/A` |

`N/A` **no es vacío**: es un valor del contrato que el agente interpreta como "no aplica" (omite el paso
y lo declara).

---

## Regla de verificación

`node .template/scripts/validar-contrato.mjs` comprueba que:

1. Todo `{{...}}` usado en `AGENTS.md`, `openspec/config.yaml`, `.template/PROJECT-README.md`,
   `.template/agents/` y `.agents/skills/` está en la lista de **proyecto**.
2. Todo `{{...}}` usado en los perfiles está en la lista de **perfil**.
3. La tabla de `AGENTS.md` § Placeholders no declara claves fuera del contrato.

Si falla, **no se inventa**: se amplía este contrato y se documenta el origen del valor.
---

## 3. Stacks (multi-stack)

`state.stacks` es la fuente única. Cada stack:

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

- `id` es obligatorio y único; el adaptador es `engineer-<id>`.
- `profile` referencia `.template/profiles/<id>.yaml` (o un perfil del proyecto).
- `packs` son los packs activos de ese stack; `state.packs` es la unión.
- Single-stack: un elemento; el renderer genera `engineer.md`. Multi-stack: uno por tecnología.
- `AGENTS.md` § Stacks se rellena desde `state.stacks` (`{{STACKS_TABLE}}`).

La tabla de `§ Stacks` incluye los comandos para que el contrato sea autocontenido:

```markdown
| Stack | Perfil | Rutas | Install | Build | Run | Test | Lint | Quality | Packs |
|---|---|---|---|---|---|---|---|---|---|
| `python` | `python` | `backend/` | `pip install -r requirements.txt` | — | `uvicorn app:app` | `pytest` | `ruff check .` | `ruff check . && pytest` | — |
```
