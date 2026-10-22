---
name: actualizar-arnes
description: Use when the user asks to update the template or harness (new template version, "actualiza el arnés", "update the template"). Applies ownership rules, resolves conflicts and updates the manifest/state.
license: MIT
---

# Actualizar el arnés

Flujo para llevar una versión nueva del template a un proyecto ya configurado. **Nunca sobrescribe
archivos `owned` ni borra archivos.**

## Cuándo

- El usuario pide actualizar el template/arnés, o hay un tag/commit nuevo del template.
- No a mitad de un cambio: termina o archiva primero.

## Pasos

1. **Comprueba el estado**: `.template/state.json` (`template_source`) y `.template/manifest.json`.
2. **Obtén el template nuevo** en un directorio temporal (`git clone` + `checkout <tag|commit>`).
3. **Ejecuta el script** desde la raíz del proyecto:
   `node .template/scripts/actualizar-arnes.mjs --template <ruta>`
   - `owned` → omitido · `generated` → regenerado (adaptadores con placeholders resueltos) ·
     `managed` → reemplazado si el hash coincide, si no `<archivo>.new`.
   - Hace backup y **reescribe `manifest.json` y `state.json`** (versión, commit, hashes).
4. **Resuelve conflictos**: `diff -u <archivo> <archivo>.new`, fusiona a mano y borra el `.new`.
5. **Valida**: `validar-manifiesto`, `validar-contrato`, `validar-perfiles`, `openspec doctor` y
   `openspec context`.
6. **Commit**: `chore(arnes): actualizar a <versión>` y reporta actualizados/conflictos/omitidos.

## Reglas

- **No improvises hashes**: usa `sha256.sh`/`sha256.ps1` o los scripts.
- **No sobrescribas `owned`** (AGENTS.md, config, docs, adr, specs).
- Si el template elimina un archivo, **repórtalo**; no lo borres.
- Los packs se activan/desactivan a mano (`.template/packs/README.md`).

Guía para personas: `docs/harness/es/UPDATE.md` (o `docs/harness/en/UPDATE.md`).
