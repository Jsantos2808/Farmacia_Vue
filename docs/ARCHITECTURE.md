# Arquitectura inicial

## Dispensación controlada

1. La View Vue emite intents para editar el SKU, cantidad, folio y médico, y para solicitar la dispensación.
2. El Model valida campos requeridos y envía el intent de dispensar al API. El cliente no decide lotes ni identifica al usuario.
3. Un middleware de identidad debe verificar el token y poblar `request.user.sub`; el guard del API rechaza peticiones sin esa identidad.
4. El caso de uso valida la entrada y delega al puerto de dispensación.
5. El adaptador MongoDB valida producto y prescripción, descuenta los lotes activos en orden FEFO, registra los lotes/cantidades exactos y agrega un evento de stock bajo, todo dentro de una transacción.

## Datos y consistencia

- `Products` mantiene SKU, clasificación de control y umbral de seguridad.
- `Batches` conserva el inventario por lote y caducidad; el índice compuesto soporta la consulta FEFO.
- `Prescriptions` controla vigencia y saldo dispensable mediante actualización condicional.
- `Transactions` es el registro de dispensación; la aplicación solo inserta y no actualiza estos documentos.
- `OutboxEvents` desacopla la publicación de alertas del flujo de venta. Un consumidor debe marcar/reenviar los eventos con idempotencia.

Se requieren transacciones MongoDB; por ello Compose usa un replica set local de un nodo. Atlas soporta transacciones en clusters compatibles. En despliegues reales, comprueba el nivel de disponibilidad y latencia del cluster elegido.

## Privacidad y seguridad

TLS debe terminar en un balanceador/API gateway con certificados gestionados, y la conexión a Atlas debe requerir TLS. Habilita cifrado en reposo de Atlas y diseña cifrado a nivel de campo para información personal con claves gestionadas y rotación. Los ejemplos guardan solo identificadores seudónimos, nunca nombre, dirección o información clínica de pacientes.

Las obligaciones HIPAA y las leyes de protección de datos dependen de jurisdicción, procesos y contratos; cifrar datos por sí solo no acredita cumplimiento. Este esqueleto no incluye autenticación concreta, gestión de consentimiento, políticas de retención, worker de outbox, gestión de claves ni certificación.
