# Evaluación — Reto Zikit

Panel web para que el jurado capture y consulte las evaluaciones del reto
"Antes de que suene el teléfono" (Zikit).

## Qué hace

- **Evaluar**: formulario con 5 criterios (comprensión del problema, detección
  de incidentes, falsas alarmas, calidad técnica, presentación), total en vivo
  y notas. Cada equipo puede recibir una evaluación por jurado (si el mismo
  jurado vuelve a evaluar al mismo equipo, se sobreescribe la anterior).
- **Consultar evaluación**: lista los equipos ordenados por promedio, con una
  barra por jurado y el promedio general.

## Arquitectura

```
site/index.html   → frontend estático (HTML/CSS/JS sin dependencias externas)
lambda/index.mjs   → Lambda (Node 20) que atiende "save" y "list" vía POST
```

- **Frontend**: `site/index.html`, servido como estático (S3 + CloudFront).
- **API**: API Gateway (HTTP API) → Lambda (`lambda/index.mjs`) → DynamoDB.
- **Datos**: tabla DynamoDB `ZikitEvaluaciones`, llave `equipo` (partition) +
  `jurado` (sort).

## Despliegue automático

Cada push a `master` que toque `site/**` o `lambda/**` dispara
`.github/workflows/deploy.yml`, que:

1. Se autentica contra AWS vía OIDC (sin llaves guardadas en el repo) usando
   el rol `ZikitRubricaGitHubDeployRole`, con permisos acotados solo a:
   subir el objeto del sitio al bucket S3, invalidar la distribución de
   CloudFront y actualizar el código de la Lambda.
2. Sube `site/index.html` al bucket S3 e invalida la cache de CloudFront.
3. Empaqueta y publica `lambda/index.mjs` como el código de la Lambda.

El sitio queda disponible en: https://d2kmi3g3zq70nw.cloudfront.net/

## Desplegar desde cero (primera vez)

1. Crear la tabla DynamoDB:
   ```
   aws dynamodb create-table \
     --table-name ZikitEvaluaciones \
     --attribute-definitions AttributeName=equipo,AttributeType=S AttributeName=jurado,AttributeType=S \
     --key-schema AttributeName=equipo,KeyType=HASH AttributeName=jurado,KeyType=RANGE \
     --billing-mode PAY_PER_REQUEST
   ```
2. Crear un rol de ejecución para la Lambda con `AWSLambdaBasicExecutionRole`
   + permisos de lectura/escritura sobre la tabla.
3. Empaquetar y publicar `lambda/index.mjs` (runtime `nodejs20.x`, handler
   `index.handler`).
4. Exponerla con API Gateway (HTTP API, integración proxy a la Lambda).
5. Editar la constante `API_URL` en `site/index.html` con el endpoint del
   paso anterior.
6. Subir `site/index.html` a un bucket S3 privado y servirlo con CloudFront
   (Origin Access Control) o cualquier hosting estático.

## Notas

- La API no tiene autenticación — pensada para uso interno durante el evento,
  no para producción.
- Sin dependencias de build: el frontend es un solo archivo HTML.
