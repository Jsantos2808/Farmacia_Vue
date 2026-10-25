import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { MongoClient } from 'mongodb'
import { AuthService } from './application/auth/auth.service'
import { DispenseControlledMedication } from './application/dispense-controlled-medication'
import { InventoryService } from './application/inventory/inventory.service'
import { AUTH_REPOSITORY } from './application/ports/auth.repository'
import { DISPENSATION_REPOSITORY } from './application/ports/dispensation.repository'
import { INVENTORY_REPOSITORY } from './application/ports/inventory.repository'
import { PRODUCT_REPOSITORY } from './application/ports/product.repository'
import { SALE_REPOSITORY } from './application/ports/sale.repository'
import { ProductService } from './application/products/product.service'
import { SaleService } from './application/sales/sale.service'
import { MongoAuthRepository } from './infrastructure/mongo/mongo-auth.repository'
import { MongoBootstrapService } from './infrastructure/mongo/mongo-bootstrap.service'
import { MongoDispensationRepository } from './infrastructure/mongo/mongo-dispensation.repository'
import { MongoInventoryRepository } from './infrastructure/mongo/mongo-inventory.repository'
import { MongoProductRepository } from './infrastructure/mongo/mongo-product.repository'
import { MongoSaleRepository } from './infrastructure/mongo/mongo-sale.repository'
import { MONGO_CLIENT } from './infrastructure/mongo/mongo.tokens'
import { AuthController } from './presentation/auth.controller'
import { AuthMiddleware } from './presentation/auth.middleware'
import { AuthenticatedUserGuard } from './presentation/authenticated-user.guard'
import { DispensationsController } from './presentation/dispensations.controller'
import { HealthController } from './presentation/health.controller'
import { InventoryController } from './presentation/inventory.controller'
import { ProductsController } from './presentation/products.controller'
import { RolesGuard } from './presentation/roles.guard'
import { SalesController } from './presentation/sales.controller'

const databaseName = () => process.env.MONGODB_DATABASE ?? 'pharmacy'

@Module({
  controllers: [
    HealthController,
    AuthController,
    ProductsController,
    InventoryController,
    SalesController,
    DispensationsController,
  ],
  providers: [
    {
      provide: MONGO_CLIENT,
      useFactory: async () => {
        const uri = process.env.MONGODB_URI
        if (!uri) throw new Error('MONGODB_URI must be configured')
        const client = new MongoClient(uri)
        await client.connect()
        return client
      },
    },
    {
      provide: AUTH_REPOSITORY,
      useFactory: (client: MongoClient) => new MongoAuthRepository(client, databaseName()),
      inject: [MONGO_CLIENT],
    },
    {
      provide: PRODUCT_REPOSITORY,
      useFactory: (client: MongoClient) => new MongoProductRepository(client, databaseName()),
      inject: [MONGO_CLIENT],
    },
    {
      provide: INVENTORY_REPOSITORY,
      useFactory: (client: MongoClient) => new MongoInventoryRepository(client, databaseName()),
      inject: [MONGO_CLIENT],
    },
    {
      provide: SALE_REPOSITORY,
      useFactory: (client: MongoClient) => new MongoSaleRepository(client, databaseName()),
      inject: [MONGO_CLIENT],
    },
    {
      provide: DISPENSATION_REPOSITORY,
      useFactory: (client: MongoClient) => new MongoDispensationRepository(client, databaseName()),
      inject: [MONGO_CLIENT],
    },
    AuthService,
    ProductService,
    InventoryService,
    SaleService,
    DispenseControlledMedication,
    AuthMiddleware,
    AuthenticatedUserGuard,
    RolesGuard,
    MongoBootstrapService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthMiddleware).forRoutes('{*path}')
  }
}
