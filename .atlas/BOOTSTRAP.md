# BOOTSTRAP.md — Ritual de primera sesión de ATLAS

> **Se ejecuta una vez por proyecto, antes de escribir código.**
> Estado: `.atlas/state.json` (`pending` → `configured`).
> Si `status` es `configured`, **no repetir**; ofrecer reconfiguración explícita.
>
> Este archivo lo ejecuta el agente. El humano responde las preguntas y aprueba cada fase.

---

## Reglas del ritual

1. **No escribir código de negocio** en ninguna fase.
2. **No borrar nada.** Lo que no aplique se mueve a `.atlas/adapters/<host>/`.
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
   BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
   [ -n "$BASE" ] || BASE=$(git branch --show-current)
   ```

   Si el repo no tiene remoto, `BASE` cae a la rama actual.

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

Inspecciona y registra el inventario en `.atlas/adoption-report.md` (guía: `docs/harness/<lang>/ADOPTION.md`):

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
backup en .atlas/backups/<timestamp>/ → diff → fusión → confirmación del usuario
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
| `opencode.json` | crear desde `.atlas/hosts/opencode/` | ignorar | ignorar |
| `.atlas/agents/` | fuente canónica | fuente canónica | fuente canónica |
| Adaptador de agentes | `.opencode/agent/<rol>.md` | `.claude/agents/<rol>.md` | *(no hay subagentes)* |
| Skills | `.agents/skills/` (canónico) + `.opencode/skills/` (nativo, con prioridad) | `.claude/skills` → symlink a `.agents/skills` | `.agents/skills/` (nativo) |
| `CLAUDE.md` | conservar | debe contener solo `@AGENTS.md` | conservar |

**`prune` (opt-in, nunca por defecto):** si el usuario lo pide, mueve los artefactos de hosts no activos
a `.atlas/adapters/<host>/` y regístralo en `state.json.displaced`. Se recupera con `git revert`.

## 0.3 Skills

| Host | Acción | Verificación |
|---|---|---|
| OpenCode / Codex | ninguna | `ls .agents/skills/*/SKILL.md` |
| Claude Code | `ln -s ../.agents/skills .claude/skills` | `readlink .claude/skills` |
| Claude Code sin symlink (Windows) | copiar y avisar de que es estática | `diff -r .agents/skills .claude/skills` |

**Packs**: no se copian por defecto. Copia solo `.atlas/packs/<id>/skills` y
`.atlas/packs/<id>/agents` de los packs activos en `state.stacks[].packs`; el resto no consume
contexto. `state.packs` es la unión de los packs de todos los stacks. Registra las skills del pack en
`AGENTS.md` § Skill Registry y su `{name, version}` en `state.packs`.

## 0.4 Comandos

No se escriben a mano: los genera OpenSpec.

```bash
cp AGENTS.md /tmp/agents.bootstrap.bak
openspec init --tools <opencode|claude|codex>
diff /tmp/agents.bootstrap.bak AGENTS.md && echo "AGENTS.md intacto" || echo "⚠️ revisar y fusionar"

# .opencode/skills/ es la ruta nativa de OpenCode y tiene prioridad sobre
# .agents/skills/. No borres el directorio: puede alojar skills propias del equipo.
ls .agents/skills | sort > /tmp/skills-agents.txt
ls .opencode/skills 2>/dev/null | sort > /tmp/skills-opencode.txt
comm -12 /tmp/skills-agents.txt /tmp/skills-opencode.txt  # IDs duplicados, si hay
```

Salida esperada: `.opencode/commands/opsx-*` · `.claude/commands/opsx/*` · `.codex/prompts/*`.
`openspec update` no acepta `--tools`: úsalo solo para actualizar instrucciones ya generadas.
Si `openspec init` reescribe `AGENTS.md`, restáuralo desde el backup y fusiona solo lo nuevo.

**Si hay IDs duplicados, decides tú.** La copia de `.opencode/skills/` gana sobre `.agents/skills/`.
Dos salidas válidas:

| Opción | Ventaja | Coste |
|---|---|---|
| Conservar `.opencode/skills/` | Espacio nativo del host; el equipo puede dejar ahí sus skills | Las skills canónicas del template quedan sombreadas y no reciben sus mejoras |
| Eliminar solo los IDs duplicados (o el directorio completo) | Gana el canónico; mismo comportamiento en OpenCode, Claude y Codex | Hay que repetirlo tras cada `openspec init`; borrar el directorio se lleva también las skills del equipo |

Borra solo los IDs que liste `comm` si quieres conservar las skills propias. No hay opción
"correcta": el proyecto asume el tradeoff.

**Commit:** `chore(bootstrap): adaptar el entorno a <host>`

---

# Fase 1 — Interrogatorio

Conduce el interrogatorio en **5 rondas (0–4)**, agrupando preguntas.

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
5. Perfil de stack: **no hay catálogo**. Parte de `.atlas/profiles/_templates/profile.yaml`, propón
   comandos reales y crea `.atlas/profiles/<id>.yaml` con `crear-perfil.mjs`. El usuario valida,
   corrige o elimina. Si un ejemplo de `_examples/` encaja, úsalo como referencia, no lo copies.
6. **Stacks** (multi-stack): si el proyecto mezcla tecnologías (p. ej. Python back + JS front + mobile),
   pide una fila por stack: `id`, `profile`, `paths`, comandos y `packs`. El **primero** es el default
   (rellena § Comandos); los demás van a § Stacks. La tabla de § Stacks incluye los comandos
   (`Install`, `Build`, `Run`, `Test`, `Lint`, `Quality`) para que el contrato sea autocontenido.
   Un solo stack = una fila.

## Ronda 2 — Comandos y calidad

| Categoría | Pregunta / sugerencia |
|---|---|
| Build / run / test | Comandos reales; si no se conocen, `TBD` |
| Lint y análisis estático | Checkstyle/ESLint/ruff/… |
| Cobertura | JaCoCo/c8/pytest-cov/… |
| Mutación | PIT/Stryker/mutmut/… |
| **CRAP** | Umbral por método; default **6** (ver `docs/harness/<lang>/QUALITY.md`) |
| Secretos | gitleaks (tool‑agnóstico) |
| Entorno de QA | Docker sí/no, servicio, puerto, health, métricas (sin health o puerto → `N/A`) |

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
9. **Contribución**: ¿solo vas a usar el arnés o también a contribuir? Si solo lo usas:
   `mkdir -p .atlas/archive && mv .atlas/docs .atlas/archive/docs`; en `docs/README.md`
   elimina la fila "Arnés interno"; en `AGENTS.md § Extending` elimina el bullet "Skills y agentes"
   (apunta a `.atlas/docs/`) y cualquier enlace a `.atlas/docs/`.
10. **README**: si el proyecto ya tiene `README.md`, ¿añadir las secciones que falten de
    `.atlas/PROJECT-README.md`? (solo añade; nunca sobrescribe).

## Ronda 4 — Agentes opcionales

Pregunta **uno por uno**, en este orden. En cada pregunta di explícitamente: **(opcional)**, **qué hace**,
**que no forma parte del ciclo de desarrollo** y que **queda disponible para invocarlo cuando se necesite**.
No los presentes como recomendados ni los actives por defecto.

| Rol | Qué hace |
|---|---|
| `mentor` | Enseña, de forma agnóstica, los conceptos y patrones que use el proyecto (DDD, arquitectura, diseño) según su contexto y stack; explica el código y genera material didáctico |
| `business-strategist` | Modelo de negocio, propuesta de valor, segmentos, pricing y canales (`docs/business/`) |

| Respuesta | Acción |
|---|---|
| Sí | Añade el id a `state.optional_agents` |
| No | No lo añadas (default: `[]`) |

- **Codex**: no tiene subagentes. Explica que el rol no se puede instalar y omítelo; no lo añadas al estado.
- Si el usuario duda: puede activarlo después añadiendo el id a `state.optional_agents` y regenerando
  adaptadores.

> Si el usuario responde “lo que sea”, elige el default de su stack **y dilo** para que lo corrija.
> Las respuestas se escriben directamente en `AGENTS.md`; no se inventan comandos.

---

# Fase 2 — Generación

| Artefacto | Qué rellenar |
|---|---|
| `AGENTS.md` | Resumen, arquitectura, comandos, **Stacks**, estructura, no tocar, preferencias, placeholders |
| `openspec/config.yaml` | Bloque `context:` y `rules:` (reglas de diseño según la arquitectura elegida) |
| `.atlas/PROJECT-README.md` → `README.md` del proyecto | Greenfield/sin README: generar. Brownfield con README: conservar y preguntar append |
| `docs/project-context.md` | Contexto propio del proyecto (brownfield: migrar el `AGENTS.md` existente) |
| `.env.example` / `.gitattributes` / `.editorconfig` | **Solo si no existen**: créalos con las convenciones del stack (variables detectadas, EOL, indentación). Si existen, consérvalos. No vienen del template. |
| `.gitignore` | Stack, secretos, estado local (si no existe, créalo) |
| `docs/` | Renombrar carpetas si el usuario eligió otros nombres y actualizar `AGENTS.md` |
| `CLAUDE.md` | Verificar el stub de una línea: `@AGENTS.md` |
| Adaptadores | Agentes y comandos del host detectado |
| `.atlas/docs/` | Si no se contribuye, mover a `.atlas/archive/docs/` y quitar la fila del índice |
| `.atlas/manifest.json` | `origin`, `sha256` y `ownership` por archivo generado |

### Generación de adaptadores y manifiesto

- **Agentes**: genera el adaptador del host con
  `node .atlas/scripts/renderizar-adaptadores.mjs --host <host>`. El script sustituye los
  placeholders desde `AGENTS.md` § Placeholders (OpenCode: `description` + `mode: all`; Claude Code:
  `name` + `description`; Codex: sin subagentes). **No copies el cuerpo a mano.**
  - **Stacks**: cada stack se renderiza como `engineer-<id>` (también con uno solo). Sin stacks se
    genera `engineer.md` de arranque y se elimina al aparecer el primero. Los demás roles son agnósticos.
  - **Agentes opcionales**: solo se renderizan los ids de `state.optional_agents` (Ronda 4). Los prompts
    marcados con `<!-- optional-role -->` que no estén activados se omiten.
- **README (brownfield)**: si `README.md` existe, **no lo sobrescribas**. Pregunta:
  "¿Añadir las secciones que falten de `.atlas/PROJECT-README.md`?". Dry-run:
  `node .atlas/scripts/combinar-readme.mjs --proyecto .`; si acepta, `--apply`. Registra
  `state.readme` (`generated|preserved|appended`).
- **AGENTS.md (brownfield)**: `node .atlas/scripts/adoptar-agents.mjs --template <pristine> --apply`
  (backup + base del template + contenido propio a `docs/project-context.md`); después rellena los
  placeholders de la base en esta Fase 2. No es un merge de iguales.
- **Manifiesto**: `node .atlas/scripts/generar-manifiesto.mjs --host <host>`. Aplica las reglas de
  ownership y origen (owned: AGENTS/config/README/docs/adr/specs; managed: skills/prompts/schemas/packs;
  generated: adaptadores/commands/opencode.json/CLAUDE.md), calcula `sha256` y escribe
  `.atlas/manifest.json`. **Contrato: 64 hex en minúsculas, sin nombre de archivo** (lo aplica el script).
  **Ejecútalo al final de la Fase 2**, después de placeholders, docs y contribución; si cambias un archivo después, vuelve a ejecutarlo.
- **Shell**: el ritual usa comandos POSIX (`sh`, `grep`, `diff`, `mkdir`). En Windows ejecútalo
  desde **Git Bash o WSL** (recomendado). Si el host ejecuta PowerShell, al menos el hash debe
  salir del helper `.ps1`; si no hay shell POSIX ni PowerShell, **detente** y pídelo al usuario —
  no inventes el hash con otra herramienta.
- **Placeholders**: el perfil y las respuestas son la fuente de valores; sustituye en `AGENTS.md`,
  `openspec/config.yaml` y `README.md`. No dejes `{{...}}`.

Reglas:

- Sustituye **todos** los `{{...}}` de los archivos anteriores. Al terminar:
  `grep -r "{{" AGENTS.md openspec/config.yaml README.md` debe devolver **vacío**.
- **Idioma**: `AGENTS.md`, el `README.md` del proyecto (generado desde `.atlas/PROJECT-README.md`) y
  `docs/README.md` se escriben en `language.user`. Si el usuario eligió un idioma distinto del template
  (español), tradúcelos. Las guías del template (`docs/README.md`, `.atlas/BOOTSTRAP.md`,
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
- [ ] Contrato de placeholders consistente: `node .atlas/scripts/validar-contrato.mjs`
- [ ] Perfiles válidos: `node .atlas/scripts/validar-perfiles.mjs`
- [ ] Manifiesto consistente: `node .atlas/scripts/validar-manifiesto.mjs`
- [ ] Adaptadores sin placeholders: `grep -rn "{{" .opencode/agent .claude/agents` → vacío (si existen)
- [ ] Hooks de git activos: `git config core.hooksPath .githooks` (si falta gitleaks, el hook avisa y no bloquea)
- [ ] Sin health/puerto: si `qa.health_path` o `qa.app_port` están vacíos, `HEALTH_URL` es `N/A` (no se compone una URL con path vacío)
- [ ] `openspec doctor` → root ok
- [ ] `openspec schema which spec-driven-with-adr` → `Source: project`
- [ ] `openspec context` → sin warnings
- [ ] `ls .agents/skills/*/SKILL.md` → ≥1 skill
- [ ] Adaptador del host activo presente (agentes y comandos)
- [ ] Agentes opcionales: solo los elegidos en `state.optional_agents` tienen adaptador
- [ ] Stacks: cada uno tiene `engineer-<stack>.md` y no queda `engineer.md`.
- [ ] Sin contaminación de plantilla: `grep -rniE "example-domain|template-domain" --exclude-dir=.git --exclude-dir=.atlas --exclude-dir=node_modules .` → sin resultados
- [ ] `.atlas/manifest.json` generado
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

## Extender después del bootstrap

No hace falta repetir el ritual. Estas operaciones se hacen en caliente y se validan al final:

| Quiero… | Procedimiento |
|---|---|
| Añadir un stack o perfil | `crear-perfil.mjs` → completar comandos → `state.stacks` + `AGENTS.md § Stacks` → `renderizar-adaptadores.mjs` |
| Añadir un agente implementador | Es el mismo `engineer` con un stack nuevo: `state.stacks` + `engineer-<id>` |
| Añadir un pack | `crear-pack.mjs` → skills/agentes → activar en `state.stacks[].packs` y `state.packs` |
| Quitar un stack o pack | Quitar de `state.stacks`/`state.packs` → `renderizar-adaptadores.mjs` (limpia adaptadores) → regenerar manifiesto |

Guía detallada: `.atlas/docs/es/extending.md`. Validación: `validar-contrato.mjs`, `validar-perfiles.mjs`,
`renderizar-adaptadores.mjs` y `medir-contexto.mjs`.

---

## Re‑ejecución y cambio de herramienta

| Situación | Acción |
|---|---|
| `status == configured` | No repetir. Reconfigurar solo con petición explícita |
| Cambio de herramienta | Fase 0 con el nuevo host; restaurar adaptadores desde `.atlas/adapters/` o `git revert` |
| Repo clonado de nuevo | `.atlas/state.json` viaja en git → el ritual se salta solo |

## Lo que este ritual NO hace

- No instala dependencias del stack.
- No configura MCP (es por herramienta; ver `docs/harness/<lang>/COMPATIBILITY.md`).
- No crea specs, ADRs ni código de negocio.
- No decide la arquitectura: la recoge y la declara.
