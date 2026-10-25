import { CompleteSaleCommand, SaleReceipt } from '../../domain/sale'

export interface SaleRepository {
  complete(command: CompleteSaleCommand): Promise<SaleReceipt>
  listRecent(limit?: number): Promise<SaleReceipt[]>
  findById(id: string): Promise<SaleReceipt | null>
}

export const SALE_REPOSITORY = Symbol('SALE_REPOSITORY')
