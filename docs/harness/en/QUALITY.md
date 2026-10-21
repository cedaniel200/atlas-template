# QUALITY — gates, metrics and CRAP

> Quality controls are **signals**, not goals. Never manipulate metrics to pass a gate.

---

## Menu by stack

| Category | Java/Kotlin | TypeScript/JS | Python | Go |
|---|---|---|---|---|
| Style | Checkstyle / ktlint | ESLint + Prettier | ruff | gofmt |
| Static analysis | SpotBugs / ErrorProne / Detekt | `tsc --noEmit` | mypy | `go vet`, staticcheck |
| Architecture | ArchUnit | dependency-cruiser | import-linter | — |
| Complexity / risk | **CRAP** | **CRAP** | **CRAP** | **CRAP** |
| Coverage | JaCoCo | c8 / Vitest | pytest-cov | `go test -cover` |
| Mutation | PIT | Stryker | mutmut | go-mutesting |
| Secrets | gitleaks | gitleaks | gitleaks | gitleaks |

The bootstrap picks the project's real tools and writes them to `AGENTS.md` § Commands. Versions are
verified with **Context7** when configuring.

---

## CRAP

`CRAP(m) = complexity(m)² × (1 − coverage(m))³ + complexity(m)`

It combines cyclomatic complexity with coverage: a complex method **and** without tests scores high.

### Threshold 6

With a threshold of **6**, the real policy is:

| Complexity | Minimum coverage |
|---:|---:|
| 1 | 0% |
| 2 | 0% (CRAP = 6 exactly) |
| 3 | 30.7% |
| 4 | 50% |
| 5 | 65.8% |
| 6 | **100%** |
| ≥ 7 | **impossible** |

In short: complexity ≤ 2 passes regardless of coverage; 3 to 5 require increasing coverage; 6 only with
full coverage; 7 or more is not accepted.

### How it is applied

| Rule | Why |
|---|---|
| **Incremental gate**: only files touched by the change | Does not block a legacy project |
| **Ratchet** in brownfield: fails if it gets worse than the baseline | Continuous improvement without rewriting everything |
| Declared exclusions: generated code, DTOs, configuration, migrations, `main` | Avoids noise without hiding logic |
| Report **p50 / p90 / worst method** | A single pass/fail hides the distribution |

### Configuration

- Threshold: `AGENTS.md` § Preferences (`CRAP_THRESHOLD`, default `6`).
- Command: `AGENTS.md` § Commands (`CRAP_COMMAND`).
- Changing it is a project decision, not a silent adjustment.

---

## Change gates

| Gate | Criterion |
|---|---|
| Lint | **0 violations** in touched files (pre-existing ones are fixed) |
| CRAP | ≤ threshold per method, in touched files |
| Coverage | New paths have reasonable coverage; no critical branches uncovered |
| Mutation | Optional; very low score in touched classes → medium finding |
| Secrets | gitleaks with no findings |
| Comments | Reference ADRs or functional documentation, never `openspec/` specs |

---

## Command examples

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
node scripts/crap.mjs          # if the project implements it
pnpm test -- --coverage
npx stryker run
```

> These are examples. Real commands are declared in `AGENTS.md`; if they do not exist, they are marked
> `TBD` and never invented.

---

## What not to do

- Delete blank lines, split methods without cohesion or add trivial tests to lower a metric.
- Raise the CRAP threshold so a change passes.
- Exclude files with real logic.
- Ignore a QA or review finding without documenting it and asking the user.
