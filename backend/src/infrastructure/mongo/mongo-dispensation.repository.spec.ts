// Runtime validation coverage for: transactional controlled medication dispensing
import { randomUUID } from 'node:crypto'
import { MongoClient, type Db } from 'mongodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoDispensationRepository } from './mongo-dispensation.repository'

const connectionString =
  process.env.TEST_MONGODB_URI ??
  'mongodb://localhost:27017/?directConnection=true&replicaSet=rs0'
const databaseName = `pharmacy_test_${randomUUID().replaceAll('-', '')}`
const sku = 'TEST-MED-01'
const folio = 'RX-TEST-01'
const prescriberId = 'MD-TEST-01'
const userId = 'user-test-01'

let client: MongoClient
let database: Db
let repository: MongoDispensationRepository
let expirySoon: Date
let expiryLater: Date

function validCommand(overrides: Partial<{
  sku: string
  quantity: number
  prescriptionFolio: string
  prescriberId: string
  userId: string
}> = {}) {
  return {
    sku,
    quantity: 1,
    prescriptionFolio: folio,
    prescriberId,
    userId,
    ...overrides,
  }
}

async function addPrescription(overrides: Record<string, unknown> = {}) {
  await database.collection('Prescriptions').insertOne({
    folio,
    prescriberId,
    productSku: sku,
    status: 'VALID',
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
    quantityRemaining: 10,
    ...overrides,
  })
}

