import { randomUUID } from 'node:crypto'
import { Collection, MongoClient } from 'mongodb'
import {
  InventoryError,
  InventoryReceipt,
  ReceiveStockCommand,
  StockBatch,
} from '../../domain/inventory'
import { InventoryRepository } from '../../application/ports/inventory.repository'

interface ProductDocument {
  sku: string
  minimumStock: number
}

interface BatchDocument {
  sku: string
  batchId: string
  expiresAt: Date
  quantityAvailable: number
  receivedAt: Date
  unitCost?: number
}

export class MongoInventoryRepository implements InventoryRepository {
  private readonly products: Collection<ProductDocument>
  private readonly batches: Collection<BatchDocument>
  private readonly transactions: Collection

  constructor(client: MongoClient, databaseName: string) {
    const database = client.db(databaseName)
    this.products = database.collection<ProductDocument>('Products')
    this.batches = database.collection<BatchDocument>('Batches')
    this.transactions = database.collection('Transactions')
  }

  async ensureIndexes(): Promise<void> {
    await this.batches.createIndex({ sku: 1, expiresAt: 1, batchId: 1 })
    await this.batches.createIndex({ sku: 1, batchId: 1 }, { unique: true })
  }

  async receive(command: ReceiveStockCommand): Promise<InventoryReceipt> {
    const session = this.products.db.client.startSession()
    let receipt: InventoryReceipt | undefined
    try {
      await session.withTransaction(async () => {
        const product = await this.products.findOne({ sku: command.sku }, { session })
        if (!product) throw new InventoryError('Producto no encontrado', 'PRODUCT_NOT_FOUND')

        const existing = await this.batches.findOne(
          { sku: command.sku, batchId: command.batchId },
          { session },
        )
        const now = new Date()
        if (existing) {
          const result = await this.batches.updateOne(
            { sku: command.sku, batchId: command.batchId },
            {
              $inc: { quantityAvailable: command.quantity },
              $set: {
                expiresAt: command.expiresAt,
                ...(command.unitCost !== undefined ? { unitCost: command.unitCost } : {}),
              },
            },
            { session },
          )
          if (result.matchedCount !== 1) {
            throw new InventoryError('No se pudo actualizar el lote', 'INVALID_RECEIPT')
          }
        } else {
          await this.batches.insertOne(
            {
              sku: command.sku,
              batchId: command.batchId,
              expiresAt: command.expiresAt,
              quantityAvailable: command.quantity,
              receivedAt: now,
              ...(command.unitCost !== undefined ? { unitCost: command.unitCost } : {}),
            },
            { session },
          )
        }

        receipt = {
          id: randomUUID(),
          sku: command.sku,
          batchId: command.batchId,
          quantity: command.quantity,
          expiresAt: command.expiresAt,
          userId: command.userId,
          timestamp: now,
          notes: command.notes,
        }
        await this.transactions.insertOne(
          {
            ...receipt,
            type: 'INCOME',
          },
          { session },
        )
      })
      if (!receipt) throw new Error('Inventory receipt missing after transaction')
      return receipt
    } finally {
      await session.endSession()
    }
  }

  async listBatches(sku?: string): Promise<StockBatch[]> {
    const filter = sku ? { sku } : {}
    const rows = await this.batches
      .find({ ...filter, quantityAvailable: { $gt: 0 } })
      .sort({ expiresAt: 1, batchId: 1 })
      .toArray()
    return rows.map((row) => ({
      sku: row.sku,
      batchId: row.batchId,
      expiresAt: row.expiresAt,
      quantityAvailable: row.quantityAvailable,
      receivedAt: row.receivedAt,
      unitCost: row.unitCost,
    }))
  }

  async stockBySku(): Promise<Array<{ sku: string; available: number }>> {
    const now = new Date()
    const rows = await this.batches
      .aggregate<{ _id: string; available: number }>([
        { $match: { quantityAvailable: { $gt: 0 }, expiresAt: { $gt: now } } },
        { $group: { _id: '$sku', available: { $sum: '$quantityAvailable' } } },
        { $sort: { _id: 1 } },
      ])
      .toArray()
    return rows.map((row) => ({ sku: row._id, available: row.available }))
  }
}
