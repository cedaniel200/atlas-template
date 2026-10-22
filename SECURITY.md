# Security, confidentiality and responsibility

> This document describes **what ATLAS does and does not do** with your data.
> It is not legal advice. For commercial use, review the license (`LICENSE`) and consult a professional.
>
> **Language:** English · [Español](SECURITY.es.md)

## What the repository includes

- Configuration, instructions and skills for agents.
- **No business data, credentials, tokens, keys or database connections.**
- The bootstrap may generate a `.env.example` with variable names, never values.

## What happens when you use it

An AI agent **can read any file in the repository** it has access to. What code, documentation or data
you expose when opening the project is your decision.

In addition, the template **suggests** (never activates by itself) tools that send information out of
the repository:

| Tool | What it sends out | Recommendation |
|---|---|---|
| **Context7** (documentation MCP) | The query written by the agent | Never include proprietary code, secrets or personal data in the query |
| **Persistent memory** (Engram or similar) | Session summaries | `.engram/` is in `.gitignore`; do not sync without deciding what is shared first |
| **Database MCP** | SQL queries to the server | Use read-only credentials and development data, never production |
| **CI/CD or deployment services** | Code and artifacts | Review your organization's policy before connecting them |

## Confidentiality

- The template **collects no telemetry** and sends no data to its author.
- Optional integrations are configured **per project and per tool**; their data policy is the one of
  the corresponding provider.
- Files in `.atlas/adapters/` and `.atlas/backups/` are **local state**: they are not versioned, but
  they are not a backup either.

## No warranty

The software is delivered **"AS IS"**, without warranty of any kind. The author is not responsible for
how it is used, for the decisions made by the agents or for the consequences derived from its
configuration. See `LICENSE`.

## Vulnerability reporting

If you find a security issue (for example, an instruction that could leak data or run unwanted
commands), open a private issue or contact the maintainer **without publishing exploitable details**.
Include: affected file, impact and reproduction steps.
