# QUICKSTART — proyecto nuevo

> Para proyectos que empiezan de cero. Si ya tienes código, usa [`ADOPTION.md`](ADOPTION.md).

---

## Requisitos

- **Git**
- **Node.js 20+** y **OpenSpec CLI** (`npm i -g @fission-ai/openspec`)
- **Shell POSIX** (`sh`, `grep`, `diff`). En **Windows**: Git Bash o WSL
- Una herramienta: **OpenCode**, **Claude Code** o **Codex**
- Opcional: Docker, Context7 (MCP), Engram (memoria)

---

## 1. Copia el template

```bash
npx degit <usuario>/<repo> mi-proyecto
cd mi-proyecto
rm -rf .git && git init
```

Si clonaste en vez de usar `degit`, elimina el historial del template y empieza uno nuevo.

---

## 2. Abre la herramienta y pide el ritual

Abre el proyecto y escribe:

> **“Configura este proyecto”**

El agente lee `AGENTS.md`, ve que `.template/state.json` está `pending` y ejecuta `.template/BOOTSTRAP.md`.

| Herramienta | Qué ocurre |
|---|---|
| **OpenCode** | Crea `opencode.json` desde `.template/hosts/opencode/` y genera los wrappers de comandos |
| **Claude Code** | Crea `.claude/agents/` y el symlink `.claude/skills`; `CLAUDE.md` ya apunta a `AGENTS.md` |
| **Codex** | Lee `AGENTS.md` y `.agents/skills/` de forma nativa; no hay subagentes |

---

## 3. Responde el cuestionario

El ritual pregunta, por rondas:

| Ronda | Qué |
|---|---|
| Idioma | Documentación (`language.user`) e idioma de skills/prompts |
| Identidad | Nombre, descripción, stack, estructura, package base |
| Comandos y calidad | Build, run, test, lint, cobertura, mutación, CRAP, entorno de QA |
| Arquitectura y límites | Postura declarada, dominio, reglas de no tocar |
| Preferencias | Memoria persistente, comandos OpenSpec (`user`/`agent`/`ask`), orquestación |

Si no sabes un comando, responde `TBD`: el agente lo anota en `AGENTS.md` § Pendientes. **Nunca se inventa uno.**

---

## 4. Revisa lo generado

El ritual termina con un gate. Comprueba:

```bash
openspec doctor                              # OpenSpec root: ok
openspec schema which spec-driven-with-adr   # Source: project
openspec context                             # sin warnings
ls .agents/skills/*/SKILL.md                 # ≥1 skill
```

Y revisa el diff de la rama de bootstrap: `AGENTS.md`, `openspec/config.yaml`, el adaptador del host y
`docs/` deben reflejar tus respuestas.

---

## 5. Primer cambio

1. **Explore** — describe la idea; el `analyst` pregunta y clarifica.
2. **Propose** — se generan `proposal`, `specs`, `design`, `adr` y `tasks`, uno a uno con tu aprobación.
3. **Implement** — el `engineer` aplica TDD por tarea.
4. **QA** — el `qa-analyst` diseña escenarios y ejecuta contra el entorno.
5. **Review** — el `reviewer` revisa arquitectura, seguridad y calidad.
6. **Cierre** — documentación, PR y revisión humana una sola vez.
7. **Merge** — tú mergeas; después `archive` y limpieza.

El `analyst` te pregunta al inicio si orquesta el ciclo o prefieres invocar cada fase.

---

## Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `openspec: command not found` | CLI no instalada | `npm i -g @fission-ai/openspec` |
| `Schema not found` | Falta `openspec/schemas/` | Restaura el schema vendorizado |
| Las skills no aparecen | Ruta incorrecta o falta reiniciar | Verifica `.agents/skills/*/SKILL.md` y reinicia la herramienta |
| `AGENTS.md` cambió tras `openspec init` | El CLI lo reescribió | Restaura el backup y fusiona a mano |
| El gate no pasa | Comandos o secciones en `TBD` | Complétalos en `AGENTS.md` |

---

## Siguiente

- Proyecto existente → [`ADOPTION.md`](ADOPTION.md)
- Herramientas y MCP → [`TOOLS.md`](TOOLS.md)
- Calidad y CRAP → [`QUALITY.md`](QUALITY.md)
- Compatibilidad por herramienta → [`COMPATIBILITY.md`](COMPATIBILITY.md)
