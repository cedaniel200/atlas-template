# `.atlas/` — estado y material del ritual

Este directorio es el **único** lugar del repo que sabe que el proyecto todavía no está configurado.
Lo consume `.atlas/BOOTSTRAP.md` en la primera sesión.

## Estructura

| Ruta | Versionado | Propósito |
|---|---|---|
| `state.json` | ✅ sí | **Inputs**: estado del ritual y decisiones tomadas |
| `manifest.json` | ✅ sí | **Outputs**: archivos generados, hash y propiedad (base para actualizar) |
| `BOOTSTRAP.md` | ✅ sí | Ritual de primera sesión |
| `PLACEHOLDERS.md` | ✅ sí | Contrato cerrado de placeholders: capas perfil/proyecto, estados (`N/A`) y derivaciones |
| `PROJECT-README.md` | ✅ sí | Plantilla del README del proyecto (se copia a `README.md` al adoptar) |
| `agents/` | ✅ sí | Prompts canónicos de rol; el bootstrap genera los adaptadores desde aquí |
| `docs/` | ✅ sí | Documentación interna del arnés (`en/` canónico, `es/` traducción) |
| `hosts/<host>/` | ✅ sí | Plantillas de adaptador por herramienta |
| `profiles/<stack>.yaml` | ✅ sí | **Datos** por stack: comandos, rutas, calidad |
| `packs/<pack>/` | ✅ sí | **Procedimiento** opcional (skills/agentes), fuera de discovery |
| `scripts/` | ✅ sí | Helpers portables (solo Node/shell): `sha256.*` (hash), `renderizar-adaptadores.mjs`, `actualizar-arnes.mjs`, `validar-manifiesto.mjs`, `inventariar-adopcion.mjs`, `adoptar-agents.mjs`, `combinar-readme.mjs`, `generar-manifiesto.mjs`, `medir-contexto.mjs` (diagnóstico de mantenimiento) y `validar-perfiles.mjs`/`validar-contrato.mjs` (gates) |
| `adapters/<host>/` | ❌ no (gitignored) | Artefactos desplazados por `prune` (estado local) |
| `archive/` | ❌ no (gitignored) | Documentación interna archivada cuando el proyecto no contribuye (`.atlas/docs/`) |
| `backups/<timestamp>/` | ❌ no (gitignored) | Copia previa a una fusión en modo brownfield |

### La diferencia importa

- **Perfil = dato.** Comandos, rutas, herramientas, umbrales. Se puede añadir uno nuevo en ~40 líneas
  de YAML y cualquier stack queda soportado.
- **Pack = procedimiento.** Conocimiento que **no** se reduce a un comando (patrones, checklists,
  configuración). Es opcional: ATLAS funciona sin packs.

## `state.json` — inputs

| Campo | Valores | Significado |
|---|---|---|
| `bootstrap_version` | entero | Versión del ritual con la que se configuró |
| `template_version` | semver | Versión de ATLAS usada como base |
| `template_source` | `{url, commit}` | Origen para actualizaciones reproducibles |
| `status` | `pending` \| `configured` | Si es `configured`, el ritual no se repite |
| `mode` | `greenfield` \| `brownfield` \| `null` | Cómo se adoptó ATLAS |
| `host` | `opencode` \| `claude` \| `codex` \| `null` | Herramienta anfitriona |
| `host_source` | `env` \| `user` \| `files` \| `null` | Cómo se determinó |
| `language.user` | `es` \| `en` \| otro \| `null` | Idioma de la documentación de usuario |
| `language.agent` | `en` (por defecto) | Idioma de skills y prompts |
| `architecture.stance` | `null` \| texto libre | Postura elegida: `layered`, `hexagonal`, `ddd`, `custom`… |
| `architecture.notes` | texto \| `null` | Reglas de frontera que declara el proyecto |
| `profile` | id de perfil \| `null` | Perfil de stack aplicado |
| `packs` | lista | Packs activados |
| `stacks` | lista | Stacks del proyecto: `id`, `profile`, `paths`, comandos y `packs` |
| `readme` | `generated` \| `preserved` \| `appended` \| `null` | Política aplicada al `README.md` del proyecto |
| `optional_agents` | lista | Roles opcionales activados (`mentor`, `business-strategist`) |
| `preferences.openspec_commands` | `user` \| `agent` \| `ask` | Quién ejecuta los comandos OpenSpec |
| `preferences.orchestration` | `orchestrated` \| `manual` | Si el analyst encadena las fases o el usuario las invoca |
| `quality.crap_threshold` | entero | Umbral CRAP por método (default `6`) |
| `docs.*` | rutas | Carpetas de documentación (nombres en inglés; contenido en `language.user`) |
| `phase` | `0`–`3` | Última fase completada |
| `displaced` | lista | Rutas movidas a `adapters/` |
| `override_reason` | texto \| `null` | Motivo si el usuario saltó el gate de validación |
| `configured_at` | ISO-8601 \| `null` | Fecha de configuración |

## `manifest.json` — outputs y actualizaciones

```json
{
  "template_version": "0.1.0",
  "generated_at": "2026-10-21T12:00:00Z",
  "note": "Generado por el bootstrap. No editar a mano.",
  "files": {
    ".agents/skills/conventional-commits/SKILL.md": {
      "origin": "core",
      "sha256": "…",
      "ownership": "managed"
    },
    "AGENTS.md": {
      "origin": "core",
      "sha256": "…",
      "ownership": "owned"
    },
    "opencode.json": {
      "origin": "host:opencode",
      "sha256": "…",
      "ownership": "generated"
    }
  }
}
```

### Propiedad de archivos

| `ownership` | Ejemplos | Al actualizar ATLAS |
|---|---|---|
| `managed` | skills y prompts del núcleo | Se reemplaza **solo si el hash coincide** con el manifiesto; si no, se escribe `<archivo>.new` y se reporta conflicto |
| `generated` | adaptador de host, wrappers `opsx-*` | Se regenera siempre |
| `owned` | `AGENTS.md`, `config.yaml`, specs, ADRs, `docs/` | **Nunca se sobrescribe**; solo se sugieren secciones nuevas |

### Algoritmo de actualización (v1)

```
1. Leer state.json (inputs) y manifest.json (base)
2. Obtener ATLAS en `template_source.commit`
3. Regenerar en un directorio temporal con los MISMOS inputs
4. Por archivo del manifiesto:
     owned     -> omitir
     generated -> sobrescribir
     managed   -> hash(actual) == hash(base) ? sobrescribir : escribir .new + conflicto
5. Reporte: actualizados / conflictos / omitidos
```

La actualización por hash **nunca destruye** trabajo del usuario: los archivos modificados se
reportan como conflicto en lugar de sobrescribirse.

## Reglas

1. **Nada se borra.** Lo que no aplica se desplaza a `adapters/` (recuperable con `git revert`).
2. **La raíz nace neutra.** No hay configuración de ninguna herramienta en la raíz hasta que el
   bootstrap la genera desde `hosts/`.
3. **Un commit por fase.** El ritual deja rastro explícito en el historial.
4. **Un pack nunca es requisito** para que ATLAS funcione.
