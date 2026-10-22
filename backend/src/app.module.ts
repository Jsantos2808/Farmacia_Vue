import { Module } from '@nestjs/common'
import { MongoClient } from 'mongodb'
import { DispenseControlledMedication } from './application/dispense-controlled-medication'
import { DISPENSATION_REPOSITORY } from './application/ports/dispensation.repository'
import { MongoDispensationRepository } from './infrastructure/mongo/mongo-dispensation.repository'
import { DispensationsController } from './presentation/dispensations.controller'
import { HealthController } from './presentation/health.controller'

@Module({
  controllers: [DispensationsController, HealthController],
  providers: [
    {
      provide: MongoClient,
      useFactory: async () => {
        const uri = process.env.MONGODB_URI
        if (!uri) throw new Error('MONGODB_URI must be configured')
        const client = new MongoClient(uri)
        await client.connect()
        return client
      },
    },
    {
      provide: DISPENSATION_REPOSITORY,
      useFactory: (client: MongoClient) => {
        const databaseName = process.env.MONGODB_DATABASE ?? 'pharmacy'
        return new MongoDispensationRepository(client, databaseName)
      },
      inject: [MongoClient],
    },
    DispenseControlledMedication,
  ],
})
export class AppModule {}
