# Documentación Funcional (Use Cases)

> El nombre de la carpeta (`functional/`) es un identificador técnico en inglés; el **contenido** sigue
> `language.user`. Si el proyecto prefiere otro nombre, renuébralo y actualice `AGENTS.md` § Mapa de documentos.

Esta carpeta contiene los **Casos de Uso** en formato Cockburn, que son la **fuente de verdad de las reglas de negocio**.

> ⚠️ **Contractual:** El agente `doc-writer` **debe** actualizar esta carpeta cuando un cambio afecte reglas de negocio (pre-merge, dentro del worktree).

## Estructura sugerida

```
functional/
├── UC-001-registrar-usuario.md
├── UC-002-iniciar-sesion.md
├── UC-003-crear-recurso.md
└── ...
```

## Formato de cada Use Case (Cockburn)

```markdown
# UC-XXX: Nombre del Caso de Uso

**Actor principal:** [Usuario/Sistema externo]
**Actores secundarios:** [Servicios, BD, APIs externas]
**Precondiciones:** [Estado del sistema antes]
**Postcondiciones:** [Estado del sistema después]

## Flujo principal
1. El actor hace X
2. El sistema valida Y
3. El sistema ejecuta Z
4. El sistema responde W

## Flujos alternativos
### A1: Validación falla
1. El sistema detecta error
2. El sistema responde error con código E001

## Reglas de negocio
- RN-001: [Descripción de la regla]
- RN-002: [Otra regla]

## Referencias
- ADR: `../../adr/00XX-decision.md`
- Specs: `../../openspec/specs/<capacidad>/spec.md`
```

## Reglas

- **Un archivo por Use Case** (número secuencial + nombre descriptivo)
- **Actualizar en el mismo commit** que cambia la regla de negocio
- **Referenciar ADRs y Specs** — no duplicar información
- **Lenguaje del dominio** (términos del negocio, no técnicos)