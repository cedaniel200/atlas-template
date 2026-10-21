# `.template/` — estado y material del ritual

Este directorio es el **único** lugar del repo que sabe que el proyecto todavía no está configurado.
Lo consume `BOOTSTRAP.md` en la primera sesión.

## Contrato

| Ruta | Versionado | Propósito |
|---|---|---|
| `state.json` | ✅ sí | Estado del ritual (`pending` → `configured`) y decisiones detectadas |
| `hosts/<host>/` | ✅ sí | **Plantillas** de adaptador por herramienta |
| `packs/<pack>/` | ✅ sí | Skills/agentes opcionales, fuera de los directorios de descubrimiento |
| `adapters/<host>/` | ❌ no (gitignored) | Artefactos desplazados por `prune` (estado local) |
| `backups/<timestamp>/` | ❌ no (gitignored) | Copia previa a una fusión en modo brownfield |

## `state.json`

| Campo | Valores | Significado |
|---|---|---|
| `bootstrap_version` | entero | Versión del ritual con la que se configuró |
| `status` | `pending` \| `configured` | Si es `configured`, el ritual no se repite |
| `mode` | `greenfield` \| `brownfield` \| `null` | Cómo se adoptó el template |
| `host` | `opencode` \| `claude` \| `codex` \| `null` | Herramienta anfitriona detectada |
| `host_source` | `env` \| `user` \| `files` \| `null` | Cómo se determinó el host |
| `language.user` | `es` \| `en` \| otro \| `null` | Idioma de la documentación de cara al usuario |
| `language.agent` | `en` (por defecto) | Idioma de skills y prompts de agente |
| `packs` | lista | Packs activados |
| `phase` | `0`–`3` | Última fase completada |
| `displaced` | lista | Rutas movidas a `adapters/` |
| `override_reason` | string \| `null` | Motivo si el usuario saltó el gate de validación |
| `configured_at` | ISO-8601 \| `null` | Fecha de configuración |

## Reglas

1. **Nada se borra.** Lo que no aplica se desplaza a `adapters/` (recuperable con `git revert`).
2. **La raíz nace neutra.** No hay configuración de ninguna herramienta en la raíz hasta que el
   bootstrap la genera desde `hosts/`.
3. **Un commit por fase.** El ritual deja rastro explícito en el historial.
