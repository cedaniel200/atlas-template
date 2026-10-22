# Third-party notices

This repository **redistributes** third-party material. Each component keeps the license of its
origin. If you redistribute ATLAS, keep this file and the copyright notices.

> **Language:** English · [Español](THIRD-PARTY-NOTICES.es.md)

## Vendored skills

| Skill(s) | Origin | License |
|---|---|---|
| `openspec-explore`, `openspec-propose`, `openspec-apply-change`, `openspec-archive-change`, `openspec-sync-specs` | [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | MIT — Copyright (c) 2024 OpenSpec Contributors |
| `grilling`, `grill-me`, `grill-with-docs`, `teach` | [mattpocock/skills](https://github.com/mattpocock/skills) | MIT — Copyright (c) 2026 Matt Pocock |
| `test-driven-development`, `using-git-worktrees` | [obra/superpowers](https://github.com/obra/superpowers) | MIT — Copyright (c) 2025 Jesse Vincent |
| `architectural-decision-records` | [intent-driven-dev/openspec-schemas](https://github.com/intent-driven-dev/openspec-schemas) | MIT — Copyright (c) 2026 |

> The OpenSpec skills were adapted to remove host-tool command syntax. The rest of the content is
> unchanged.

## OpenSpec schema

| Component | Origin | License |
|---|---|---|
| `openspec/schemas/spec-driven-with-adr/` (schema + templates) | [intent-driven-dev/openspec-schemas](https://github.com/intent-driven-dev/openspec-schemas) | MIT — Copyright (c) 2026 |

## Original ATLAS material

| Component | License |
|---|---|
| `AGENTS.md`, `CLAUDE.md`, `.atlas/BOOTSTRAP.md`, `.atlas/PROJECT-README.md`, `.atlas/agents/`, `docs/README.md`, `docs/harness/`, `.atlas/docs/`, `.atlas/` | MIT (see `LICENSE`) |
| Local skills `gherkin-specs`, `conventional-commits`, `implementation-standards`, `session-startup`, `session-end`, `git-workflow`, `openspec-workflow` | MIT (see `LICENSE`) |

## Runtime dependencies (not redistributed)

| Tool | Use | License |
|---|---|---|
| [OpenSpec CLI](https://github.com/Fission-AI/OpenSpec) | Spec-driven workflow (`openspec …`) | MIT |
| [OpenCode](https://opencode.ai) | Host tool (optional) | See its repository |
| Claude Code | Host tool (optional) | See its repository |
| Codex | Host tool (optional) | See its repository |
| Context7 (MCP) | Documentation verification (optional) | External service |

> When adding a pack or a new skill, **update this table** with origin and license.
