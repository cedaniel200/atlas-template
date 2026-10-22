# Packs opcionales

Un pack agrupa **conocimiento procedimental** —skills y agentes— que no se puede expresar como un
comando o una ruta. **No se descubre automáticamente**: vive fuera de `.agents/skills/` y `.template/agents/`,
así que no consume contexto en sesiones donde no aplica.

## Regla de admisión

Antes de crear un pack, clasifica el conocimiento:

| Tipo | Ejemplo | Dónde va |
|---|---|---|
| **Workflow** (invariante entre stacks) | cómo se propone, se hace TDD, se revisa | **Núcleo** |
| **Dato de configuración** | comando de test, puerto, rutas, umbral CRAP | **Perfil** (`.template/profiles/`) |
| **Procedimiento tecnológico** | cómo medir CRAP en Gradle, patrones de test React, checklist MASVS | **Pack** |

> Si el "pack" solo contendría comandos y rutas, **no es un pack: es un perfil**.

**Un pack nunca es requisito** para que el template funcione. Sin pack, el agente usa el perfil y el
proceso del núcleo; con pack, gana profundidad.

## Estructura y manifiesto

```
.template/packs/<pack>/
  pack.yaml
  README.md
  skills/<nombre>/SKILL.md
  agents/<rol>.md
  docs/<plantilla>.md
```

```yaml
# pack.yaml
name: ddd
version: 0.1.0
description: Modelado estratégico y táctico de dominio
provides:
  - skills/ddd-modeling
requires: []
stack_hints: []
license: MIT
```

- `requires` permite validar la coherencia (un pack de Java no se activa con perfil de Python).
- La versión del pack es independiente de la del template.
- Cada skill conserva su `license` y se registra en `THIRD-PARTY-NOTICES.md`.

## Activación

1. El bootstrap lee los `pack.yaml` y propone los que encajan con los perfiles de `state.stacks`.
2. El usuario elige.
3. El bootstrap copia el contenido a `.agents/skills/` y `.template/agents/`, registra `{name, version}` en
   `state.stacks[].packs` (y en la unión `state.packs`) y las skills en `AGENTS.md` § Skill Registry.
   Solo los packs activos consumen contexto.

Desactivar un pack = borrar sus archivos copiados (o restaurarlos desde este directorio).
En una actualización, **solo se actualizan los packs activados**.

## Catálogo

El catálogo base es agnóstico de tecnología. Un pack de proyecto puede declarar `stack_hints`/`requires`
(un pack de Java no se activa con un perfil de Python).

| Pack | Qué aporta | Requiere |
|---|---|---|
| `ddd` | Modelado estratégico y táctico: agregados, VOs, eventos, context mapping | — |
| `business-modeling` | Modelo de negocio y propuesta de valor (agente `business`) | — |
| `integrations` | Memoria persistente (Engram) y grafo de conocimiento (Graphify) | — |

Se incorporan de forma incremental; el mecanismo de activación está disponible desde esta versión.

## Lo que un pack NO es

- No es una copia del perfil (eso son datos).
- No es una variante del núcleo (eso es duplicación).
- No es obligatorio para ningún stack: si no existe, el template sigue funcionando.
