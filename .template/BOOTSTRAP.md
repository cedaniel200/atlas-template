# BOOTSTRAP.md — Ritual de primera sesión

> **Se ejecuta una vez por proyecto, antes de escribir código.**
> Estado: `.template/state.json` (`pending` → `configured`).
> Si `status` es `configured`, **no repetir**; ofrecer reconfiguración explícita.
>
> Este archivo lo ejecuta el agente. El humano responde las preguntas y aprueba cada fase.

---

## Reglas del ritual

1. **No escribir código de negocio** en ninguna fase.
2. **No borrar nada.** Lo que no aplique se mueve a `.template/adapters/<host>/`.
3. **Idempotente**: cada fase se puede repetir sin duplicar efectos.
4. **Un commit por fase**, con el prefijo indicado.
5. **Si una fase falla, no se avanza** a la siguiente.
6. **No inventar comandos, rutas ni versiones.** Lo desconocido se marca `TBD` y se lista en
   `AGENTS.md` § Pendientes.

---

# Fase −2 — Aislamiento (antes de tocar nada)

El bootstrap escribe archivos: **nunca se ejecuta sobre una rama con trabajo sin commitear**.

1. `git status --porcelain` debe estar vacío. Si no, detenerse y pedir commit o stash.
2. Detectar la rama por defecto:

   ```bash
   BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD | sed 's#^origin/##')
   ```

3. Elegir la rama:

   | Situación | Rama |
   |---|---|
   | Greenfield sin historial de producto | La rama por defecto (o `chore/bootstrap` si el repo ya existe) |
   | Brownfield | `chore/bootstrap` (o un worktree `.worktrees/bootstrap`) |
   | Repo compartido o duda | `chore/bootstrap` siempre |

4. Crear la rama si aplica:

   ```bash
   git checkout -b chore/bootstrap
   ```

5. Un commit por fase. **Sin push ni PR** salvo petición explícita del usuario.
6. Al terminar: indicar la rama usada y pedir revisión; **el merge lo hace el usuario**.

> **Excepción declarada:** el bootstrap es la única tarea que no sigue la regla “un worktree por cambio”.
> Usa su propia rama de configuración para no contaminar el trabajo del proyecto.

---

# Fase −1 — Modo de adopción

## −1.1 Detectar

| Señal | Modo |
|---|---|
| Hay código, build, tests, CI o historial de git con commits de producto | **Brownfield** (proyecto existente) |
| Repo vacío o solo con el template | **Greenfield** (desde cero) |

Confirma con el usuario antes de seguir.

## −1.2 Inventario (solo lectura, brownfield)

Inspecciona y registra en `docs/template-adoption.md` (guía: `docs/harness/<lang>/ADOPTION.md`):

