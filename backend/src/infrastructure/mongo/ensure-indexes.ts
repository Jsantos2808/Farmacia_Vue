import { MongoAuthRepository } from './mongo-auth.repository'
import { MongoInventoryRepository } from './mongo-inventory.repository'
import { MongoProductRepository } from './mongo-product.repository'
import { MongoSaleRepository } from './mongo-sale.repository'

export async function ensureMongoIndexes(params: {
  auth: MongoAuthRepository
  products: MongoProductRepository
  inventory: MongoInventoryRepository
  sales: MongoSaleRepository
}): Promise<void> {
  await Promise.all([
    params.auth.ensureIndexes(),
    params.products.ensureIndexes(),
    params.inventory.ensureIndexes(),
    params.sales.ensureIndexes(),
  ])
}
