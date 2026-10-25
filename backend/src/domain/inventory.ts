export interface ReceiveStockCommand {
  readonly sku: string
  readonly batchId: string
  readonly quantity: number
  readonly expiresAt: Date
  readonly unitCost?: number
  readonly userId: string
  readonly notes?: string
}

export interface StockBatch {
  readonly sku: string
  readonly batchId: string
  readonly expiresAt: Date
  readonly quantityAvailable: number
  readonly receivedAt: Date
  readonly unitCost?: number
}

export interface InventoryReceipt {
  readonly id: string
  readonly sku: string
  readonly batchId: string
  readonly quantity: number
  readonly expiresAt: Date
  readonly userId: string
  readonly timestamp: Date
  readonly notes?: string
}

export class InventoryError extends Error {
  constructor(
    message: string,
    readonly code: 'PRODUCT_NOT_FOUND' | 'INVALID_RECEIPT' | 'BATCH_EXISTS',
  ) {
    super(message)
    this.name = 'InventoryError'
  }
}
