import { Inject, Injectable } from '@nestjs/common'
import { InventoryError, InventoryReceipt, ReceiveStockCommand, StockBatch } from '../../domain/inventory'
import { INVENTORY_REPOSITORY, InventoryRepository } from '../ports/inventory.repository'

@Injectable()
export class InventoryService {
  constructor(@Inject(INVENTORY_REPOSITORY) private readonly repository: InventoryRepository) {}

  receive(command: ReceiveStockCommand): Promise<InventoryReceipt> {
    const sku = command.sku.trim().toUpperCase()
    const batchId = command.batchId.trim().toUpperCase()
    if (!sku || !batchId || !command.userId.trim()) {
      throw new InventoryError('SKU, lote y usuario son obligatorios', 'INVALID_RECEIPT')
    }
    if (!Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
      throw new InventoryError('La cantidad debe ser un entero positivo', 'INVALID_RECEIPT')
    }
    const expiresAt =
      command.expiresAt instanceof Date ? command.expiresAt : new Date(command.expiresAt as unknown as string)
    if (Number.isNaN(expiresAt.getTime())) {
      throw new InventoryError('Fecha de vencimiento inválida', 'INVALID_RECEIPT')
    }
    if (expiresAt.getTime() <= Date.now()) {
      throw new InventoryError('No se pueden ingresar lotes ya vencidos', 'INVALID_RECEIPT')
    }
    return this.repository.receive({
      ...command,
      sku,
      batchId,
      expiresAt,
      notes: command.notes?.trim() || undefined,
    })
  }

  listBatches(sku?: string): Promise<StockBatch[]> {
    return this.repository.listBatches(sku?.trim().toUpperCase())
  }

  stockBySku() {
    return this.repository.stockBySku()
  }
}
