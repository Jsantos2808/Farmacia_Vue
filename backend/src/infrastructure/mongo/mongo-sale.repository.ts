import { randomUUID } from 'node:crypto'
import { ClientSession, Collection, MongoClient } from 'mongodb'
import { unitsFromSaleQuantity } from '../../domain/product'
import {
  CompleteSaleCommand,
  SaleError,
  SaleLineBatch,
  SaleLineResult,
  SaleReceipt,
} from '../../domain/sale'
import { SaleRepository } from '../../application/ports/sale.repository'

interface ProductDocument {
  sku: string
  name: string
  sellMode: 'UNIT' | 'BOX'
  unitsPerBox: number
  unitPrice: number
  controlCategory: 'OTC' | 'PRESCRIPTION' | 'PSYCHOTROPIC' | 'ANTIBIOTIC'
  minimumStock: number
}

interface BatchDocument {
  sku: string
  batchId: string
  expiresAt: Date
  quantityAvailable: number
  receivedAt: Date
}

export class MongoSaleRepository implements SaleRepository {
  private readonly products: Collection<ProductDocument>
  private readonly batches: Collection<BatchDocument>
  private readonly transactions: Collection
  private readonly outbox: Collection

  constructor(client: MongoClient, databaseName: string) {
    const database = client.db(databaseName)
    this.products = database.collection<ProductDocument>('Products')
    this.batches = database.collection<BatchDocument>('Batches')
    this.transactions = database.collection('Transactions')
    this.outbox = database.collection('OutboxEvents')
  }

  async ensureIndexes(): Promise<void> {
    await this.transactions.createIndex({ type: 1, timestamp: -1 })
    await this.transactions.createIndex({ id: 1 }, { unique: true, sparse: true })
    await this.outbox.createIndex({ status: 1, createdAt: 1 })
  }

  async complete(command: CompleteSaleCommand): Promise<SaleReceipt> {
    const session = this.products.db.client.startSession()
    let receipt: SaleReceipt | undefined
    try {
      await session.withTransaction(async () => {
        const now = new Date()
        const lineResults: SaleLineResult[] = []

        for (const line of command.lines) {
          const product = await this.products.findOne({ sku: line.sku }, { session })
          if (!product) throw new SaleError(`Producto ${line.sku} no encontrado`, 'PRODUCT_NOT_FOUND')
          if (product.controlCategory !== 'OTC') {
            throw new SaleError(
              `${product.name} requiere receta; usa el flujo de dispensación controlada`,
              'PRESCRIPTION_REQUIRED',
            )
          }
          if (line.sellMode === 'BOX' && product.sellMode !== 'BOX') {
            throw new SaleError(`${product.name} no se vende por cajas`, 'INVALID_SALE')
          }

          const unitsNeeded = unitsFromSaleQuantity(line.quantity, line.sellMode, product.unitsPerBox)
          const stockBefore = await this.totalAvailable(line.sku, now, session)

          const candidates = await this.batches
            .find(
              { sku: line.sku, quantityAvailable: { $gt: 0 }, expiresAt: { $gt: now } },
              { session },
            )
            .sort({ expiresAt: 1, batchId: 1 })
            .toArray()

          let remaining = unitsNeeded
          const reserved: SaleLineBatch[] = []
          for (const batch of candidates) {
            if (remaining === 0) break
            const take = Math.min(batch.quantityAvailable, remaining)
            const result = await this.batches.updateOne(
              {
                _id: batch._id,
                quantityAvailable: { $gte: take },
                expiresAt: { $gt: now },
              },
              { $inc: { quantityAvailable: -take } },
              { session },
            )
            if (result.modifiedCount !== 1) {
              throw new SaleError('El inventario cambió; reintenta el despacho', 'INSUFFICIENT_STOCK')
            }
            reserved.push({ batchId: batch.batchId, quantity: take, expiresAt: batch.expiresAt })
            remaining -= take
          }
          if (remaining > 0) {
            throw new SaleError(`Stock insuficiente para ${product.name}`, 'INSUFFICIENT_STOCK')
          }

          const lineTotal = Number((product.unitPrice * unitsNeeded).toFixed(2))
          lineResults.push({
            sku: product.sku,
            productName: product.name,
            sellMode: line.sellMode,
            quantity: line.quantity,
            unitsSold: unitsNeeded,
            unitPrice: product.unitPrice,
            lineTotal,
            batches: reserved,
          })

          const stockAfter = await this.totalAvailable(line.sku, now, session)
          if (stockBefore >= product.minimumStock && stockAfter < product.minimumStock) {
            await this.outbox.insertOne(
              {
                type: 'LOW_STOCK',
                sku: product.sku,
                available: stockAfter,
                threshold: product.minimumStock,
                status: 'PENDING',
                createdAt: now,
              },
              { session },
            )
          }
        }

        const totalAmount = Number(lineResults.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2))
        receipt = {
          id: randomUUID(),
          customerName: command.customerName,
          cashierId: command.userId,
          cashierName: command.cashierName,
          lines: lineResults,
          totalAmount,
          timestamp: now,
        }
        await this.transactions.insertOne(
          {
            ...receipt,
            type: 'SALE',
          },
          { session },
        )
      })
      if (!receipt) throw new Error('Sale receipt missing after transaction')
      return receipt
    } finally {
      await session.endSession()
    }
  }

  async listRecent(limit = 50): Promise<SaleReceipt[]> {
    const rows = await this.transactions
      .find({ type: 'SALE' })
      .sort({ timestamp: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .toArray()
    return rows.map(toReceipt)
  }

  async findById(id: string): Promise<SaleReceipt | null> {
    const row = await this.transactions.findOne({ type: 'SALE', id })
    return row ? toReceipt(row) : null
  }

  private async totalAvailable(sku: string, now: Date, session: ClientSession): Promise<number> {
    const stock = await this.batches
      .aggregate<{ total: number }>(
        [
          { $match: { sku, expiresAt: { $gt: now } } },
          { $group: { _id: null, total: { $sum: '$quantityAvailable' } } },
        ],
        { session },
      )
      .next()
    return stock?.total ?? 0
  }
}

function toReceipt(row: Record<string, unknown>): SaleReceipt {
  return {
    id: String(row.id),
    customerName: String(row.customerName),
    cashierId: String(row.cashierId),
    cashierName: String(row.cashierName),
    lines: (row.lines as SaleLineResult[]) ?? [],
    totalAmount: Number(row.totalAmount),
    timestamp: new Date(row.timestamp as string | Date),
  }
}
