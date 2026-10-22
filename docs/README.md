# ATLAS — OpenSpec + Agentes

> **ATLAS** (*Agnostic Template for LLM Agent Systems*) es una plantilla para **desarrollo de software
> impulsado por IA con SDD (Spec-Driven Development)**: el agente trabaja sobre especificaciones,
> decisiones y gates, no sobre improvisación.
>
> Te ahorra montar desde cero el contrato del proyecto, el esquema de OpenSpec, los roles de agente,
> las skills, los perfiles de stack y el ritual de arranque: usas la plantilla, respondes un
> cuestionario y empiezas a construir.
>
> Es **agnóstica** de dominio, arquitectura y herramienta anfitriona (OpenCode, Claude Code, Codex), y
> **eficiente por diseño**: contexto acotado, procedimientos bajo demanda y validaciones automáticas
> antes de cada merge.
>
> **En la práctica:**
> - **SDD**: primero `proposal → specs → design → ADR → tasks`; después código.
> - **Roles con gates**: analyst → engineer → QA → reviewer → doc-writer.
> - **Multi-stack y multi-host**: un perfil por stack; el mismo arnés en tres herramientas.
>
> **Idioma:** Español · [English](harness/en/QUICKSTART.md)
>
> **Nombre:** ATLAS es el producto. “Template/plantilla” se mantiene como sustantivo común para el
> andamio y para las claves `template_version` / `template_source` y el flag `--template`.

---

## Flujo de ATLAS

```text
Humano + analyst — explore → propose (proposal, design, specs, ADR, tasks)
        ↓
engineer — implementación (uno por stack si es multi-stack)
        ↓
qa-analyst — QA funcional (entorno Docker + QA Context)
        ↓
reviewer — revisión de código (máx. 3 iteraciones con hallazgos críticos)
        ↓
analyst — cierre de ciclo y consistencia diseño → código
        ↓
doc-writer — documentación técnica y funcional
        ↓
analyst — consistencia documental
        ↓
PR — el humano revisa, hace merge y archiva la spec
```

Las correcciones de QA y reviewer vuelven a `engineer` (tope global: **5 iteraciones** entre ambos).
Cada cambio es **1 PR revisable** (≤ 800–1200 líneas, 1–2 specs) y el humano aprueba cada artefacto.

**Roles de soporte (opcionales, fuera del ciclo de entrega):**

| Rol | Para qué sirve |
|---|---|
| `mentor` (opcional) | Enseñar, de forma agnóstica, los conceptos y patrones que use el proyecto (DDD, arquitectura, diseño) según su contexto y stack; explicar el código y generar material didáctico |
| `business-strategist` (opcional) | Modelo de negocio, propuesta de valor, segmentos, pricing y canales (`docs/business/`) |

> No forman parte del ciclo de entrega: se añaden como agentes o packs propios del proyecto.
> El bootstrap los pregunta **uno por uno** (Ronda 4) y solo instala los aceptados en
> `state.optional_agents`.

---

## Empieza aquí

### 1. Crea el proyecto desde ATLAS

- **GitHub:** usa **Use this template** (recomendado).
- **Manual:** descarga o clona este repositorio y coloca su contenido en la **raíz del proyecto**
  (donde vivirá `AGENTS.md`).

### 2. Arranca el ritual

Abre el proyecto con tu herramienta y di:

> **“Configura este proyecto”**

El agente lee [`../AGENTS.md`](../AGENTS.md), ve que `.atlas/state.json` está `pending` y ejecuta
[`../.atlas/BOOTSTRAP.md`](../.atlas/BOOTSTRAP.md).

> El `README.md` del proyecto se genera desde `.atlas/PROJECT-README.md`; este `docs/README.md` es la portada de ATLAS (no hay README raíz por decisión).

### 3. Elige tu guía

| Si… | Ve a |
|---|---|
| Empiezas un proyecto **nuevo** | [`docs/harness/es/QUICKSTART.md`](harness/es/QUICKSTART.md) |
| Ya tienes un proyecto | [`docs/harness/es/ADOPTION.md`](harness/es/ADOPTION.md) |
| Quieres actualizar el arnés | [`docs/harness/es/UPDATE.md`](harness/es/UPDATE.md) |
| Quieres configurar MCP o memoria | [`docs/harness/es/TOOLS.md`](harness/es/TOOLS.md) |
| Te interesan los gates y CRAP | [`docs/harness/es/QUALITY.md`](harness/es/QUALITY.md) |
| No entiendes un término | [`docs/harness/es/GLOSSARY.md`](harness/es/GLOSSARY.md) |
| Extender el arnés (skills/agentes/packs) | [`.atlas/docs/es/extending.md`](../.atlas/docs/es/extending.md) · [`.atlas/packs/README.md`](../.atlas/packs/README.md) |

