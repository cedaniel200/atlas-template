# AGENTS.md — Contrato del proyecto

> **Punto de entrada para cualquier agente.**
> **Primera sesión:** si `.template/state.json` no existe o su `status` es `pending`, lee y ejecuta
> `BOOTSTRAP.md` **antes de cualquier otra acción**.
> Si el usuario dice **"configura este proyecto"**, **"haz el setup inicial"** o cualquier equivalente,
> esto es lo que debe ejecutar.
>
> La fuente de verdad del comportamiento son `openspec/specs/` y `adr/`.

---

## Índice

| Sección | Contenido |
|---|---|
| [Resumen](#resumen) | Proyecto, stack, idioma |
| [Arquitectura](#arquitectura) | Postura y fronteras declaradas |
| [Comandos](#comandos) | Build, test, calidad, entorno |
| [Estructura](#estructura) | Dónde vive cada cosa |
| [Reglas de No Tocar](#reglas-de-no-tocar) | Lo que ningún agente modifica |
| [Preferencias](#preferencias) | Comandos OpenSpec, orquestación, calidad |
| [Roles](#roles) | Agentes disponibles |
| [Workflow](#workflow) | Pipeline y gates |
| [Reglas de oro](#reglas-de-oro) | Normas transversales |
| [Skill Registry](#skill-registry) | Skills con ruta y trigger |
| [Placeholders](#placeholders) | Valores que leen los prompts |
| [Mapa de documentos](#mapa-de-documentos) | Dónde encontrar cada cosa |
| [Pendientes](#pendientes) | `TBD` del bootstrap |

---

## Resumen

- **Proyecto:** {{PROJECT_NAME}}
- **Descripción:** {{ONE_LINE_DESCRIPTION}}
- **Stack:** {{STACK_SUMMARY}}
- **Dominio:** {{DOMAIN_SUMMARY}}
- **Package base:** {{PACKAGE_BASE}}
- **Idioma de documentación:** {{LANGUAGE_USER}}
- **Idioma de skills y prompts:** {{LANGUAGE_AGENT}}

---

## Arquitectura

{{ARCHITECTURE_SUMMARY}}

**Fronteras y dirección de dependencias:** {{ARCHITECTURE_NOTES}}

- Ningún agente impone una arquitectura distinta a la declarada aquí.
- Las decisiones durables se registran en `adr/` y son inmutables una vez aceptadas.
- Si una implementación contradice un ADR vigente, el agente se detiene y consulta.

---

## Comandos

| Propósito | Comando |
|---|---|
| Instalar dependencias | `{{INSTALL_COMMAND}}` |
| Build | `{{BUILD_COMMAND}}` |
| Ejecutar en local | `{{RUN_APP_COMMAND}}` |
| Tests | `{{TEST_COMMAND}}` |
| Lint (producción) | `{{LINT_MAIN_COMMAND}}` |
| Lint (tests) | `{{LINT_TEST_COMMAND}}` |
| Análisis estático | `{{STATIC_ANALYSIS_COMMAND}}` |
| Gate de calidad | `{{QUALITY_COMMAND}}` |
| Cobertura | `{{COVERAGE_COMMAND}}` |
| Mutación | `{{MUTATION_COMMAND}}` |
| CRAP | `{{CRAP_COMMAND}}` |

**Entorno de QA:** {{QA_ENVIRONMENT}}

---

## Estructura

```
{{PROJECT_STRUCTURE}}
```

Cada cambio vive en `openspec/changes/<cambio>/` y se trabaja en su rama o worktree.

---

## Reglas de No Tocar

{{DO_NOT_TOUCH}}

Además:

- No se modifican `openspec/specs/` ni `adr/` desde la implementación.
- No se commitean secretos, credenciales ni datos reales.
- No se añaden dependencias externas sin justificación en `design.md` o en un ADR aprobado.

---

## Preferencias

| Preferencia | Valor | Valores posibles |
|---|---|---|
| Comandos OpenSpec | `{{OPENSPEC_COMMANDS_POLICY}}` | `user` (siempre el humano), `agent` (siempre el agente, mutación con confirmación), `ask` (preguntar al inicio de cada sesión) |
| Orquestación | `{{ORCHESTRATION_POLICY}}` | `orchestrated` (default) o `manual` |
| Umbral CRAP | `{{CRAP_THRESHOLD}}` | entero por método (default `6`) |
| Memoria persistente | `{{MEMORY}}` | `engram`, otra, o `none` |
| Documentación | `docs/functional`, `docs/architecture`, `docs/api`, `docs/guides` | nombres de carpeta en inglés; contenido en `language.user` |

**Invariante:** `archive` y `sync` siempre requieren aprobación explícita, sea cual sea la preferencia.

---

## Roles

| Rol | Prompt canónico | Función |
|---|---|---|
| `analyst` | `agents/analyst.md` | Análisis y planificación |
| `engineer` | `agents/engineer.md` | Implementación con TDD |
| `reviewer` | `agents/reviewer.md` | Revisión de código (solo lectura) |
| `qa-analyst` | `agents/qa-analyst.md` | Pruebas funcionales |
| `doc-writer` | `agents/doc-writer.md` | Documentación técnica y funcional |

Los adaptadores por herramienta los genera el bootstrap desde `agents/`. Codex no tiene subagentes: los
roles se emulan con este archivo y el anuncio de rol.

---

## Workflow

```text
explore → propose → apply → QA → review → cierre
         (proposal → specs → design → adr → tasks)
```

> **Excepción — bootstrap:** la configuración inicial (`BOOTSTRAP.md`) corre en su propia rama
> (`chore/bootstrap`), no en un worktree de cambio. Un commit por fase y el merge lo hace el usuario.

### Gates

El `analyst` orquesta por defecto y se detiene en:

1. Aprobación de cada artefacto OpenSpec.
2. **Inicio de implementación** (puede retomarse en otra sesión).
3. Inicio de QA (consume un entorno).
4. Creación del PR.
5. Archive y merge (siempre el usuario).

En modo `manual`, el usuario invoca cada fase; el `analyst` verifica que no se salte ningún gate.

### Cierre

1. Consistencia diseño → código.
2. `doc-writer` actualiza documentación técnica y funcional y devuelve un resumen.
3. El `analyst` valida la consistencia documental.
4. Se crea el PR; **el usuario revisa una vez**.
5. `openspec archive` + sync, merge y limpieza.

---

## Reglas de oro

- **Commits incrementales**: un cambio lógico = un commit (ver `conventional-commits`).
- **Byline de rol** en commits de agente: `By <rol>.` al final del body.
- **Comentarios en código**: referencian ADRs (`adr/NNNN-...`) o documentación funcional, **nunca**
  specs de `openspec/`.
- **Calidad**: 0 violaciones de lint en los archivos tocados; CRAP ≤ `{{CRAP_THRESHOLD}}` por método.
- **Los controles de calidad son señales, no objetivos**: no se manipulan métricas.
- **No inventar librerías, APIs ni comportamiento**: verificar con **Context7** o preguntar.
- **Datos de prueba**: si se crean por SQL directo, respetan las invariantes de negocio y se declaran.
- **Anuncio de rol**: `🎩 Ahora soy <rol>` al cambiar de rol.
- **Nunca avanzar** sin la aprobación explícita del usuario en cada gate.

---

## Skill Registry

| Skill | Ruta | Trigger |
|---|---|---|
| `openspec-explore` | `.agents/skills/openspec-explore/` | Explorar una idea antes de proponer |
| `openspec-propose` | `.agents/skills/openspec-propose/` | Planificar un cambio |
| `openspec-apply-change` | `.agents/skills/openspec-apply-change/` | Implementar los tasks |
| `openspec-archive-change` | `.agents/skills/openspec-archive-change/` | Archivar un cambio |
| `openspec-sync-specs` | `.agents/skills/openspec-sync-specs/` | Sincronizar specs |
| `openspec-workflow` | `.agents/skills/openspec-workflow/` | Pipeline completo y gates |
| `test-driven-development` | `.agents/skills/test-driven-development/` | Rojo → verde → refactor |
| `using-git-worktrees` | `.agents/skills/using-git-worktrees/` | Aislar el cambio |
| `git-workflow` | `.agents/skills/git-workflow/` | Ramas, worktrees, PR, limpieza |
| `architectural-decision-records` | `.agents/skills/architectural-decision-records/` | Documentar una decisión durable |
| `gherkin-specs` | `.agents/skills/gherkin-specs/` | Escribir escenarios |
| `conventional-commits` | `.agents/skills/conventional-commits/` | Cada commit |
| `session-startup` | `.agents/skills/session-startup/` | Inicio de sesión |
| `session-end` | `.agents/skills/session-end/` | Cierre de sesión |

Las skills de packs (`.template/packs/`) solo existen cuando el pack está activado.

---

## Placeholders

Los prompts de `agents/` usan estos placeholders. **Este archivo es el único lugar donde se definen.**

| Placeholder | Valor |
|---|---|
| `TEST_COMMAND` | {{TEST_COMMAND}} |
| `QUALITY_COMMAND` | {{QUALITY_COMMAND}} |
| `MUTATION_COMMAND` | {{MUTATION_COMMAND}} |
| `CRAP_COMMAND` | {{CRAP_COMMAND}} |
| `APP_PORT` | {{APP_PORT}} |
| `RUN_APP_COMMAND` | {{RUN_APP_COMMAND}} |
| `SERVICE_NAME` | {{SERVICE_NAME}} |
| `HEALTH_URL` | {{HEALTH_URL}} |
| `METRICS_PATH` | {{METRICS_PATH}} |

Si el stack no usa un concepto, el valor es `N/A` (nunca se deja el placeholder sin resolver).

---

## Mapa de documentos

| Para qué | Dónde |
|---|---|
| Especificaciones del comportamiento | `openspec/specs/` |
| Cambio activo | `openspec/changes/<cambio>/` |
| Decisiones arquitectónicas | `adr/` |
| Documentación funcional (Use Cases) | `docs/functional/` |
| Arquitectura y C4 | `docs/architecture/` |
| Contratos de API | `docs/api/` |
| Guías de desarrollo | `docs/guides/` |
| Inventario preliminar de QA | `openspec/changes/<cambio>/qa-scenarios.md` |
| Reportes de QA | `openspec/changes/<cambio>/qa-report-*.md` |
| Reportes de revisión | `openspec/changes/<cambio>/reviewer-report-*.md` |
| Guías del arnés | `docs/QUICKSTART.md`, `docs/ADOPTION.md`, `docs/TOOLS.md`, `docs/QUALITY.md` |

---

## Pendientes

{{TBD_ITEMS}}
