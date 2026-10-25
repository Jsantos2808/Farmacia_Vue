import { Inject, Injectable } from '@nestjs/common'
import { CreateProductCommand, Product, ProductError } from '../../domain/product'
import { PRODUCT_REPOSITORY, ProductRepository } from '../ports/product.repository'

@Injectable()
export class ProductService {
  constructor(@Inject(PRODUCT_REPOSITORY) private readonly repository: ProductRepository) {}

  create(command: CreateProductCommand): Promise<Product> {
    const sku = command.sku.trim().toUpperCase()
    const name = command.name.trim()
    const description = command.description.trim()
    if (!sku || !name || !description) {
      throw new ProductError('SKU, nombre y descripción son obligatorios', 'INVALID_PRODUCT')
    }
    if (!Number.isSafeInteger(command.unitsPerBox) || command.unitsPerBox < 1) {
      throw new ProductError('unitsPerBox debe ser un entero >= 1', 'INVALID_PRODUCT')
    }
    if (command.sellMode === 'UNIT' && command.unitsPerBox !== 1) {
      throw new ProductError('Para venta por unidad, unitsPerBox debe ser 1', 'INVALID_PRODUCT')
    }
    if (!(command.unitPrice >= 0) || !Number.isFinite(command.unitPrice)) {
      throw new ProductError('Precio unitario inválido', 'INVALID_PRODUCT')
    }
    if (!Number.isSafeInteger(command.minimumStock) || command.minimumStock < 0) {
      throw new ProductError('minimumStock inválido', 'INVALID_PRODUCT')
    }
    return this.repository.create({
      ...command,
      sku,
      name,
      description,
      unitsPerBox: command.sellMode === 'UNIT' ? 1 : command.unitsPerBox,
    })
  }

  list(): Promise<Product[]> {
    return this.repository.list()
  }
}
