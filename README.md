# Template DDD + OpenSpec + Agents

> **Plantilla base para proyectos de software con Domain-Driven Design, OpenSpec y agentes especializados.**
> Funciona para **backend, frontend, mobile, monorepos** (multi-proyecto) o cualquier stack que use spec-driven development.
>
> ⚠️ **Docker es opcional** — Se menciona en varios lugares (QA, MCP postgres, bases de datos) pero **no es obligatorio**. Úsalo solo si tu proyecto lo necesita.

---

## 🚀 Inicio rápido

```bash
# 1. Clonar o copiar esta plantilla
git clone <url-de-este-template> mi-proyecto
cd mi-proyecto

# 2. Eliminar historial git y empezar limpio
rm -rf .git
git init

# 3. Personalizar placeholders (ver sección siguiente)
#    - Editar PROJECT-README.md con la info de tu proyecto
#    - Editar AGENTS.md con tu stack y comandos
#    - Editar opencode.json si cambias modelos/MCP
#    - Editar openspec/config.yaml con tu dominio

# 4. Instalar dependencias del proyecto (Gradle, Maven, npm, pnpm, Cargo, etc.)
#    Según tu stack definido en AGENTS.md

# 5. Verificar que todo funciona
#    Ejecutar comando de tests definido en AGENTS.md → {{TEST_COMMAND}}

# 6. Configurar variables de entorno (si aplica)
cp .env.example .env 2>/dev/null || true
# Editar .env con tus variables (DB, API keys, etc.)

# 7. Levantar entorno (Docker Compose, dev server, emulador, etc. — según tu stack)
# docker compose up -d   # solo si tu proyecto usa Docker

# 8. Primera feature: explorar + proponer
#    En opencode: cambiar a agente ddd-analyst
#    Ejecutar: /opsx:explore
```

---

## 🚀 Cómo usar este template

### 1. Obtener el template (descargar en tu máquina local)

La URL del template es: **https://github.com/cedaniel200/ddd-opencode-openspec-template**

**Opción A: GitHub Template (recomendado — crea tu repo en GitHub directamente)**
1. Abre https://github.com/cedaniel200/ddd-opencode-openspec-template
2. Click **"Use this template"** → **"Create a new repository"**
3. GitHub crea TU repo (ej. `mi-proyecto`) en tu cuenta con una copia limpia
4. Clona TU repo local: `git clone https://github.com/tu-usuario/mi-proyecto`

**Opción B: degit (CLI rápido — descarga directa sin historial)**
```bash
npx degit cedaniel200/ddd-opencode-openspec-template mi-proyecto
cd mi-proyecto
git init
git remote add origin https://github.com/tu-usuario/mi-proyecto
```

**Opción C: Clone manual (si no quieres degit)**
```bash
git clone https://github.com/cedaniel200/ddd-opencode-openspec-template mi-proyecto
cd mi-proyecto
rm -rf .git          # Elimina historial del template
git init             # Inicia tu propio historial
git remote add origin https://github.com/tu-usuario/mi-proyecto
```

### 2. Cambiar el remoto a TU repositorio (si usaste clone manual)

```bash
git remote set-url origin https://github.com/tu-usuario/mi-proyecto
git push -u origin main
```

### 3. Personalizar y limpiar

1. Edita `PROJECT-README.md` → renombra a `README.md`
2. Edita `AGENTS.md` con tu stack (comandos, puertos, paths, etc.)
3. Edita `opencode.json` si cambias modelos/MCP
4. Edita `openspec/config.yaml` con tu dominio
5. **Borra esta guía del template:** `rm README.md` (este archivo)
6. Commit inicial: `git add -A && git commit -m "chore: setup from template"`
7. Push: `git push -u origin main`

---

## 🤖 Los agentes te ayudan a personalizar

> **Tip:** Pídele al agente `ddd-analyst` (o cualquiera) que te guíe en la customización.
> Ejemplo: *"Ayúdame a adaptar AGENTS.md y opencode.json para un proyecto React Native con Expo"*
>
> Los agentes conocen la plantilla y pueden:
> - Sugerir valores para cada placeholder según tu stack
> - Crear comandos de test/lint/build apropiados
> - Ajustar la estructura de carpetas (monorepo, multi-módulo, etc.)
> - Configurar MCP para tus herramientas (PostgreSQL, Firebase, Supabase, etc.)

---

## 🔧 Patrón de configuración: Prompts genéricos + AGENTS.md concreto

**Principio:** Los prompts de los agentes (`.opencode/agent/*.md`) son **genéricos y reutilizables** — usan placeholders como `{{HEALTH_URL}}`, `{{RUN_APP_COMMAND}}`, `{{HEALTH_PATH}}`. **AGENTS.md es el único lugar** donde defines los valores reales para tu stack.

### Cómo funciona

