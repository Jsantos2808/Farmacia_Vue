export type SellMode = 'UNIT' | 'BOX'
export type ControlCategory = 'OTC' | 'PRESCRIPTION' | 'PSYCHOTROPIC' | 'ANTIBIOTIC'

export interface Product {
  sku: string
  name: string
  description: string
  sellMode: SellMode
  unitsPerBox: number
  unitPrice: number
  controlCategory: ControlCategory
  minimumStock: number
}

export interface StockBatch {
  sku: string
  batchId: string
  expiresAt: string
  quantityAvailable: number
  receivedAt: string
}

export interface SaleLineInput {
  sku: string
  quantity: number
  sellMode: SellMode
}

export interface SaleReceipt {
  id: string
  customerName: string
  cashierId: string
  cashierName: string
  lines: Array<{
    sku: string
    productName: string
    sellMode: SellMode
    quantity: number
    unitsSold: number
    unitPrice: number
    lineTotal: number
    batches: Array<{ batchId: string; quantity: number; expiresAt: string }>
  }>
  totalAmount: number
  timestamp: string
}
