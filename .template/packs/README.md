# Packs opcionales

Un pack agrupa **conocimiento procedimental** —skills y agentes— que no se puede expresar como un
comando o una ruta. **No se descubre automáticamente**: vive fuera de `.agents/skills/` y `agents/`,
así que no consume contexto en sesiones donde no aplica.

> ⚠️ **Catálogo provisional.** Solo se listan los packs agnósticos de tecnología. Los packs de stack
> se definen al final del template (ver "Por definir al final").

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

1. El bootstrap lee los `pack.yaml` y propone los que encajan con el perfil detectado.
2. El usuario elige.
3. El bootstrap copia el contenido a `.agents/skills/` y `agents/`, y registra `{name, version}` en
   `state.json.packs`.

Desactivar un pack = borrar sus archivos copiados (o restaurarlos desde este directorio).
En una actualización, **solo se actualizan los packs activados**.

## Catálogo (candidatos agnósticos)

Estos packs no prometen soporte de ninguna tecnología concreta, por eso pueden quedar definidos:

| Pack | Qué aporta | Requiere |
|---|---|---|
| `ddd` | Modelado estratégico y táctico: agregados, VOs, eventos, context mapping | — |
| `business-modeling` | Modelo de negocio y propuesta de valor (agente `business`) | — |
| `integrations` | Memoria persistente (Engram) y grafo de conocimiento (Graphify) | — |

**v1: el mecanismo existe, sin packs.** Se materializan en cambios posteriores.

## Por definir al final

Packs que dependen de una tecnología y que **no** forman parte del catálogo soportado todavía:

| Pack previsto | Depende de |
|---|---|
| `java-quality` | Perfil JVM |
| `node-ts` | Perfil Node/TS |
| `react-frontend` | Perfil Node/TS |
| `kmp-mobile` | Perfil Kotlin |
| `qa-http` | Herramientas HTTP/SQL |
| `design-system` | Sistema de diseño del proyecto |

La decisión de cuáles se soportan, con qué alcance y con qué perfiles se toma al final, junto con la
definición definitiva de los perfiles.

## Lo que un pack NO es

- No es una copia del perfil (eso son datos).
- No es una variante del núcleo (eso es duplicación).
- No es obligatorio para ningún stack: si no existe, el template sigue funcionando.
