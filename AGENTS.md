# AGENTS.md — Mapa del proyecto (desarrollo)

> **Este archivo es el punto de entrada para cualquier agente de desarrollo.**  
> La fuente de verdad del dominio son `openspec/specs/` y `adr/`.

---

## Índice de navegación

| Sección | Contenido | Prioridad |
|---------|-----------|-----------|
| [Estándar de producción](#estándar-de-producción) | Cómo tratar el proyecto (producción, fuente de verdad) | **Obligatoria** |
| [REGLA #1: Cargar skills](#regla-1-cargar-skills-obligatorio) | Skills a cargar por rol (pre-flight) | **Obligatoria** |
| [REGLA #2: Flujo Git](#regla-2-flujo-git-obligatorio) | Worktrees, ramas, commits, PR, archive, merge | **Obligatoria** |
| [Preferencias del usuario](#preferencias-del-usuario) | Idioma, stack, enfoque, formato de sesión | Obligatoria |
| [Secuencia al iniciar sesión](#secuencia-al-iniciar-sesión) | Pasos al arrancar cada sesión | Obligatoria |
| [Workflow de cada sesión](#workflow-de-cada-sesión) | Pipeline canónico de desarrollo (OpenSpec) | **Obligatoria** |
| [Reglas de oro](#reglas-de-oro) | Reglas normativas transversales (byline, sensores, comentarios, datos, roles) | **Obligatoria** |
| [Stack](#stack) | Backend, packages | Contexto |
| [OpenSpec (SDD)](#openspec-sdd) | Rutas, schema, comandos | Contexto |
| [Decisiones arquitectónicas (ADRs)](#decisiones-arquitectónicas-adrs) | Dónde viven las decisiones | Contexto |
| [Mapa de documentos](#mapa-de-documentos-desarrollo) | Dónde encontrar cada cosa | Referencia |
| [Comandos](#comandos) | Build, tests, OpenSpec | Referencia |
| [Detalle operativo](#detalle-operativo) | QA, Revisión, gates, H2/Postgres, doc-writer (detalle largo) | Bajo demanda |
| [Al finalizar la sesión](#al-finalizar-la-sesión) | Checklist de cierre | Referencia |
| [Skill Registry](#skill-registry) | Lista completa de skills con rutas | Referencia |

---

## Estándar de producción

**Este es un proyecto de producción.** Todo agente debe tratar el código, la infraestructura
y las decisiones arquitectónicas como si estuvieran en un entorno real.

- La fuente de verdad del dominio son `openspec/specs/` y `adr/`.

---

## REGLA #1: Cargar skills (obligatorio)

## REGLA #2: Flujo Git obligatorio

Skills asociadas: `using-git-worktrees`, `conventional-commits`, `openspec-archive-change`.

### Arranque de sesión
Quien inicie la sesión (analyst o engineer) debe:
  1. `git checkout main`
  2. `git pull origin main`
  (Sobre main actualizado se crean ramas y worktrees)

### Ciclo completo de feature
1. **analyst** crea el worktree + rama:
     `git worktree add .worktrees/<feature> -b feature/<feature>`
     `cd .worktrees/<feature>`
   Todo el ciclo (explore, propose, specs, qa-scenarios, ADR, doc-writer, archive) y los reportes
   (qa-report-*.md, reviewer-report-*.md) se hacen dentro del worktree.

2. Los agentes ejecutan git directamente (add, commit, push) tras cada cambio aprobado.

3. **analyst** en el cierre de ciclo (ver pipeline): valida consistencia → invoca doc-writer (pre-merge, dentro del worktree) → valida consistencia de la documentación → el usuario revisa los cambios documentales → **crea el PR**:
     `gh pr create --base main --head feature/<feature> --title "<tipo>: <feature>"`
   Notifica al usuario: "✅ PR listo en <url> — revísalo y, cuando apruebes, mergea"

4. Tras aprobación del usuario: `/opsx:archive` + `/opsx:sync` (commit `chore: archive <feature>`) y push.

5. Tras el merge del PR:
   - `git branch -d feature/<feature>`
   - `git worktree remove .worktrees/<feature>`

### Múltiples features en paralelo
- Cada feature en su propio `.worktrees/<feature>` + rama.
- El workspace main siempre limpio y actualizado.

Antes de cualquier acción, ejecutar `skill` para cargar las skills aplicables según la fase y el rol del agente.

| Fase / Rol | Skills a cargar |
|------------|-----------------|
| **Pre‑flight** (siempre) | `openspec-explore`, `openspec-propose`, `architectural-decision-records`, `gherkin-specs` |
| **Análisis / Planificación** (`analyst`) | `openspec-explore`, `openspec-propose`, `architectural-decision-records`, `gherkin-specs` (genera `qa-scenarios.md`) |
| **Implementación** (`engineer`) | `openspec-apply-change`, `test-driven-development`, `using-git-worktrees`, `conventional-commits` |
| **Revisión** (`reviewer`) | (No aplica - solo lectura de código y generación de reportes) |
| **Documentación (pre-merge, cierre de ciclo)** (`doc-writer`, invocado por `analyst`) | `architectural-decision-records`, `gherkin-specs`, `conventional-commits` |
| **Pruebas funcionales** (`qa-analyst`, sub-agente del `engineer`) | `gherkin-specs` |
| **Cierre** (`analyst` / `engineer`) | `openspec-archive-change`, `openspec-sync-specs` |

Ver el **Skill Registry** al final de este archivo para la lista completa con rutas y descripciones.

---

## Preferencias del usuario

- **Idioma**: Español (términos técnicos pueden mantenerse en inglés)
- **Proyecto**: {{STACK_DETAIL}}
- **Enfoque**: desarrollo guiado por agentes especializados
- **El usuario ejecuta los comandos OpenSpec**; los agentes indican qué comando y cómo revisar cada artefacto
- Formato híbrido: breve explicación → código → feedback
- Sesiones de 30‑60 min
- Package base: {{PACKAGE_BASE}}
- **Regla de documentación**: Ningún agente inventa librerías/APIs. Usar **MCP context7** para consultar documentación oficial.

---

## Placeholders del proyecto (configuración en AGENTS.md)

Los agentes usan placeholders genéricos en sus prompts. **Este archivo (AGENTS.md) es el único lugar** donde se definen los valores concretos para tu stack. Los prompts de los agentes (`agents/*.md`) referencian estos placeholders.

### Observabilidad / Health Endpoint

| Placeholder | Descripción | Tu valor | Ejemplos por stack |
|-------------|-------------|----------|-------------------|
| `{{HEALTH_PORT}}` | Puerto del health endpoint (si es separado del puerto principal) | | Spring Boot Actuator: `8081`; Node/Go/Python/Frontend: `{{APP_PORT}}` (mismo puerto) |
| `{{HEALTH_PATH}}` | Path del health endpoint | | Spring: `/actuator/health`; Node: `/healthz`; Go: `/health`; .NET: `/healthz`; FastAPI: `/health` |
| `{{HEALTH_URL}}` | URL completa del health endpoint (se compone: `http://localhost:{{HEALTH_PORT}}{{HEALTH_PATH}}` o `http://localhost:{{APP_PORT}}{{HEALTH_PATH}}`) | | Se deriva de los anteriores |
| `{{METRICS_PATH}}` | Path de métricas (Prometheus, etc.) | | Spring: `/actuator/prometheus`; Node: `/metrics`; Go: `/metrics` |
| `{{HEALTH_AUTH}}` | Autenticación para health endpoint (si requiere auth) | | Spring: `Basic monitor:password`; Otros: `none` / `Bearer token` |

### App Runtime

| Placeholder | Descripción | Tu valor | Ejemplos |
|-------------|-------------|----------|----------|
| `{{APP_PORT}}` | Puerto principal de la API | | `8080`, `3000`, `5173`, `8000` |
| `{{RUN_APP_COMMAND}}` | Comando para levantar la app en desarrollo | | `./gradlew bootRun` / `npm run dev` / `flutter run` / `python main.py` |
| `{{SERVICE_NAME}}` | Nombre del servicio en Docker Compose (si usa Docker) | | `api`, `backend`, `web` |

### Calidad y Tests

| Placeholder | Descripción | Tu valor | Ejemplos |
|-------------|-------------|----------|----------|
| `{{TEST_COMMAND}}` | Comando para ejecutar todos los tests | | `./gradlew test` / `npm test` / `flutter test` |
| `{{QUALITY_COMMAND}}` | Comando para gates de calidad (lint, spotbugs, tests) | | `./gradlew checkstyleMain checkstyleTest spotbugsMain test` / `npm run lint && npm run typecheck` |
| `{{CRAP_COMMAND}}` | Comando para análisis CRAP/complejidad | | `./gradlew crapAnalysis` |
| `{{MUTATION_COMMAND}}` | Comando para mutation testing | | `./gradlew pitest` / `npx stryker run` |
| `{{LINT_MAIN_COMMAND}}` | Linting código producción | | `./gradlew checkstyleMain` / `npm run lint` |
| `{{LINT_TEST_COMMAND}}` | Linting tests | | `./gradlew checkstyleTest` / `npm run lint:test` |
| `{{SPOTBUGS_COMMAND}}` | Análisis estático SpotBugs | | `./gradlew spotbugsMain` |

### Docker / Infra (si aplica)

| Placeholder | Descripción | Tu valor | Ejemplos |
|-------------|-------------|----------|----------|
| `{{SERVICE_NAME}}` | Nombre servicio en docker-compose | | `api`, `backend` |
| `{{HEALTH_AUTH}}` | Credenciales para health endpoint protegido | | `monitor:password` / `Bearer token` |

> **Nota:** Los prompts de los agentes (`agents/*.md`) usan placeholders genéricos como `{{HEALTH_URL}}`, `{{RUN_APP_COMMAND}}`, `{{HEALTH_PATH}}`. Los valores reales se definen **aquí en AGENTS.md**. Si tu stack no usa un concepto (ej. puerto separado para health), deja el valor igual a `{{APP_PORT}}` o `N/A`.

---

## Secuencia al iniciar sesión

1. Cargar skills (Regla #1)
2. Leer este archivo
3. Ejecutar tests: `{{TEST_COMMAND}}` — todo verde
4. Presentar plan al usuario antes de escribir código

---

## Workflow de cada sesión

### Sesiones de **desarrollo** (feature con OpenSpec)

**Pipeline canónico:**

```
[humano + analyst] → explore → propose (proposal, design + qa-scenarios, specs, tasks, ADR)
        ↓ aprobado por el humano
[engineer] → TDD por tasks → gates de calidad → Docker + QA Context
        ↓
[analyst: CHECKPOINT DE CONSISTENCIA]  ← verifica drift de diseño/alcance/ADRs ANTES de QA
        ↓
LOOP (límite global 5 iteraciones QA + Reviewer):
   [engineer ↔ qa-analyst ↔ reviewer]  ← corrige TODO de cada reporte
        ↓  (qa -FINAL y reviewer -FINAL: todo resuelto o documentado)
[analyst: CIERRE DE CICLO]
   1. Revisión de consistencia diseño→código
   2. Invoca doc-writer (pre-merge, dentro del worktree)
   3. Analyst valida consistencia de documentación → el usuario revisa
   4. Crea el PR → el usuario REVISA el PR
   5. /opsx:archive + /opsx:sync
   6. El usuario MERGEA el PR
   7. Limpieza post-merge: borrar rama + worktree
```

- **El usuario ejecuta los comandos OpenSpec** en su terminal; los agentes indican qué comando ejecutar y qué revisar.
- **El usuario revisa cada artefacto** antes de continuar al siguiente.
- **Checkpoint de consistencia del `analyst`** (antes de QA): verificación rápida de que el código implementa el design aprobado, el alcance no varió y los ADRs nuevos son coherentes. Si hay drift → se corrige el diseño ANTES de que QA y reviewer gasten iteraciones.
- **Detalle operativo del QA, la revisión y las reglas de calidad**: ver [Detalle operativo](#detalle-operativo) (se lee bajo demanda según la fase).
- Durante `propose`: cargar ADRs y Gherkin specs.
- Durante `apply`: cargar TDD y worktrees.
- **Nunca avanzar sin esperar revisión explícita del usuario** tras proposal, design, adr y tasks.

---

## Reglas de oro

Reglas normativas transversales que aplican a **todos los agentes en todas las fases**:

- **Commits incrementales**: commitear tras cada cambio lógico usando conventional commits. No acumular cambios.
- **Byline de rol en commits**: cuando un agente ejecuta un commit, añade `By <rol>.` al final del body (ej. `feat: mensaje\n\nBy engineer.`). Los commits del usuario no llevan byline.
- **Sensores de calidad**: antes de commitear ejecutar `{{QUALITY_COMMAND}}`. **Regla de 0 hallazgos Checkstyle**: no se dejan pasar violaciones en los archivos que se tocan; si el archivo tiene violaciones preexistentes, se resuelven (no se deja deuda "porque no era mía").
- **Comentarios en código**: referencian **ADRs** (`adr/00NN-...`) o documentación funcional (`docs/funcional/`), **nunca** specs de `openspec/` (son delta que se archiva/muta).
- **Datos de prueba directos en BD**: los datos creados por SQL directo (seed QA) deben respetar las invariantes de negocio (validaciones de VO, estados válidos, hashes, auditoría, columnas NOT NULL, `debe_cambiar_password=false`). Preferir crear datos por la API. Si se usa SQL directo, declarar en el QA Context qué invariantes se respetaron y cuáles no.
- **Regla de anuncio de rol:** Cada vez que un agente cambie de rol (analyst → engineer → reviewer), debe anunciarlo explícitamente con el formato `"🎩 Ahora soy {rol}"` antes de ejecutar cualquier acción del nuevo rol. Esto aplica incluso si el mismo agente está desempeñando múltiples roles en la misma sesión.

---

## Stack

### Backend
**{{STACK_DETAIL}}**

```
{{PACKAGE_BASE}}
```
Tests en `src/test/` (mirror del source package). Nomenclatura: `shouldXxx`.

---

## OpenSpec (SDD)

Este proyecto usa [OpenSpec](https://openspec.dev) v1.5.0 + schema `spec-driven-with-adr`.

| Ruta | Propósito |
|------|-----------|
| `openspec/specs/` | Especificaciones del dominio (lenguaje ubicuo) |
| `openspec/changes/<feature>/` | Cambio activo: proposal, specs, design, tasks, reviewer-report-*.md |
| `openspec/config.yaml` | Schema y contexto del proyecto |
| `adr/` | Architecture Decision Records (persisten siempre) |
| `docs/funcional/` | Documentación funcional (Use Cases Cockburn) — actualizar al cambiar reglas de negocio |

Comandos disponibles en el chat: `/opsx:{propose,explore,apply,archive,sync}`.

---

## Decisiones arquitectónicas (ADRs)

Documentadas en `adr/`. Los agentes `analyst` e `engineer` deben consultarlas al proponer o implementar cambios.

---

## Mapa de documentos (desarrollo)

| Para qué… | Dónde ir |
|-----------|----------|
| Skills disponibles y triggers | **Skill Registry** (abajo) |
| Especificaciones del dominio (GIVEN/WHEN/THEN) | `openspec/specs/` |
| ADRs (decisiones arquitectónicas) | `adr/` |
| Documentación funcional (Use Cases Cockburn) | `docs/funcional/` |
| Reportes de revisión de código | `openspec/changes/<feature>/reviewer-report-*.md` |
| Reportes de pruebas funcionales | `openspec/changes/<feature>/qa-report-*.md` |
| Inventario preliminar de escenarios QA | `openspec/changes/<feature>/qa-scenarios.md` |
| Descripción general del proyecto | `README.md` |

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `{{TEST_COMMAND}}` | Todos los tests |
| `{{LINT_MAIN_COMMAND}}` | Linting producción |
| `{{LINT_TEST_COMMAND}}` | Linting tests |
| `{{SPOTBUGS_COMMAND}}` | Bugs en bytecode |
| `{{CRAP_COMMAND}}` | Métrica CRAP (riesgo de cambio) en archivos del feature |
| `/opsx:{propose,explore,apply,archive,sync}` | Flujo OpenSpec en el chat |

---

## Detalle operativo

Detalle largo de los procesos de QA, revisión y calidad. **Se lee bajo demanda** según la fase del pipeline en la que estés. Las reglas resumidas están en [Reglas de oro](#reglas-de-oro) y en el [Workflow](#workflow-de-cada-sesión).

### Pruebas funcionales (QA)

- El `engineer` prepara el entorno con **Docker Compose** (API en `{{APP_PORT}}`). **Health endpoint (`{{HEALTH_URL}}`) solo dentro de Docker** — no desde el host.
  - Readiness: `docker compose ps {{SERVICE_NAME}} --format json | grep -q "healthy"`; inspección manual: `docker exec {{SERVICE_NAME}} curl -sf {{HEALTH_URL}}`.
  - **No uses `{{RUN_APP_COMMAND}}`** como entorno oficial de QA.
- Entrega **QA Context** (incluye inventario preliminar de escenarios de `qa-scenarios.md` si existe, URL base, usuario+password, tokens vigentes [access y refresh], datos precargados y qué invariantes se respetaron). **Invocan a `@qa-analyst` el engineer o el usuario** (ambos válidos).
- QA **analiza en profundidad** proposal/design/specs/ADRs antes de probar; inventaria escenarios con BN/BB, **barrido endpoint×endpoint** y flujos multi-endpoint; hace **gap analysis** del inventario antes de ejecutar.
- QA valida **status + body + headers + efectos de negocio**, no solo códigos HTTP.
- Al cerrar cada iteración, QA deja **KPIs** en el reporte y en el chat (escenarios endpoint/multi pass-fail, hallazgos por severidad).
- QA genera `qa-report-X.md` (plantilla con listado de escenarios) en `openspec/changes/<feature>/`.
- Iteraciones intermedias: regresión **focalizada**. Iteración **FINAL**: regresión **total**.
- **`-FINAL` exige que **todos** los hallazgos (Alta/Media/Baja/💡/deuda) estén **resueltos o documentados**. No basta con 0 Altos — no se deja ningún hallazgo abierto ni se pasa al reviewer con deuda pendiente. Ciclo de análisis: 2 iteraciones; si quedan 1–2 Altos tras la 2ª, el engineer corrige y QA hace **una verificación extra** focalizada. Si en la 2ª hay **3+ Altos** → `BLOQUEADO` y deriva a `analyst`.
- Tras correcciones, el engineer **redespliega** (`docker compose up -d --build`) antes de re-invitar a QA.
- El engineer **debe resolver TODOS** los hallazgos (Alta/Media/Baja/💡/deuda). Ningún hallazgo se cierra en silencio: si uno es inviable o fuera de alcance, se documenta el porqué y se consulta al usuario. Los **Altos son obligatorios** de cerrar.
- Si QA aprueba (`-FINAL`), se pasa a **Revisión de código**.

### Revisión (post‑implementación)

- El usuario invoca al agente `reviewer` tras QA aprobado.
- El reviewer genera `reviewer-report-X.md` en `openspec/changes/<feature>/` e incluye **gates cuantitativos** (Checkstyle, CRAP, cobertura, reporte PIT del feature).
- El engineer **debe resolver TODOS** los hallazgos (críticos → bajos, atajos, deuda). Los criterios de aprobación del reviewer **no cambian**: sin críticos y altos resueltos → `-FINAL`; en la iteración final el reviewer verifica que hallazgos previos (incluidos Bajos/💡) estén resueltos o documentados.
- Si hay críticos o altos abiertos: se repite el ciclo (máximo 3 iteraciones de reviewer).
- Si no hay críticos y los altos están resueltos: el reviewer emite un reporte `-FINAL` y se da el cambio por apto para archivar.

### Límite global de ciclos (QA + Reviewer)

Como máximo **5 iteraciones totales** entre ambos (ej. 2 QA + 3 Reviewer). Si se superan, se detiene todo y se solicita intervención humana al usuario.

### Tests H2 vs Postgres

H2 sigue siendo válido en `@IntegrationTest` cuando el comportamiento es equivalente. Si H2 diverge o fuerza hacks, el engineer usa **dobles** y/o validación contra **PostgreSQL en Docker** — sin torcer producción solo para H2.

### Documentación (pre-merge, cierre de ciclo)

En el cierre de ciclo el `analyst` invoca a `doc-writer` como sub‑agente **dentro del worktree, ANTES del merge**, para que analice el cambio y actualice la documentación; el analyst valida la consistencia de la documentación con el cambio y el usuario aprueba los cambios documentales antes de crear el PR. Si el cambio afecta reglas de negocio, el `doc-writer` debe actualizar los Use Cases correspondientes en `docs/funcional/`.

---

## Al finalizar la sesión

- `{{TEST_COMMAND}}` debe pasar
- Commit final si no se ha hecho ya: `git add -A && git commit -m "<prefijo>: mensaje descriptivo"`

---

# Skill Registry

| Skill | Ruta | Trigger | Fase |
|-------|------|---------|------|
| `openspec-explore` | `.agents/skills/openspec-explore/` | Explorar una idea antes de proponer | Desarrollo (análisis) |
| `openspec-propose` | `.agents/skills/openspec-propose/` | Planificar un cambio: specs + design + ADR + tasks | Desarrollo (análisis) |
| `openspec-apply-change` | `.agents/skills/openspec-apply-change/` | Implementar los tasks de un cambio | Desarrollo (implementación) |
| `openspec-archive-change` | `.agents/skills/openspec-archive-change/` | Cerrar un cambio completado | Desarrollo (análisis) |
| `openspec-sync-specs` | `.agents/skills/openspec-sync-specs/` | Sincronizar specs archivadas | Desarrollo (análisis) |
| `test-driven-development` | `.agents/skills/test-driven-development/` | Escribir código: test rojo → verde → refactor | Desarrollo (implementación) |
| `using-git-worktrees` | `.agents/skills/using-git-worktrees/` | Aislar cambios en rama al iniciar feature | Desarrollo (implementación) |
| `architectural-decision-records` | `.agents/skills/architectural-decision-records/` | Documentar una decisión arquitectónica significativa | Desarrollo (análisis) |
| `gherkin-specs` | `.agents/skills/gherkin-specs/` | Escribir escenarios Given/When/Then | Desarrollo (análisis) |
| `conventional-commits` | `.agents/skills/conventional-commits/` | En cada commit: un cambio lógico = un commit con prefijo | Todas |

---

**Nota:** Los agentes `analyst`, `engineer`, `reviewer`, `qa-analyst` y `doc-writer` tienen sus propias instrucciones en sus respectivos archivos `.md` en `agents/`.