# Perfiles de stack

Un perfil es **datos**, no procedimiento: describe cómo se construye, se ejecuta y se valida un stack.
**No hay catálogo**: el bootstrap crea solo el perfil que el proyecto necesita a partir de
`_templates/perfil.yaml`, y el usuario valida los comandos.

## Cómo se crea

```bash
node .atlas/scripts/crear-perfil.mjs --id <id> --language <lenguaje> \
  [--runtime <runtime>] [--package-manager <gestor>] [--source <ruta>] [--tests <ruta>]
```

1. El script copia `_templates/perfil.yaml` a `<id>.yaml` (no sobrescribe sin `--force`).
2. Completa los comandos con valores reales; si no aplica, `""` + nota.
3. Valida: `node .atlas/scripts/validar-perfiles.mjs`.
4. Añade el stack a `state.stacks` y a `AGENTS.md § Stacks`.
5. Regenera adaptadores: `node .atlas/scripts/renderizar-adaptadores.mjs`.

Se puede hacer **en cualquier momento**, no solo en el bootstrap.

## Por qué existen

Sin perfiles, cada stack obligaría a repetir los mismos comandos en cada proyecto. Con perfiles,
**cualquier stack queda soportado** con ~40 líneas de YAML; los packs se reservan para conocimiento
procedimental real. Al generarse bajo demanda, no hay archivos que nadie use.

## Perfil o pack: cómo decidir

| Necesitas… | Va en… | Ejemplo |
|---|---|---|
| Cómo se ejecuta el stack | **Perfil** + stack | `./gradlew build`, `npm test`, puerto, health |
| Cómo se hace algo con una tecnología | **Pack** | cómo probar controllers de Spring, checklist MASVS |
| Regla de workflow para todos | **Núcleo** | TDD, PR pequeño, gates |

**Ejemplo — Spring Boot:**

- **Perfil `java-gradle` + stack:** comandos de build/test/run, `8080`, `/actuator/health` (datos).
- **Pack `spring-boot` (opcional):** convenciones de tests, seguridad y observabilidad (procedimiento).

## Esquema

```yaml
name: <id>                     # kebab-case, coincide con el nombre del archivo
description: <texto>

stack:
  language: <lenguaje>
  runtime: <runtime>
  package_manager: <gestor>

structure:
  source: <ruta>
  tests: <ruta>

commands:                      # strings ejecutables; usar "" si no aplica
  install: ""
  build: ""
  run: ""
  test: ""
  test_unit: ""
  lint: ""
  lint_tests: ""
  typecheck: ""
  static_analysis: ""
  quality: ""                  # el gate que debe pasar antes de commit
  coverage: ""
  mutation: ""
  crap: ""

quality:
  crap_threshold: 6            # umbral por método (ver docs/harness/<lang>/QUALITY.md)
  coverage_min: null
  tools: []
  suggested: []

qa:
  docker: false
  service_name: ""
  app_port: ""
  health_path: ""
  metrics_path: ""

notes: |
  Ajustes manuales o advertencias del perfil.
```

## Placeholders de perfil

Se resuelven al **instanciar** el perfil (respuestas del cuestionario). Lista cerrada en
[`../PLACEHOLDERS.md`](../PLACEHOLDERS.md).

| Placeholder | Campo |
|---|---|
| `PACKAGE_MANAGER` | `stack.package_manager` |
| `RUN_APP_COMMAND` | `commands.run` |
| `SERVICE_NAME` | `qa.service_name` |
| `APP_PORT` | `qa.app_port` |
| `HEALTH_PATH` | `qa.health_path` |
| `METRICS_PATH` | `qa.metrics_path` |

Un campo que no aplica es `""` (nunca se omite ni se inventa). Derivaciones a placeholders de proyecto:
`HEALTH_URL = http://localhost:<APP_PORT><HEALTH_PATH>`.

**Vacío ≠ compuesto:** si `health_path` o `app_port` es `""`, el proyecto recibe `HEALTH_URL = N/A`
(nunca se compone una URL con path vacío). Igual para `metrics_path`/`service_name` → `N/A`.

## Reglas

- **Solo datos.** Nada de instrucciones para el agente (eso son skills).
- **Nada inventado.** Si un comando no se conoce, `""` + nota en `notes`; nunca un comando supuesto.
- **Sin fugas de framework.** Un perfil de toolchain no contiene rutas ni comandos de un framework
  concreto: esos valores son placeholders que se resuelven en el cuestionario.
- **Un perfil no activa packs**: solo informa la recomendación.
- Los valores se validan ejecutando el comando, no leyendo documentación.

## Ejemplos y plantilla

- `_templates/perfil.yaml` es la **plantilla** que usa `crear-perfil.mjs`. No se valida como perfil.
- La plantilla usa marcadores de generación (`{{ID}}`, `{{LANGUAGE}}`, …) que no son placeholders de
  perfil: los resuelve `crear-perfil.mjs`. El borrador nace con `TODO` en runtime/rutas; complétalos.
- En `_examples/` hay dos perfiles **ilustrativos**: muestran la forma del YAML, no un catálogo.
  Si uno encaja, úsalo como referencia; no se copia tal cual.

| Archivo | Ilustra |
|---|---|
| `_templates/perfil.yaml` | Esqueleto para generar un perfil |
| `_examples/java-gradle.yaml` | Toolchain JVM (Gradle, Checkstyle, PIT, CRAP) |
| `_examples/node-ts.yaml` | Toolchain Node/TS (lint, typecheck, cobertura) |

El proyecto crea su perfil con `crear-perfil.mjs`; `_examples/` solo sirve de referencia.
