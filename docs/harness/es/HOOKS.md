# HOOKS — guards de commit

> El arnés trae sus hooks de git en `.githooks/`. Se ejecutan antes de cada commit, en cualquier host de
> agente, y no dependen del runtime del agente.

---

## Qué se ejecuta al confirmar

`git commit` ejecuta `.githooks/pre-commit`, un **despachador**. Lanza en orden lexicográfico cada
archivo ejecutable de `.githooks/pre-commit.d/` y aborta en el primer fallo:

| Guard | Qué comprueba | Cuándo bloquea |
|---|---|---|
| `10-worktree-guard.sh` | La rama actual frente a la rama base | Cualquier commit sobre la rama base |
| `20-gitleaks.sh` | Los cambios en stage en busca de secretos | Un secreto encontrado (si falta gitleaks, solo avisa) |

El despachador no se edita al añadir un guard: un archivo ejecutable nuevo en `pre-commit.d/` se ejecuta
automáticamente. Cada guard define su semántica de omisión.

---

## Qué bloquea el guard de aislamiento

El invariante es la **rama**: los artefactos del change, el código, los informes y la documentación no se
confirman sobre la rama base. El guard determina la base con `origin/HEAD`; si falta, un `main` local; y
después un `master` local.

| Estado | Comportamiento |
|---|---|
| Repositorio sin commits | Avisa; el primer commit se permite |
| HEAD detached (por ejemplo un submódulo en un tag) | Avisa; no interviene |
| Rama base indeterminable | Avisa; no interviene |
| Rama actual ≠ base | No interviene |
| Rama actual = base | **Bloquea con salida 1** |

El mensaje se adapta a lo que está en stage. Si las rutas pertenecen a `openspec/changes/<change>/`,
propone el worktree de ese change:

```bash
git worktree add .worktrees/<change> -b feature/<change>
cd .worktrees/<change>
```

Para cualquier otro contenido (código, configuración, documentación) propone una rama de feature y un
pull request.

**No existe variable de escape** del arnés. Si un humano decide confirmar sobre la rama base, usa los
mecanismos de git y es su decisión; el arnés no los documenta como funcionalidad.

> El guard no se omite si falta gitleaks: `20-gitleaks.sh` avisa y sale con 0, pero
> `10-worktree-guard.sh` se ejecuta igual.

La política de aislamiento está en [`ISOLATION.md`](ISOLATION.md).

---

## Activar los hooks

Git solo ejecuta los hooks cuando `core.hooksPath` apunta a ellos. Por clon:

```bash
git config core.hooksPath .githooks
```

| Situación | Qué ocurre |
|---|---|
| Proyecto nuevo | El bootstrap lo activa solo si no hay ruta configurada o ya es `.githooks` |
| Proyecto existente | El actualizador **comprueba y avisa** con el comando exacto; nunca escribe configuración de git |
| Ruta ajena (husky, lefthook…) | Se conserva; encadena los hooks del arnés desde el hook propio |

Para encadenarlos desde un `pre-commit` ajeno:

```sh
exec "$(git rev-parse --show-toplevel)/.githooks/pre-commit" "$@"
```

---

## Un repositorio nuevo

Un repositorio sin commits no tiene rama base que proteger, así que el guard avisa y deja pasar el
**primer** commit. A partir de ahí, los commits sobre la rama base se bloquean: crea antes la rama o el
worktree del change. La configuración inicial (`chore/bootstrap`) ya se ejecuta en su propia rama.

---

## Añadir un guard

1. Crea un archivo ejecutable en `.githooks/pre-commit.d/` con prefijo numérico (`30-mi-check.sh`).
2. Usa `sh` POSIX; no dependas de bash.
3. Sale con `0` para pasar y distinto de cero para abortar el commit. Explica el motivo.
4. Añade una prueba en `.atlas/scripts/githooks.test.mjs`.

No hace falta tocar `pre-commit`.