| Capa | Qué hace | Ejemplo |
|------|----------|---------|
| **Prompts (`.opencode/agent/*.md`)** | Lógica genérica, referencian placeholders | `"Valida health en {{HEALTH_URL}}"` |
| **AGENTS.md** | Valores concretos por proyecto | `{{HEALTH_URL}} = "http://localhost:8080/healthz"` |
| **README.md (este archivo)** | Documenta el patrón y da ejemplos | Tabla de placeholders con ejemplos por stack |

### Placeholders clave para observabilidad

| Placeholder | Qué resuelve | Dónde se define |
|-------------|--------------|-----------------|
| `{{HEALTH_URL}}` | URL completa del health endpoint | AGENTS.md (se compone de `{{HEALTH_PORT}}` + `{{HEALTH_PATH}}`) |
| `{{HEALTH_PORT}}` | Puerto del health endpoint (separado o mismo que `{{APP_PORT}}`) | AGENTS.md |
| `{{HEALTH_PATH}}` | Path del health endpoint (`/health`, `/actuator/health`, `/healthz`, etc.) | AGENTS.md |
| `{{RUN_APP_COMMAND}}` | Comando para levantar la app (`./gradlew bootRun`, `npm run dev`, `flutter run`) | AGENTS.md |
| `{{HEALTH_PATH}}` | **Solo el path** (`/actuator/health`, `/healthz`, `/health`, `/live`) | AGENTS.md |
| `{{HEALTH_URL}}` | **URL completa** (protocolo + host + puerto + path) | AGENTS.md (se compone de `{{HEALTH_PORT}}` + `{{HEALTH_PATH}}`) |

### {{HEALTH_URL}} vs {{HEALTH_PATH}} — Cuál usar

| Placeholder | Qué es | Cuándo usarlo |
|-------------|--------|---------------|
| `{{HEALTH_PATH}}` | Solo el path (ruta) | Configuración en código, YAML, Dockerfile, variables de entorno de la app |
| `{{HEALTH_URL}}` | URL completa (protocolo + host + puerto + path) | Hacer curl/HTTP requests, documentar, mostrar al usuario, validar en tests |

> **Relación:** `{{HEALTH_URL}}` se compone en AGENTS.md:
> - Puerto separado (Spring Boot): `{{HEALTH_URL}} = "http://localhost:{{HEALTH_PORT}}{{HEALTH_PATH}}"`
> - Mismo puerto (Node, Go, Python): `{{HEALTH_URL}} = "http://localhost:{{APP_PORT}}{{HEALTH_PATH}}"`

**En prompts de agentes:** usa `{{HEALTH_URL}}` para requests HTTP.
**En configuración de la app:** usa `{{HEALTH_PATH}}` para paths.

> **Ventaja:** Cambias de stack (Spring Boot → Node → Go) editando **solo AGENTS.md**. Los prompts de los agentes no se tocan.

---

## 📝 Personalización obligatoria

### 1. `PROJECT-README.md` → Renombrar a `README.md` al final
Contiene la documentación real de tu proyecto. Edita todos los placeholders `{{...}}`:
- `{{PROJECT_NAME}}`, `{{ONE_LINE_DESCRIPTION}}`, `{{STACK_SUMMARY}}`
- `{{QUICK_START}}`, `{{C4_CONTEXT}}`, `{{ADRS_NOTE}}`, `{{DEV_COMMANDS}}`, `{{LICENSE}}`
- Variables de entorno, stack, arquitectura, etc.

### 2. `AGENTS.md` — Configuración del proyecto + workflow
Edita los placeholders `{{...}}` (la tabla de abajo son ejemplos para **backend Java**; cámbialos a tu stack). **AGENTS.md es la única fuente de verdad** para valores concretos; los prompts de los agentes usan placeholders genéricos que se resuelven aquí.

