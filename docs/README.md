# Template — OpenSpec + Agentes

> Plantilla **autocontenida** para proyectos con OpenSpec y agentes especializados.
> Agnóstica de dominio, de arquitectura y de herramienta anfitriona (OpenCode, Claude Code, Codex).
>
> **Idioma:** Español · [English](harness/en/QUICKSTART.md)

---

## Flujo del template

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
| `mentor` | Enseñar DDD y arquitectura, explicar el código y generar material didáctico |
| `business-strategist` | Modelo de negocio, propuesta de valor, segmentos, pricing y canales (`docs/business/`) |

> No forman parte del ciclo de entrega: se añaden como agentes o packs propios del proyecto.

---

## Empieza aquí

### 1. Crea el proyecto desde el template

- **GitHub:** usa **Use this template** (recomendado).
- **Manual:** descarga o clona este repositorio y coloca su contenido en la **raíz del proyecto**
  (donde vivirá `AGENTS.md`).

### 2. Arranca el ritual

Abre el proyecto con tu herramienta y di:

> **“Configura este proyecto”**

El agente lee [`../AGENTS.md`](../AGENTS.md), ve que `.template/state.json` está `pending` y ejecuta
[`../.template/BOOTSTRAP.md`](../.template/BOOTSTRAP.md).

> El `README.md` del proyecto se genera desde `.template/PROJECT-README.md`; este `docs/README.md` es la portada del template (no hay README raíz por decisión).

### 3. Elige tu guía

| Si… | Ve a |
|---|---|
| Empiezas un proyecto **nuevo** | [`docs/harness/es/QUICKSTART.md`](harness/es/QUICKSTART.md) |
| Ya tienes un proyecto | [`docs/harness/es/ADOPTION.md`](harness/es/ADOPTION.md) |
| Quieres actualizar el arnés | [`docs/harness/es/UPDATE.md`](harness/es/UPDATE.md) |
| Quieres configurar MCP o memoria | [`docs/harness/es/TOOLS.md`](harness/es/TOOLS.md) |
| Te interesan los gates y CRAP | [`docs/harness/es/QUALITY.md`](harness/es/QUALITY.md) |
| No entiendes un término | [`docs/harness/es/GLOSSARY.md`](harness/es/GLOSSARY.md) |
| Extender el arnés (skills/agentes/packs) | [`.template/docs/es/extending.md`](../.template/docs/es/extending.md) · [`.template/packs/README.md`](../.template/packs/README.md) |

---

## Capas de documentación

| Capa | Dónde | Para quién |
|---|---|---|
| **Arnés interno** | [`.template/docs/es/`](../.template/docs/es/README.md) | Quien mantiene o extiende el template |
| **Uso** | [`docs/harness/es/`](harness/es/QUICKSTART.md) | Quien adopta el template en su proyecto |
| **Proyecto** | `docs/architecture/`, `docs/api/`, `docs/functional/`, `docs/guides/` | El equipo del proyecto |
| **Contexto del proyecto** | `docs/project-context.md` | El equipo del proyecto |

---

## Qué incluye

| Componente | Detalle |
|---|---|
| **OpenSpec** | Schema `spec-driven-with-adr` vendorizado (`proposal → specs → design → adr → tasks`) |
| **Agentes** | `analyst`, `engineer` (single-stack; multi-stack genera `engineer-<stack>`), `reviewer`, `qa-analyst`, `doc-writer` en `.template/agents/` |
| **Skills** | 17 skills core portables en `.agents/skills/` + packs opcionales en `.template/packs/` |
| **Ritual** | [`../.template/BOOTSTRAP.md`](../.template/BOOTSTRAP.md): detecta la herramienta, interroga y genera el contexto |
| **Compatibilidad** | [`harness/es/COMPATIBILITY.md`](harness/es/COMPATIBILITY.md): matriz por host |
| **Estado** | [`.template/`](../.template/README.md): hosts, perfiles, packs, `state.stacks`, manifiesto y estado |
| **Contexto del proyecto** | [`docs/project-context.md`](project-context.md): capa propia que complementa `AGENTS.md` |

---

## Estructura

```
.
├── AGENTS.md            # contrato del proyecto
├── CLAUDE.md            # stub para Claude Code
├── .agents/
│   └── skills/          # 17 skills core portables
├── .template/
│   ├── BOOTSTRAP.md     # ritual de primera sesión
│   ├── PLACEHOLDERS.md  # contrato de placeholders (perfil/proyecto, N/A)
│   ├── PROJECT-README.md # plantilla del README del proyecto
│   ├── agents/          # 5 prompts canónicos (+ engineer-<stack> generado)
│   ├── docs/en|es/      # documentación del arnés (contribuidor)
│   ├── hosts/ profiles/ packs/
│   ├── scripts/         # sha256 + validadores + adoptar-agents + combinar-readme + generar-manifiesto + inventariar + medir
│   └── state.json (stacks, packs) manifest.json
├── docs/
│   ├── README.md        # este índice (portada del template)
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
