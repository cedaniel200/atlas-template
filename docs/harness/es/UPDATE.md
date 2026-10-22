# Actualizar el arnés

> El template es un **andamio**, no una dependencia. Actualizar es opcional, explícito y **nunca destructivo**.

---

## Cuándo

- Hay una versión nueva del template y quieres sus mejoras (skills, gates, prompts).
- **No actualices a mitad de un cambio**: termina o archiva el cambio primero.

## Qué necesitas

- `.template/state.json` con `template_source` (url + commit) y `.template/manifest.json` (lo genera el bootstrap).
- `state.stacks` (multi-stack), `state.packs` y `state.readme` (si existen) para conservar la configuración.
- **Node 20+** (el único runtime que asume el arnés).
- Una copia del template nuevo (clone o checkout del tag/commit).

## Pasos

1. **Obtén el template nuevo** en un directorio temporal:

   ```bash
   git clone <url-del-template> /tmp/template-nuevo
   git -C /tmp/template-nuevo checkout <tag-o-commit>
   ```

2. **Ejecuta la actualización** desde la raíz de tu proyecto:

   ```bash
   node .template/scripts/actualizar-arnes.mjs --template /tmp/template-nuevo
   ```

   - `owned` (AGENTS.md, config, docs, adr, specs) → **no se toca**.
   - `generated` (adaptadores, `opencode.json`, `CLAUDE.md`) → **se regenera** (adaptadores con placeholders resueltos).
   - `managed` (skills, prompts, schemas, packs activos) → se reemplaza **solo si no lo modificaste**; si lo modificaste, se escribe `<archivo>.new`.
   - Antes de escribir, copia lo que reemplaza a `.template/backups/<timestamp>/`.
   - **Actualiza `manifest.json` y `state.json`** (versión, commit y hashes) para que la próxima actualización no dé falsos conflictos.

3. **Resuelve los conflictos** (`.new`):

   ```bash
   diff -u <archivo> <archivo>.new   # fusiona a mano
   rm <archivo>.new
   ```

4. **Valida**:

   ```bash
   node .template/scripts/validar-manifiesto.mjs
   node .template/scripts/validar-contrato.mjs
   node .template/scripts/validar-perfiles.mjs
   openspec doctor && openspec context
   ```

5. **Commit**: `chore(arnes): actualizar a <versión>`.

## Qué NO hace

- No sobrescribe `owned`.
- No borra archivos: si el template elimina uno, lo **reporta**.
- **Packs**: los activos se actualizan como `managed` (si no los modificaste); los inactivos y el catálogo `.template/packs` no se tocan. Se activan/desactivan a mano.
- No resuelve conflictos por ti.

## Rollback

Copia de vuelta los archivos desde `.template/backups/<timestamp>/`.

## Para agentes

La skill **`update-harness`** describe el mismo flujo. Usa el script; no improvises hashes ni sobrescribas `owned`.
