# Documentación del arnés (interna)

> Esta carpeta es para **mantenedores y contribuidores** de ATLAS, no para los proyectos que lo usan.
> Si solo usas el arnés, puedes eliminar `.atlas/docs/` (el bootstrap lo pregunta).

---

## Qué es el arnés

Un conjunto portable de instrucciones, procedimientos y configuración de OpenSpec que convierte a un
agente de código en un flujo disciplinado: explore → propose → apply → QA → review → cierre.

Es **agnóstico** de:

- **Dominio**: no hay términos de negocio embebidos.
- **Arquitectura**: cada proyecto declara la suya.
- **Herramienta**: OpenCode, Claude Code y Codex.
- **Stack**: los comandos vienen de un perfil, no de los prompts.

---

## Componentes

| Ruta | Qué es | Propiedad |
|---|---|---|
| `.atlas/agents/` | Prompts canónicos de rol, sin frontmatter de host | managed |
| `.agents/skills/` | Procedimientos portables bajo demanda | managed |
| `openspec/schemas/spec-driven-with-adr/` | Schema de OpenSpec vendorizado | managed |
| `.atlas/hosts/<host>/` | Plantillas de adaptador por herramienta | managed |
| `.atlas/profiles/` | Datos de stack: comandos, rutas, calidad | managed |
| `.atlas/packs/` | Conocimiento procedimental opcional | managed |
| `.atlas/state.json` | Entradas del bootstrap y estado | owned tras configurar |
| `.atlas/manifest.json` | Archivos generados, hashes y propiedad | generated |
| `AGENTS.md` | Contrato del proyecto: arquitectura, comandos, límites | owned |
| `.atlas/BOOTSTRAP.md` | Ritual de primera sesión | managed |
| `docs/` | Documentación (arnés, uso, proyecto) | mixta |

---

## Cómo funciona

```text
.atlas/BOOTSTRAP.md
  ├── detecta el host y crea su adaptador
  ├── interroga al usuario (idioma, stack, calidad, arquitectura, límites)
  ├── rellena AGENTS.md + openspec/config.yaml + docs
  └── valida el contrato y marca state.json como configured

AGENTS.md
  └── el contrato que lee todo agente: comandos, estructura, arquitectura, no tocar, preferencias
```

Los procedimientos detallados viven en skills, para que `AGENTS.md` siga siendo un contrato y no un manual.

---

## Principios de diseño

1. **Fuente única de verdad**: `AGENTS.md` para el proyecto, specs de OpenSpec para el comportamiento,
   ADRs para las decisiones.
2. **Procedimientos bajo demanda**: las skills se cargan solo cuando su trigger coincide.
3. **Sin stack oculto**: ningún comando, ruta o versión está hardcodeado en un prompt.
4. **Sin arquitectura impuesta**: el proyecto declara la suya; los prompts la siguen.
5. **Configuración determinista**: el bootstrap rellena placeholders; no sintetiza comportamiento.
6. **Cambios reversibles**: un commit por fase, sin borrar sin consentimiento.

---

## Dónde ir

- Extender el arnés: [`extending.md`](extending.md)
- Actualizar un proyecto configurado: [`updating.md`](updating.md)
- Usar el arnés: [`../../../docs/harness/es/QUICKSTART.md`](../../../docs/harness/es/QUICKSTART.md)
- Diferencias por herramienta: [`../../../docs/harness/es/COMPATIBILITY.md`](../../../docs/harness/es/COMPATIBILITY.md)
