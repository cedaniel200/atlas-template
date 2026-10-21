# Perfiles de stack

Un perfil es **datos**, no procedimiento: describe cómo se construye, se ejecuta y se valida un stack.
El bootstrap lo usa para rellenar los placeholders de `AGENTS.md` y generar el bloque de comandos.

> ⚠️ **Esquema provisional.** La forma definitiva del perfil se define al final del template
> (ver "Definición pendiente"). No se crean perfiles nuevos hasta entonces.

## Por qué existen

Sin perfiles, cada stack obligaría a mantener un "pack" (skills duplicadas) solo para cambiar comandos.
Con perfiles, **cualquier stack queda soportado** con ~40 líneas de YAML; los packs se reservan para
conocimiento procedimental real.

## Esquema (provisional)

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
  crap_threshold: 6            # umbral por método (ver docs/QUALITY.md)
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

## Definición pendiente (al final del template)

El esquema actual mezcla tres dimensiones que cambian por motivos distintos. La versión definitiva
debe separarlas:

| Dimensión | Qué contiene | Depende de |
|---|---|---|
| **toolchain** | build, test, lint, análisis estático, mutación, CRAP | lenguaje + build tool |
| **framework / runtime** | comando de arranque, puerto, health, métricas | framework de aplicación |
| **infra / QA** | Docker, nombre de servicio, entorno | despliegue |

Opciones a evaluar: perfil compuesto (`toolchain` + `framework` + `infra`) o secciones separadas en
un mismo archivo. Hasta decidirlo, **no se añaden perfiles al catálogo**.
