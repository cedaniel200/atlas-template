# Actualizar un proyecto configurado

> **Flujo automatizado:** `node .atlas/scripts/actualizar-arnes.mjs --template <ruta>`.
> Guía para personas: `docs/harness/es/UPDATE.md`. Este documento es la referencia interna del algoritmo.

> El template es un **andamio**, no una dependencia de ejecución. Las actualizaciones son opcionales,
> explícitas y seguras.

---

## Versionado

- `template_version` (semver) vive en `.atlas/state.json`.
- `template_source` registra la URL y el commit usados, para que la actualización sea reproducible.
- Los packs tienen su propia versión en `pack.yaml`.

---

## Entradas y salidas

| Archivo | Rol |
|---|---|
| `.atlas/state.json` | **Entradas**: host, idioma, arquitectura, perfil, packs, preferencias |
| `.atlas/manifest.json` | **Salidas**: por archivo, `origin`, `sha256` y `ownership` |

> **Formato del hash:** 64 hex en **minúsculas**, sin nombre de archivo, calculado con
> `.atlas/scripts/sha256.sh` (POSIX) o `sha256.ps1` (PowerShell). Al comparar, normaliza a
> minúsculas. Si el proyecto se generó en otro sistema operativo, el hash solo coincide si el
> archivo está normalizado a LF (el `.gitattributes` generado usa `* text=auto eol=lf`).

---

## Propiedad

| `ownership` | Ejemplos | Al actualizar |
|---|---|---|
| `managed` | skills, prompts, schemas | Se reemplaza **solo si el hash coincide**; si no, se escribe `<archivo>.new` y se reporta |
| `generated` | adaptador de host, wrappers de comandos | Se regenera |
| `owned` | `AGENTS.md`, `config.yaml`, specs, ADRs, `docs/` | **Nunca** se sobrescribe; solo sugerencias |

---

## Algoritmo de actualización

```text
1. Leer state.json (entradas) y manifest.json (base)
2. Obtener el template en template_source.commit
3. Regenerar en un directorio temporal con las MISMAS entradas
4. Por cada archivo del manifiesto:
     owned     -> omitir
     generated -> sobrescribir
     managed   -> hash(actual) == hash(base) (en minúsculas) ? sobrescribir : escribir .new + conflicto
5. **Reescribir manifest.json** (hashes nuevos, `template_version`, `generated_at`) y **state.json**
   (`template_version`, `template_source`, `updated_at`) — sin esto, la próxima actualización da falsos conflictos
6. **Validar**: `node .atlas/scripts/validar-manifiesto.mjs`
7. Reporte: actualizados / sin cambios / conflictos / omitidos / ajenos al template
```

Esta versión **nunca destruye** trabajo del usuario. El merge a tres bandas para conflictos es una mejora
futura.

---

## Actualizar packs

- Solo se actualizan los packs **activados**.
- Los inactivos quedan intactos en `.atlas/packs/`.
- Un pack puede subir de versión independientemente del template.

---

## Checklist

```bash
git status                                   # limpio antes de actualizar
# obtener el template en template_source.commit
# regenerar y comparar según el manifiesto
git diff --stat                              # revisar
openspec doctor && openspec context          # validar
```

- Revisar cada archivo `.new` antes de mergear.
- No actualizar automáticamente archivos `owned`.
- Commitear la actualización como un único cambio lógico.

---

## Limitaciones conocidas

- Sin merge a tres bandas: los conflictos se reportan, no se resuelven.
- La propiedad se registra en el bootstrap; los archivos creados después deben añadirse al manifiesto a mano.
- Un archivo renombrado aparece como borrar + añadir hasta regenerar el manifiesto.