beforeAll(async () => {
  client = new MongoClient(connectionString, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  database = client.db(databaseName)
  repository = new MongoDispensationRepository(client, databaseName)
})

beforeEach(async () => {
  await Promise.all(
    ['Products', 'Batches', 'Prescriptions', 'Transactions', 'OutboxEvents'].map((collectionName) =>
      database.collection(collectionName).deleteMany({}),
    ),
  )
  const now = Date.now()
  expirySoon = new Date(now + 24 * 60 * 60 * 1000)
  expiryLater = new Date(now + 2 * 24 * 60 * 60 * 1000)
  await database.collection('Products').insertOne({
    sku,
    controlCategory: 'ANTIBIOTIC',
    minimumStock: 4,
  })
  await database.collection('Batches').insertMany([
    {
      sku,
      batchId: 'LOT-EXPIRED',
      expiresAt: new Date(now - 24 * 60 * 60 * 1000),
      quantityAvailable: 99,
    },
    { sku, batchId: 'LOT-EARLY', expiresAt: expirySoon, quantityAvailable: 2 },
    { sku, batchId: 'LOT-LATE', expiresAt: expiryLater, quantityAvailable: 3 },
  ])
  await addPrescription()
})

afterAll(async () => {
  if (database) await database.dropDatabase()
  if (client) await client.close()
})

describe('MongoDB controlled medication dispensing', () => {
  it('rejects an unknown SKU without recording a sale', async () => {
    await expect(repository.dispense(validCommand({ sku: 'UNKNOWN' }))).rejects.toMatchObject({
      code: 'PRODUCT_NOT_FOUND',
    })
    expect(await database.collection('Transactions').countDocuments()).toBe(0)
  })

  it('rejects OTC products on the controlled-medication endpoint', async () => {
    await database.collection('Products').updateOne({ sku }, { $set: { controlCategory: 'OTC' } })

    await expect(repository.dispense(validCommand())).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects a missing prescription', async () => {
    await database.collection('Prescriptions').deleteMany({})

    await expect(repository.dispense(validCommand())).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects a mismatched prescription folio', async () => {
    await expect(repository.dispense(validCommand({ prescriptionFolio: 'RX-WRONG' }))).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects a mismatched prescriber ID', async () => {
    await expect(repository.dispense(validCommand({ prescriberId: 'MD-WRONG' }))).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects a prescription assigned to a different SKU', async () => {
    await database.collection('Prescriptions').updateOne({ folio }, { $set: { productSku: 'OTHER-SKU' } })

    await expect(repository.dispense(validCommand())).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects an expired prescription', async () => {
    await database.collection('Prescriptions').updateOne(
      { folio },
      { $set: { validUntil: new Date(Date.now() - 1000) } },
    )

    await expect(repository.dispense(validCommand())).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects a revoked prescription', async () => {
    await database.collection('Prescriptions').updateOne({ folio }, { $set: { status: 'REVOKED' } })

    await expect(repository.dispense(validCommand())).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('rejects a quantity greater than the prescription balance', async () => {
    await database.collection('Prescriptions').updateOne(
      { folio },
      { $set: { quantityRemaining: 1 } },
    )

    await expect(repository.dispense(validCommand({ quantity: 2 }))).rejects.toMatchObject({
      code: 'PRESCRIPTION_INVALID',
    })
  })

  it('allocates inventory in FEFO order across multiple batches', async () => {
    const sale = await repository.dispense(validCommand({ quantity: 3 }))

    expect(sale.batches.map(({ batchId, quantity }) => [batchId, quantity])).toEqual([
      ['LOT-EARLY', 2],
      ['LOT-LATE', 1],
    ])
  })

  it('never dispenses an expired batch', async () => {
    const sale = await repository.dispense(validCommand())

    expect(sale.batches).toEqual([{ batchId: 'LOT-EARLY', quantity: 1, expiresAt: expirySoon }])
    expect((await database.collection('Batches').findOne({ batchId: 'LOT-EXPIRED' }))?.quantityAvailable).toBe(99)
  })

  it('persists an immutable audit record with user, timestamp, prescription, and exact lots', async () => {
    const sale = await repository.dispense(validCommand({ quantity: 3 }))
    const record = await database.collection('Transactions').findOne({ id: sale.id })

    expect(record).toMatchObject({
      type: 'DISPENSATION',
      sku,
      quantity: 3,
      userId,
      prescription: { folio, prescriberId },
      batches: [
        { batchId: 'LOT-EARLY', quantity: 2 },
        { batchId: 'LOT-LATE', quantity: 1 },
      ],
    })
    expect(record?.timestamp).toBeInstanceOf(Date)
  })

  it('decrements the prescription balance and available batches atomically', async () => {
    await repository.dispense(validCommand({ quantity: 3 }))

    expect((await database.collection('Prescriptions').findOne({ folio }))?.quantityRemaining).toBe(7)
    expect((await database.collection('Batches').findOne({ batchId: 'LOT-EARLY' }))?.quantityAvailable).toBe(0)
    expect((await database.collection('Batches').findOne({ batchId: 'LOT-LATE' }))?.quantityAvailable).toBe(2)
  })

  it('creates a low-stock outbox event when a sale crosses the safety threshold', async () => {
    await repository.dispense(validCommand({ quantity: 2 }))

    await expect(database.collection('OutboxEvents').findOne({ sku, type: 'LOW_STOCK' })).resolves.toMatchObject({
      available: 3,
      threshold: 4,
      status: 'PENDING',
    })
  })

  it('does not emit a low-stock event when stock remains at the threshold', async () => {
    await repository.dispense(validCommand({ quantity: 1 }))

    expect(await database.collection('OutboxEvents').countDocuments({ sku, type: 'LOW_STOCK' })).toBe(0)
  })

  it('does not duplicate a threshold-crossing event when stock was already low', async () => {
    await database.collection('Batches').updateOne(
      { batchId: 'LOT-LATE' },
      { $set: { quantityAvailable: 1 } },
    )
    await repository.dispense(validCommand())

    expect(await database.collection('OutboxEvents').countDocuments({ sku, type: 'LOW_STOCK' })).toBe(0)
  })

  it('rolls back prescription, inventory, and audit when active stock is insufficient', async () => {
    await expect(repository.dispense(validCommand({ quantity: 6 }))).rejects.toMatchObject({
      code: 'INSUFFICIENT_STOCK',
    })

    expect((await database.collection('Prescriptions').findOne({ folio }))?.quantityRemaining).toBe(10)
    expect((await database.collection('Batches').findOne({ batchId: 'LOT-EARLY' }))?.quantityAvailable).toBe(2)
    expect((await database.collection('Batches').findOne({ batchId: 'LOT-LATE' }))?.quantityAvailable).toBe(3)
    expect(await database.collection('Transactions').countDocuments()).toBe(0)
    expect(await database.collection('OutboxEvents').countDocuments()).toBe(0)
  })
})
