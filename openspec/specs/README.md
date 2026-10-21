# Especificaciones — fuente de verdad del comportamiento

Una carpeta por capacidad, en kebab-case:

```
openspec/specs/<capacidad>/spec.md
```

## Reglas de escritura

- Requisitos con `### Requirement: <nombre>` y descripción normativa (**SHALL** / **MUST**).
- Escenarios con **exactamente** `#### Scenario: <nombre>` (cuatro almohadillas; con tres se ignoran).
- Cada escenario en **GIVEN / WHEN / THEN** y en **lenguaje del dominio**, no en lenguaje técnico
  (nada de DTO, repositorio, service).
- Cada requisito tiene **al menos un escenario**.
- Una capacidad no se duplica: si cambia el comportamiento, se modifica su spec existente.

## Ciclo de vida

Estas specs describen el comportamiento **vigente**. Los cambios se proponen como delta en
`openspec/changes/<cambio>/specs/<capacidad>/spec.md` y, al archivar el cambio, se fusionan aquí.

Operaciones de delta permitidas en un change:

| Operación | Uso |
|---|---|
| `## ADDED Requirements` | Comportamiento nuevo |
| `## MODIFIED Requirements` | Cambio de comportamiento (copiar el requisito completo) |
| `## REMOVED Requirements` | Deprecación (requiere **Reason** y **Migration**) |
| `## RENAMED Requirements` | Solo cambio de nombre (`FROM:` / `TO:`) |
