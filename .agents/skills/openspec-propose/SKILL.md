---
name: openspec-propose
description: Propose a new change with all artifacts generated in one step. Use when the user wants to quickly describe what they want to build and get a complete proposal with design, specs, and tasks ready for implementation.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.5.0"
---

Propose a new change — create the change and generate all artifacts in one step (proposal, design,
specs, adr, tasks as the schema requires).

**Store selection:** If the user names a store (a standalone OpenSpec repo registered on this machine)
or the work lives in one, run `openspec store list --json` and pass `--store <id>` on the commands that
read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`,
`archive`, `doctor`, `context`). Other commands do not take the flag.

**Input**: a change name (kebab-case) or a description of what to build.

**Steps**

1. **If no clear input, ask what they want to build** (open-ended). Derive a kebab-case name
   (`add user authentication` → `add-user-auth`). Do NOT proceed without understanding the change.
2. **Create the change**: `openspec new change "<name>"` (scaffolds `.openspec.yaml` in the planning
   home resolved by the CLI).
3. **Get the artifact build order**: `openspec status --change "<name>" --json`. Parse `applyRequires`
   (artifact IDs needed before implementation), `artifacts` (status + dependencies), and
   `planningHome`/`changeRoot`/`artifactPaths`/`actionContext` (use these instead of assuming paths).
4. **Create artifacts in dependency order** (track with TodoWrite):
   - For each `ready` artifact, get instructions:
     `openspec instructions <artifact-id> --change "<name>" --json`.
   - The JSON gives `template` (structure), `resolvedOutputPath` (where to write), `instruction`
     (schema guidance), `context`/`rules` (constraints for you — **never copy them into the file**)
     and `dependencies` (read them first).
   - Write the artifact to `resolvedOutputPath` using `template`; show "Created <artifact-id>".
   - After each artifact, re-run `openspec status` and stop when every `applyRequires` artifact is
     `done`. If an artifact needs user input, ask.
5. **Show final status**: `openspec status --change "<name>"`.

**Output**: summarize change name/location, artifacts created, and *"All artifacts created! Ready for
implementation."* Prompt to run the apply command.

**Guardrails**
- Create ALL artifacts the schema's `apply.requires` demands.
- Read dependency artifacts before creating a new one.
- Ask when context is critically unclear; otherwise decide and keep momentum.
- If a change with that name exists, ask whether to continue it or create a new one.
- Verify each file exists after writing.
