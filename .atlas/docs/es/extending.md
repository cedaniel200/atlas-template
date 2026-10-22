# Extender el arnés

> Todo lo de aquí es **canónico**: se cambia una vez y el bootstrap lo propaga a los proyectos nuevos.

---

## Añadir una skill

1. Crear `.agents/skills/<nombre>/SKILL.md`.
   > `.opencode/skills/` es la ruta nativa de OpenCode y tiene prioridad sobre `.agents/skills/`.
   > Úsala solo para skills propias del host; las compartidas van en `.agents/skills/` para no
   > quedar sombreadas por un ID duplicado.
2. Frontmatter:

```yaml
---
name: <kebab-case, coincide con la carpeta>
description: <cuándo usarla; se carga en cada sesión>
license: MIT
compatibility: <opcional>
metadata: <opcional, mapa de strings>
---
```

3. Reglas:
   - Un procedimiento por skill.
   - Sin términos de dominio; usar `<placeholders>`.
   - Sin comandos hardcodeados: se leen de `AGENTS.md`.
   - Sin sintaxis de comandos slash; los wrappers se generan por host.
   - Breve; el detalle largo va a un archivo de referencia hermano.
4. Registrarla en `AGENTS.md` § Skill Registry.
5. Regenera el manifiesto (`node .atlas/scripts/generar-manifiesto.mjs --host <host>`) y valida
   (`node .atlas/scripts/validar-manifiesto.mjs`).
6. Si viene de otro repositorio, conservar su licencia y añadirla a `THIRD-PARTY-NOTICES.md`.

---

## Añadir un agente

1. Crear `.atlas/agents/<rol>.md` con el cuerpo del prompt y **sin frontmatter de host**.
2. Nombrarlo por rol, no por arquitectura (`analyst`, no `ddd-analyst`).
3. El renderer (`renderizar-adaptadores.mjs`) genera los adaptadores:
   - OpenCode: `.opencode/agent/<rol>.md` (`description`, `mode: all`).
   - Claude Code: `.claude/agents/<rol>.md` (`name`, `description`).
   - Codex: sin subagentes; el rol se emula desde `AGENTS.md`.
   - Multi-stack: `engineer-<stack>` por stack con `STACK_CONTEXT`; `state.stacks` es la fuente.
4. Si el rol es **opcional**, empieza el prompt con `<!-- optional-role -->` y regístralo en
   `state.optional_agents` (el bootstrap lo pregunta en la Ronda 4). Sin ese id no se genera su adaptador.
5. Registrar el rol en `AGENTS.md` § Roles.

---

## Añadir un pack

Un pack existe solo para **conocimiento procedimental que no se puede expresar como comando o ruta**.

```text
.atlas/packs/<pack>/
  pack.yaml
  README.md
  skills/<nombre>/SKILL.md
  .atlas/agents/<rol>.md
```

```yaml
name: <pack>
version: 0.1.0
description: <qué aporta>
provides: [skills/<nombre>]
requires: [profile:<perfil>]
stack_hints: [<stack>]
license: MIT
```

- **No** se descubre automáticamente; el bootstrap lo copia a `.agents/skills/` y `.atlas/agents/`.
- Nunca es requisito para que el núcleo funcione.
- Registrarlo en el catálogo de packs y en `THIRD-PARTY-NOTICES.md` si vendoriza contenido de terceros.
- Actívalo en `state.stacks[].packs` (la unión va a `state.packs`); el bootstrap copia solo los packs activos y registra sus skills en `AGENTS.md § Skill Registry`.
- Versión: `pack.yaml`; en una actualización solo se actualizan los packs activos.

---

## Añadir un perfil

Un perfil es **dato**, no procedimiento. El esquema está en `.atlas/profiles/README.md`.

- Solo comandos, rutas, nombres de herramientas y umbrales.
- Sin valores de framework bajo un nombre de toolchain (por ejemplo, sin rutas de Spring en `java-gradle`).
- Si un comando no existe, dejar `""` y anotarlo; nunca inventarlo.
- Validar el YAML y ejecutar los comandos antes de commitear.

---

## Añadir un adaptador de host

1. Crear `.atlas/hosts/<host>/` con los archivos que el host necesita en la raíz del proyecto.
2. Documentarlo en `.atlas/hosts/README.md`.
3. Actualizar `docs/harness/es/COMPATIBILITY.md` con la matriz y cualquier degradación.
4. El bootstrap debe poder crear el adaptador sin destruir los de otras herramientas.

---

## Adopción y README

- `adoptar-agents.mjs` migra un `AGENTS.md` existente a la base + `docs/project-context.md`.
- `combinar-readme.mjs` añade al README existente solo las secciones que falten de `PROJECT-README.md`.

---

## Gobernanza de skills

