# `.atlas/` — ritual state and material

This directory is the **only** place in the repo that knows the project is not configured yet.
It is consumed by `.atlas/BOOTSTRAP.md` on the first session.

## Structure

| Path | Versioned | Purpose |
|---|---|---|
| `state.json` | ✅ yes | **Inputs**: ritual state and decisions taken |
| `manifest.json` | ✅ yes | **Outputs**: generated files, hash and ownership (base for updates) |
| `BOOTSTRAP.md` | ✅ yes | First-session ritual |
| `PLACEHOLDERS.md` | ✅ yes | Closed placeholder contract: profile/project layers, states (`N/A`) and derivations |
| `PROJECT-README.md` | ✅ yes | Project README template (copied to `README.md` on adoption; content in `language.user`) |
| `agents/` | ✅ yes | Canonical role prompts; the bootstrap generates adapters from here |
| `docs/` | ✅ yes | Internal harness documentation (`en/` canonical, `es/` translation) |
| `hosts/<host>/` | ✅ yes | Per-tool adapter templates |
| `profiles/<stack>.yaml` | ✅ yes | **Data** per stack: commands, paths, quality |
| `profiles/_templates/` | ✅ yes | Profile template; not validated as a profile |
| `packs/<pack>/` | ✅ yes | Optional **procedure** (skills/agents), outside discovery |
| `packs/_templates/` | ✅ yes | Pack skeleton; not activated |
| `legal/` | ✅ yes | Template legal moved when configuring a project (LICENSE, SECURITY, THIRD-PARTY) |
| `scripts/` | ✅ yes | Portable helpers (Node/shell only): `sha256.*` (hash), `renderizar-adaptadores.mjs` (tests: `node --test .atlas/scripts/*.test.mjs`), `actualizar-arnes.mjs`, `validar-manifiesto.mjs`, `inventariar-adopcion.mjs`, `adoptar-agents.mjs`, `combinar-readme.mjs`, `generar-manifiesto.mjs`, `aplicar-docs.mjs` (optional documentation sections), `crear-perfil.mjs`, `crear-pack.mjs`, `mover-legal.mjs`, `minimizar.mjs`, `validar-run.mjs`, `medir-contexto.mjs` (maintenance diagnostic) and `validar-perfiles.mjs`/`validar-contrato.mjs` (gates) |
| `adapters/<host>/` | ❌ no (gitignored) | Artifacts displaced by `prune` (local state) |
| `archive/` | ❌ no (gitignored) | Material archived by minimization (docs, examples, inactive hosts) |
| `run/<change>/` | ❌ no (gitignored) | Ephemeral state for an experimental parallel run (per change or `program.json`) |
| `backups/<timestamp>/` | ❌ no (gitignored) | Copy before a brownfield merge |

### The difference matters

- **Profile = data.** Commands, paths, tools, thresholds. A new one can be added in ~40 lines of YAML
  and any stack becomes supported.
- **Pack = procedure.** Knowledge that **cannot** be reduced to a command (patterns, checklists,
  configuration). It is optional: ATLAS works without packs.

## `state.json` — inputs

| Field | Values | Meaning |
|---|---|---|
| `bootstrap_version` | integer | Ritual version used for setup |
| `template_version` | semver | ATLAS version used as the base |
| `template_source` | `{url, commit}` | Origin for reproducible updates |
| `status` | `pending` \| `configured` | If `configured`, the ritual is not repeated |
| `mode` | `greenfield` \| `brownfield` \| `null` | How ATLAS was adopted |
| `host` | `opencode` \| `claude` \| `codex` \| `null` | Host tool |
| `host_source` | `env` \| `user` \| `files` \| `null` | How it was determined |
| `language.user` | `es` \| `en` \| other \| `null` | User documentation language |
| `language.agent` | `en` (default) | Skills and prompt language |
| `architecture.stance` | `null` \| free text | Chosen stance: `layered`, `hexagonal`, `ddd`, `custom`… |
| `architecture.notes` | text \| `null` | Boundary rules declared by the project |
| `profile` | profile id \| `null` | Stack profile applied |
| `packs` | list | Activated packs |
| `stacks` | list | Project stacks: `id`, `profile`, `paths`, commands and `packs` |
| `readme` | `generated` \| `preserved` \| `appended` \| `null` | Policy applied to the project `README.md` |
| `optional_agents` | list | Activated optional roles (`mentor`, `business-strategist`) |
| `skills.duplicates` | list | Duplicate skill IDs detected between `.agents/skills/` and `.opencode/skills/` |
| `skills.decision` | `canonical` \| `host` \| `both` \| `null` | Human decision for the duplicates (mandatory when they exist) |
| `skills.reason` | text \| `null` | Justification; mandatory when `decision` is `both` |
| `preferences.openspec_commands` | `user` \| `agent` \| `ask` | Who runs OpenSpec commands |
| `preferences.orchestration` | `orchestrated` \| `manual` | Whether the analyst chains phases or the user invokes them |
| `quality.crap_threshold` | integer | CRAP threshold per method (default `6`) |
| `docs.root` | relative path | Documentation root (default `docs`) |
| `docs.functional`, `docs.architecture`, `docs.api`, `docs.guides` | path \| `null` | Selected section (project-relative, includes the root); `null` = not used |
| `phase` | `0`–`3` | Last completed phase |
| `displaced` | list | Paths moved to `adapters/` or `archive/` |
| `override_reason` | text \| `null` | Reason if the user skipped the validation gate |
| `configured_at` | ISO-8601 \| `null` | Setup date |

## `manifest.json` — outputs and updates

```json
{
  "template_version": "0.1.0",
  "generated_at": "2026-10-21T12:00:00Z",
  "note": "Generated by the bootstrap. Do not edit by hand.",
  "files": {
    ".agents/skills/conventional-commits/SKILL.md": {
      "origin": "core",
      "sha256": "…",
      "ownership": "managed"
    },
    "AGENTS.md": {
      "origin": "core",
      "sha256": "…",
      "ownership": "owned"
    },
    "opencode.json": {
      "origin": "host:opencode",
      "sha256": "…",
      "ownership": "generated"
    }
  }
}
```

### File ownership

| `ownership` | Examples | On ATLAS update |
|---|---|---|
| `managed` | skills, prompts, profile/pack templates | Replaced **only if the hash matches** the manifest; otherwise `<file>.new` is written and a conflict is reported |
| `generated` | host adapter, `opsx-*` wrappers | Always regenerated |
| `owned` | `AGENTS.md`, `config.yaml`, specs, ADRs, `docs/` | **Never overwritten**; only new sections are suggested |

### Update algorithm (v1)

```
1. Read state.json (inputs) and manifest.json (base)
2. Fetch ATLAS at `template_source.commit`
3. Regenerate in a temporary directory with the SAME inputs
4. Per manifest file:
     owned     -> skip
     generated -> overwrite
     managed   -> hash(current) == hash(base) ? overwrite : write .new + conflict
5. Report: updated / conflicts / skipped
```

Hash-based updates **never destroy** user work: modified files are reported as conflicts instead of
being overwritten.

## Rules

1. **Nothing is deleted.** Anything that does not apply is moved to `adapters/` (recoverable with
   `git revert`).
2. **The root is born neutral.** No tool configuration exists at the root until the bootstrap
   generates it from `hosts/`.
3. **One commit per phase.** The ritual leaves an explicit trace in history.
4. **A pack is never a requirement** for ATLAS to work.