| Se detecta | Acción |
|---|---|
| Build/tooling (`pom.xml`, `build.gradle`, `package.json`, `pyproject.toml`, `go.mod`…) | Pre-rellenar perfil y comandos |
| Tests, lint, CI, Docker | Pre-rellenar el menú de calidad y QA |
| `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, reglas de agentes | **Fusionar con diff**, nunca sobrescribir |
| `openspec/` existente | Fusionar `context:` y `rules:`; no reemplazar specs |
| `.opencode/agent/`, `.claude/agents/`, `.agents/skills/` propios | Preservar; adaptar solo lo que colisione |
| `.env`, secretos, credenciales | Detectar y **no** copiar valores |

## −1.3 Política de conflicto

```text
backup en .template/backups/<timestamp>/ → diff → fusión → confirmación del usuario
```

Nunca se sobrescribe un archivo del proyecto sin diff y aprobación. Greenfield y brownfield convergen en
la Fase 1, con las respuestas pre-rellenadas en brownfield.

**Commit:** `chore(bootstrap): detectar modo <greenfield|brownfield>`

---

# Fase 0 — Herramienta anfitriona (obligatoria)

## 0.1 Detección

```bash
env | grep -E '^(OPENCODE|CODEX_[A-Z_]+|CLAUDECODE|CLAUDE_CODE)=' || echo "SIN_SEÑAL"
```

| Señal | Herramienta |
|---|---|
| `OPENCODE` | **OpenCode** |
| `CODEX_CI`, `CODEX_THREAD_ID` o `CODEX_SANDBOX` | **Codex** |
| `CLAUDECODE` o `CLAUDE_CODE` | **Claude Code** |
| sin señal | **Preguntar** |

Evidencia secundaria (solo desempate): `opencode.json` → OpenCode; `.claude/` → Claude Code; `.codex/` →
Codex. Si la señal de entorno y la evidencia de archivos discrepan, **pregunta**.

## 0.2 Adaptación

**Por defecto es aditiva**: no se mueve nada; solo se crea el adaptador que falta.

| Acción | OpenCode | Claude Code | Codex |
|---|---|---|---|
| `opencode.json` | crear desde `.template/hosts/opencode/` | ignorar | ignorar |
| `.template/agents/` | fuente canónica | fuente canónica | fuente canónica |
| Adaptador de agentes | `.opencode/agent/<rol>.md` | `.claude/agents/<rol>.md` | *(no hay subagentes)* |
| Skills | `.agents/skills/` (nativo) | `.claude/skills` → symlink a `.agents/skills` | `.agents/skills/` (nativo) |
| `CLAUDE.md` | conservar | debe contener solo `@AGENTS.md` | conservar |

**`prune` (opt-in, nunca por defecto):** si el usuario lo pide, mueve los artefactos de hosts no activos
a `.template/adapters/<host>/` y regístralo en `state.json.displaced`. Se recupera con `git revert`.

## 0.3 Skills

| Host | Acción | Verificación |
|---|---|---|
| OpenCode / Codex | ninguna | `ls .agents/skills/*/SKILL.md` |
| Claude Code | `ln -s ../.agents/skills .claude/skills` | `readlink .claude/skills` |
| Claude Code sin symlink (Windows) | copiar y avisar de que es estática | `diff -r .agents/skills .claude/skills` |

## 0.4 Comandos

No se escriben a mano: los genera OpenSpec.

```bash
cp AGENTS.md /tmp/agents.bootstrap.bak
openspec update --tools <opencode|claude|codex>   # o openspec init --tools <host> si falta openspec/
diff /tmp/agents.bootstrap.bak AGENTS.md && echo "AGENTS.md intacto" || echo "⚠️ revisar y fusionar"
```

Salida esperada: `.opencode/commands/opsx-*` · `.claude/commands/opsx/*` · `.codex/prompts/*`.
Si `openspec init` reescribe `AGENTS.md`, restáuralo desde el backup y fusiona solo lo nuevo.

**Commit:** `chore(bootstrap): adaptar el entorno a <host>`

---

# Fase 1 — Interrogatorio

Conduce el interrogatorio en **3 rondas como máximo**, agrupando preguntas.

## Ronda 0 — Idioma

| Pregunta | Valores | Dónde se guarda |
|---|---|---|
| Idioma del usuario (documentación, AGENTS.md, mensajes) | `es`, `en`, otro | `language.user` |
| Idioma de skills y prompts de agente | `en` (default) o el del usuario | `language.agent` |

## Ronda 1 — Identidad y stack

1. Nombre y descripción en una frase.
2. Stack y versiones (lenguaje, framework, gestor de dependencias, runtime).
3. Estructura de primer nivel (¿monorepo? ¿módulos?).
4. Package base / namespace.
5. Perfil de stack: `java-gradle`, `node-ts`, u otro (se crea uno nuevo si no existe).

## Ronda 2 — Comandos y calidad

| Categoría | Pregunta / sugerencia |
|---|---|
| Build / run / test | Comandos reales; si no se conocen, `TBD` |
| Lint y análisis estático | Checkstyle/ESLint/ruff/… |
| Cobertura | JaCoCo/c8/pytest-cov/… |
| Mutación | PIT/Stryker/mutmut/… |
| **CRAP** | Umbral por método; default **6** (ver `docs/harness/<lang>/QUALITY.md`) |
| Secretos | gitleaks (tool‑agnóstico) |
| Entorno de QA | Docker sí/no, servicio, puerto, health, métricas |

## Ronda 3 — Arquitectura, dominio y límites

1. **Arquitectura**: `layered`, `hexagonal`, `ddd`, `custom`, o “la que ya tenga el proyecto”. Se declara en
   `AGENTS.md` § Arquitectura; no se impone ninguna.
2. **Dominio**: 2–3 módulos/contextos iniciales y 5–10 términos del lenguaje del negocio.
3. **Reglas de No Tocar**: archivos, carpetas, APIs, migraciones que el agente nunca debe modificar.
4. **Convención Git**: ramas, PR, merge.
5. **Documentación**: carpetas por defecto en inglés (`docs/functional`, `docs/architecture`, `docs/api`,
   `docs/guides`); el usuario puede renombrarlas.
6. **Memoria persistente**: Engram, otra, o ninguna. Si no sabe, **sugerir Engram**; `.engram/` no se
   versiona por defecto.
7. **Comandos OpenSpec**: `user` (siempre el humano), `agent` (siempre el agente) o `ask` (preguntar en
   cada sesión). Default: `ask`.
8. **Orquestación**: orquestada (default) o manual.
9. **Contribución**: ¿solo vas a usar el arnés o también a contribuir? Si solo lo usas, `.template/docs/`
   se puede retirar (se mueve a `.template/archive/` y se quita del índice).

> Si el usuario responde “lo que sea”, elige el default de su stack **y dilo** para que lo corrija.
> Las respuestas se escriben directamente en `AGENTS.md`; no se inventan comandos.

---

# Fase 2 — Generación

| Artefacto | Qué rellenar |
|---|---|
| `AGENTS.md` | Resumen, arquitectura, comandos, estructura, no tocar, preferencias, placeholders |
| `openspec/config.yaml` | Bloque `context:` y `rules:` (reglas de diseño según la arquitectura elegida) |
| `.template/PROJECT-README.md` → `README.md` del proyecto | Nombre, descripción, quick start, C4, variables de entorno |
| `.env.example` | Variables detectadas, sin valores reales |
| `.gitignore` / `.gitattributes` / `.editorconfig` | Stack, secretos, estado local, EOL, indentación |
| `docs/` | Renombrar carpetas si el usuario eligió otros nombres y actualizar `AGENTS.md` |
| `CLAUDE.md` | Verificar el stub de una línea: `@AGENTS.md` |
| Adaptadores | Agentes y comandos del host detectado |
| `.template/manifest.json` | `origin`, `sha256` y `ownership` por archivo generado |
| `.template/docs/` | Si no se contribuye, mover a `.template/archive/docs/` y quitar la sección del índice |

### Generación de adaptadores y manifiesto

- **Agentes**: por cada rol de `.template/agents/<rol>.md`:
  - OpenCode: `.opencode/agent/<rol>.md` con frontmatter `description` y `mode: all` + cuerpo canónico.
  - Claude Code: `.claude/agents/<rol>.md` con frontmatter `name` y `description` + cuerpo canónico.
- **Manifiesto**: calcula el `sha256` de cada archivo generado con el helper portable del template:
  `sh .template/scripts/sha256.sh <archivo>` (macOS, Linux, Git Bash, WSL) o
  `powershell -NoProfile -File .template/scripts/sha256.ps1 <archivo>` (Windows/PowerShell 5.1+).
  **Contrato: 64 hex en minúsculas, solo el hash, sin nombre de archivo.** No uses
  `certutil` ni `Get-FileHash` directamente: emiten mayúsculas y otro formato, y el
  manifiesto deja de ser comparable (falso drift al actualizar). Escribe
  `.template/manifest.json` con `origin`, `sha256` y `ownership`.
- **Shell**: el ritual usa comandos POSIX (`sh`, `grep`, `diff`, `mkdir`). En Windows ejecútalo
  desde **Git Bash o WSL** (recomendado). Si el host ejecuta PowerShell, al menos el hash debe
  salir del helper `.ps1`; si no hay shell POSIX ni PowerShell, **detente** y pídelo al usuario —
  no inventes el hash con otra herramienta.
- **Placeholders**: el perfil y las respuestas son la fuente de valores; sustituye en `AGENTS.md`,
  `openspec/config.yaml` y `README.md`. No dejes `{{...}}`.

Reglas:

- Sustituye **todos** los `{{...}}` de los archivos anteriores. Al terminar:
  `grep -r "{{" AGENTS.md openspec/config.yaml README.md` debe devolver **vacío**.
- **Idioma**: `AGENTS.md`, el `README.md` del proyecto (generado desde `.template/PROJECT-README.md`) y
  `docs/README.md` se escriben en `language.user`. Si el usuario eligió un idioma distinto del template
  (español), tradúcelos. Las guías del template (`docs/README.md`, `.template/BOOTSTRAP.md`,
  `docs/harness/<lang>/COMPATIBILITY.md`) pueden quedarse en español salvo que el usuario pida traducirlas.
- `ownership`: `owned` (AGENTS.md, config.yaml, docs, adr, specs), `managed` (skills, prompts, schemas),
  `generated` (adaptadores, comandos, CLAUDE.md).
- Si el usuario dio términos de dominio, sustituye los ejemplos `<entity>` de las skills.
- Los `TBD` van a `AGENTS.md` § Pendientes con el motivo.
- **No crear `openspec/project.md`**: el contexto vive en `openspec/config.yaml`.

**Commit:** `docs(bootstrap): completar el contexto del proyecto`

---

# Fase 3 — Validación (gate bloqueante)

No se permite avanzar a `propose` hasta que **todo** esté en verde.

- [ ] `AGENTS.md` tiene `## Comandos` con ≥1 comando real
- [ ] `AGENTS.md` tiene `## Estructura` y `## Reglas de No Tocar`
- [ ] `AGENTS.md` tiene `## Preferencias` con `language`, comandos OpenSpec y orquestación
- [ ] `AGENTS.md` tiene `## Arquitectura`
- [ ] No quedan `{{...}}` en `AGENTS.md`, `openspec/config.yaml` y `README.md`
- [ ] `openspec doctor` → root ok
- [ ] `openspec schema which spec-driven-with-adr` → `Source: project`
- [ ] `openspec context` → sin warnings
- [ ] `ls .agents/skills/*/SKILL.md` → ≥1 skill
- [ ] Adaptador del host activo presente (agentes y comandos)
- [ ] Sin contaminación de plantilla: `grep -rniE "example-domain|template-domain" .` → sin resultados
- [ ] `.template/manifest.json` generado
- [ ] `git status` limpio y las fases commiteadas

Si algo falla: corrige y repite. Si el usuario insiste en saltar el gate:

```json
{ "status": "configured", "override_reason": "<motivo textual del usuario>" }
```

…y avisa: *"El flujo OpenSpec queda en riesgo: proposal/specs se generarán sin contexto de proyecto."*

Al cerrar:

```json
{ "status": "configured", "phase": 3, "configured_at": "<ISO-8601>" }
```

**Commit:** `chore(bootstrap): validar el contexto del proyecto`

Anuncia: **"Bootstrap completo. Ya puedes proponer un cambio."**

---

## Re‑ejecución y cambio de herramienta

| Situación | Acción |
|---|---|
| `status == configured` | No repetir. Reconfigurar solo con petición explícita |
| Cambio de herramienta | Fase 0 con el nuevo host; restaurar adaptadores desde `.template/adapters/` o `git revert` |
| Repo clonado de nuevo | `.template/state.json` viaja en git → el ritual se salta solo |

## Lo que este ritual NO hace

- No instala dependencias del stack.
- No configura MCP (es por herramienta; ver `docs/harness/<lang>/COMPATIBILITY.md`).
- No crea specs, ADRs ni código de negocio.
- No decide la arquitectura: la recoge y la declara.
