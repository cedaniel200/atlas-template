# Architecture Decision Records (ADR)

Decisiones arquitectónicas **durables** del proyecto. Persisten entre cambios y no se archivan con ellos.

## Convención

- Un archivo por decisión: `NNNN-kebab-case-title.md` (ej. `0001-use-postgres.md`).
- Numeración monotónica y **nunca reutilizada** (aunque el ADR se superseda).
- Formato por defecto: MADR-short (Contexto · Decisión · Consecuencias). La skill
  `architectural-decision-records` ofrece plantillas alternativas (Nygard, Y-Statement, MADR-full).

## Regla de inmutabilidad

Un ADR aceptado **no se edita**: ni su estado, ni su cuerpo, ni su fecha. Si una decisión cambia,
se crea un ADR **nuevo** con:

```yaml
Status: accepted, supersedes ADR-NNNN
Supersedes: ADR-NNNN
```

El conjunto vigente se deriva recorriendo los enlaces `Supersedes`; el ADR anterior queda como
historia inmutable. Nunca se borra un ADR.

## Qué merece un ADR

- Un patrón, tecnología, frontera o contrato de **largo plazo**.
- Decisiones que afectarán cambios futuros (no detalles tácticos de implementación).
- Divergencias conscientes respecto a un ADR vigente.

## Qué NO merece un ADR

- Nombres de variables, refactors locales, decisiones reversibles sin coste.

> Las decisiones del **cambio en curso** se registran en `openspec/changes/<cambio>/adr.md`
> (manifiesto de revisión). Solo lo durable se promueve a este directorio.
