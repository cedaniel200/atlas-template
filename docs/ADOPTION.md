# ADOPTION — proyecto existente

> Para repositorios con código e historial. El ritual **no reemplaza nada sin diff**.

---

## Antes de empezar

1. **Árbol limpio**: `git status --porcelain` debe estar vacío.
2. **Rama propia**: crea `chore/bootstrap` (o un worktree `.worktrees/bootstrap`). **No se ejecuta sobre `main`.**
3. **Backup**: el ritual copia a `.template/backups/<timestamp>/` antes de fusionar.

---

## 1. Copia el arnés sin sobrescribir

Copia del template solo lo que falte:

| Archivo | Si ya existe |
|---|---|
| `AGENTS.md` | **No sobrescribir**; fusionar por diff |
| `openspec/config.yaml` | Fusionar `context:` y `rules:` |
| `openspec/specs/`, `adr/` | Conservar los del proyecto |
| `.agents/skills/`, `agents/` | Conservar las propias; añadir las del template con prefijo o como pack |
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

El resultado se escribe en `docs/template-adoption.md`:

```markdown
# Adopción del arnés

## Detectado
## Reutilizado
## Fusionado
## En conflicto
## Pendiente
```

---

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

**Nunca** se sobrescriben specs, ADRs ni reglas de negocio existentes.

---

## 5. Valida y revisa

```bash
openspec doctor
openspec schema which spec-driven-with-adr
openspec context
git status
```

Revisa el diff completo de `chore/bootstrap`. El merge lo haces tú; el agente no hace push ni PR salvo
que se lo pidas.

---

## 6. Primer cambio

El arnés ya está configurado. A partir de aquí, el flujo es el de [`QUICKSTART.md`](QUICKSTART.md):
explore → propose → apply → QA → review → cierre.

---

## Rollback

| Qué | Cómo |
|---|---|
| Una fase completa | `git revert <commit>` |
| Un archivo fusionado | Restaurar desde `.template/backups/<timestamp>/` |
| Todo el bootstrap | `git revert` de los commits de `chore/bootstrap` |

---

## Qué no hacer

- No ejecutar el ritual sobre `main` ni sobre una rama compartida.
- No reemplazar specs o ADRs existentes.
- No copiar `.env` ni credenciales.
- No forzar `push` ni reescribir historia.
- No dejar el reporte de adopción como deuda: se revisa antes del merge.
