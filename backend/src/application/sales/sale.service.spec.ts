import { describe, expect, it, vi } from 'vitest'
import { SaleRepository } from '../ports/sale.repository'
import { SaleService } from './sale.service'

describe('SaleService', () => {
  it('requires customer name before persisting', () => {
    const repository: SaleRepository = {
      complete: vi.fn(),
      listRecent: vi.fn(),
      findById: vi.fn(),
    }
    const service = new SaleService(repository)
    expect(() =>
      service.complete({
        customerName: 'A',
        cashierName: 'Cajero',
        userId: 'u1',
        lines: [{ sku: 'MED-1', quantity: 1, sellMode: 'UNIT' }],
      }),
    ).toThrow(/nombre del comprador/i)
    expect(repository.complete).not.toHaveBeenCalled()
  })

  it('delegates a valid sale', async () => {
    const expected = {
      id: 'sale-1',
      customerName: 'Ana Pérez',
      cashierId: 'u1',
      cashierName: 'Cajero',
      lines: [],
      totalAmount: 0,
      timestamp: new Date(),
    }
    const repository: SaleRepository = {
      complete: vi.fn().mockResolvedValue(expected),
      listRecent: vi.fn(),
      findById: vi.fn(),
    }
    const service = new SaleService(repository)
    await expect(
      service.complete({
        customerName: 'Ana Pérez',
        cashierName: 'Cajero',
        userId: 'u1',
        lines: [{ sku: 'med-1', quantity: 2, sellMode: 'UNIT' }],
      }),
    ).resolves.toEqual(expected)
    expect(repository.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Ana Pérez',
        lines: [{ sku: 'MED-1', quantity: 2, sellMode: 'UNIT' }],
      }),
    )
  })
})