- **Estructura (disclosure progresiva):** `SKILL.md` = **núcleo** (cuándo, pasos, reglas, checklist e
  **índice de referencias**); `references/*.md` = ejemplos, anti-patrones y checklists largos que se
  leen **solo cuando hacen falta**. El núcleo debe decir **cuándo** leer cada referencia. **Solo para
  skills propias** con material de referencia largo; **no** para las externas (`generatedBy`), que se
  actualizan desde la herramienta.
- **Idioma:** cuerpo y `description` en **inglés** (`language.agent`). La `description` incluye ejemplos
  de disparo en **varios idiomas** (`update the template`, `actualiza el arnés`), porque el usuario puede
  pedirlo en cualquier idioma: el agente debe casar la **intención**, no la frase exacta.

- Toda skill se registra en `AGENTS.md` § Skill Registry; una skill sin registro está huérfana.
- Valida el descubrimiento con `ls .agents/skills/*/SKILL.md` y, si el host lo permite, reinicia y
  comprueba que aparece.
- Marca las skills del núcleo como `managed` en el manifiesto; las de packs, como opcionales.
- Antes de modificar una skill existente, busca quién la invoca
  (`grep -rn "<skill>" .atlas/agents .agents/skills docs`) y avisa de posibles roturas.
- No hay versionado de skills todavía: si el cambio es incompatible, documenta la migración en el commit.

## Checklist de verificación

```bash
# skills
for f in .agents/skills/*/SKILL.md; do sed -n '1,5p' "$f"; done
# referencias de agentes (informativo: nunca falla)
grep -rn "ddd-\|opencode\|claude" .atlas/agents/ .agents/skills/ || true
# perfiles (gate): estructural sin dependencias; con `npm i yaml` añade parseo real
node .atlas/scripts/validar-perfiles.mjs
# contrato de placeholders (gate)
node .atlas/scripts/validar-contrato.mjs
# coste de contexto (informativo: detecta archivos que engordan el arnés)
node .atlas/scripts/medir-contexto.mjs
# contrato
openspec doctor && openspec context
```

> **Solo dependencias declaradas.** Toda comprobación del harness usa Git, Node 20+, OpenSpec CLI y
> shell POSIX. Si necesita otra herramienta, debe **detectarla y avisar**; nunca asumirla.
> Un check que no puede ejecutarse no debe fingir que pasó.

## Coste de contexto (diagnóstico de mantenimiento)

`medir-contexto.mjs` **no es un gate** y no se ejecuta en el bootstrap: es una herramienta de
**mantenimiento** para comprobar que el arnés no engorda y comparar antes/después de un cambio. Un
equipo puede usarla si añade skills, agentes o packs propios.

```bash
node .atlas/scripts/medir-contexto.mjs          # informe legible
node .atlas/scripts/medir-contexto.mjs --json   # línea base comparable
```

Qué mide (estimación **estática**, sin conversación ni tool outputs):

| Grupo | Qué incluye |
|---|---|
| Base de sesión | AGENTS.md + descripciones de skills + config del host |
| Arranque mínimo | BOOTSTRAP + AGENTS + PLACEHOLDERS + perfiles + host |
| Arranque completo | lo anterior + los prompts de agente (5 core + 2 opcionales) |
| Por agente | base + prompt + **núcleo** (`SKILL.md`) de las skills que menciona |
| Techo | todo el arnés cargado a la vez (**incluye** las referencias on-demand) |

**Cómo leerlo:** proxy `~4 caracteres/token` (en español hasta ~3,5 → +15%). Presupuesto orientativo:
**base ≤ 4k**, **por agente ≤ 14k** (las 5 skills externas de OpenSpec son un coste fijo: no se optimizan sin forkearlas). Si crece, ataca primero el mayor contribuyente: skills largas →
disclosure progresiva; `AGENTS.md` → mover referencia a docs enlazados.

## Añadir un stack

1. Añade una fila a `state.stacks` (`id`, `profile`, `paths`, comandos, `packs`).
2. Rellena `AGENTS.md` § Stacks (`{{STACKS_TABLE}}`); incluye `Install`, `Build`, `Run`, `Test`, `Lint` y `Quality`.
3. Ejecuta `renderizar-adaptadores.mjs`: se genera `engineer-<id>` por stack.
4. Activa los packs del stack (`state.stacks[].packs`) y copia solo sus skills/agentes.

Los packs opcionales viven en [`.atlas/packs/`](../../packs/README.md) y no consumen contexto hasta
que se activan. Un stack sin pack usa el perfil y el proceso del núcleo.

## Core vs pack

- **Core**: `.agents/skills/` (workflow; se instala siempre).
- **Pack**: `.atlas/packs/<id>/` (tecnología o procedimiento; solo se copia si está activo en `state.stacks[].packs`).
- **Versión**: el pack en `pack.yaml`; el core sigue la versión del template.
