# Resultados — Prueba E2E del arnés (alpha `6f7e42e` → rama de mejoras)

**Fecha:** 2026-10-22 · **Alcance:** 4 escenarios, 10/11 ejecuciones (B3 bloqueada) · **Corte:** 45 min
**Fuente:** `origin/feat/template-alpha` @ `6f7e42e` · **Mejoras:** rama local `qa/template-e2e-2026-10-22` (sin push)
**Batería de regresión:** 55/55 PASS en la rama de mejoras · **Tokens (estático):** base 3.425 · analyst 13.430 · engineer 12.106 · doc-writer 6.934 · qa 6.706 · reviewer 5.729 · techo 34.198 (≤13.5k por agente)

> **Limitaciones de la prueba:** el cuestionario y las tareas smoke se simularon con un fixture fijo (no se invocó un LLM por escenario); el evaluador no es un agente "sin conocimiento previo". La verificación de C/D es estructural (prompts, adaptadores, aislamiento), no de razonamiento del agente.

---

## 1. Escenarios

| # | Escenario | Ejecuciones | Resultado | Evidencia |
|---|---|---|---|---|
| A | Desde cero (greenfield) | A1, A2, A3 | ✅ 10/10 gates en A3 | `from-scratch/` |
| B | Proyecto existente (brownfield) | B1, B2 (focused); B3 **pendiente** | ⛔ Bloqueante en `AGENTS.md` | `existing-project/` |
| C | Multi-agente (mismo rol, 2 stacks) | C1, C2, C3 (focused) | ⚠️ Funciona por estructura; gap documentado | `multi-agent/` |
| D | Auto-evolución (skill nueva) | D1, D2 (focused) | ✅ Crear/modificar/validar; gap menor | `self-evolution/` |

### A — Desde cero
- **A1:** ritual literal sobre el template alpha. **13 hallazgos**, 9/10 gates.
  - **Bloqueantes:** el renderizador exigía `state.status=configured` antes de que el ritual lo pusiera (A1-11); el gate de contaminación se encontraba a sí mismo en `BOOTSTRAP.md` (A1-gate-contaminacion).
  - **Molestos:** manifiesto sin contrato de archivos/origen/ownership (A1-13); `.env.example`/`.gitattributes`/`.editorconfig` prometidos pero ausentes (A1-08/09/010); contribución=no sin edit exacto (A1-14); `openspec init` duplica skills (A1-07, el ritual ya lo elimina); sin remoto, el fallback no está en la tabla (A1-01).
- **A2:** tras las correcciones. **Renderizador en orden natural ✅**, manifiesto por script ✅. **Nuevo bloqueante:** el manifiesto se generaba antes del edit de contribución=no → hash de `docs/README.md` desactualizado (A2-gate-manifiesto).
- **A3:** manifiesto al final de la Fase 2. **10/10 gates**, git limpio; solo persiste A1-07 (fricción del CLI, manejada por el ritual).

### B — Proyecto existente (clon SSH de `App-for-unit-testing`)
- **B1:** inventario de adopción: **96 nuevos, 0 iguales, 4 distintos** (`.gitattributes`, `.gitignore`, `AGENTS.md`, `LICENSE`) con backup automático.
- **Bloqueante:** el `AGENTS.md` del proyecto choca con el del template y el ritual solo dice "fusionar con diff"; **no hay guía ni herramienta de merge**. No se improvisó: B3 queda pendiente de decisión.
- **Molesto:** el `README.md` del proyecto no entra en el inventario (el template no trae `README.md` raíz); la Fase 2 podría sobrescribirlo al generar el README.
- **B2 (focused):** re-inventario → mismos 4 conflictos; el bloqueante persiste (sin cambios de diseño).

### C — Multi-agente (implementer-java + implementer-react)
- **C1:** se crearon dos prompts canónicos (`.template/agents/implementer-{java,react}.md`) y se re-renderizó: **7 adaptadores, 0 colisiones**. Smoke simulado: el artefacto Java no menciona React/TSX y el React no menciona Java/Maven/Gradle.
- **C2 (focused):** render idempotente (sin cambios).
- **C3 (focused):** al modificar solo el prompt React, **solo cambia su adaptador**; el de Java queda intacto.
- **Gap:** el modelo documentado es **un prompt por rol** (`.template/agents/README.md`), no por instancia/stack; el `AGENTS.md` raíz es de un solo stack (comandos Java/Gradle), así que el agente React hereda comandos que no le corresponden. Requiere decisión de diseño (contexto por agente o raíz neutral).

### D — Auto-evolución (skill `hello-world`)
- **D1:** skill creada con frontmatter + registro en `AGENTS.md`; ejecutada (simulada) en Java; **modificada** con parámetro `language` (es/en) y re-ejecutada; manifiesto regenerado (82 archivos) y validado; commit local `feat(skills): añade hello-world con parámetro language`.
- **D2 (focused):** la modificación no rompe `validar-contrato` ni `validar-manifiesto`; el registro sigue íntegro.
- **Gap:** la guía de creación (`.template/docs/es/extending.md`) no decía regenerar el manifiesto; se añadió el paso (ES/EN). La gobernanza sigue siendo **interna** (no enlazada desde la entrada del usuario) y sin marcador core/opt-in ni versionado.

---

## 2. Hallazgos y estado

