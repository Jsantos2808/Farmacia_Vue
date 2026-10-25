# Farmacia Aurora

Sistema web de farmacia (Vue 3 + NestJS + MongoDB Atlas) para **caja de mostrador**: cuentas de usuario, catálogo, ingresos por lote, despachos con comprobante al comprador e inventario **FEFO**.

## Qué incluye

- **Auth**: registro e inicio de sesión (JWT). Sin cuenta no se opera.
- **Productos**: nombre, descripción, venta por unidad o caja, precio, stock mínimo, clasificación (OTC / receta / etc.).
- **Ingresos**: lotes con cantidad y fecha de vencimiento.
- **Despacho**: carrito OTC, nombre del comprador obligatorio, resumen de compra (folio, cajero, lotes usados, total).
- **Controlados**: dispensación con folio y médico (hereda el flujo FEFO original).
- **Historial de ventas** en línea sobre MongoDB.
- Listo para desplegar con Docker / Cloud Run / App Runner (ver `docs/DEPLOYMENT.md`).

## Inicio local

```sh
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:5173  
- API: http://localhost:3000/api/health  

Sin Docker:

```sh
npm --prefix backend ci
npm --prefix frontend ci
# Terminal 1 — MongoDB replica set requerido para transacciones
MONGODB_URI='mongodb://localhost:27017/pharmacy?replicaSet=rs0' JWT_SECRET='dev' npm --prefix backend run start:dev
# Terminal 2
npm --prefix frontend run dev
```

## Flujo de trabajo recomendado

1. Crear cuenta de cajero → entrar.  
2. Alta de productos OTC (y controlados si aplica).  
3. Registrar **ingresos** por lote + vencimiento.  
4. En **Despacho**, agregar ítems, pedir el **nombre del cliente**, cobrar y entregar el resumen.  
5. Usar **Controlados** solo para medicamentos con receta.  

**FEFO vs LIFO:** pediste LIFO; en mostrador con caducidad conviene **FEFO** (primero vence, primero sale). Está implementado así; detalles en `docs/ARCHITECTURE.md`.

## Pruebas

```sh
docker compose up -d mongo
TEST_MONGODB_URI='mongodb://localhost:27017/?directConnection=true&replicaSet=rs0' npm --prefix backend test
npm --prefix frontend test
```

## Producción / nube

```sh
export MONGODB_URI='mongodb+srv://USER:PASS@cluster.mongodb.net/pharmacy'
export JWT_SECRET='cadena-larga-aleatoria'
docker compose -f docker-compose.prod.yml up --build -d
```

Recomendación de hosting: **Google Cloud Run** (+ Atlas). Alternativa: AWS App Runner. Necesitamos de ti la URI de Atlas, `JWT_SECRET` y la cuenta cloud — lista completa en `docs/DEPLOYMENT.md`.

## Estructura

- `frontend/` — Vue 3 + Vue Router  
- `backend/` — NestJS + MongoDB  
- `docs/` — arquitectura, esquemas, despliegue  
- `terraform/` — Atlas M0 opcional  
- `docker-compose.yml` / `docker-compose.prod.yml`
