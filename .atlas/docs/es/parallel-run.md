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
  "units": [
    { "id": "hello", "agent": "agent-a", "paths": ["agents/a/hello.py"], "depends_on": [] },
    { "id": "sum", "agent": "agent-b", "paths": ["agents/b/sum.py"], "depends_on": [] }
  ]
}
```

- `id` único; `agent` único por unidad; `paths` no vacío; `depends_on` referencia unidades existentes.
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
{"ts":"2026-01-01T00:00:00Z","event":"started","unit":"hello","agent":"agent-a","message":"start"}
```

`event`: `started`, `progress`, `blocked`, `handoff` o `done`.

### `handoff/<unit>.md`

Resumen corto para el orquestador: qué cambió, tests ejecutados, preguntas abiertas y lo que el
integrador debe saber. Obligatorio cuando la unidad está `done`.

## Reglas

- **Un dueño por ruta.** Nunca escribir fuera de las rutas reclamadas.
- **Escritura atómica**: archivo temporal + rename; nunca editar en sitio un archivo compartido.
- **Journal append-only**; no reescribir líneas anteriores.
- **Blocked** exige una entrada de journal con el motivo y actualizar el estado.
- **Done** exige tests, estado actualizado, evento `done` y handoff.
- Si hay conflicto de claims, se detiene y se pregunta al humano; no se inventa una resolución.
- El analyst integra; los agentes paralelos no hacen merge ni abren PRs.

## Ciclo de vida

- Se crea al empezar la ejecución paralela.
- Se conserva entre sesiones hasta terminar integración, QA y review.
- Se borra después de archive/merge (o si el change se abandona): `rm -rf .atlas/run/<change>`.
- Es gitignored y nunca forma parte de los artefactos OpenSpec ni del PR.

## Validación

```bash
node .atlas/scripts/validar-run.mjs --change <change>
```

Comprueba unidades, claims, solapes, estados, handoffs, eventos del journal y dependencias.

El protocolo no fija un número máximo de unidades; el ejemplo usa dos. La restricción real son las rutas
disjuntas y las dependencias declaradas.

## Ejemplo acotado

Dos unidades, dos agentes, dos archivos disjuntos:

- `agent-a` → `agents/a/hello.py` con `hello() -> "hello"`.
- `agent-b` → `agents/b/sum.py` con `sum(a, b) -> a + b`.

Ambos añaden sus eventos de inicio, progreso y fin; el analyst ejecuta `validar-run.mjs`, integra y
lanza los tests. Es la ejecución paralela mínima útil; no la uses como plantilla para cambios grandes
y acoplados.
