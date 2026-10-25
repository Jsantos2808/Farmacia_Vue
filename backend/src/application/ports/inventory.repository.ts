import { InventoryReceipt, ReceiveStockCommand, StockBatch } from '../../domain/inventory'

export interface InventoryRepository {
  receive(command: ReceiveStockCommand): Promise<InventoryReceipt>
  listBatches(sku?: string): Promise<StockBatch[]>
  stockBySku(): Promise<Array<{ sku: string; available: number }>>
}

export const INVENTORY_REPOSITORY = Symbol('INVENTORY_REPOSITORY')
