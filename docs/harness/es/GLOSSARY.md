# Glosario

> Términos que aparecen en la documentación del arnés y que no siempre se explican.

| Término | Qué es |
|---|---|
| **Arnés** (harness) | Conjunto de instrucciones, skills, agentes y configuración que guían al agente. |
| **Núcleo portable** | Lo que todo proyecto recibe (`AGENTS.md`, skills, agentes, schema, ritual). No depende de dominio, arquitectura ni herramienta. |
| **Herramienta anfitriona** (host) | OpenCode, Claude Code, Codex o Cursor. |
| **Adaptador** | Archivos que una herramienta necesita: `opencode.json`, `.claude/agents/`, `.cursor/agents/`, `CLAUDE.md`, comandos `opsx-*`. |
| **Skill** | Procedimiento reutilizable que el agente carga cuando la tarea coincide con su descripción. |
| **Rol / agente** | `analyst`, `engineer`, `reviewer`, `qa-analyst`, `doc-writer`; opcionales: `mentor`, `business-strategist`. |
| **Pack** | Conocimiento procedimental opcional (mobile, web, diseño, ddd, integraciones). |
| **Perfil** | Datos de stack: comandos, rutas, herramientas y umbrales. |
| **Ritual / bootstrap** | Primera sesión: detecta host, interroga, genera el contexto y valida. |
| **Gate** | Condición bloqueante: artefacto aprobado, QA, PR, archive/merge. |
| **`managed` / `generated` / `owned`** | Propiedad de un archivo para actualizaciones: se reemplaza, se regenera o no se toca. |
| **`state.json` / `manifest.json`** | Entradas del bootstrap y salidas generadas (hashes y propiedad). |
