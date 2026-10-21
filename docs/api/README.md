# Documentación de API

Esta carpeta contiene la documentación de las interfaces públicas del proyecto.

## Contenido sugerido

- **Endpoints REST** (paths, métodos, request/response, códigos de estado)
- **Contratos GraphQL** (schemas, queries, mutations, subscriptions)
- **Definiciones gRPC** (protobuf, servicios, mensajes)
- **Autenticación y autorización** (JWT, OAuth, API keys, roles)
- **Ejemplos de uso** (curl, Postman, cliente SDK)
- **Versionado** (política, migración v1→v2)
- **Rate limiting y throttling**
- **Códigos de error** (formato Problem+JSON RFC 7807)

## Formato

- Markdown con tablas para endpoints
- Ejemplos de request/response en bloques de código
- Referencia a OpenAPI/Swagger generado: `Ver [OpenAPI JSON](openapi.json)`
- Actualizar con cada cambio en la API