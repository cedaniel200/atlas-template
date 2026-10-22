# Schemas locales de OpenSpec

OpenSpec resuelve primero los schemas **project-local** (`openspec/schemas/<nombre>/`) y después los
del paquete. Este directorio vendoriza el schema del proyecto para que funcione sin descargas y de
forma determinista.

| Schema | Origen | Licencia |
|---|---|---|
| `spec-driven-with-adr` | [intent-driven-dev/openspec-schemas](https://github.com/intent-driven-dev/openspec-schemas) | MIT |

## Verificación

```bash
openspec schema which spec-driven-with-adr      # debe responder: Source: project
openspec schema validate spec-driven-with-adr   # estructura y plantillas válidas
```

## Dónde vive cada cosa

| Ruta | Contenido |
|---|---|
| `openspec/schemas/<schema>/schema.yaml` | Orden de artefactos, dependencias e instrucciones |
| `openspec/schemas/<schema>/templates/` | Plantillas de cada artefacto |
| `openspec/config.yaml` | Contexto y reglas **de este proyecto** |

> No edites un schema vendorizado sin documentarlo: es una decisión arquitectónica (ADR).
