# COMPATIBILITY.md — OpenCode · Claude Code · Codex · Cursor

> Matriz de lo que funciona igual, lo que degrada y lo que **no** se intenta unificar.
> **Regla:** si no hay una solución simple y verificable, se documenta la limitación; no se fuerza.

---

## Matriz de capacidades

| Capacidad | OpenCode | Claude Code | Codex | Cursor | Estrategia del template |
|---|---|---|---|---|---|
| Instrucciones | `AGENTS.md` (+ `instructions` en `opencode.json`) | `CLAUDE.md` con `@AGENTS.md` | `AGENTS.md` nativo | `AGENTS.md` nativo | **`AGENTS.md` es la fuente única**; `CLAUDE.md` es un stub |
| Instrucciones anidadas | Sube del cwd al worktree | Lee `AGENTS.md` anidados al abrir un subdirectorio | Raíz; el comportamiento anidado no está garantizado | Raíz y subdirectorios | Núcleo **solo en la raíz**; anidar es opcional |
| Skills | `.agents/skills/` (+ `.opencode/`, `.claude/`) | `.claude/skills/` | `.agents/skills/` | `.agents/skills/` | Canónico `.agents/skills/`; Claude por symlink; Cursor sin copia propia |
| Invocación de skill | Automática; `/nombre` si `metadata.opencode/slash` | Automática | `$nombre` o `/skills` | `/nombre` o `@nombre` | El cuerpo no depende de sintaxis de comando |
| Comandos OpenSpec | `.opencode/commands/opsx-*` | `.claude/commands/opsx/*` | `.codex/prompts/*` | `.cursor/commands/opsx-*` | **Generados por `openspec init --tools <host>`**; `openspec update` los regenera |
| Subagentes | `.opencode/agent/*.md` | `.claude/agents/*.md` | **No existen** | `.cursor/agents/*.md` | Prompts canónicos en `.atlas/agents/`; adaptador por host; cada stack: `engineer-<stack>` |
| Roles en Codex | — | — | Un solo agente | — | Se emulan con `AGENTS.md` y el anuncio de rol |
| Hooks de agente | Plugins | Hooks nativos | No disponibles | — | **El flujo núcleo no depende de hooks** |
| Git hooks | `core.hooksPath` | `core.hooksPath` | `core.hooksPath` | `core.hooksPath` | **Tool‑agnósticos**: gitleaks funciona en los cuatro |
| MCP | `opencode.json` | Configuración de Claude | Configuración de Codex | `.cursor/mcp.json` | Se configura por herramienta; el archivo de Cursor solo se crea si falta; nunca se versionan credenciales |
| Modelos | `model` / `small_model` | `model` | `model` | `model: inherit` | **Nunca hardcodeados** en el template |
| Permisos / sandbox | `permission` del agente | Settings / modo | Sandbox | `permissions.json` del proyecto; sin permisos por rol | Se declaran en el adaptador del host cuando el host lo permite |
| Memoria persistente | Plugin + hook git | Hook git / MCP | Hook git / MCP | Hook git / MCP | **Pack opcional**, nunca requisito |
| Grafo de conocimiento | Plugin | No | No | No | **Pack opcional** |

---

## Generación de adaptadores

Los prompts de `.atlas/agents/<rol>.md` son la fuente canónica, **sin frontmatter de herramienta**.

| Host | Adaptador | Frontmatter mínimo |
|---|---|---|
| OpenCode | `.opencode/agent/<rol>.md` | `description`, `mode: all` |
| Claude Code | `.claude/agents/<rol>.md` | `name`, `description` |
| Cursor | `.cursor/agents/<rol>.md` | `name`, `description`, `model: inherit` |
| Codex | — | No hay subagentes |

Cada stack genera `engineer-<stack>.md` (OpenCode/Claude/Cursor) con su `STACK_CONTEXT`; Codex no tiene subagentes y usa `AGENTS.md § Stacks`.

El nombre y los directorios del adaptador salen de un único registro de hosts (`.atlas/scripts/lib/hosts.mjs`): añadir un host es añadir una entrada, no editar cinco scripts. Los adaptadores de Cursor nunca declaran `readonly` (ver C‑10).

Los comandos `opsx-*` **no** se mantienen a mano: `openspec init --tools <host>` los crea y `openspec update` los regenera.

---

## Degradaciones conocidas

