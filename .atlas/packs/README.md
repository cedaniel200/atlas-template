# Packs opcionales

Un pack agrupa **conocimiento procedimental** —skills y agentes— que no se puede expresar como un
comando o una ruta. **No se descubre automáticamente**: vive fuera de `.agents/skills/` y `.atlas/agents/`,
así que no consume contexto en sesiones donde no aplica.

**No hay catálogo base.** Un pack existe solo si el proyecto lo crea con `crear-pack.mjs` a partir de
`_templates/pack/`; el contenido lo aporta el proyecto. Se puede crear en cualquier momento.

## Regla de admisión

Antes de crear un pack, clasifica el conocimiento:

| Tipo | Ejemplo | Dónde va |
|---|---|---|
| **Workflow** (invariante entre stacks) | cómo se propone, se hace TDD, se revisa | **Núcleo** |
| **Dato de configuración** | comando de test, puerto, rutas, umbral CRAP | **Perfil** (`.atlas/profiles/`) |
| **Procedimiento tecnológico** | cómo medir CRAP en Gradle, patrones de test React, checklist MASVS | **Pack** |

> Si el "pack" solo contendría comandos y rutas, **no es un pack: es un perfil**.

**Ejemplo:** `bootRun`, el puerto y `health` van en el perfil/stack; cómo probar un controller o
proteger un endpoint va en un pack.

**Un pack nunca es requisito** para que ATLAS funcione. Sin pack, el agente usa el perfil y el
proceso del núcleo; con pack, gana profundidad.

## Estructura y manifiesto

```
.atlas/packs/<pack>/
  pack.yaml
  README.md
  skills/<nombre>/SKILL.md
  agents/<rol>.md
  docs/<plantilla>.md
```

```yaml
# pack.yaml
name: <id>
version: 0.1.0
description: <texto>
requires: []          # perfiles o packs de los que depende
skills: []            # ids de skills incluidas
agents: []            # roles incluidos
notes: |
  Ajustes o advertencias del pack.
```

- `requires` permite validar la coherencia (un pack de Java no se activa con un perfil de Python).
- La versión del pack es independiente de la de ATLAS.
- Cada skill conserva su `license` y se registra en `THIRD-PARTY-NOTICES.md`.

## Activación

1. Cuando existan packs en `.atlas/packs/`, el bootstrap lee sus `pack.yaml` y propone los que encajan
   con los perfiles de `state.stacks`.
2. El usuario elige.
3. El bootstrap copia el contenido a `.agents/skills/` y `.atlas/agents/`, registra el id en
   `state.stacks[].packs` (y en la unión `state.packs`) y las skills en `AGENTS.md` § Skill Registry.
   Solo los packs activos consumen contexto.

Desactivar un pack = quitar su id de `state.stacks[].packs` y `state.packs`, y borrar sus archivos
copiados (o restaurarlos desde este directorio). En una actualización, **solo se actualizan los packs
activados**.

## Crear un pack

```bash
node .atlas/scripts/crear-pack.mjs --id <id> --description "<texto>"
```

Crea el esqueleto desde `_templates/pack/` (no sobrescribe sin `--force`). La plantilla usa
`{{ID}}`/`{{DESCRIPTION}}`; el script los resuelve. Después:

1. Añade skills en `skills/<nombre>/SKILL.md` y agentes en `agents/<rol>.md`, o deja el pack vacío
   si aún no hay contenido.
2. Actívalo en `state.stacks[].packs` y `state.packs`.
3. Copia sus skills a `.agents/skills/` y regístralas en `AGENTS.md § Skill Registry`.
4. Valida: `node .atlas/scripts/validar-contrato.mjs` (exige `pack.yaml` para cada pack activo).

## Lo que un pack NO es

- No es una copia del perfil (eso son datos).
- No es una variante del núcleo (eso es duplicación).
- No es obligatorio para ningún stack: si no existe, ATLAS sigue funcionando.