| Placeholder | Backend Java (ejemplo) | Frontend React (ejemplo) | Mobile Flutter (ejemplo) |
|-------------|------------------------|--------------------------|--------------------------|
| `{{STACK_DETAIL}}` | "Java 17 + Gradle (single module, JUnit 5)" | "React 18 + Vite + TypeScript + Vitest" | "Flutter 3.x + Dart + Melos (monorepo)" |
| `{{PACKAGE_BASE}}` | `com.empresa.proyecto.contexto.{core,dom1}` | `src/{features,shared,core}` | `lib/{features,core,shared}` |
| `{{TEST_COMMAND}}` | `./gradlew test` | `npm run test` / `pnpm test` | `flutter test` / `melos run test` |
| `{{QUALITY_COMMAND}}` | `./gradlew checkstyleMain checkstyleTest spotbugsMain test` | `npm run lint && npm run typecheck` | `flutter analyze && dart format --set-exit-if-changed .` |
| `{{CRAP_COMMAND}}` | `./gradlew crapAnalysis` | *(no aplica / usar coverage)* | *(no aplica)* |
| `{{APP_PORT}}` | `8080` | `5173` (Vite) / `3000` (Next.js) | N/A |
| `{{HEALTH_PORT}}` | `8081` (Actuator) | `8080` (mismo) | N/A |
| `{{HEALTH_PATH}}` | `/actuator/health` | `/healthz` | N/A |
| `{{HEALTH_URL}}` | `http://localhost:8081/actuator/health` | `http://localhost:8080/healthz` | N/A |
| `{{SERVICE_NAME}}` | Nombre servicio docker-compose | N/A | N/A |
| `{{RUN_APP_COMMAND}}` | `./gradlew bootRun` | `npm run dev` | `flutter run` |
| `{{MUTATION_COMMAND}}` | `./gradlew pitest ...` | `npx stryker run` | *(no aplica)* |
| `{{LINT_MAIN_COMMAND}}` | `./gradlew checkstyleMain` | `npm run lint` | `flutter analyze` |
| `{{LINT_TEST_COMMAND}}` | `./gradlew checkstyleTest` | `npm run lint:test` | *(no aplica)* |
| `{{SPOTBUGS_COMMAND}}` | `./gradlew spotbugsMain` | *(no aplica)* | *(no aplica)* |

> **Elimina o añade placeholders** según necesites. Si tu stack no usa Docker, borra `{{SERVICE_NAME}}`, `{{APP_PORT}}`, etc. **AGENTS.md centraliza toda la configuración**; los agentes leen estos valores via placeholders.

### 3. `opencode.json` — Modelos y MCP
- La BD PostgreSQL está configurada como `mi_db` por defecto — cámbiala en `opencode.json` si usas MCP postgres
- Añade/quita MCPs según tu stack (ej. Firebase, Supabase, AWS, etc.)

### 4. `openspec/config.yaml` — Contexto del dominio
- `{{PROJECT_NAME}}`, `{{STACK_SUMMARY}}`, `{{DOMAIN_SUMMARY}}`, `{{PACKAGE_BASE}}`

### 5. Variables de entorno
Define las que necesite tu proyecto (no solo DB):
```bash
# Ejemplos según stack:
# Backend: DB_USER, DB_PASSWORD, JWT_SECRET, ...
# Frontend: VITE_API_URL, VITE_AUTH_DOMAIN, ...
# Mobile: FIREBASE_API_KEY, SENTRY_DSN, ...
```

---

## 🤖 Agentes incluidos

| Agente | Rol | Cuándo usarlo |
|--------|-----|---------------|
| `ddd-analyst` | Análisis y planificación OpenSpec | Inicio de feature: `/opsx:explore` → `/opsx:propose` |
| `ddd-engineer` | Implementación TDD + DDD | Tras aprobar proposal: `/opsx:apply` |
| `ddd-reviewer` | Revisión código (SOLO LECTURA) | Tras QA aprobado |
| `qa-analyst` | Pruebas funcionales E2E | Sub-agente, invocado por engineer/usuario |
| `doc-writer` | Documentación pre-merge | Invocado por analyst en cierre de ciclo |

> **Placeholders en agentes:** Algunos agentes (`ddd-engineer`, `qa-analyst`, etc.) tienen placeholders `{{APP_PORT}}`, `{{HEALTH_URL}}`, `{{SERVICE_NAME}}`, `{{QUALITY_COMMAND}}`, etc. en sus prompts. **Edítalos en AGENTS.md** y los agentes los heredarán vía los placeholders compartidos.

> **⚠️ Agentes que asumen Docker (QA/E2E):**
> Los siguientes agentes tienen prompts que asumen Docker Compose para el entorno de QA y pruebas E2E con PostgreSQL real:
> - `ddd-analyst` — menciona Docker Compose en el handoff a QA
> - `ddd-engineer` — levanta entorno QA con `docker compose up -d --build`, valida health dentro de Docker, usa PostgreSQL en Docker para E2E
> - `qa-analyst` — requiere Docker Compose listo, ejecuta tests contra API en Docker, valida health via `docker exec`
>
> **Si tu proyecto NO usa Docker:** Debes editar los prompts de estos agentes (archivos en `.opencode/agent/*.md`) para adaptar la estrategia de QA/E2E a tu entorno (dev server local, emulador, Testcontainers, base de datos local, etc.). Los placeholders `{{SERVICE_NAME}}`, `{{APP_PORT}}`, `{{HEALTH_URL}}`, `{{RUN_APP_COMMAND}}` en AGENTS.md también deberán ajustarse o eliminarse.

---

## 🔧 Skills incluidas (autocontenidas)

