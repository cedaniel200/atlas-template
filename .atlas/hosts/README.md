# Plantillas de adaptador por herramienta

El repositorio nace **neutro**: no incluye la configuración de ninguna herramienta en la raíz.
El bootstrap (Fase 0) detecta el host y **copia desde aquí** lo necesario.

| Host | Plantilla | Genera en la raíz |
|---|---|---|
| OpenCode | `opencode/opencode.json` | `opencode.json` |
| Claude Code | *(sin plantilla: verifica el stub `CLAUDE.md`)* | `.claude/agents/`, `.claude/skills` (symlink); `CLAUDE.md` ya existe |
| Codex | *(no requiere plantilla)* | Nada: lee `AGENTS.md` y `.agents/skills/` de forma nativa |

## Reglas

- **Nunca hardcodear modelos**: el host usa su configuración global o el bootstrap pregunta.
- **Nunca versionar** credenciales, URLs de base de datos ni API keys.
- Los comandos `opsx-*` **no** se escriben aquí: los genera `openspec update --tools <host>`.
- Un adaptador se valida abriendo el proyecto con esa herramienta y comprobando que las skills
  se descubren y que `AGENTS.md` se carga.
