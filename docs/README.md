# Template — OpenSpec + Agentes

> Plantilla **autocontenida** para proyectos con OpenSpec y agentes especializados.
> Agnóstica de dominio, de arquitectura y de herramienta anfitriona (OpenCode, Claude Code, Codex).
>
> **Idioma:** Español · [English](harness/en/QUICKSTART.md)

---

## Empieza aquí

| Si… | Ve a |
|---|---|
| Empiezas un proyecto **nuevo** | [`harness/es/QUICKSTART.md`](harness/es/QUICKSTART.md) |
| Ya tienes un proyecto | [`harness/es/ADOPTION.md`](harness/es/ADOPTION.md) |
| Quieres configurar MCP o memoria | [`harness/es/TOOLS.md`](harness/es/TOOLS.md) |
| Te interesan los gates y CRAP | [`harness/es/QUALITY.md`](harness/es/QUALITY.md) |

Para arrancar, abre el proyecto con tu herramienta y di:

> **“Configura este proyecto”**

El agente lee [`../AGENTS.md`](../AGENTS.md), ve que `.template/state.json` está `pending` y ejecuta
[`../.template/BOOTSTRAP.md`](../.template/BOOTSTRAP.md).

---

## Capas de documentación

| Capa | Dónde | Para quién |
|---|---|---|
| **Arnés interno** | [`.template/docs/es/`](../.template/docs/es/README.md) | Quien mantiene o extiende el template |
| **Uso** | [`harness/es/`](harness/es/QUICKSTART.md) | Quien adopta el template en su proyecto |
| **Proyecto** | `docs/architecture/`, `docs/api/`, `docs/functional/`, `docs/guides/` | El equipo del proyecto |

---

## Qué incluye

| Componente | Detalle |
|---|---|
| **OpenSpec** | Schema `spec-driven-with-adr` vendorizado (`proposal → specs → design → adr → tasks`) |
| **Agentes** | `analyst`, `engineer`, `reviewer`, `qa-analyst`, `doc-writer` en `.template/agents/` |
| **Skills** | 16 skills portables en `.agents/skills/` |
| **Ritual** | [`../.template/BOOTSTRAP.md`](../.template/BOOTSTRAP.md): detecta la herramienta, interroga y genera el contexto |
| **Compatibilidad** | [`harness/es/COMPATIBILITY.md`](harness/es/COMPATIBILITY.md): matriz por host |
| **Estado** | [`.template/`](../.template/README.md): hosts, perfiles, packs, manifiesto y estado |

---

## Estructura

```
.
├── AGENTS.md            # contrato del proyecto
├── CLAUDE.md            # stub para Claude Code
├── .agents/
│   └── skills/          # 16 skills portables
├── .template/
│   ├── BOOTSTRAP.md     # ritual de primera sesión
│   ├── PROJECT-README.md # plantilla del README del proyecto
│   ├── agents/          # 5 prompts canónicos
│   ├── docs/en|es/      # documentación del arnés (contribuidor)
│   ├── hosts/ profiles/ packs/
│   └── state.json manifest.json
├── docs/
│   ├── README.md        # este índice
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
- Opcional: Docker, MCP (`Context7`), memoria persistente (`Engram`)

---

## Seguridad, confidencialidad y licencia

- El repositorio **no incluye credenciales ni datos de negocio**.
- Las integraciones opcionales pueden sacar datos del repo: la configuración y el cumplimiento son
  responsabilidad del usuario.
- Software entregado **“AS IS”**, sin garantía. Ver [`../SECURITY.md`](../SECURITY.md) y
  [`../LICENSE`](../LICENSE).
