import { CreateProductCommand, Product } from '../../domain/product'

export interface ProductRepository {
  create(command: CreateProductCommand): Promise<Product>
  list(): Promise<Product[]>
  findBySku(sku: string): Promise<Product | null>
}

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY')
