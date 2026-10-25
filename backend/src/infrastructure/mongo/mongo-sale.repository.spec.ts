import { randomUUID } from 'node:crypto'
import { MongoClient, type Db } from 'mongodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MongoSaleRepository } from './mongo-sale.repository'

const connectionString =
  process.env.TEST_MONGODB_URI ??
  'mongodb://localhost:27017/?directConnection=true&replicaSet=rs0'
const databaseName = `pharmacy_sale_test_${randomUUID().replaceAll('-', '')}`

let client: MongoClient
let database: Db
let repository: MongoSaleRepository
let expirySoon: Date
let expiryLater: Date

beforeAll(async () => {
  client = new MongoClient(connectionString, { serverSelectionTimeoutMS: 5000 })
  await client.connect()
  database = client.db(databaseName)
  repository = new MongoSaleRepository(client, databaseName)
})

beforeEach(async () => {
  await Promise.all(
    ['Products', 'Batches', 'Transactions', 'OutboxEvents'].map((name) =>
      database.collection(name).deleteMany({}),
    ),
  )
  const now = Date.now()
  expirySoon = new Date(now + 24 * 60 * 60 * 1000)
  expiryLater = new Date(now + 3 * 24 * 60 * 60 * 1000)
  await database.collection('Products').insertOne({
    sku: 'OTC-01',
    name: 'Paracetamol 500mg',
    description: 'Analgésico',
    sellMode: 'BOX',
    unitsPerBox: 10,
    unitPrice: 1.5,
    controlCategory: 'OTC',
    minimumStock: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  await database.collection('Batches').insertMany([
    {
      sku: 'OTC-01',
      batchId: 'LOT-LATE',
      expiresAt: expiryLater,
      quantityAvailable: 20,
      receivedAt: new Date(now - 1000),
    },
    {
      sku: 'OTC-01',
      batchId: 'LOT-EARLY',
      expiresAt: expirySoon,
      quantityAvailable: 8,
      receivedAt: new Date(now - 5000),
    },
  ])
})

afterAll(async () => {
  if (database) await database.dropDatabase()
  if (client) await client.close()
})

describe('MongoDB OTC sale with FEFO', () => {
  it('allocates soonest-expiring batches first and stores customer receipt', async () => {
    const receipt = await repository.complete({
      customerName: 'María López',
      cashierName: 'Cajero Demo',
      userId: 'cashier-1',
      lines: [{ sku: 'OTC-01', quantity: 1, sellMode: 'BOX' }],
    })

    expect(receipt.customerName).toBe('María López')
    expect(receipt.totalAmount).toBe(15)
    expect(receipt.lines[0].batches).toEqual([
      { batchId: 'LOT-EARLY', quantity: 8, expiresAt: expirySoon },
      { batchId: 'LOT-LATE', quantity: 2, expiresAt: expiryLater },
    ])

    const early = await database.collection('Batches').findOne({ batchId: 'LOT-EARLY' })
    const late = await database.collection('Batches').findOne({ batchId: 'LOT-LATE' })
    expect(early?.quantityAvailable).toBe(0)
    expect(late?.quantityAvailable).toBe(18)
  })

  it('rejects controlled products on the cashier sale endpoint', async () => {
    await database.collection('Products').updateOne(
      { sku: 'OTC-01' },
      { $set: { controlCategory: 'ANTIBIOTIC' } },
    )
    await expect(
      repository.complete({
        customerName: 'María López',
        cashierName: 'Cajero Demo',
        userId: 'cashier-1',
        lines: [{ sku: 'OTC-01', quantity: 1, sellMode: 'UNIT' }],
      }),
    ).rejects.toMatchObject({ code: 'PRESCRIPTION_REQUIRED' })
  })
})
