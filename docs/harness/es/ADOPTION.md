# ADOPTION — proyecto existente

> Para repositorios con código e historial. El ritual **no reemplaza nada sin diff**.

---

## Antes de empezar

1. **Árbol limpio**: `git status --porcelain` debe estar vacío.
2. **Rama propia**: crea `chore/bootstrap` (o un worktree `.worktrees/bootstrap`). **No se ejecuta sobre `main`.**
3. **Backup**: el ritual copia a `.atlas/backups/<timestamp>/` antes de fusionar.

---

## 1. Copia el arnés sin sobrescribir

Copia del template solo lo que falte:

| Archivo | Si ya existe |
|---|---|
| `AGENTS.md` | **Base del template**: backup, reemplazar por el `AGENTS.md` del template y migrar el contenido propio a `docs/project-context.md` |
| `docs/project-context.md` | Crear desde la base; migrar el contenido propio del `AGENTS.md` existente |
| `openspec/config.yaml` | Fusionar `context:` y `rules:` |
| `openspec/specs/`, `adr/` | Conservar los del proyecto |
| `.agents/skills/`, `.atlas/agents/` | Conservar las propias; añadir las del template con prefijo o como pack |
| `README.md` | **Conservar**; el bootstrap pregunta si añadir las secciones que falten de `.atlas/PROJECT-README.md` |
| `docs/README.md` | Fusionar: conservar el índice del proyecto y enlazar las secciones del arnés |
| Adaptadores (`.opencode/`, `.claude/`) | Preservar; adaptar solo lo que colisione |

---

## 2. Ejecuta el ritual

Abre el proyecto y pide:

> **“Configura este proyecto”**

El bootstrap detecta **brownfield** y hace inventario antes de tocar nada.

---

## 3. Inventario (solo lectura)

| Se detecta | Se registra |
|---|---|
| Build/tooling | Perfil y comandos reales |
| Tests, lint, cobertura, mutación | Menú de calidad |
| CI y despliegue | Entorno de QA |
| `AGENTS.md`, `CLAUDE.md`, `.cursorrules` | Reglas existentes a fusionar |
| `openspec/` | Specs, changes y configuración existentes |
| Agentes y skills propios | Qué se conserva y qué se adapta |
| `.env`, secretos | Solo nombres; **nunca valores** |

El resultado se escribe en `.atlas/adoption-report.md`:

```markdown
# Adopción del arnés

## Detectado
## Reutilizado
## Fusionado
## En conflicto
## Pendiente
```

---

## 3.1 Inventario automatizado (opcional)

```bash
node .atlas/scripts/inventariar-adopcion.mjs --template <ruta-template-pristino>
node .atlas/scripts/adoptar-agents.mjs --template <ruta-template-pristino> --apply
```

El segundo hace backup del `AGENTS.md` existente, copia la base del template y mueve el contenido
anterior a `docs/project-context.md`. Después el bootstrap rellena los placeholders de la base.

- `state.stacks` (multi-stack) y `state.packs` se conservan; el `README` se genera/conserva según la política.

Clasifica cada archivo del template en `nuevo` / `igual` / `distinto`, copia los `distinto` a
`.atlas/backups/adopcion-<timestamp>/` y escribe `.atlas/adoption-report.md` con la tabla.
El agente decide la política de conflicto; el script **no fusiona**.

## 4. Política de conflicto

```text
backup → diff → fusión → confirmación del usuario
```

| Situación | Acción |
|---|---|
| Archivo idéntico | Se conserva |
| Archivo del proyecto más completo | Se conserva el del proyecto; se anota en el reporte |
| Archivo del template más completo | Se propone el reemplazo con diff |
| Ambos con contenido | Fusión manual; nunca automática |
| `AGENTS.md` del proyecto | Se reemplaza por la **base del template** (backup); el contenido propio se migra a `docs/project-context.md` |
| `README.md` del proyecto | Se conserva; solo se añaden las secciones faltantes si el usuario lo acepta |

**Nunca** se sobrescriben specs, ADRs ni reglas de negocio existentes.

---

## 5. Valida y revisa

```bash
openspec doctor
openspec schema which spec-driven-with-adr
openspec context
git status
```

El `validar-contrato` comprueba además `state.stacks`, los adaptadores `engineer-<stack>` y que toda skill
instalada esté en `AGENTS.md § Skill Registry`.

Revisa el diff completo de `chore/bootstrap`. El merge lo haces tú; el agente no hace push ni PR salvo
que se lo pidas.

---

## 6. Lo que puedes pedir al agente

Con la adopción terminada, pídeselo con tus palabras. Si el agente deduce la acción de la intención,
**te pedirá confirmación antes de actuar**.

| Pídele… | Qué hace |
|---|---|
| “Añade un stack o perfil para X” | Crea el perfil, actualiza `state.stacks`/`AGENTS.md` y regenera el adaptador |
| “Añade un implementador para X” | Crea el stack y `engineer-<id>` |
| “Crea un pack para X” | Crea el esqueleto y lo activa |
| “Deja ATLAS mínimo” | Archiva lo no usado con `minimizar.mjs` |
| “Actualiza ATLAS” | Ejecuta `update-harness` |
| “Mide el contexto” | Ejecuta `medir-contexto.mjs` |

Detalle: [`.atlas/docs/es/extending.md`](../../../.atlas/docs/es/extending.md).

---

## 7. Primer cambio

El arnés ya está configurado. A partir de aquí, el flujo es el de [`QUICKSTART.md`](QUICKSTART.md):
explore → propose → apply → QA → review → cierre.

---

## Rollback

| Qué | Cómo |
|---|---|
| Una fase completa | `git revert <commit>` |
| Un archivo fusionado | Restaurar desde `.atlas/backups/<timestamp>/` |
| Todo el bootstrap | `git revert` de los commits de `chore/bootstrap` |

---

## Qué no hacer

- No ejecutar el ritual sobre `main` ni sobre una rama compartida.
- No reemplazar specs o ADRs existentes.
- No copiar `.env` ni credenciales.
- No forzar `push` ni reescribir historia.
- No dejar el reporte de adopción como deuda: se revisa antes del merge.
