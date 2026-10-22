# Perfiles de stack

Un perfil es **datos**, no procedimiento: describe cómo se construye, se ejecuta y se valida un stack.
El bootstrap lo usa para rellenar los placeholders de `AGENTS.md` y generar el bloque de comandos.

## Por qué existen

Sin perfiles, cada stack obligaría a mantener un "pack" (skills duplicadas) solo para cambiar comandos.
Con perfiles, **cualquier stack queda soportado** con ~40 líneas de YAML; los packs se reservan para
conocimiento procedimental real.

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
  service_name: null
  app_port: null
  health_path: null
  metrics_path: null

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

## Ejemplos (no normativos)

En `_examples/` hay dos perfiles **ilustrativos**: muestran la forma del YAML, no un catálogo
soportado. Usan placeholders para todo lo que depende del framework o de la infraestructura.

| Ejemplo | Ilustra |
|---|---|
| `_examples/java-gradle.yaml` | Toolchain JVM (Gradle, Checkstyle, PIT, CRAP) |
| `_examples/node-ts.yaml` | Toolchain Node/TS (lint, typecheck, cobertura) |

Cada proyecto define su propio perfil en el cuestionario; estos archivos no se copian tal cual.
