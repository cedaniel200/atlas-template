# Template — OpenSpec + Agentes

> Plantilla **autocontenida** para proyectos con OpenSpec y agentes especializados.
> Agnóstica de dominio, de arquitectura y de herramienta anfitriona (OpenCode, Claude Code, Codex).
>
> El template no trae un proyecto: trae el **arnés** y un ritual para configurarlo.

---

## Qué incluye

| Componente | Detalle |
|---|---|
| **OpenSpec** | Schema `spec-driven-with-adr` vendorizado (`proposal → specs → design → adr → tasks`) |
| **Agentes** | `analyst`, `engineer`, `reviewer`, `qa-analyst`, `doc-writer` en `agents/` |
| **Skills** | 14 skills portables en `.agents/skills/` |
| **Ritual** | `BOOTSTRAP.md`: detecta la herramienta, interroga y genera el contexto |
| **Compatibilidad** | `COMPATIBILITY.md`: matriz de capacidades y degradaciones por host |
| **Guías** | `docs/QUICKSTART.md`, `ADOPTION.md`, `TOOLS.md`, `QUALITY.md` |
| **Estado** | `.template/`: plantillas de host, perfiles, packs, manifiesto y estado |

---

## Requisitos

- **Git**
- **Node.js** + **OpenSpec CLI** (`npm i -g @fission-ai/openspec`)
- Opcional: Docker, MCP (`Context7`), memoria persistente (`Engram`)

---

## Inicio rápido

```bash
# 1. Copia el template
npx degit <usuario>/<repo> mi-proyecto
cd mi-proyecto
rm -rf .git && git init

# 2. Abre tu herramienta y pide el ritual
#    "Configura este proyecto" o "Haz el setup inicial"
#    (la frase exacta no importa: expresa la intención)
```

### Según la herramienta

**OpenCode**
1. Abre el proyecto.
2. El agente detecta `OPENCODE` y crea `opencode.json` desde `.template/hosts/opencode/`.
3. Pide: *"Configura este proyecto"*. El agente leerá `BOOTSTRAP.md` y empezará el ritual.

**Claude Code**
1. Abre el proyecto.
2. El bootstrap crea `.claude/agents/` y el symlink `.claude/skills`; `CLAUDE.md` ya contiene `@AGENTS.md`.
3. Pide: *"Configura este proyecto"*. El agente leerá `BOOTSTRAP.md` y empezará el ritual.

**Codex**
1. Abre el proyecto.
2. Codex lee `AGENTS.md` y `.agents/skills/` de forma nativa; no hay subagentes.
3. Pide: *"Configura este proyecto"*. El agente leerá `BOOTSTRAP.md` y empezará el ritual.

> En las tres herramientas, el ritual se ejecuta **una vez**. El estado queda en `.template/state.json`.

---

## Cómo funciona el ritual

| Fase | Qué hace |
|---|---|
| **−2. Aislamiento** | Árbol limpio y rama propia (`chore/bootstrap`); nunca sobre trabajo sin commitear |
| **−1. Modo** | Distingue proyecto nuevo (greenfield) de proyecto existente (brownfield) e inventaría el segundo |
| **0. Herramienta** | Detecta el host y genera su adaptador sin borrar nada |
| **1. Interrogatorio** | Idioma, stack, comandos, calidad, arquitectura, dominio, límites, memoria |
| **2. Generación** | Rellena `AGENTS.md`, `config.yaml`, README, lint/EOL y adaptadores; genera `.env.example` si el proyecto usa variables |
| **3. Validación** | Gate bloqueante: sin contrato completo no se propone ningún cambio |

Detalle completo en [`BOOTSTRAP.md`](BOOTSTRAP.md).

---

## Estructura

```
.
├── agents/              # 5 prompts canónicos + README
├── .agents/
│   └── skills/          # 14 skills portables
├── .template/           # hosts, profiles, packs, state.json, manifest.json
├── openspec/
│   ├── config.yaml      # Contexto y reglas del proyecto
│   ├── specs/           # Especificaciones (Gherkin)
│   ├── changes/         # Cambios activos y archive/
│   └── schemas/         # Schema spec-driven-with-adr vendorizado
├── adr/                 # Decisiones arquitectónicas
├── docs/
│   ├── QUICKSTART.md    # Proyecto nuevo, paso a paso
│   ├── ADOPTION.md      # Proyecto existente
│   ├── TOOLS.md         # MCP y herramientas opcionales
│   ├── QUALITY.md       # Gates, métricas y CRAP
│   ├── architecture/
│   ├── api/
│   ├── guides/
│   └── functional/      # Use Cases (contenido en el idioma del proyecto)
├── AGENTS.md            # Contrato del proyecto
├── BOOTSTRAP.md         # Ritual de primera sesión
├── COMPATIBILITY.md     # Matriz por herramienta
├── SECURITY.md          # Confidencialidad y responsabilidad
└── LICENSE              # MIT
```

---

## Herramientas sugeridas (opcionales)

| Herramienta | Para qué | Nota |
|---|---|---|
| **Context7** (MCP) | Verificar documentación de librerías | No enviar código propietario en las consultas |
| **Engram** | Memoria persistente entre sesiones | `.engram/` no se versiona por defecto |
| **gitleaks** | Bloquear secretos en commits | Git hook, funciona en las tres herramientas |
| **Graphify** | Grafo de conocimiento del código | Integración específica de OpenCode |

---

## Documentación

- [`BOOTSTRAP.md`](BOOTSTRAP.md) — ritual de primera sesión.
- [`COMPATIBILITY.md`](COMPATIBILITY.md) — qué funciona igual y qué degrada por herramienta.
- [`docs/QUICKSTART.md`](docs/QUICKSTART.md) — proyecto nuevo, paso a paso.
- [`docs/ADOPTION.md`](docs/ADOPTION.md) — proyecto existente, inventario y conflictos.
- [`docs/TOOLS.md`](docs/TOOLS.md) — MCP, memoria y herramientas opcionales.
- [`docs/QUALITY.md`](docs/QUALITY.md) — gates, métricas y CRAP.
- [`docs/`](docs/) — documentación del proyecto (arquitectura, API, guías, funcional).

---

## Seguridad, confidencialidad y licencia

- El repositorio **no incluye credenciales ni datos de negocio**.
- Las integraciones opcionales (Context7, memoria, MCP de base de datos) pueden sacar datos del repo:
  la configuración y el cumplimiento son responsabilidad del usuario.
- Software entregado **"AS IS"**, sin garantía. Ver [`SECURITY.md`](SECURITY.md) y [`LICENSE`](LICENSE).

---

## Contribuir

- Un cambio lógico = un commit (conventional commits).
- Los cambios de comportamiento pasan por OpenSpec: `proposal → specs → design → adr → tasks`.
- No se incluye planificación interna ni notas de release en la documentación del template.
