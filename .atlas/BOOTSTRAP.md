# BOOTSTRAP.md — ATLAS first-session ritual

> **Runs once per project, before writing code.**
> State: `.atlas/state.json` (`pending` → `configured`).
> If `status` is `configured`, **do not read or repeat** this file; offer explicit reconfiguration.
>
> The agent runs this file. The human answers the questions and approves each phase.

---

## Ritual rules

1. **Do not write business code** in any phase.
2. **Do not delete anything.** Anything that does not apply is moved to `.atlas/adapters/<host>/`.
3. **Idempotent**: each phase can be repeated without duplicating effects.
4. **One commit per phase**, with the indicated prefix.
5. **If a phase fails, do not advance** to the next.
6. **Do not invent commands, paths or versions.** Unknown values are marked `TBD` and listed in
   `AGENTS.md § Pending`.

---

# Phase −2 — Isolation (before touching anything)

The bootstrap writes files: **it never runs on a branch with uncommitted work**.

1. `git status --porcelain` must be empty. If not, stop and ask for a commit or stash.
2. Detect the default branch:

   ```bash
   BASE=$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')
   [ -n "$BASE" ] || BASE=$(git branch --show-current)
   ```

   If the repo has no remote, `BASE` falls back to the current branch.

3. Choose the branch:

   | Situation | Branch |
   |---|---|
   | Greenfield without product history | The default branch (or `chore/bootstrap` if the repo already exists) |
   | Brownfield | `chore/bootstrap` (or a `.worktrees/bootstrap` worktree) |
   | Shared repo or doubt | `chore/bootstrap` always |

4. Create the branch if applicable:

   ```bash
   git checkout -b chore/bootstrap
   ```

5. One commit per phase. **No push or PR** unless the user explicitly asks.
6. When done: state the branch used and ask for review; **the user performs the merge**.

> **Declared exception:** the bootstrap is the only task that does not follow the "one worktree per
> change" rule. It uses its own setup branch so it does not contaminate project work.

---

# Phase −1 — Adoption mode

## −1.1 Detect

| Signal | Mode |
|---|---|
| Code, build, tests, CI or git history with product commits | **Brownfield** (existing project) |
| Empty repo or only the template | **Greenfield** (from scratch) |

Confirm with the user before continuing.

Record the confirmed mode in `.atlas/state.json` → `mode` (`greenfield` | `brownfield`). The
documentation script reads it: `--descartar-docs` is rejected unless `mode` is `greenfield`.

## −1.2 Inventory (read-only, brownfield)

Inspect and record the inventory in `.atlas/adoption-report.md` (guide: `docs/harness/<lang>/ADOPTION.md`):

