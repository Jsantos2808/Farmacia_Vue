import { SellMode } from './product'

export interface SaleLineInput {
  readonly sku: string
  readonly quantity: number
  readonly sellMode: SellMode
}

export interface CompleteSaleCommand {
  readonly customerName: string
  readonly lines: readonly SaleLineInput[]
  readonly userId: string
  readonly cashierName: string
}

export interface SaleLineBatch {
  readonly batchId: string
  readonly quantity: number
  readonly expiresAt: Date
}

export interface SaleLineResult {
  readonly sku: string
  readonly productName: string
  readonly sellMode: SellMode
  readonly quantity: number
  readonly unitsSold: number
  readonly unitPrice: number
  readonly lineTotal: number
  readonly batches: readonly SaleLineBatch[]
}

export interface SaleReceipt {
  readonly id: string
  readonly customerName: string
  readonly cashierId: string
  readonly cashierName: string
  readonly lines: readonly SaleLineResult[]
  readonly totalAmount: number
  readonly timestamp: Date
}

export class SaleError extends Error {
  constructor(
    message: string,
    readonly code: 'PRODUCT_NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'INVALID_SALE' | 'PRESCRIPTION_REQUIRED',
  ) {
    super(message)
    this.name = 'SaleError'
  }
}
