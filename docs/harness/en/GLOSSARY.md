# Glossary

> Terms used in the harness documentation that are not always explained.

| Term | What it is |
|---|---|
| **Harness** | The set of instructions, skills, agents and configuration that guide the agent. |
| **Portable core** | What every project receives (`AGENTS.md`, skills, agents, schema, ritual). It does not depend on domain, architecture or host. |
| **Host** | OpenCode, Claude Code, Codex or Cursor. |
| **Adapter** | Files a host needs: `opencode.json`, `.claude/agents/`, `.cursor/agents/`, `CLAUDE.md`, `opsx-*` commands. |
| **Skill** | A reusable procedure the agent loads when the task matches its description. |
| **Role / agent** | `analyst`, `engineer`, `reviewer`, `qa-analyst`, `doc-writer`; optional: `mentor`, `business-strategist`. |
| **Pack** | Optional procedural knowledge (mobile, web, design, ddd, integrations). |
| **Profile** | Stack data: commands, paths, tools and thresholds. |
| **Ritual / bootstrap** | First session: detects the host, interviews, generates the context and validates it. |
| **Gate** | Blocking condition: approved artifact, QA, PR, archive/merge. |
| **`managed` / `generated` / `owned`** | File ownership for updates: replaced, regenerated or left untouched. |
| **`state.json` / `manifest.json`** | Bootstrap inputs and generated outputs (hashes and ownership). |
