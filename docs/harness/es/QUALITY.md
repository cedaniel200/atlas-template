# QUALITY — gates, métricas y CRAP

> Los controles de calidad son **señales**, no objetivos. No se manipulan métricas para pasar un gate.

---

## Menú por stack

| Categoría | Java/Kotlin | TypeScript/JS | Python | Go |
|---|---|---|---|---|
| Estilo | Checkstyle / ktlint | ESLint + Prettier | ruff | gofmt |
| Análisis estático | SpotBugs / ErrorProne / Detekt | `tsc --noEmit` | mypy | `go vet`, staticcheck |
| Arquitectura | ArchUnit | dependency-cruiser | import-linter | — |
| Complejidad / riesgo | **CRAP** | **CRAP** | **CRAP** | **CRAP** |
| Cobertura | JaCoCo | c8 / Vitest | pytest-cov | `go test -cover` |
| Mutación | PIT | Stryker | mutmut | go-mutesting |
| Secretos | gitleaks | gitleaks | gitleaks | gitleaks |

El bootstrap elige las herramientas reales del proyecto y las escribe en `AGENTS.md` § Comandos. Las
versiones se verifican con **Context7** en el momento de configurar.

---

## CRAP

`CRAP(m) = complejidad(m)² × (1 − cobertura(m))³ + complejidad(m)`

Combina complejidad ciclomática con cobertura: un método complejo **y** sin tests puntúa alto.

### Umbral 6

Con umbral **6**, la política real es:

| Complejidad | Cobertura mínima |
|---:|---:|
| 1 | 0% |
| 2 | 0% (CRAP = 6 exacto) |
| 3 | 30,7% |
| 4 | 50% |
| 5 | 65,8% |
| 6 | **100%** |
| ≥ 7 | **imposible** |

Traducción: métodos de complejidad ≤ 2 pasan sin importar la cobertura; de 3 a 5 exigen cobertura
creciente; 6 solo con cobertura total; 7 o más no se aceptan.

### Cómo se aplica

| Regla | Motivo |
|---|---|
| **Gate incremental**: solo archivos tocados por el cambio | No bloquea un proyecto heredado |
| **Ratchet** en brownfield: falla si empeora respecto a la línea base | Mejora continua sin reescribir todo |
| Exclusiones declaradas: generados, DTOs, configuración, migraciones, `main` | Evita ruido sin tapar lógica |
| Reporte con **p50 / p90 / peor método** | Un binario oculta la distribución |

### Configuración

- Umbral: `AGENTS.md` § Preferencias (`CRAP_THRESHOLD`, default `6`).
- Comando: `AGENTS.md` § Comandos (`CRAP_COMMAND`).
- Cambiarlo es una decisión del proyecto, no un ajuste silencioso.

---

## Gates de un cambio

| Gate | Criterio |
|---|---|
| Lint | **0 violaciones** en los archivos tocados (si había preexistentes, se resuelven) |
| CRAP | ≤ umbral por método, en archivos tocados |
| Cobertura | Los caminos nuevos tienen cobertura razonable; sin ramas críticas sin cubrir |
| Mutación | Opcional; score muy bajo en clases tocadas → hallazgo medio |
| Secretos | gitleaks sin hallazgos |
| Comentarios | Referencian ADRs o documentación funcional, nunca specs de `openspec/` |

---

## Ejemplos de comandos

**Java + Gradle**

```bash
./gradlew checkstyleMain checkstyleTest spotbugsMain test
./gradlew crapAnalysis
./gradlew jacocoTestReport
./gradlew pitest
```

**Node + TypeScript**

```bash
pnpm lint && pnpm typecheck && pnpm test
node scripts/crap.mjs          # si el proyecto lo implementa
pnpm test -- --coverage
npx stryker run
```

> Son ejemplos. Los comandos reales se declaran en `AGENTS.md`; si no existen, se marcan `TBD` y no se
> inventan.

---

## Qué no hacer

- Borrar líneas en blanco, dividir métodos sin cohesión o añadir tests triviales para bajar una métrica.
- Subir el umbral de CRAP para que pase un cambio.
- Excluir archivos con lógica real.
- Ignorar un hallazgo de QA o revisión sin documentarlo y consultarlo.