| Detected | Action |
|---|---|
| Build/tooling (`pom.xml`, `build.gradle`, `package.json`, `pyproject.toml`, `go.mod`…) | Pre-fill profile and commands |
| Tests, lint, CI, Docker | Pre-fill the quality and QA menu |
| `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, agent rules | **Merge with diff**, never overwrite |
| Existing `openspec/` | Merge `context:` and `rules:`; do not replace specs |
| Project-owned `.opencode/agent/`, `.claude/agents/`, `.agents/skills/` | Preserve; adapt only what collides |
| `.env`, secrets, credentials | Detect and **do not** copy values |

## −1.3 Conflict policy

```text
backup in .atlas/backups/<timestamp>/ → diff → merge → user confirmation
```

A project file is never overwritten without diff and approval. Greenfield and brownfield converge in
Phase 1, with answers pre-filled in brownfield.

**Commit:** `chore(bootstrap): detect <greenfield|brownfield> mode`

---

# Phase 0 — Host tool (mandatory)

## 0.1 Detection

```bash
env | grep -E '^(OPENCODE|CODEX_[A-Z_]+|CLAUDECODE|CLAUDE_CODE|CURSOR_CLI)=' || echo "NO_SIGNAL"
```

| Signal | Tool |
|---|---|
| `OPENCODE` | **OpenCode** |
| `CODEX_CI`, `CODEX_THREAD_ID` or `CODEX_SANDBOX` | **Codex** |
| `CLAUDECODE` or `CLAUDE_CODE` | **Claude Code** |
| `CURSOR_CLI` | **Cursor** (integrated terminal) |
| no signal | **Ask** |

Secondary evidence (tie-breaker only): `opencode.json` → OpenCode; `.claude/` → Claude Code; `.codex/` →
Codex; `.cursor/` → Cursor. If there is no environment signal but there is `.cursor/` evidence, propose
Cursor and **ask for confirmation** before adapting. If the signal and the evidence disagree, **stop and
ask**. `CURSOR_CLI` is not officially documented, so evidence plus confirmation is the safety net.

## 0.2 Adaptation

**It is additive by default**: nothing is moved; only the missing adapter is created.

| Action | OpenCode | Claude Code | Codex | Cursor |
|---|---|---|---|---|
| `opencode.json` | create from `.atlas/hosts/opencode/` | ignore | ignore | ignore |
| `.atlas/agents/` | canonical source | canonical source | canonical source | canonical source |
| Agent adapter | `.opencode/agent/<role>.md` | `.claude/agents/<role>.md` | *(no subagents)* | `.cursor/agents/<role>.md` |
| Skills | `.agents/skills/` (canonical) + `.opencode/skills/` (native, takes precedence) | `.claude/skills` → symlink to `.agents/skills` | `.agents/skills/` (native) | `.agents/skills/` (native) |
| `CLAUDE.md` | preserve | must contain only `@AGENTS.md` | preserve | preserve |
| MCP | `opencode.json` → `mcp` | Claude configuration | Codex configuration | `.cursor/mcp.json` from `.atlas/hosts/cursor/mcp.json`, **only if missing** |

Cursor reads `AGENTS.md` natively and needs neither `opencode.json` nor `CLAUDE.md`; it does **not**
create `.cursor/rules/` (there is a single source of instructions). The MCP file is created **only when
it is missing**, announced to the human and never overwritten: after that it belongs to the project and
is not registered in `.atlas/manifest.json` (§ 0.4).

**`prune` (opt-in, never by default):** if the user asks, move non-active host artifacts to
`.atlas/adapters/<host>/` and record it in `state.json.displaced`. Recover with `git revert`.

## 0.3 Skills

| Host | Action | Verification |
|---|---|---|
| OpenCode / Codex / Cursor | none | `ls .agents/skills/*/SKILL.md` |
| Claude Code | `ln -s ../.agents/skills .claude/skills` | `readlink .claude/skills` |
| Claude Code without symlink (Windows) | copy and warn that it is static | `diff -r .agents/skills .claude/skills` |

Cursor discovers `.agents/skills/` natively: no copy and no link, so there is a single canonical copy.

**Packs**: not copied by default. Copy only `.atlas/packs/<id>/skills` and
`.atlas/packs/<id>/agents` for packs active in `state.stacks[].packs`; the rest consumes no context.
`state.packs` is the union of all stacks' packs. Register pack skills in
`AGENTS.md` § Skill Registry and their `{name, version}` in `state.packs`.

## 0.4 Commands

They are not written by hand: OpenSpec generates them.

```bash
cp AGENTS.md /tmp/agents.bootstrap.bak
openspec init --tools <opencode|claude|codex|cursor>
diff /tmp/agents.bootstrap.bak AGENTS.md && echo "AGENTS.md unchanged" || echo "⚠️ review and merge"

# .opencode/skills/ is OpenCode's native path and takes precedence over
# .agents/skills/. Do not delete the directory: it can host team-owned skills.
ls .agents/skills | sort > /tmp/skills-agents.txt
ls .opencode/skills 2>/dev/null | sort > /tmp/skills-opencode.txt
comm -12 /tmp/skills-agents.txt /tmp/skills-opencode.txt  # duplicate IDs, if any
```

Expected output: `.opencode/commands/opsx-*` · `.claude/commands/opsx/*` · `.codex/prompts/*` ·
`.cursor/commands/opsx-*`.
`openspec update` does not accept `--tools`: use it only to update already generated instructions.
If `openspec init` rewrites `AGENTS.md`, restore it from the backup and merge only what is new.

**Cursor MCP:** if the host is Cursor and `.cursor/mcp.json` does not exist, copy it from
`.atlas/hosts/cursor/mcp.json` and announce that it was created. If it already exists, **do not modify
it**: report that it was preserved. The file is the project's from then on and is not added to the
manifest. `openspec init` does not create it.

**If `comm` returns one or more IDs, stop and ask the human. Do not continue until the human
answers.** Present exactly these three options:

| Option | What it does | Consequence |
|---|---|---|
| **(a) recommended** | Delete **only the duplicate IDs** from `.opencode/skills/`, so the canonical `.agents/skills/` wins | Same behavior across every supported host |
| **(b)** | Keep the native `.opencode/skills/` | Template canonical skills are shadowed and do not receive their improvements |
| **(c)** | Keep both, with an explicit justification recorded | Two copies of the same skill; the recorded reason explains why |

Record the answer in `.atlas/state.json` → `skills`, so it is never implicit:

```json
"skills": { "duplicates": ["<ids>"], "decision": "canonical|host|both", "reason": null }
```

- `decision` is `canonical` (a), `host` (b) or `both` (c).
- `reason` is mandatory text when `decision` is `both`; otherwise `null`.
- If there are no duplicates, keep `{ "duplicates": [], "decision": null, "reason": null }`.

The ritual **never** deletes the whole `.opencode/skills/` directory: option (a) removes **only the IDs
listed by `comm`** and leaves team-owned skills in place. Repeat the decision after every
`openspec init` that recreates the duplicates.

**Commit:** `chore(bootstrap): adapt the environment to <host>`

---

# Phase 1 — Interview

Run the interview in **5 rounds (0–4)**, grouping questions.

## Round 0 — Language

| Question | Values | Where it is stored |
|---|---|---|
| User language (README, project docs, messages) | `es`, `en`, other | `language.user` |
| Agent language (AGENTS.md, prompts, skills, OpenSpec context) | `en` (default) or the user's | `language.agent` |

## Round 1 — Identity and stack

1. Name and one-sentence description.
2. Stack and versions (language, framework, dependency manager, runtime).
3. Top-level structure (monorepo? modules?).
4. Base package / namespace.
5. Stack profile: **there is no catalog**. Start from `.atlas/profiles/_templates/profile.yaml`, propose
   real commands and create `.atlas/profiles/<id>.yaml` with `crear-perfil.mjs`. The user validates,
   corrects or removes it. If an `_examples/` example fits, use it as a reference; do not copy it.
6. **Stacks** (multi-stack): if the project mixes technologies (e.g. Python back + JS front + mobile),
   ask for one row per stack: `id`, `profile`, `paths`, commands and `packs`. The **first** is the
   default (fills § Commands); the rest go to § Stacks. The § Stacks table includes the commands
   (`Install`, `Build`, `Run`, `Test`, `Lint`, `Quality`) so the contract is self-contained.
   One stack = one row.

## Round 2 — Commands and quality

| Category | Question / suggestion |
|---|---|
| Build / run / test | Real commands; if unknown, `TBD` |
| Lint and static analysis | Checkstyle/ESLint/ruff/… |
| Coverage | JaCoCo/c8/pytest-cov/… |
| Mutation | PIT/Stryker/mutmut/… |
| **CRAP** | Per-method threshold; default **6** (see `docs/harness/<lang>/QUALITY.md`) |
| Secrets | gitleaks (tool-agnostic) |
| QA environment | Docker yes/no, service, port, health, metrics (no health or port → `N/A`) |

## Round 3 — Architecture, domain and boundaries

1. **Architecture**: `layered`, `hexagonal`, `ddd`, `custom`, or "whatever the project already uses".
   It is declared in `AGENTS.md` § Architecture; none is imposed.
2. **Domain**: 2–3 initial modules/contexts and 5–10 business-language terms.
3. **Do Not Touch Rules**: files, folders, APIs, migrations the agent must never modify.
4. **Git convention**: branches, PR, merge.
5. **Documentation** (two parts, one question):
   - **Root**: where the project documentation lives. Default `docs/`; store it in `state.docs.root`.
   - **Optional sections**: ask which of `functional`, `architecture`, `api` and `guides` the project
     wants. Store each accepted one in `state.docs.<area>` as its project-relative path **including the
     root** (e.g. `docs/architecture`); the rest stay `null`. Never create a section the user did not
     choose.
   - **Bilingual landing**: a second landing (`<root>/README.en.md`) is created **only if the human
     asks for it explicitly**; record it in `state.docs.bilingual` (`false` by default). Never invent a
     translation.

   These always exist, whatever the answers: `<root>/README.md`, `<root>/project-context.md`,
   `<root>/harness/` and the ADR directory (`adr/` by default, recorded in `AGENTS.md § Document map`,
   not in `state.docs`).

   **Brownfield:** detect `docs/`, `documentation/`, `doc/` and `wiki/` first. If the project already has
   documentation, ask before using or relocating it: never overwrite an existing README and never move
   documentation without confirmation. If the user chooses a new root, ask **"move or keep both"** and
   pass the matching flag when running the script from Phase 2 (`--mover-docs` or `--mantener-ambas`).
   Never leave a duplicate `docs/` behind without an explicit decision.
6. **Persistent memory**: Engram, another, or none. If unsure, **suggest Engram**; `.engram/` is not
   versioned by default.
7. **OpenSpec commands**: `user` (always the human), `agent` (always the agent) or `ask` (ask at each
   session). Default: `ask`.
8. **Orchestration**: orchestrated (default) or manual.
9. **Contribution**: will you only use the harness or also contribute? If you only use it:
   `mkdir -p .atlas/archive && mv .atlas/docs .atlas/archive/docs`; in `docs/README.md`
   remove the "Internal harness" row; in `AGENTS.md § Extending` remove the bullets pointing to
   `.atlas/docs/` and any link to `.atlas/docs/`.
10. **README**: if the project already has a `README.md`, should the missing sections from
    `.atlas/PROJECT-README.md` be added? (append only; never overwrite).

## Round 4 — Optional agents

Ask **one by one**, in this order. In each question state explicitly: **(optional)**, **what it does**,
**that it is not part of the delivery cycle** and that **it remains available to invoke when needed**.
Do not present them as recommended or activate them by default.

| Role | What it does |
|---|---|
| `mentor` | Teaches, agnostically, the concepts and patterns the project uses (DDD, architecture, design) according to its context and stack; explains the code and generates learning material |
| `business-strategist` | Business model, value proposition, segments, pricing and channels (`docs/business/`) |

| Answer | Action |
|---|---|
| Yes | Add the id to `state.optional_agents` |
| No | Do not add it (default: `[]`) |

- **Codex**: it has no subagents. Explain that the role cannot be installed and omit it; do not add it
  to the state.
- If the user hesitates: they can activate it later by adding the id to `state.optional_agents` and
  regenerating adapters.

> If the user answers "whatever", choose their stack default **and say so** so they can correct it.
> Answers are written directly to `AGENTS.md`; commands are never invented.

---

# Phase 2 — Generation

| Artifact | What to fill |
|---|---|
| `AGENTS.md` | Summary, architecture, commands, **Stacks**, structure, do-not-touch, preferences, placeholders |
| `openspec/config.yaml` | `context:` and `rules:` blocks (design rules for the chosen architecture) |
| `.atlas/PROJECT-README.md` → project `README.md` | Greenfield/no README: generate. Brownfield with README: preserve and ask about append |
| `docs/project-context.md` | Project-specific context (brownfield: migrate the existing `AGENTS.md`) |
| `.env.example` / `.gitattributes` / `.editorconfig` | **Only if they do not exist**: create them with the stack conventions (detected variables, EOL, indentation). If they exist, preserve them. They do not come from the template. |
| `.gitignore` | Stack, secrets, local state (create it if missing) |
| `docs/` | `node .atlas/scripts/aplicar-docs.mjs` (add `--mover-docs`, `--mantener-ambas` or `--descartar-docs` only with the user's confirmation). It creates only the selected sections and updates `AGENTS.md § Document map`, the landing files and the project README |
| `CLAUDE.md` | Verify the one-line stub: `@AGENTS.md` |
| Adapters | Agents and commands for the detected host |
| `.atlas/docs/` | If not contributing, move to `.atlas/archive/docs/` and remove the index row |
| `.atlas/legal/` | Template legal moved from the root (see below) |
| `.atlas/manifest.json` | `origin`, `sha256` and `ownership` per generated file |

### Adapter and manifest generation

- **Agents**: generate the host adapter with
  `node .atlas/scripts/renderizar-adaptadores.mjs --host <host>`. The script replaces the
  placeholders from `AGENTS.md` § Placeholders (OpenCode: `description` + `mode: all`; Claude Code:
  `name` + `description`; Cursor: `name` + `description` + `model: inherit`; Codex: no subagents).
  **Do not copy the body by hand.**
  - **Stacks**: each stack is rendered as `engineer-<id>` (even with only one). Without stacks, the
    bootstrap `engineer.md` is generated and removed when the first stack appears. The other roles are
    stack-agnostic.
  - **Optional agents**: only the ids in `state.optional_agents` are rendered (Round 4). Prompts
    marked with `<!-- optional-role -->` that are not active are omitted.
- **Git hooks**: activate the hooks path **idempotently** — only when there is no path configured or it
  is already the harness one. Never overwrite a foreign path (husky, lefthook): report it and offer
  chaining (`.atlas/docs/en/` and `docs/harness/<language.user>/HOOKS.md`).

  ```bash
  RUTA=$(git config --get core.hooksPath || true)
  if [ -z "$RUTA" ]; then
    git config core.hooksPath .githooks
    echo "Git hooks activated: .githooks"
  elif [ "$RUTA" = ".githooks" ]; then
    echo "Git hooks already active: .githooks"
  else
    echo "Git hooks path preserved: $RUTA (chain the harness hooks; do not overwrite it)"
  fi
  ```
- **README (brownfield)**: if `README.md` exists, **do not overwrite it**. Ask:
  "Should the missing sections from `.atlas/PROJECT-README.md` be added?". Dry run:
  `node .atlas/scripts/combinar-readme.mjs --proyecto .`; if accepted, `--apply`. Record
  `state.readme` (`generated|preserved|appended`).
- **AGENTS.md (brownfield)**: `node .atlas/scripts/adoptar-agents.mjs --template <pristine> --apply`
  (backup + template base + project content to `docs/project-context.md`); then fill the base
  placeholders in this Phase 2. It is not a merge of equals.
- **Template legal**: in `greenfield` (or if the user accepts in brownfield), move the template legal
  to `.atlas/legal/`:
  `node .atlas/scripts/mover-legal.mjs --apply`. It moves `LICENSE`, `SECURITY.md`, `SECURITY.es.md`,
  `THIRD-PARTY-NOTICES.md` and `THIRD-PARTY-NOTICES.es.md`, and updates the links in `docs/README.md`
  and `docs/README.en.md`. **It does not generate a project license**: if the user wants one, they
  request it explicitly. In brownfield, if the project already has its own legal files, do not move them.
- **Manifest**: `node .atlas/scripts/generar-manifiesto.mjs --host <host>`. It applies the ownership
  and origin rules (owned: AGENTS/config/README/docs/adr/specs; managed: skills/prompts/schemas/packs/legal;
  generated: adapters/commands/opencode.json/CLAUDE.md; `.cursor/mcp.json` is excluded because it belongs
  to the user), computes `sha256` and writes
  `.atlas/manifest.json`. **Contract: 64 lowercase hex characters, no file name** (enforced by the script).
  **Run it at the end of Phase 2**, after placeholders, docs and contribution; if you change a file later, run it again.
- **Shell**: the ritual uses POSIX commands (`sh`, `grep`, `diff`, `mkdir`). On Windows run it from
  **Git Bash or WSL** (recommended). If the host runs PowerShell, at least the hash must come from the
  `.ps1` helper; if there is no POSIX shell or PowerShell, **stop** and ask the user — do not invent
  the hash with another tool.
- **Placeholders**: the profile and the answers are the source of values; replace them in `AGENTS.md`,
  `openspec/config.yaml` and `README.md`. Do not leave `{{...}}`.

Rules:

- Replace **all** `{{...}}` in the previous files. When done:
  `grep -r "{{" AGENTS.md openspec/config.yaml README.md` must return **empty**.
- **Language (agent)**: `AGENTS.md`, `.atlas/docs/en/`, `.atlas/agents/`, `.agents/skills/`,
  the `context:` block of `openspec/config.yaml` and `state.architecture.notes` are written in
  `language.agent` (English by default); they are the agent's contract and procedure.
  **Translate the interview answers before writing them into these files**; never paste
  `language.user` prose into an agent-language file.
- **Language (human)**: `README.md`, `<root>/README.md`, `<root>/project-context.md` and
  `<root>/harness/<language.user>/` are written in `language.user`. If it is not Spanish,
  **translate** `<root>/README.md`, use the guides in `<root>/harness/<language.user>/` and update
  their links to `<root>/harness/<language.user>/` and `.atlas/docs/<language.user>/`; do not leave `es/`
  links in an English project.
- `ownership`: `owned` (AGENTS.md, config.yaml, docs, adr, specs), `managed` (skills, prompts, schemas),
  `generated` (adapters, commands, CLAUDE.md).
- If the user provided domain terms, replace the `<entity>` examples in the skills.
- `TBD` items go to `AGENTS.md` § Pending with the reason.
- **Do not create `openspec/project.md`**: the context lives in `openspec/config.yaml`.

**Commit:** `docs(bootstrap): complete the project context`

---

# Phase 3 — Validation (blocking gate)

Advancing to `propose` is not allowed until **everything** is green.

- [ ] `AGENTS.md` has `## Commands` with ≥1 real command
- [ ] `AGENTS.md` has `## Structure` and `## Do Not Touch Rules`
- [ ] `AGENTS.md` has `## Preferences` with `language`, OpenSpec commands and orchestration
- [ ] `AGENTS.md` has `## Architecture`
- [ ] `AGENTS.md`, the `openspec/config.yaml` `context:` block and `state.architecture.notes` are
  written in `language.agent`; no `language.user` prose leaked
- [ ] No `{{...}}` remains in `AGENTS.md`, `openspec/config.yaml` and `README.md`
- [ ] Placeholder contract is consistent: `node .atlas/scripts/validar-contrato.mjs`
- [ ] Profiles are valid: `node .atlas/scripts/validar-perfiles.mjs`
- [ ] Manifest is consistent: `node .atlas/scripts/validar-manifiesto.mjs`
- [ ] Adapters without placeholders: `grep -rn "{{" .opencode/agent .claude/agents .cursor/agents` → empty (if they exist)
- [ ] Git hooks path active: `git config --get core.hooksPath` → `.githooks` (a foreign path is preserved and reported; if gitleaks is missing the secret guard warns and does not block, but the base-branch guard still runs)
- [ ] No health/port: if `qa.health_path` or `qa.app_port` are empty, `HEALTH_URL` is `N/A` (never compose a URL with an empty path)
- [ ] `openspec doctor` → root ok
- [ ] `openspec schema which spec-driven-with-adr` → `Source: project`
- [ ] `openspec context` → no warnings
- [ ] `ls .agents/skills/*/SKILL.md` → ≥1 skill
- [ ] Duplicate skill IDs: `state.skills` records the human's decision (or there were none)
- [ ] Active host adapter present (agents and commands)
- [ ] Cursor only: `.cursor/mcp.json` was created when missing (and announced) or preserved untouched; it is not in `.atlas/manifest.json`
- [ ] Optional agents: only those chosen in `state.optional_agents` have an adapter
- [ ] Stacks: each one has `engineer-<stack>.md` and no `engineer.md` remains
- [ ] Template legal: if moved, `.atlas/legal/` has the five files and the root is free; if the project has its own, they remain at the root
- [ ] Documentation is idempotent: `node .atlas/scripts/aplicar-docs.mjs --dry-run` reports nothing pending
- [ ] No template contamination: `grep -rniE "example-domain|template-domain" --exclude-dir=.git --exclude-dir=.atlas --exclude-dir=node_modules .` → no results
- [ ] `.atlas/manifest.json` generated
- [ ] `git status` clean and phases committed
- [ ] One-time handoff message delivered in `language.user` (Phase 3.5)

If something fails: fix and repeat. If the user insists on skipping the gate:

```json
{ "status": "configured", "override_reason": "<user's textual reason>" }
```

…and warn: *"The OpenSpec flow is at risk: proposal/specs will be generated without project context."*

When closing:

```json
{ "status": "configured", "phase": 3, "configured_at": "<ISO-8601>" }
```

**Commit:** `chore(bootstrap): validate the project context`

Announce: **"Bootstrap complete. You can now propose a change."**

**Optional minimization:** ATLAS may not need all its internal material. If the user is not going to
contribute to the template, offer to minimize it, but **never run it without explicit confirmation**:

```bash
node .atlas/scripts/minimizar.mjs --dry-run --all
node .atlas/scripts/minimizar.mjs --apply --examples --hosts
```

State the consequences before asking:

- Nothing is deleted: it moves to `.atlas/archive/` (gitignored).
- Archived files are **no longer updated** by `actualizar-arnes`; restore them from git or the template.
- `.atlas/docs/` is archived only if `AGENTS.md` and `docs/README*` no longer link to it.
- Active profiles, packs and skills are not touched.

Ask: **"Do you want me to minimize ATLAS now?"** and wait for the answer.

# Phase 3.5 — Handoff (one-time)

After the gate is green and the optional minimization decision is resolved, deliver a short handoff
to the human in `language.user`. **Do not write it to a file** and do not create a commit for it; it is
a one-time onboarding message.

Include:

- how to start a session: *"In this session we will work on …"*;
- the normal flow: `analyst` explores and proposes → human approves → `engineer` implements → QA and
  `reviewer` validate → `doc-writer` updates documentation → PR → human reviews;
- the close: the human approves `archive`; `archive` + sync is committed **inside the PR, before
  merge**; then merge and cleanup;
- the fallback: if the PR is merged without archive, open a new archive branch/PR and **never rewrite
  `main`**;
- a link to `docs/harness/<language.user>/QUICKSTART.md`;
- that this is explained once; repeat it only if the human asks.

**After the bootstrap:** do not repeat this ritual. Agent procedure for stacks, profiles, packs or
agents: `.atlas/docs/en/extending.md` (human version: `.atlas/docs/<language.user>/extending.md`).

---

## Re-run and host change

| Situation | Action |
|---|---|
| `status == configured` | Do not repeat. Reconfigure only on explicit request |
| Host change | Phase 0 with the new host (including Cursor); restore adapters from `.atlas/adapters/` or `git revert` |
| Repo cloned again | `.atlas/state.json` travels in git → the ritual skips itself |

## What this ritual does NOT do

- It does not install stack dependencies.
- It does not configure MCP beyond creating the host template when it is missing (Cursor: `.cursor/mcp.json`); MCP is per tool (see `docs/harness/<lang>/COMPATIBILITY.md`).
- It does not create specs, ADRs or business code.
- It does not decide the architecture: it collects it and declares it.
