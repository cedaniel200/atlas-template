# Ejecución paralela (experimental)

> **Experimental.** No es el flujo por defecto y no tiene garantía de estabilidad. Es un protocolo
> para el agente cuando el usuario pide explícitamente implementar changes o unidades independientes
> en paralelo. El humano pide y aprueba; el agente orquesta.

---

## Cuándo usarlo

Solo si se cumplen **todas**:

- Los changes/unidades son independientes, o el contrato entre ellos ya está congelado (API/schema).
- Cada unidad tiene **rutas disjuntas** o su propio worktree/rama.
- El usuario confirma explícitamente la ejecución paralela.

No lo uses para dos specs que tocan los mismos archivos, ni para trabajo dependiente sin contrato.

## Roles

- **analyst**: orquestador. Crea el plan, asigna claims, integra, valida y reporta.
- **implementadores**: un agente por unidad. Solo escriben dentro de sus rutas reclamadas y añaden progreso.
- **qa-analyst / reviewer**: se ejecutan **después de integrar**, no por agente paralelo.

## Dos modos

- **Un change, N unidades**: un directorio `.atlas/run/<change>/` con N unidades/agentes.
- **Programa, N changes × N unidades**: `.atlas/run/program.json` más un run por change.

Un programa es la forma de ejecutar varias specs grandes en paralelo, cada una con sus N agentes.

---

## Directorio de estado

```text
.atlas/run/<change>/          # gitignored, estado local de ejecución
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
  "strategy": "shared-worktree",
  "units": [
    { "id": "hello", "agent": "agent-a", "paths": ["agents/a/hello.py"], "task": "1.1", "depends_on": [] },
    { "id": "sum", "agent": "agent-b", "paths": ["agents/b/sum.py"], "task": "1.2", "depends_on": [] }
  ]
}
```

- `strategy`: `shared-worktree` (por defecto) o `per-unit-worktree`.
- `id` único; `agent` único por unidad; `paths` no vacío; `depends_on` referencia unidades existentes.
- `task` (opcional pero recomendado) enlaza la unidad con la tarea OpenSpec, p. ej. `1.2`.
- `worktree` solo es obligatorio con `per-unit-worktree`; debe ser único.
- Sin ciclos.

### `claims.json`

```json
{
  "claims": [
    { "unit": "hello", "agent": "agent-a", "paths": ["agents/a/hello.py"] },
    { "unit": "sum", "agent": "agent-b", "paths": ["agents/b/sum.py"] }
  ]
}
```

- Un claim por unidad; el agente debe coincidir con el plan.
- Los claims de unidades distintas no pueden solaparse (misma ruta o una dentro de otra).

### `agents/<agent>/status.json`

```json
{ "agent": "agent-a", "unit": "hello", "state": "done", "updated_at": "2026-01-01T00:00:00Z" }
```

`state`: `pending`, `running`, `blocked` o `done`.

### `journal.ndjson`

Un objeto JSON por línea, append-only:

```json
{"ts":"2026-01-01T00:00:00Z","event":"commit","unit":"hello","agent":"orchestrator","sha":"a1b2c3d"}
```

`event`: `started`, `progress`, `blocked`, `handoff`, `done` o `commit`. `commit` registra el SHA de
cada commit asociado a la unidad (el orquestador en `shared-worktree`, el agente en `per-unit-worktree`).

### `handoff/<unit>.md`

Resumen corto para el orquestador: qué cambió, tests ejecutados, preguntas abiertas y lo que el
integrador debe saber. Obligatorio cuando la unidad está `done`.

## Programa (varios changes)

`.atlas/run/program.json` coordina varios changes:

```json
{
  "program": "demo",
  "changes": [
    { "id": "spec-a", "depends_on": [], "contract": "docs/api/spec-a.yaml" },
    { "id": "spec-b", "depends_on": ["spec-a"], "contract": "docs/api/spec-b.yaml" }
  ]
}
```

- Cada `id` debe tener su propio `.atlas/run/<id>/` con plan, claims, estado, journal y handoff.
- `depends_on` se comprueba entre changes: un change dependiente no puede tener unidades `done`
  hasta que su dependencia esté completa.