| ID | Limitación | Impacto | Mitigación |
|---|---|---|---|
| C‑1 | Codex no tiene subagentes | No hay `engineer`/`qa-analyst` como agentes separados; los opcionales tampoco se pueden instalar | `AGENTS.md` define el protocolo de roles; el anuncio de rol sigue vigente |
| C‑2 | `disable-model-invocation` no está en la especificación Agent Skills | Algunos hosts pueden autoinvocar una skill que debería ser manual | Se documenta; si un pack la usa, se marca como dependiente del host |
| C‑3 | Symlinks en Windows requieren modo desarrollador | `.claude/skills` roto en Windows | Copia estática + re-ejecutar el bootstrap al añadir skills |
| C‑4 | `openspec init` puede reescribir `AGENTS.md` y escribir skills en `.opencode/skills` (ruta nativa de OpenCode, con prioridad sobre `.agents/skills`) | Pérdida del contrato / skills canónicas sombreadas por ID | Backup + `diff` + fusión manual. Si hay IDs duplicados, el proyecto elige: conservar la copia del CLI (sombreado) o eliminar solo esos IDs (canónico). Tradeoff asumido (`.atlas/BOOTSTRAP.md` § 0.4) |
| C‑5 | Los wrappers de comandos dependen de la versión de OpenSpec | Wrappers obsoletos tras un upgrade | Regenerar con `openspec update --tools <host>` |
| C‑6 | Claude Code y Codex cargan `AGENTS.md` anidados de forma distinta | Reglas de subdirectorio no uniformes | Núcleo solo en la raíz; anidar se documenta por proyecto |
| C‑7 | MCP no es portable | Cada host tiene su formato | `.env.example` generado por el bootstrap + bloque por host en `.atlas/hosts/` |
| C‑8 | Hooks de ciclo de vida del agente no existen en Codex | Automatizaciones que dependen de ellos no funcionan | Los hooks de agente son opcionales; el flujo vive en skills e instrucciones |
| C‑9 | Dos fuentes de instrucciones (`CLAUDE.md` y `AGENTS.md`) | Reglas contradictorias | `CLAUDE.md` contiene **solo** `@AGENTS.md`; nunca duplicar |
| C‑10 | Cursor no ofrece permisos de escritura por rol: `readonly: true` es todo-o-nada y bloquea edición de archivos y shell | El `reviewer` podría escribir código (su contrato de solo lectura no lo impone el host) y no podría emitir su informe obligatorio si se activa `readonly` | El adaptador **omite `readonly`** y el contrato de solo lectura sigue en el prompt, como en los demás hosts; `.cursor/permissions.json` es del usuario porque afecta a todos los roles |
| C‑11 | Cursor 2.4+ puede migrar los comandos de OpenSpec a skills | Los wrappers de comandos podrían sustituirse por skills en una release futura | Los `.cursor/commands/opsx-*` generados siguen funcionando; la migración se documenta y se revisa en la próxima release |
| C‑12 | `CURSOR_CLI` no está documentada oficialmente | La detección por entorno podría no reconocer Cursor | Evidencia `.cursor/` más pregunta explícita de confirmación cuando no hay señal o la evidencia contradice a la señal |

---

## Hooks: agente vs. git

| Tipo | Dónde vive | Portabilidad |
|---|---|---|
| **Hook de agente** (ciclo de vida de la sesión) | Plugin/hook de cada herramienta | Baja: solo OpenCode y Claude Code |
| **Hook de git** (`pre-commit`, `post-commit`) | `.githooks/` + `core.hooksPath` | **Alta: funciona en los cuatro** |

El núcleo no depende de hooks de agente. Si un proyecto usa gitleaks o Engram, lo hace vía git hooks,
que son independientes de la herramienta anfitriona.

---

## MCP

No se unifican. Cada host tiene su configuración:

| Host | Dónde se declara |
|---|---|
| OpenCode | `opencode.json` → `mcp` |
| Claude Code | Configuración de MCP de Claude |
| Codex | Configuración de MCP de Codex |
| Cursor | `.cursor/mcp.json` → `mcpServers` (solo se crea si falta; después es del proyecto) |

`Context7` es la integración recomendada para verificar documentación. **Caveat:** las consultas salen a
un servicio externo; nunca incluir código propietario, secretos ni datos personales.

---

## Shell y sistema operativo

El ritual usa comandos **POSIX** (`sh`, `grep`, `diff`, `mkdir`). En Windows se ejecuta desde
**Git Bash o WSL** (recomendado); no desde `cmd.exe`.

| Entorno | Shell | Helper de hash del manifiesto |
|---|---|---|
| macOS / Linux | POSIX (`sh`) | `.atlas/scripts/sha256.sh` |
| Windows + Git Bash / WSL | POSIX | `.atlas/scripts/sha256.sh` |
| Windows nativo | PowerShell 5.1+ | `.atlas/scripts/sha256.ps1` |

- **No** usar `certutil` ni `Get-FileHash` directamente: emiten **mayúsculas** y otro formato
  (`certutil` además con cabecera y pie) → el manifiesto queda incomparable y la actualización
  reporta **falso drift**.
- **EOL:** el hash se calcula sobre el archivo en disco. El `.gitattributes` generado fija
  `* text=auto eol=lf`, de modo que el hash es comparable entre sistemas.
- Si no hay shell POSIX ni PowerShell, el ritual debe **detenerse** y pedirlo al usuario.

---

## Fuentes verificadas

- **OpenCode** — *Agent Skills*: rutas `.opencode/`, `.claude/`, `.agents/`; frontmatter
  `name`/`description`/`license`/`compatibility`/`metadata`; claves `opencode/slash` y
  `opencode/autoinvoke`.
- **Claude Code** — import `@archivo` en `CLAUDE.md`; `.claude/skills` con hot‑reload y soporte de
  symlink; `.claude/agents/` para subagentes.
- **Codex** — descubrimiento de skills compartidas desde `.agents/skills`; mención con `$` o `/skills`;
  sin subagentes.
- **Cursor** — `AGENTS.md` y `.agents/skills/` nativos; subagentes en `.cursor/agents/*.md` con
  frontmatter `name`, `description`, `model` y `readonly`; MCP del proyecto en `.cursor/mcp.json`
  (`mcpServers` con `url` remota); comandos generados por OpenSpec en `.cursor/commands/`.
- **OpenSpec 1.5** — `openspec init --tools <lista>`; adaptadores de comandos por herramienta; schema
  `spec-driven-with-adr` resuelto desde `openspec/schemas/`.
