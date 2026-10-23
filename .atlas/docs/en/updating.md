# Updating a configured project

> **Automated flow:** `node .atlas/scripts/actualizar-arnes.mjs --template <path>`.
> User guide: `docs/harness/en/UPDATE.md`. This document is the internal algorithm reference.

> The template is a **scaffold**, not a runtime dependency. Updates are optional, explicit and safe.

---

## Versioning

- `template_version` (semver) lives in `.atlas/state.json`.
- `template_source` records the URL and commit used, so an update is reproducible.
- Packs have their own version in `pack.yaml`.

---

## Inputs and outputs

| File | Role |
|---|---|
| `.atlas/state.json` | **Inputs**: host, language, architecture, profile, packs, preferences |
| `.atlas/manifest.json` | **Outputs**: per file, `origin`, `sha256` and `ownership` |

> **Hash format:** 64 lowercase hex chars, no filename, computed with
> `.atlas/scripts/sha256.sh` (POSIX) or `sha256.ps1` (PowerShell). Normalize to lowercase when
> comparing. If the project was generated on another OS, the hash only matches when the file is
> normalized to LF (the generated `.gitattributes` uses `* text=auto eol=lf`).

---

## Ownership

| `ownership` | Examples | On update |
|---|---|---|
| `managed` | skills, agent prompts, schemas | Replaced **only if the hash matches**; otherwise written as `<file>.new` and reported |
| `generated` | host adapter, command wrappers | Regenerated |
| `owned` | `AGENTS.md`, `config.yaml`, specs, ADRs, `docs/` | **Never overwritten**; only suggestions |

---

## Update algorithm

```text
1. Read state.json (inputs) and manifest.json (base)
2. Fetch the template at template_source.commit
3. Regenerate in a temporary directory with the SAME inputs
4. For each manifest entry:
     owned     -> skip
     generated -> overwrite
     managed   -> hash(current) == hash(base) (lowercase) ? overwrite : write .new + conflict
5. **Rewrite manifest.json** (new hashes, `template_version`, `generated_at`) and **state.json**
   (`template_version`, `template_source`, `updated_at`) — without this, the next update reports false conflicts
6. **Validate**: `node .atlas/scripts/validar-manifiesto.mjs`
7. Report: updated / unchanged / conflicts / skipped / host-owned
```

This version **never destroys** user work. A three-way merge for conflicts is a future improvement.

---

## Updating packs

- Only **activated** packs are updated.
- Inactive packs stay untouched in `.atlas/packs/`.
- An update can bump a pack version independently of the template version.

---

## Checklist

```bash
git status                                   # clean before updating
# fetch template at template_source.commit
# regenerate and compare per manifest
git diff --stat                              # review
openspec doctor && openspec context          # validate
```

- Review every `.new` file before merging.
- Do not update `owned` files automatically.
- Commit the update as a single logical change.

---

## Known limitations

- No three-way merge yet: conflicts are reported, not resolved.
- Ownership is recorded at bootstrap time; files created later must be added to the manifest manually.
- A renamed file appears as delete + add until the manifest is regenerated.
