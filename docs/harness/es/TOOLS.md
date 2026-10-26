# TOOLS — herramientas, MCP e integraciones

> Todo lo de esta página es **opcional** salvo OpenSpec CLI. El template funciona sin MCP, sin memoria y
> sin Docker.

---

## Configuración por herramienta

| Capacidad | OpenCode | Claude Code | Codex | Cursor |
|---|---|---|---|---|
| Instrucciones | `AGENTS.md` + `opencode.json` | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` | `AGENTS.md` (nativo) |
| Skills | `.agents/skills/` (canónico) y `.opencode/skills/` (nativo, con prioridad) | `.claude/skills` (symlink) | `.agents/skills/` | `.agents/skills/` (nativo) |
| Agentes | `.opencode/agent/` (+ opcionales si se activan) | `.claude/agents/` (+ opcionales si se activan) | *(sin subagentes)* | `.cursor/agents/` (+ opcionales si se activan) |
| Comandos OpenSpec | `.opencode/commands/` | `.claude/commands/opsx/` | `.codex/prompts/` | `.cursor/commands/opsx-*` |
| MCP | `opencode.json` → `mcp` | Configuración de Claude | Configuración de Codex | `.cursor/mcp.json` → `mcpServers` |
| Modelo | `model` / `small_model` | `model` | `model` | `model: inherit` en cada subagente |

Los adaptadores los genera el bootstrap. Los comandos, `openspec init --tools <host>`
(`openspec update` regenera instrucciones pero no admite `--tools`).

### Particularidades de Cursor

- **Instrucciones:** `AGENTS.md` es la única fuente. El template no crea `.cursor/rules/*.mdc`.
- **Skills:** Cursor descubre `.agents/skills/` de forma nativa; no hay copia ni enlace en
  `.cursor/skills/`. Se invocan como `/nombre` o `@nombre`.
- **Subagentes:** `.cursor/agents/<rol>.md` con `name`, `description` y `model: inherit`. El template
  nunca escribe `readonly`: bloquea la edición de archivos y el `reviewer` debe escribir su informe.
- **Comandos:** `openspec init --tools cursor` escribe `.cursor/commands/opsx-*`. Cursor 2.4+ puede
  migrar comandos a skills; los comandos generados siguen funcionando mientras tanto.
- **MCP:** `.cursor/mcp.json` se crea desde `.atlas/hosts/cursor/mcp.json` **solo si falta** y se anuncia.
  Después pertenece al proyecto y nunca se sobrescribe.
- **Permisos:** `.cursor/permissions.json` y `.cursor/cli.json` son una **opción del usuario**. Aplican a
  todo el proyecto y no distinguen roles, así que el template no los crea ni los versiona.

---

## Context7 (MCP de documentación)

**Para qué:** verificar APIs, versiones y sintaxis antes de proponer o usar una librería.

| Host | Configuración |
|---|---|
| OpenCode | Bloque `mcp.context7` en `opencode.json` (ya incluido en la plantilla de host) |
| Claude Code | Añadir el servidor MCP remoto `https://mcp.context7.com/mcp` |
| Codex | Añadir el servidor MCP en su configuración |
| Cursor | `mcpServers.context7` en `.cursor/mcp.json` (el bootstrap lo crea solo si falta) |

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

Es un **git hook**, no un hook de agente: funciona en las cuatro herramientas.

```bash
brew install gitleaks
git config core.hooksPath .githooks
```

`.githooks/pre-commit` es un despachador. `20-gitleaks.sh` escanea los cambios en stage y bloquea el
commit si detecta secretos; si gitleaks no está instalado, avisa y no bloquea. El guard de la rama base
se ejecuta igual. Detalle: [`HOOKS.md`](HOOKS.md).

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
| Cursor no muestra un subagente | Verificar `.cursor/agents/<rol>.md` y reiniciar Cursor |
| Cursor no puede escribir el informe del reviewer | No añadir `readonly: true` al adaptador: bloquea toda edición |
| Los comandos `opsx-*` no aparecen | `openspec init --tools <host>` (o `openspec update` para regenerarlos) |
