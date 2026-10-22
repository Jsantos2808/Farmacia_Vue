import { randomUUID } from 'node:crypto'
import { Collection, MongoClient } from 'mongodb'
import {
  DispenseCommand,
  Dispensation,
  DispensationError,
  DispensedBatch,
} from '../../domain/dispensation'
import { DispensationRepository } from '../../application/ports/dispensation.repository'

interface ProductDocument {
  sku: string
  controlCategory: 'OTC' | 'PRESCRIPTION' | 'PSYCHOTROPIC' | 'ANTIBIOTIC'
  minimumStock: number
}

interface BatchDocument {
  sku: string
  batchId: string
  expiresAt: Date
  quantityAvailable: number
}

interface PrescriptionDocument {
  folio: string
  prescriberId: string
  productSku: string
  status: 'VALID' | 'EXPIRED' | 'REVOKED'
  validUntil: Date
  quantityRemaining: number
}

export class MongoDispensationRepository implements DispensationRepository {
  private readonly products: Collection<ProductDocument>
  private readonly batches: Collection<BatchDocument>
  private readonly prescriptions: Collection<PrescriptionDocument>
  private readonly transactions: Collection
  private readonly outbox: Collection

  constructor(client: MongoClient, databaseName: string) {
    const database = client.db(databaseName)
    this.products = database.collection<ProductDocument>('Products')
    this.batches = database.collection<BatchDocument>('Batches')
    this.prescriptions = database.collection<PrescriptionDocument>('Prescriptions')
    this.transactions = database.collection('Transactions')
    this.outbox = database.collection('OutboxEvents')
  }

  async dispense(command: DispenseCommand): Promise<Dispensation> {
    const session = this.products.db.client.startSession()
    let dispensation: Dispensation | undefined
    try {
      await session.withTransaction(async () => {
        const now = new Date()
        const product = await this.products.findOne({ sku: command.sku }, { session })
        if (!product) throw new DispensationError('Product not found', 'PRODUCT_NOT_FOUND')
        if (product.controlCategory === 'OTC') {
          throw new DispensationError('This endpoint only accepts prescription products', 'PRESCRIPTION_INVALID')
        }

        const prescription = await this.prescriptions.findOneAndUpdate(
          {
            folio: command.prescriptionFolio,
            prescriberId: command.prescriberId,
            productSku: command.sku,
            status: 'VALID',
            validUntil: { $gt: now },
            quantityRemaining: { $gte: command.quantity },
          },
          { $inc: { quantityRemaining: -command.quantity }, $set: { updatedAt: now } },
          { session, returnDocument: 'after' },
        )
        if (!prescription) {
          throw new DispensationError(
            'Prescription is invalid, expired, mismatched or has insufficient remaining quantity',
            'PRESCRIPTION_INVALID',
          )
        }

        const initialStock = await this.batches
          .aggregate<{ total: number }>(
            [
              { $match: { sku: command.sku, expiresAt: { $gt: now } } },
              { $group: { _id: null, total: { $sum: '$quantityAvailable' } } },
            ],
            { session },
          )
          .next()
        const stockBeforeDispensation = initialStock?.total ?? 0

        const candidates = await this.batches
          .find(
            { sku: command.sku, quantityAvailable: { $gt: 0 }, expiresAt: { $gt: now } },
            { session },
          )
          .sort({ expiresAt: 1, batchId: 1 })
          .toArray()

        let quantityToReserve = command.quantity
        const reservedBatches: DispensedBatch[] = []
        for (const batch of candidates) {
          if (quantityToReserve === 0) break
          const quantity = Math.min(batch.quantityAvailable, quantityToReserve)
          const result = await this.batches.updateOne(
            {
              _id: batch._id,
              quantityAvailable: { $gte: quantity },
              expiresAt: { $gt: now },
            },
            { $inc: { quantityAvailable: -quantity } },
            { session },
          )
          if (result.modifiedCount !== 1) {
            throw new DispensationError('Inventory changed; retry the dispensation', 'INSUFFICIENT_STOCK')
          }
          reservedBatches.push({ batchId: batch.batchId, quantity, expiresAt: batch.expiresAt })
          quantityToReserve -= quantity
        }
        if (quantityToReserve > 0) {
          throw new DispensationError('Insufficient unexpired inventory', 'INSUFFICIENT_STOCK')
        }

        dispensation = {
          id: randomUUID(),
          sku: command.sku,
          quantity: command.quantity,
          batches: reservedBatches,
          userId: command.userId,
          timestamp: now,
          prescription: { folio: command.prescriptionFolio, prescriberId: command.prescriberId },
        }
        await this.transactions.insertOne(
          { ...dispensation, type: 'DISPENSATION' },
          { session },
        )

        const stock = await this.batches
          .aggregate<{ total: number }>(
            [
              { $match: { sku: command.sku, expiresAt: { $gt: now } } },
              { $group: { _id: null, total: { $sum: '$quantityAvailable' } } },
            ],
            { session },
          )
          .next()
        const remainingStock = stock?.total ?? 0
        if (stockBeforeDispensation >= product.minimumStock && remainingStock < product.minimumStock) {
          await this.outbox.insertOne(
            {
              type: 'LOW_STOCK',
              sku: command.sku,
              available: remainingStock,
              threshold: product.minimumStock,
              status: 'PENDING',
              createdAt: now,
            },
            { session },
          )
        }
      })
      if (!dispensation) throw new Error('MongoDB transaction completed without a dispensation result')
      return dispensation
    } finally {
      await session.endSession()
    }
  }
}
