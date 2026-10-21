# Cambios — propuestas activas

Cada cambio vive en `openspec/changes/<nombre-en-kebab-case>/` y se crea con `openspec new change "<nombre>"`.

## Artefactos del schema `spec-driven-with-adr`

| Orden | Archivo | Propósito |
|---|---|---|
| 1 | `proposal.md` | Por qué y qué cambia (capacidades afectadas) |
| 2 | `specs/<capacidad>/spec.md` | Delta de requisitos (ADDED/MODIFIED/REMOVED/RENAMED) |
| 3 | `design.md` | Cómo se implementa: C4, decisiones, alternativas, riesgos |
| 4 | `adr.md` | Manifiesto de revisión de ADRs (marca de finalización del artefacto) |
| 5 | `tasks.md` | Checklist ejecutable (`- [ ] X.Y …`) |

Artefactos de proceso (no los genera el schema, los producen los agentes):

| Archivo | Origen |
|---|---|
| `qa-scenarios.md` | Inventario preliminar de escenarios E2E (`ddd-analyst`) |
| `qa-report-*.md` | Evidencia de pruebas funcionales (`qa-analyst`) |
| `reviewer-report-*.md` | Evidencia de revisión de código (`ddd-reviewer`) |

## Regla de orden

Un artefacto se escribe solo cuando sus dependencias están completas:

```
proposal → specs → design → adr → tasks → apply
```

El usuario revisa y aprueba cada artefacto antes de continuar al siguiente.

## Cierre

`openspec archive <cambio>` fusiona el delta en `openspec/specs/` y mueve el cambio a
`openspec/changes/archive/`. **No se edita el histórico a mano.**
