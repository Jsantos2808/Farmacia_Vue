import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { MongoClient } from 'mongodb'
import { ensureMongoIndexes } from './ensure-indexes'
import { MongoAuthRepository } from './mongo-auth.repository'
import { MongoInventoryRepository } from './mongo-inventory.repository'
import { MongoProductRepository } from './mongo-product.repository'
import { MongoSaleRepository } from './mongo-sale.repository'
import { MONGO_CLIENT } from './mongo.tokens'

@Injectable()
export class MongoBootstrapService implements OnModuleInit {
  constructor(@Inject(MONGO_CLIENT) private readonly client: MongoClient) {}

  async onModuleInit(): Promise<void> {
    const databaseName = process.env.MONGODB_DATABASE ?? 'pharmacy'
    await ensureMongoIndexes({
      auth: new MongoAuthRepository(this.client, databaseName),
      products: new MongoProductRepository(this.client, databaseName),
      inventory: new MongoInventoryRepository(this.client, databaseName),
      sales: new MongoSaleRepository(this.client, databaseName),
    })
  }
}
