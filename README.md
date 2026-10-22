# Farmacia PMS

Base inicial para un sistema de gestión de farmacia con Vue 3, NestJS, MongoDB y contenedores.

## Inicio local

1. Copia `.env.example` a `.env` si necesitas cambiar la base de datos local.
2. Ejecuta `docker compose up --build`.
3. Vue queda disponible en `http://localhost:5173`; el API en `http://localhost:3000`.

MongoDB local inicia sin autenticación como replica set de un nodo para soportar transacciones y solo publica el puerto en `127.0.0.1`. Es estrictamente para desarrollo local; no lo expongas en una red compartida o productiva.

Para ejecutar sin Docker:

```sh
npm --prefix frontend ci
npm --prefix frontend run dev
npm --prefix backend ci
npm --prefix backend run start:dev
```

Configura `MONGODB_URI` para apuntar a un MongoDB replica set antes de iniciar el API.

## Terraform Atlas

El módulo crea un proyecto y un cluster Atlas M0 de desarrollo; no crea usuarios de base de datos ni reglas de acceso IP. Configura las credenciales del proveedor Atlas mediante `MONGODB_ATLAS_PUBLIC_KEY` y `MONGODB_ATLAS_PRIVATE_KEY`, luego ejecuta desde `terraform/`:

```sh
terraform init
terraform plan -var="atlas_org_id=TU_ORG_ID"
terraform apply -var="atlas_org_id=TU_ORG_ID"
```

No guardes claves en archivos versionados. Revisa la región y las capacidades de Atlas antes de aplicar.

## Estructura

- `frontend/`: aplicación Vue 3. El flujo de dispensación separa Intents, Model (estado inmutable/reactividad Vue) y View.
- `backend/`: API NestJS con caso de uso, puerto de persistencia, adaptador MongoDB y controlador HTTP.
- `docs/mongodb/`: ejemplos JSON de colecciones e índices FEFO.
- `terraform/`: infraestructura inicial opcional para un cluster MongoDB Atlas M0.
- `.github/workflows/ci.yml`: compilación del frontend y backend.

El API de dispensación solo admite productos que requieren receta, valida folio, médico, SKU, vigencia y saldo de la prescripción dentro de una transacción MongoDB. Reserva lotes por caducidad ascendente y persiste la dispensación y un evento de outbox en la misma transacción.

## Antes de producción

Este repositorio es un punto de partida, no un sistema certificado ni listo para procesar datos clínicos reales. Integra y valida un proveedor de identidad (JWT/OIDC), autorización por rol/farmacia, secretos en un gestor dedicado, TLS, cifrado en reposo y cifrado a nivel de campo administrado con KMS para cualquier dato identificable. El API falla cerrado si el middleware de autenticación no proporciona `request.user.sub`. No se deben enviar datos de pacientes al frontend o a logs innecesariamente.

La outbox almacena eventos de stock bajo para que un worker/publicador asíncrono los procese; el worker y las integraciones de alertas aún deben implementarse. Añade pruebas de integración con MongoDB replica set, observabilidad, políticas de retención/auditoría, revisión legal/regulatoria y controles HIPAA/Ley aplicable antes de cualquier uso real.
