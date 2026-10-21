# Packs opcionales

Un pack agrupa skills y agentes específicos de un stack o de una integración. **No se descubren
automáticamente**: viven fuera de `.agents/skills/` y `agents/`, así que no consumen contexto en
sesiones donde no aplican.

## Estructura

```
.template/packs/<pack>/
  README.md            # qué trae y cuándo activarlo
  skills/<nombre>/SKILL.md
  agents/<rol>.md
```

## Activación

El bootstrap copia el contenido del pack a `.agents/skills/` y `agents/` cuando el usuario lo elige,
y lo registra en `state.json.packs`. Desactivar un pack = borrar sus archivos copiados (o restaurarlos
desde este directorio).

## Catálogo

**v1: el mecanismo existe, sin packs.** Los packs se añaden en cambios posteriores.

| Pack | Contenido previsto |
|---|---|
| `ui-design` | `design-tokens`, `design-components`, `design-consistency-rules`, `design-accessibility`, `design-checklist`, `icon-mapping-lucide`, `icon-accessibility-rule` |
| `backend-java` | `qa-e2e-suite` |
| `web-react` | `react-patterns`, `web-testing`, `web-accessibility`, `web-performance`, `web-security-frontend`, `web-review` |
| `mobile-kmp` | `kotlin-multiplatform`, `compose-expert`, `kotlin-specialist`, `mobile-android-design`, `mobile-ios-hig`, `mobile-ios-design`, `mobile-testing`, `mobile-review`, agente `ddd-mobile` |
| `integrations` | Engram (memoria persistente), Graphify (grafo de conocimiento) |
| `business` | agente `business-strategist` |

## Regla de oro

Si un pack no está activado, **no debe aparecer** ninguna referencia a sus skills en `AGENTS.md`.
Las referencias a packs viven aquí, no en el contrato operativo.
