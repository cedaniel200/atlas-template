---
name: gherkin-specs
description: Use when writing or editing spec documents in openspec/specs/ — guides Gherkin-style GIVEN/WHEN/THEN scenarios with ubiquitous domain language.
---

# Gherkin Specs

## Overview

Write domain specifications using Gherkin-style scenarios. Each scenario describes one behavior from the user's perspective using the domain's ubiquitous language.

## When to Use

- During `/opsx:propose` — when writing the `specs/` phase
- Editing existing specs in `openspec/specs/<capability>/spec.md`
- Adding new scenarios to cover edge cases or new requirements

Do NOT use for implementation details, technical design, or test code. Specs describe WHAT the system does, not HOW.

## Format

```markdown
### Requirement: <name>
<Business description in domain language>

#### Scenario: <name>
- **GIVEN** <precondition / initial state>
- **WHEN** <action / trigger>
- **THEN** <expected outcome>
- **AND** <additional outcomes> (optional)
```

## Conventions

- **Lenguaje ubicuo**: usar términos del dominio (oveja, crotal, rebaño, fase, parto, procedencia). No usar términos técnicos (DTO, repositorio, service).
- **Un comportamiento por escenario**: no probar múltiples variantes en un mismo escenario.
- **GIVEN obligatorio**: todo escenario necesita un contexto inicial explícito.
- **Independencia**: los escenarios no dependen entre sí. Cada uno establece su propio GIVEN.
- **Negocio, no UI**: describir intención, no clicks o endpoints.

## Examples

### Requirement: Registrar oveja por compra individual
El sistema permite registrar una oveja adquirida por compra.

#### Scenario: Compra exitosa con fecha de nacimiento
- **GIVEN** un crotal válido (8-10 alfanuméricos) que no existe en el sistema
- **WHEN** se registra una compra con crotal, raza, sexo, peso, fase REPRODUCTORA y fecha de nacimiento
- **THEN** la oveja se crea con los datos proporcionados
- **AND** se publica un evento `OvejaRegistrada`

#### Scenario: Crotal duplicado rechazado
- **GIVEN** una oveja existente con crotal X
- **WHEN** se intenta registrar otra oveja con el mismo crotal X
- **THEN** el sistema rechaza la operación con excepción de crotal duplicado

### Requirement: Registrar parto
El sistema permite registrar el nacimiento de crías.

#### Scenario: Parto exitoso con una cría
- **GIVEN** una oveja HEMBRA en fase REPRODUCTORA con estado gestacional PREÑADA
- **WHEN** se registra un parto con 1 cría (crotal, raza, sexo, peso)
- **THEN** la cría se crea en fase LACTANCIA
- **AND** la madre actualiza su estado gestacional a VACIA
- **AND** se publican eventos `PartoRegistrado`, `NoGestacion` y `OvejaRegistrada`
