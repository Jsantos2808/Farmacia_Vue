export interface DispenseCommand {
  readonly sku: string
  readonly quantity: number
  readonly prescriptionFolio: string
  readonly prescriberId: string
  readonly userId: string
}

export class DispensationError extends Error {
  constructor(
    message: string,
    readonly code: 'PRODUCT_NOT_FOUND' | 'PRESCRIPTION_INVALID' | 'INSUFFICIENT_STOCK',
  ) {
    super(message)
    this.name = 'DispensationError'
  }
}

export interface DispensedBatch {
  readonly batchId: string
  readonly quantity: number
  readonly expiresAt: Date
}

export interface Dispensation {
  readonly id: string
  readonly sku: string
  readonly quantity: number
  readonly batches: readonly DispensedBatch[]
  readonly userId: string
  readonly timestamp: Date
  readonly prescription: {
    readonly folio: string
    readonly prescriberId: string
  }
}
