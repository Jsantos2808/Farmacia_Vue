# Arquitectura — Farmacia Aurora

## Flujo operativo (mostrador)

1. El usuario se **registra** o **inicia sesión** (JWT). Sin sesión no hay despacho ni ingresos.
2. Se cargan **productos** (SKU, nombre, descripción, unidad/caja, precio, categoría de control).
3. **Ingresos**: cada recepción crea o suma un lote (`batchId`) con `expiresAt`.
4. **Despacho OTC**: el cajero arma un carrito, captura el **nombre del comprador** y confirma. El API descuenta stock por **FEFO**, persiste la venta y devuelve el resumen/comprobante.
5. **Controlados**: productos no-OTC requieren folio + médico en el módulo de dispensación; también usan FEFO.
6. El historial de ventas permite auditar a quién se vendió cada compra.

## Por qué FEFO y no LIFO

Pediste “últimas entradas, últimas salidas” (LIFO). En farmacia con caducidad, **FEFO** (First Expired, First Out) reduce merma: se despacha primero lo que vence antes. El índice `{ sku, expiresAt, batchId }` soporta esa consulta. Si más adelante necesitas costeo LIFO contable, se puede llevar en paralelo sin cambiar el despacho físico.

## Capas

- **Vue 3**: rutas (login, despacho, productos, ingresos, ventas, controlados), token en `localStorage`, proxy `/api`.
- **NestJS**: casos de uso + puertos; MongoDB driver nativo con transacciones (replica set / Atlas).
- **Colecciones**: `Users`, `Products`, `Batches`, `Transactions` (`INCOME` | `SALE` | `DISPENSATION`), `Prescriptions`, `OutboxEvents`.

## Seguridad

- Registro público → rol `cashier`. Promueve admins fuera de banda.
- `JWT_SECRET` obligatorio en producción.
- Atlas con TLS; no versionar connection strings.
- El nombre del comprador en el comprobante es un dato operativo de mostrador; valora retención y acceso según tu jurisdicción.
