# Despliegue en la nube

## Recomendación

Para esta farmacia (Vue estático + API NestJS + **MongoDB Atlas**):

| Opción | Cuándo elegirla |
|--------|-----------------|
| **Google Cloud Run** (recomendada) | Quieres el camino más simple: contenedores, escala a cero, HTTPS gestionado, bajo costo con poco tráfico. Atlas se conecta por URI. |
| **AWS App Runner** o **ECS Fargate** | Ya operas en AWS o el cluster Atlas está en una región AWS concreta y quieres todo en la misma nube. |
| **VM + Docker Compose** (EC2 / Compute Engine) | Prefieres un solo servidor barato y administrar tú el proceso. Menos ideal a largo plazo. |

**No** hace falta un MongoDB administrado adicional en AWS/GCP: Atlas ya cubre la base en línea. Elige la región Atlas cercana a Cloud Run / App Runner (p. ej. `us-east-1` / `us-central1`).

## Datos que necesitamos de ti para publicar

1. **MongoDB Atlas**
   - Connection string `mongodb+srv://...`
   - Usuario/contraseña de base (solo lectura/escritura a `pharmacy`)
   - IP allowlist: IPs del runtime o `0.0.0.0/0` solo si aceptas el riesgo y usas user/pass fuertes + TLS
2. **Secretos**
   - `JWT_SECRET` (cadena larga aleatoria)
3. **Dominio** (opcional): `farmacia.tudominio.com`
4. **Cuenta cloud**
   - GCP: proyecto + billing, o
   - AWS: cuenta + permisos para App Runner/ECR
5. Confirmación de región preferida (Guatemala → suele convenir `us-east-1` / `us-central1`)

Con esos datos se puede desplegar API + web. **No pegues secretos en el chat de git**; usa variables de entorno del proveedor o un gestor de secretos.

## Flujo productivo sugerido

1. Cajero crea cuenta o inicia sesión.
2. Admin/cajero da de alta productos (nombre, descripción, unidad/caja, precio, vencimiento vía lotes).
3. **Ingresos**: cada llegada de mercancía crea/actualiza un lote con fecha de caducidad.
4. **Despacho**: el cajero arma el carrito OTC, pide el **nombre del comprador**, cobra y obtiene el resumen/comprobante.
5. Medicamentos con receta van por **Controlados** (folio + médico).
6. Inventario sale por **FEFO** (primero vence, primero sale) — mejor que LIFO para no perder producto por caducidad.

## Local → Atlas

```sh
cp .env.example .env
# Edita MONGODB_URI (Atlas) y JWT_SECRET
docker compose -f docker-compose.prod.yml up --build -d
```

Web: `http://localhost:8080` · API health: `http://localhost:3000/api/health`

## Cloud Run (GCP) — esquema

```sh
# API
gcloud run deploy farmacia-api \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars=MONGODB_DATABASE=pharmacy \
  --set-secrets=MONGODB_URI=MONGODB_URI:latest,JWT_SECRET=JWT_SECRET:latest

# Web (después de apuntar nginx / VITE al URL del API, o servir API detrás del mismo dominio con load balancer)
```

Para un solo dominio público, lo más limpio es: imagen `web` (Nginx) que hace proxy de `/api` al servicio `api` interno, o un Load Balancer HTTP(S).

## Terraform Atlas

El módulo en `terraform/` crea un cluster M0 de desarrollo. Aún debes crear usuario DB + allowlist en Atlas (consola o ampliar Terraform). Credenciales: `MONGODB_ATLAS_PUBLIC_KEY` / `MONGODB_ATLAS_PRIVATE_KEY` + `atlas_org_id`.