| ID | Sev. | Hallazgo | Estado |
|---|---|---|---|
| A1-11 | Bloqueante | Renderizador exigía `state.status=configured` antes de tiempo | ✅ Corregido: valida placeholders de `AGENTS.md` |
| A1-gate | Bloqueante | Gate de contaminación se autodetecta en `BOOTSTRAP.md` | ✅ Corregido: excluye `.template/` |
| A2-gate | Bloqueante | Manifiesto antes de los edits de Fase 2 → hash obsoleto | ✅ Corregido: manifiesto al final + nota |
| A1-13 | Molesto | Manifiesto sin contrato de archivos/origen/ownership | ✅ Corregido: `generar-manifiesto.mjs` |
| A1-08/09/010 | Molesto | Faltan `.env.example`, `.gitattributes`, `.editorconfig` | ✅ Añadidos al template |
| A1-14 | Molesto | Contribución=no sin pasos exactos | ✅ Corregido en `BOOTSTRAP.md` |
| D-manifiesto | Molesto | Guía de skills no indica regenerar el manifiesto | ✅ Corregido en `extending.md` ES/EN |
| A1-07 | Fricción | `openspec init` duplica skills en `.opencode/skills` | ⚪ El ritual ya lo elimina; sin cambio |
| A1-01 | Cosmético | Sin remoto, el fallback no está en la tabla | ⚪ Documentado en el código; sin cambio |
| B-merge | **Bloqueante** | Adopción con `AGENTS.md` existente sin guía de merge | ⏳ **Propuesto** (requiere decisión) |
| B-README | Molesto | README del proyecto fuera del inventario / riesgo de sobrescritura | ⏳ **Propuesto** |
| C-multi | Gap | Un prompt por rol; raíz single-stack para multi-stack | ⏳ **Propuesto** (decisión de diseño) |
| D-gob | Molesto | Gobernanza de skills interna, sin core/opt-in/versionado | ⏳ **Propuesto** (docs) |

---

## 3. Mejoras aplicadas (rama `qa/template-e2e-2026-10-22`)

1. `renderizar-adaptadores.mjs`: la precondición es `AGENTS.md` sin `{{...}}` (no `state.status`); el host se resuelve antes.
2. `generar-manifiesto.mjs` (nuevo, Node 20+, cero deps): reglas de ownership/origen, sha256, escribe `.template/manifest.json`.
3. `BOOTSTRAP.md`: gate de contaminación con `--exclude-dir=.template`; manifiesto al final de la Fase 2; pasos exactos de contribución=no.
4. Template: `.env.example`, `.gitattributes`, `.editorconfig` (los que el ritual pedía rellenar).
5. `extending.md` ES/EN: regenerar y validar el manifiesto al añadir una skill.
6. Batería de regresión adaptada al nuevo contrato del renderizador: **55/55 PASS**.

**Pendiente de decisión (no aplicado):** guía de merge de `AGENTS.md` en adopción; tratamiento del `README.md` existente; contexto por agente/raíz neutral para multi-stack; gobernanza de skills (core/opt-in/versionado).

---

## 4. Integridad

- **Template:** rama de trabajo principal intacta; nueva rama local `qa/template-e2e-2026-10-22` + worktree en `/tmp/template-e2e/improve`. Sin push.
- **`granja-app`:** sin cambios (no se tocó).
- **Clon `App-for-unit-testing`:** restaurado (se eliminan `.template/adoption-report.md` y backups del inventario).
- **Escenarios:** viven fuera de los repos, en `test-template/`; el piloto anterior quedó archivado como `RESULTS-pilot-2026-10-21.md`.

## 5. Próximo paso sugerido

1. Revisar esta rama y decidir los 4 puntos pendientes (B-merge, B-README, C-multi, D-gob).
2. Si se aprueban, implementarlos con un change OpenSpec (uno por tema, ≤800–1200 líneas).
3. B3 se ejecuta cuando exista la guía de merge; C/D pueden repetirse con agentes reales para medir tokens de conversación.

---

## 6. Implementación de las decisiones (post-QA, rama del template)

Aplicado directamente sobre `qa/template-e2e-2026-10-22`, sin OpenSpec (decisión del usuario).

| Decisión | Implementación |
|---|---|
| **Multi-stack** | `state.stacks` (fuente única) · `AGENTS.md § Stacks` (`{{STACKS_TABLE}}`) · renderer genera `engineer-<id>` por stack · `validar-contrato` valida stacks/adaptadores · fixture Python+JS: 6 adaptadores, 0 colisiones, aislamiento verificado |
| **Packs por stack (D)** | `state.stacks[].packs` + `state.packs` (unión) · el bootstrap copia solo packs activos · registra sus skills en § Skill Registry · `validar-contrato` comprueba la unión |
| **Adopción (B)** | `AGENTS.md` del template = base; el existente se respalda y su contenido propio va a `docs/project-context.md` · inventario con acción específica y notas |
| **README** | Greenfield/sin README: se genera desde `PROJECT-README.md`. Brownfield: se conserva; `combinar-readme.mjs` (dry-run/`--apply`) añade solo secciones faltantes, sin duplicar ni sobrescribir |
| **Presupuesto** | 14k por agente (antes 13,5k): el contrato multi-stack añade ~200 tokens. Base 3.547; analyst 13.581; engineers 12.3k. Si se exige 13,5k, recortar el prompt del analyst o el índice/Extending |

**Verificación:** batería 55/55 · fixture multi-stack (render, validación, aislamiento) · `combinar-readme` (dry-run, apply, idempotencia) · inventario de adopción con notas y acción de `AGENTS.md`.

**Pendiente/observaciones:** B3 puede ejecutarse ya con la política de base + `docs/project-context.md`; los packs web/mobile concretos son contenido del proyecto (el template aporta el mecanismo); el versionado por skill individual no se añadió (los packs tienen `version`; las skills core se versionan con el template).