```
.agents/skills/
├── openspec-explore
├── openspec-propose
├── openspec-apply-change
├── openspec-archive-change
├── openspec-sync-specs
├── test-driven-development
├── using-git-worktrees
├── architectural-decision-records
├── gherkin-specs
└── conventional-commits
```

---

## 📁 Estructura del proyecto

```
.
├── .opencode/
│   ├── agent/          # 5 agentes
│   ├── commands/       # Comandos custom (vacío)
│   ├── plugins/        # Plugins (vacío)
│   └── skills/         # 10 skills (autocontenidas)
├── openspec/
│   ├── config.yaml     # Schema spec-driven-with-adr
│   ├── specs/          # Especificaciones dominio (Gherkin)
│   ├── changes/        # Cambios activos (worktree)
│   └── schemas/        # Schemas OpenSpec
├── adr/                # Architecture Decision Records
├── docs/
│   ├── architecture/   # Diagramas C4, decisiones
│   ├── api/            # Contratos API (REST, GraphQL, gRPC, etc.)
│   ├── guides/         # Guías desarrollo, setup, CI/CD
│   └── funcional/      # Use Cases Cockburn (contractual)
├── PROJECT-README.md   # ← Tu documentación final (renombrar a README.md)
├── AGENTS.md           # Configuración agentes + workflow + placeholders
├── opencode.json       # Config opencode + modelos + MCP
├── .gitignore
└── README.md           # ← ESTE ARCHIVO (borrar al finalizar setup)
```

> **Estructura sugerida:** Adapta `docs/`, `openspec/specs/`, packages a tu proyecto.
>
> **💡 Para monorepos / multi-proyecto:** Se recomienda colocar cada aplicación/librería en su propia carpeta bajo la raíz del template. Ejemplos:
> ```
> .
> ├── backend/              # API backend (Java, Node, Go, etc.)
> ├── web/                  # Frontend web (React, Vue, Svelte, etc.)
> ├── portal-web/           # Portal admin/clientes
> ├── mobile/               # App móvil (Flutter, React Native, etc.)
> ├── shared/               # Código compartido (tipos, utils, librerías)
> ├── infra/                # Terraform, Kubernetes, Docker, scripts
> └── docs/                 # Documentación compartida (esta carpeta)
> ```
> Cada subproyecto tiene su propio `package.json`, `build.gradle`, `go.mod`, `pubspec.yaml`, etc., y su propia configuración de tests/lint. El `AGENTS.md` y `opencode.json` en la raíz coordinan el workflow global; cada subproyecto puede tener su propio `AGENTS.md` si necesita agentes especializados.

---

## ✅ Checklist de configuración

- [ ] Editar `PROJECT-README.md` con info real del proyecto
- [ ] Editar `AGENTS.md` con **tu stack real** (comandos, puertos, packages, placeholders)
- [ ] Editar `opencode.json` → modelos, MCPs necesarios (BD default: `mi_db`)
- [ ] Editar `openspec/config.yaml` con tu dominio
- [ ] Crear `.env` con tus variables de entorno
- [ ] Verificar que tu entorno de dev funciona (Docker, dev server, emulador, etc.)
- [ ] Ejecutar `{{TEST_COMMAND}}` → todo verde
- [ ] Probar flujo: `/opsx:explore` → `/opsx:propose` con una idea de prueba
- [ ] **Renombrar `PROJECT-README.md` → `README.md`**
- [ ] **Borrar este `README.md` (el de la plantilla)**
- [ ] Commit inicial: `git add -A && git commit -m "chore: initial commit from template"`

---

## 🗑️ Limpieza final

Una vez completado el setup:

```bash
# 1. Borrar esta guía de plantilla
rm README.md  # (este archivo)

# 2. Renombrar documentación final
mv PROJECT-README.md README.md

# 3. Commit
git add -A
git commit -m "chore: setup project from template"
```

---

## ⚠️ Requisitos previos

- **Engram** instalado globalmente (memoria persistente cross-session)
  - Ver: https://github.com/Gentleman-Programming/engram
  - Requiere `engram` en PATH + plugin en `~/.config/opencode/plugins/engram.ts`
- **opencode** configurado con modelos (deepseek-v4-flash-free por defecto)
- **Herramientas de tu stack:** Node.js/npm/pnpm, Gradle/Maven, Flutter, Xcode, Android Studio, etc.
- **Docker + Docker Compose** — **solo si tu proyecto lo usa** (para QA, MCP postgres, bases de datos, etc.)
- **Node.js + `npx`** — para MCP context7 y postgres (si los usas)

---

## 📚 Referencias

- [OpenSpec](https://openspec.dev) — Spec-Driven Development
- [Engram](https://github.com/Gentleman-Programming/engram) — Memoria persistente
- [Context7 MCP](https://context7.com) — Docs oficiales librerías
- ADRs en `adr/` — Decisiones arquitectónicas
- Skills en `.agents/skills/` — Autocontenidas