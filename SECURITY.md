# Seguridad, confidencialidad y responsabilidad

> Este documento describe **qué hace y qué no hace** ATLAS con tus datos.
> No es asesoría legal. Para uso comercial, revisa la licencia (`LICENSE`) y consulta a un profesional.

## Qué incluye el repositorio

- Configuración, instrucciones y skills para agentes.
- **Ningún dato de negocio, credencial, token, clave ni conexión a base de datos.**
- El bootstrap puede generar un `.env.example` con nombres de variables, nunca con valores.

## Qué ocurre cuando lo usas

Un agente de IA **puede leer cualquier archivo del repositorio** al que tenga acceso. Qué código,
documentación o datos expones al abrir el proyecto es una decisión tuya.

Además, el template **sugiere** (nunca activa por sí solo) herramientas que sacan información del repo:

| Herramienta | Qué envía fuera | Recomendación |
|---|---|---|
| **Context7** (MCP de documentación) | La consulta que escribe el agente | Nunca incluir código propietario, secretos ni datos personales en la consulta |
| **Memoria persistente** (Engram u otra) | Resúmenes de la sesión | `.engram/` está en `.gitignore`; no sincronizar sin decidir antes qué se comparte |
| **MCP de base de datos** | Consultas SQL al servidor | Usar credenciales de solo lectura y datos de desarrollo, nunca producción |
| **Servicios de CI/CD o despliegue** | Código y artefactos | Revisar la política de tu organización antes de conectarlos |

## Confidencialidad

- El template **no recopila telemetría** ni envía datos a su autor.
- Las integraciones opcionales se configuran **por proyecto y por herramienta**; su política de datos
  es la del proveedor correspondiente.
- Los archivos en `.atlas/adapters/` y `.atlas/backups/` son **estado local**: no se versionan,
  pero tampoco son una copia de seguridad.

## Sin garantía

El software se entrega **"AS IS"**, sin garantía de ningún tipo. El autor no se hace responsable del
uso que se le dé, de las decisiones tomadas por los agentes ni de las consecuencias derivadas de su
configuración. Ver `LICENSE`.

## Reporte de vulnerabilidades

Si encuentras un problema de seguridad (por ejemplo, una instrucción que pueda filtrar datos o
ejecutar comandos no deseados), abre un *issue* privado o contacta al mantenedor **sin publicar
detalles explotables**. Incluye: archivo afectado, impacto y pasos para reproducirlo.
