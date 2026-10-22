# TOOLS — herramientas, MCP e integraciones

> Todo lo de esta página es **opcional** salvo OpenSpec CLI. El template funciona sin MCP, sin memoria y
> sin Docker.

---

## Configuración por herramienta

| Capacidad | OpenCode | Claude Code | Codex |
|---|---|---|---|
| Instrucciones | `AGENTS.md` + `opencode.json` | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` |
| Skills | `.agents/skills/` (canónico) y `.opencode/skills/` (nativo, con prioridad) | `.claude/skills` (symlink) | `.agents/skills/` |
| Agentes | `.opencode/agent/` | `.claude/agents/` | *(sin subagentes)* |
| Comandos OpenSpec | `.opencode/commands/` | `.claude/commands/opsx/` | `.codex/prompts/` |
| MCP | `opencode.json` → `mcp` | Configuración de Claude | Configuración de Codex |
| Modelo | `model` / `small_model` | `model` | `model` |

Los adaptadores los genera el bootstrap. Los comandos, `openspec update --tools <host>`.

---

## Context7 (MCP de documentación)

**Para qué:** verificar APIs, versiones y sintaxis antes de proponer o usar una librería.

| Host | Configuración |
|---|---|
| OpenCode | Bloque `mcp.context7` en `opencode.json` (ya incluido en la plantilla de host) |
| Claude Code | Añadir el servidor MCP remoto `https://mcp.context7.com/mcp` |
| Codex | Añadir el servidor MCP en su configuración |

**Regla del proyecto:** no se propone ni se usa una librería sin verificarla con Context7; si no se puede,
se justifica en `design.md`.

⚠️ **Confidencialidad:** las consultas salen a un servicio externo. Nunca incluir código propietario,
secretos ni datos personales.

---

## Memoria persistente

| Opción | Cuándo |
|---|---|
| **Engram** | Recomendado si no sabes qué elegir: memoria local + sincronización por git |
| Otra | Mem0, Letta o la memoria nativa del host |
| Ninguna | El flujo funciona igual; el resumen va al chat y al PR |

- `.engram/` **no se versiona** por defecto.
- Si se sincroniza entre máquinas, decidir antes qué se comparte.
- La memoria puede contener contexto sensible: no guardar secretos.

---

## gitleaks (secretos)

Es un **git hook**, no un hook de agente: funciona en las tres herramientas.

```bash
brew install gitleaks
git config core.hooksPath .githooks
```

`.githooks/pre-commit` bloquea el commit si detecta secretos. Si gitleaks no está instalado, el hook se
omite y lo indica.

---

## Graphify (grafo de conocimiento)

Opcional y específico de OpenCode. Indexa el código y permite consultas de arquitectura.

- No es requisito para el flujo.
- Se configura como plugin del host.
- Los artefactos generados no se editan a mano.

---

## MCP de base de datos

Útil para inspeccionar datos durante QA o análisis.

- Usar credenciales de **solo lectura**.
- Apuntar a **datos de desarrollo**, nunca a producción.
- No versionar la cadena de conexión: va en `.env` (ignorado) o en la configuración local del host.

---

## Confidencialidad

Antes de conectar cualquier herramienta externa, revisa [`SECURITY.md`](../../../SECURITY.md):

- Qué datos salen del repositorio.
- Qué se persiste.
- Qué queda bajo tu responsabilidad.

---

## Problemas frecuentes

| Síntoma | Solución |
|---|---|
| Context7 no responde | Verificar red y la URL del MCP; el flujo puede continuar sin él |
| La memoria no persiste | Revisar la configuración del host y que `.engram/` exista |
| gitleaks no se ejecuta | `git config core.hooksPath .githooks` |
| Codex no invoca una skill | Usar `$nombre` o `/skills`; no hay subagentes |
| Los comandos `opsx-*` no aparecen | `openspec update --tools <host>` |
