# Perfiles de stack

Un perfil es **datos**, no procedimiento: describe cómo se construye, se ejecuta y se valida un stack.
El bootstrap lo usa para rellenar los placeholders de `AGENTS.md` y para generar el bloque de comandos.

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
  crap_threshold: 6            # umbral por método (ver docs/QUALITY.md)
  coverage_min: null
  tools: []                    # herramientas reales del proyecto
  suggested: []                # mejoras propuestas por el template

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
- **Un perfil no activa packs**: solo informa la recomendación.
- Los valores se validan ejecutando el comando, no leyendo documentación.

## Disponibles en v1

| Perfil | Stack |
|---|---|
| `node-ts` | Node.js + TypeScript |
| `java-gradle` | Java + Gradle |

Añadir uno nuevo: copiar un perfil, ajustar los comandos y verificar que se ejecutan. No requiere
tocar el núcleo ni escribir skills.