---

## Capas de documentación

| Capa | Dónde | Para quién |
|---|---|---|
| **Arnés interno** | [`.atlas/docs/es/`](../.atlas/docs/es/README.md) | Quien mantiene o extiende ATLAS |
| **Uso** | [`docs/harness/es/`](harness/es/QUICKSTART.md) | Quien adopta ATLAS en su proyecto |
| **Proyecto** | `docs/architecture/`, `docs/api/`, `docs/functional/`, `docs/guides/` | El equipo del proyecto |
| **Contexto del proyecto** | `docs/project-context.md` | El equipo del proyecto |

---

## Qué incluye

| Componente | Detalle |
|---|---|
| **OpenSpec** | Schema `spec-driven-with-adr` vendorizado (`proposal → specs → design → adr → tasks`) |
| **Agentes** | `analyst`, `engineer` (single-stack; multi-stack genera `engineer-<stack>`), `reviewer`, `qa-analyst`, `doc-writer` en `.atlas/agents/`; opcionales: `mentor` y `business-strategist` (los activa el bootstrap) |
| **Skills** | 17 skills core portables en `.agents/skills/` + packs opcionales en `.atlas/packs/` |
| **Ritual** | [`../.atlas/BOOTSTRAP.md`](../.atlas/BOOTSTRAP.md): detecta la herramienta, interroga y genera el contexto |
| **Compatibilidad** | [`harness/es/COMPATIBILITY.md`](harness/es/COMPATIBILITY.md): matriz por host |
| **Estado** | [`.atlas/`](../.atlas/README.md): hosts, perfiles, packs, `state.stacks`, manifiesto y estado |
| **Contexto del proyecto** | [`docs/project-context.md`](project-context.md): capa propia que complementa `AGENTS.md` |

---

## Estructura

```
.
├── AGENTS.md            # contrato del proyecto
├── CLAUDE.md            # stub para Claude Code
├── .agents/
│   └── skills/          # 17 skills core portables
├── .atlas/
│   ├── BOOTSTRAP.md     # ritual de primera sesión
│   ├── PLACEHOLDERS.md  # contrato de placeholders (perfil/proyecto, N/A)
│   ├── PROJECT-README.md # plantilla del README del proyecto
│   ├── agents/          # 5 prompts core + 2 opcionales (+ engineer-<stack> generado)
│   ├── docs/en|es/      # documentación del arnés (contribuidor)
│   ├── hosts/ profiles/ packs/
│   ├── scripts/         # sha256 + validadores + adoptar-agents + combinar-readme + generar-manifiesto + inventariar + medir
│   └── state.json (stacks, packs, optional_agents) manifest.json
├── docs/
│   ├── README.md        # este índice (portada de ATLAS)
│   ├── project-context.md # contexto propio del proyecto
│   ├── harness/es|en/   # guías de uso + COMPATIBILITY
│   ├── architecture/ api/ functional/ guides/   # documentación del proyecto
├── openspec/            # config, specs, changes, schemas
├── adr/
├── .githooks/           # hooks de git (gitleaks)
├── SECURITY.md          # confidencialidad y responsabilidad
└── LICENSE              # MIT
```

---

## Requisitos

- **Git**
- **Node.js** + **OpenSpec CLI** (`npm i -g @fission-ai/openspec`)
- **Shell POSIX** (`sh`, `grep`, `diff`). En **Windows**: Git Bash o WSL (no `cmd.exe`)
- Opcional: Docker, MCP (`Context7`), memoria persistente (`Engram`)

---

## Seguridad, confidencialidad y licencia

- El repositorio **no incluye credenciales ni datos de negocio**.
- Las integraciones opcionales pueden sacar datos del repo: la configuración y el cumplimiento son
  responsabilidad del usuario.
- Software entregado **“AS IS”**, sin garantía. Ver [`../SECURITY.md`](../SECURITY.md) y
  [`../LICENSE`](../LICENSE).
