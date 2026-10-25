import { Inject, Injectable } from '@nestjs/common'
import { CompleteSaleCommand, SaleError, SaleReceipt } from '../../domain/sale'
import { SALE_REPOSITORY, SaleRepository } from '../ports/sale.repository'

@Injectable()
export class SaleService {
  constructor(@Inject(SALE_REPOSITORY) private readonly repository: SaleRepository) {}

  complete(command: CompleteSaleCommand): Promise<SaleReceipt> {
    const customerName = command.customerName.trim()
    if (customerName.length < 2) {
      throw new SaleError('El nombre del comprador es obligatorio (mínimo 2 caracteres)', 'INVALID_SALE')
    }
    if (!command.userId.trim() || !command.cashierName.trim()) {
      throw new SaleError('Usuario cajero requerido', 'INVALID_SALE')
    }
    if (!command.lines.length) {
      throw new SaleError('Agrega al menos un producto al despacho', 'INVALID_SALE')
    }
    for (const line of command.lines) {
      if (!line.sku.trim() || !Number.isSafeInteger(line.quantity) || line.quantity <= 0) {
        throw new SaleError('Cada línea necesita SKU y cantidad entera positiva', 'INVALID_SALE')
      }
      if (line.sellMode !== 'UNIT' && line.sellMode !== 'BOX') {
        throw new SaleError('Modo de venta inválido', 'INVALID_SALE')
      }
    }
    return this.repository.complete({
      ...command,
      customerName,
      lines: command.lines.map((line) => ({
        sku: line.sku.trim().toUpperCase(),
        quantity: line.quantity,
        sellMode: line.sellMode,
      })),
    })
  }

  listRecent(limit = 50): Promise<SaleReceipt[]> {
    return this.repository.listRecent(limit)
  }

  findById(id: string): Promise<SaleReceipt | null> {
    return this.repository.findById(id)
  }
}
