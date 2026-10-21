# Updating a configured project

> The template is a **scaffold**, not a runtime dependency. Updates are optional, explicit and safe.

---

## Versioning

- `template_version` (semver) lives in `.template/state.json`.
- `template_source` records the URL and commit used, so an update is reproducible.
- Packs have their own version in `pack.yaml`.

---

## Inputs and outputs

| File | Role |
|---|---|
| `.template/state.json` | **Inputs**: host, language, architecture, profile, packs, preferences |
| `.template/manifest.json` | **Outputs**: per file, `origin`, `sha256` and `ownership` |

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
     managed   -> hash(current) == hash(base) ? overwrite : write .new + conflict
5. Report: updated / conflicts / skipped
```

This version **never destroys** user work. A three-way merge for conflicts is a future improvement.

---

## Updating packs

- Only **activated** packs are updated.
- Inactive packs stay untouched in `.template/packs/`.
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