- `contract` (opcional) debe existir; congela la API/schema antes de paralelizar backend/front.
- `validar-run --program` valida los runs individuales, solapes de claims entre changes, dependencias y contratos.

## Estrategias de worktree y commits

### `shared-worktree` (por defecto)

- Un change y un worktree; las unidades escriben en **rutas disjuntas**.
- Los agentes **nunca ejecutan `git add` ni `git commit`**: escriben, actualizan estado/journal y dejan handoff.
- El orquestador verifica el handoff, hace stage **solo de las rutas reclamadas**, commitea por unidad (o
  en un lote pequeño) y actualiza el estado.

### `per-unit-worktree`

- Cada unidad tiene su propio `worktree` (rama/ruta); los agentes commitean **solo en su rama/worktree**.
- El orquestador integra (merge/cherry-pick), valida y mantiene el historial final.

### Handoff

`handoff/<unit>.md` debe incluir: archivos cambiados, tests ejecutados, mensaje de commit sugerido y lo
que el integrador deba saber. El orquestador nunca commitea una unidad sin handoff.

### Trazabilidad

- **`shared-worktree`**: un commit por handoff/checkpoint. Si el orquestador lo agrupa todo al final,
  los commits intermedios se pierden. Si el mismo archivo necesita varios commits lógicos, divide el
  trabajo en checkpoints (actualiza handoff y journal cada vez) o usa `per-unit-worktree`.
- **`per-unit-worktree`**: los agentes commitean cada cambio en su rama; el orquestador hace merge o
  cherry-pick. **No hagas squash** si necesitas los commits individuales; los eventos `commit` del
  journal registran los SHAs.
- Se permiten varios eventos `commit` para la misma unidad: representan checkpoints, no trabajo duplicado.

## Reglas

- **Un dueño por ruta.** Nunca escribir fuera de las rutas reclamadas.
- **Escritura atómica**: archivo temporal + rename; nunca editar en sitio un archivo compartido.
- **Journal append-only**; no reescribir líneas anteriores.
- **Blocked** exige una entrada de journal con el motivo y actualizar el estado.
- **Done** exige tests, estado actualizado, evento `done` y handoff.
- Si hay conflicto de claims, se detiene y se pregunta al humano; no se inventa una resolución.
- El analyst integra; los agentes paralelos no hacen merge ni abren PRs.

## Ciclo de vida

- Se crea el run al empezar cada change paralelo.
- Se conserva entre sesiones hasta terminar integración, QA y review de ese change.
- En un programa, crea `.atlas/run/program.json` al inicio y consérvalo hasta que **todos** los changes
  estén mergeados; borra cada run al cerrar su change y el programa al final.
- Borra un run después de archive/merge (o si el change se abandona): `rm -rf .atlas/run/<change>`.
- Es gitignored y nunca forma parte de los artefactos OpenSpec ni del PR.

## Validación

```bash
node .atlas/scripts/validar-run.mjs --change <change>
node .atlas/scripts/validar-run.mjs --program [.atlas/run/program.json]
```

Comprueba unidades, claims, solapes, estados, handoffs, eventos del journal, dependencias, contratos
y solapes de claims entre changes.

El protocolo no fija un número máximo de unidades; el ejemplo usa dos. La restricción real son las rutas
disjuntas y las dependencias declaradas.

## Ejemplo acotado

**Un change, dos unidades:** dos agentes, dos archivos disjuntos:

- `agent-a` → `agents/a/hello.py` con `hello() -> "hello"`.
- `agent-b` → `agents/b/sum.py` con `sum(a, b) -> a + b`.

**Programa, dos changes × tres unidades:**

- `spec-a`: `hello`, `sum`, `mul`.
- `spec-b`: `hello`, `div`, `concat`.
- `program.json` con `spec-b` dependiendo de `spec-a` y un contrato por change.

En ambos casos cada agente añade sus eventos; el analyst ejecuta `validar-run.mjs`, integra y lanza
los tests. Son los casos mínimos útiles; no los uses como plantilla para cambios grandes y acoplados.
