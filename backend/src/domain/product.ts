export type SellMode = 'UNIT' | 'BOX'
export type ControlCategory = 'OTC' | 'PRESCRIPTION' | 'PSYCHOTROPIC' | 'ANTIBIOTIC'

export interface Product {
  readonly sku: string
  readonly name: string
  readonly description: string
  readonly sellMode: SellMode
  readonly unitsPerBox: number
  readonly unitPrice: number
  readonly controlCategory: ControlCategory
  readonly minimumStock: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface CreateProductCommand {
  readonly sku: string
  readonly name: string
  readonly description: string
  readonly sellMode: SellMode
  readonly unitsPerBox: number
  readonly unitPrice: number
  readonly controlCategory: ControlCategory
  readonly minimumStock: number
}

export class ProductError extends Error {
  constructor(
    message: string,
    readonly code: 'SKU_TAKEN' | 'INVALID_PRODUCT' | 'PRODUCT_NOT_FOUND',
  ) {
    super(message)
    this.name = 'ProductError'
  }
}

export function unitsFromSaleQuantity(quantity: number, sellMode: SellMode, unitsPerBox: number): number {
  if (sellMode === 'BOX') return quantity * unitsPerBox
  return quantity
}
