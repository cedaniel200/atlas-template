# AISLAMIENTO — dónde se escribe un change

> El invariante es la **rama**, no el worktree: ningún artefacto de change, código, informe o
> documentación se escribe ni se confirma sobre la rama base. El worktree es el mecanismo por defecto;
> la rama simple es una excepción que pide el humano.

---

## Por defecto: un worktree por change

```bash
git worktree add .worktrees/<change> -b feature/<change>
cd .worktrees/<change>
```

Todo el trabajo del change ocurre ahí: propuesta, specs, diseño, código, informes de QA y revisión, y
documentación. Dos changes no comparten worktree.

---

## Comprobación en dos fases

Al arrancar no siempre se sabe si la sesión va a escribir:

1. **Informar** — indica la rama actual, si el directorio de trabajo es un worktree y el change activo.
   Informar no crea nada ni pregunta nada.
2. **Recomprobar antes de la primera escritura** — si la rama es la base, aísla el change o detente y
   pregunta. Una sesión que empieza en lectura repite la comprobación antes de escribir.

---

## Excepción de rama simple

Una rama de feature en el checkout principal sustituye al worktree solo cuando se cumplen **todas** estas
condiciones:

- el humano la pide de forma explícita;
- el árbol de trabajo está limpio;
- la rama del change es la misma en el proyecto y en sus submódulos (sin estados de rama mezclados);
- la excepción queda registrada en el change (una línea en `design.md` o `tasks.md`);
- la rama nunca es la rama base.

Si falla cualquier condición, usa un worktree o detente y pregunta. El guard de `pre-commit` sigue
bloqueando cualquier commit sobre la rama base; ver [`HOOKS.md`](HOOKS.md).

---

## Precondiciones por rol

| Rol | Antes de escribir | Si la rama es la base |
|---|---|---|
| `analyst` | Crear o escribir artefactos del change | Aísla el change o se detiene |
| `engineer` | Empezar la implementación | Se detiene; no crea la rama ni el worktree |
| `reviewer` | Escribir el informe de revisión | Se detiene; el informe va en el worktree del change |
| `qa-analyst` | Escribir el informe de QA | Se detiene y pide aislar |
| `doc-writer` | Escribir documentación, también si lo invoca el humano | Se detiene y pide aislar |

---

## Excepción del bootstrap

La configuración inicial (`.atlas/BOOTSTRAP.md`) no usa un worktree de change: se ejecuta en su propia
rama `chore/bootstrap`, con un commit por fase, y el usuario la mezcla.
