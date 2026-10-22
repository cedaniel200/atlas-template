# Extender el arnés

> Todo lo de aquí es **canónico**: se cambia una vez y el bootstrap lo propaga a los proyectos nuevos.

---

## Añadir una skill

1. Crear `.agents/skills/<nombre>/SKILL.md`.
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
5. Si viene de otro repositorio, conservar su licencia y añadirla a `THIRD-PARTY-NOTICES.md`.

---

## Añadir un agente

1. Crear `.template/agents/<rol>.md` con el cuerpo del prompt y **sin frontmatter de host**.
2. Nombrarlo por rol, no por arquitectura (`analyst`, no `ddd-analyst`).
3. El bootstrap genera los adaptadores:
   - OpenCode: `.opencode/agent/<rol>.md` (`description`, `mode: all`).
   - Claude Code: `.claude/agents/<rol>.md` (`name`, `description`).
   - Codex: sin subagentes; el rol se emula desde `AGENTS.md`.
4. Registrar el rol en `AGENTS.md` § Roles.

---

## Añadir un pack

Un pack existe solo para **conocimiento procedimental que no se puede expresar como comando o ruta**.

```text
.template/packs/<pack>/
  pack.yaml
  README.md
  skills/<nombre>/SKILL.md
  .template/agents/<rol>.md
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

- **No** se descubre automáticamente; el bootstrap lo copia a `.agents/skills/` y `.template/agents/`.
- Nunca es requisito para que el núcleo funcione.
- Registrarlo en el catálogo de packs y en `THIRD-PARTY-NOTICES.md` si vendoriza contenido de terceros.

---

## Añadir un perfil

Un perfil es **dato**, no procedimiento. El esquema está en `.template/profiles/README.md`.

- Solo comandos, rutas, nombres de herramientas y umbrales.
- Sin valores de framework bajo un nombre de toolchain (por ejemplo, sin rutas de Spring en `java-gradle`).
- Si un comando no existe, dejar `""` y anotarlo; nunca inventarlo.
- Validar el YAML y ejecutar los comandos antes de commitear.

---

## Añadir un adaptador de host

1. Crear `.template/hosts/<host>/` con los archivos que el host necesita en la raíz del proyecto.
2. Documentarlo en `.template/hosts/README.md`.
3. Actualizar `docs/harness/es/COMPATIBILITY.md` con la matriz y cualquier degradación.
4. El bootstrap debe poder crear el adaptador sin destruir los de otras herramientas.

---

## Gobernanza de skills

- **Estructura (disclosure progresiva):** `SKILL.md` = **núcleo** (cuándo, pasos, reglas, checklist e
  **índice de referencias**); `references/*.md` = ejemplos, anti-patrones y checklists largos que se
  leen **solo cuando hacen falta**. El núcleo debe decir **cuándo** leer cada referencia.
- **Idioma:** cuerpo y `description` en **inglés** (`language.agent`). La `description` incluye ejemplos
  de disparo en **varios idiomas** (`update the template`, `actualiza el arnés`), porque el usuario puede
  pedirlo en cualquier idioma: el agente debe casar la **intención**, no la frase exacta.

- Toda skill se registra en `AGENTS.md` § Skill Registry; una skill sin registro está huérfana.
- Valida el descubrimiento con `ls .agents/skills/*/SKILL.md` y, si el host lo permite, reinicia y
  comprueba que aparece.
- Marca las skills del núcleo como `managed` en el manifiesto; las de packs, como opcionales.
- Antes de modificar una skill existente, busca quién la invoca
  (`grep -rn "<skill>" .template/agents .agents/skills docs`) y avisa de posibles roturas.
- No hay versionado de skills todavía: si el cambio es incompatible, documenta la migración en el commit.

## Checklist de verificación

```bash
# skills
for f in .agents/skills/*/SKILL.md; do sed -n '1,5p' "$f"; done
# referencias de agentes (informativo: nunca falla)
grep -rn "ddd-\|opencode\|claude" .template/agents/ .agents/skills/ || true
# perfiles (gate): estructural sin dependencias; con `npm i yaml` añade parseo real
node .template/scripts/validar-perfiles.mjs
# contrato de placeholders (gate)
node .template/scripts/validar-contrato.mjs
# coste de contexto (informativo: detecta archivos que engordan el arnés)
node .template/scripts/medir-contexto.mjs
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
node .template/scripts/medir-contexto.mjs          # informe legible
node .template/scripts/medir-contexto.mjs --json   # línea base comparable
```

Qué mide (estimación **estática**, sin conversación ni tool outputs):

| Grupo | Qué incluye |
|---|---|
| Base de sesión | AGENTS.md + descripciones de skills + config del host |
| Arranque mínimo | BOOTSTRAP + AGENTS + PLACEHOLDERS + perfiles + host |
| Arranque completo | lo anterior + los 5 prompts de agente |
| Por agente | base + prompt + **núcleo** (`SKILL.md`) de las skills que menciona |
| Techo | todo el arnés cargado a la vez (**incluye** las referencias on-demand) |

**Cómo leerlo:** proxy `~4 caracteres/token` (en español hasta ~3,5 → +15%). Presupuesto orientativo:
**base ≤ 4k**, **por agente ≤ 12k**. Si crece, ataca primero el mayor contribuyente: skills largas →
disclosure progresiva; `AGENTS.md` → mover referencia a docs enlazados.
