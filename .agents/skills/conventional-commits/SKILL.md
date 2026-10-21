---
name: conventional-commits
description: Use for ALL commits — enforces incremental commits with Conventional Commits prefixes and descriptive messages in Spanish.
---

# Conventional Commits

## Overview

Hacer commits pequeños e incrementales tras cada cambio lógico completado. Usar prefijos estandarizados para facilitar la navegación del historial y la reversión selectiva.

## When to Use

**Siempre.** Cada commit debe seguir esta convención, desde el primer cambio hasta el final de la sesión.

## Regla de oro: un cambio lógico = un commit

Commitear inmediatamente después de completar UN cambio atómico:

- ✅ Spec escrita → `docs: spec de registro de oveja`
- ✅ Test implementado → `test: validar crotal duplicado en compra`
- ✅ Código implementado → `feat: registrar compra individual`
- ✅ ADR creado → `docs: ADR 0001 - DTOs con factory methods`
- ✅ Refactor → `refactor: extrae validación de crotal a método`
- ❌ NO acumular: "Agrega spec, test, código, ADR y arregla bug" en un solo commit

## Prefijos

| Prefijo | Cuándo usarlo | Ejemplo |
|---------|---------------|---------|
| `feat:` | Nueva feature de dominio (código) | `feat: registrar parto con múltiples crías` |
| `test:` | Tests nuevos o modificados | `test: rechazar parto con madre en fase incorrecta` |
| `docs:` | Specs, ADRs, documentación (no código) | `docs: spec de fases de ciclo de vida` |
| `refactor:` | Cambio de estructura sin cambio funcional | `refactor: extrae máquina de estados a método privado` |
| `fix:` | Corrección de bug | `fix: validar crotal nulo antes de comparar` |
| `chore:` | Config, build, archivos de proyecto | `chore: actualiza skills-lock.json` |

## Flujo de trabajo

1. Hacer un cambio atómico
2. `git add -A`
3. `git commit -m "<prefijo>: <mensaje descriptivo en español>"`
4. Repetir

No esperar al final de la sesión para commitear. Los commits incrementales permiten revertir cambios específicos sin afectar al resto.

## Byline de rol (cuando el commit lo ejecuta un agente)

Los commits ejecutados por un agente llevan el rol como byline al final del body:

```text
git commit -m "feat: registrar parto con múltiples crías

By ddd-engineer."
```

- Solo cuando el commit lo ejecuta un agente. Los commits del usuario no llevan byline.
- El byline se añade al **body**, nunca al título (el título conserva el prefijo conventional).
- Ejemplo de body: `By ddd-analyst.`, `By ddd-engineer.`, `By qa-analyst.`
