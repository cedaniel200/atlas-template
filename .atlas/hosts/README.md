# Per-host adapter templates

The repository starts **neutral**: it does not include any tool configuration at the root.
The bootstrap (Phase 0) detects the host and **copies what it needs from here**.

| Host | Template | Creates at the root |
|---|---|---|
| OpenCode | `opencode/opencode.json` | `opencode.json` |
| Claude Code | *(no template: verify the `CLAUDE.md` stub)* | `.claude/agents/`, `.claude/skills` (symlink); `CLAUDE.md` already exists |
| Codex | *(no template required)* | Nothing: it reads `AGENTS.md` and `.agents/skills/` natively |
| Cursor | `cursor/mcp.json` | `.cursor/agents/` (rendered adapters) and `.cursor/mcp.json` **only if missing**; it reads `AGENTS.md` and `.agents/skills/` natively |

## Rules

- **Never hardcode models**: the host uses its global configuration or the bootstrap asks.
- **Never version** credentials, database URLs or API keys.
- `opsx-*` commands are **not** written here: `openspec update --tools <host>` generates them.
- Validate an adapter by opening the project with that tool and checking that skills are discovered and
  `AGENTS.md` is loaded.
