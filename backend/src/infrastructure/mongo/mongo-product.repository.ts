import { Collection, MongoClient } from 'mongodb'
import { CreateProductCommand, Product, ProductError } from '../../domain/product'
import { ProductRepository } from '../../application/ports/product.repository'

interface ProductDocument {
  sku: string
  name: string
  description: string
  sellMode: 'UNIT' | 'BOX'
  unitsPerBox: number
  unitPrice: number
  controlCategory: 'OTC' | 'PRESCRIPTION' | 'PSYCHOTROPIC' | 'ANTIBIOTIC'
  minimumStock: number
  createdAt: Date
  updatedAt: Date
}

export class MongoProductRepository implements ProductRepository {
  private readonly products: Collection<ProductDocument>

  constructor(client: MongoClient, databaseName: string) {
    this.products = client.db(databaseName).collection<ProductDocument>('Products')
  }

  async ensureIndexes(): Promise<void> {
    await this.products.createIndex({ sku: 1 }, { unique: true })
  }

  async create(command: CreateProductCommand): Promise<Product> {
    const now = new Date()
    const document: ProductDocument = {
      sku: command.sku,
      name: command.name,
      description: command.description,
      sellMode: command.sellMode,
      unitsPerBox: command.unitsPerBox,
      unitPrice: command.unitPrice,
      controlCategory: command.controlCategory,
      minimumStock: command.minimumStock,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await this.products.insertOne(document)
    } catch (error) {
      if (isDuplicateKey(error)) throw new ProductError('Ya existe un producto con ese SKU', 'SKU_TAKEN')
      throw error
    }
    return document
  }

  async list(): Promise<Product[]> {
    return this.products.find({}).sort({ name: 1 }).toArray()
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.products.findOne({ sku })
  }
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000
}
