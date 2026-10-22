db.Products.createIndex({ sku: 1 }, { unique: true });
db.Batches.createIndex({ sku: 1, expiresAt: 1, batchId: 1 });
db.Transactions.createIndex({ sku: 1, timestamp: -1 });
db.Transactions.createIndex({ "prescription.folio": 1, timestamp: -1 });
db.Prescriptions.createIndex(
  { folio: 1, prescriberId: 1, productSku: 1 },
  { unique: true }
);
db.OutboxEvents.createIndex({ status: 1, createdAt: 1 });
