// Runtime validation coverage for: controlled medication command validation
import { describe, expect, it, vi } from 'vitest'
import { DispenseControlledMedication } from './dispense-controlled-medication'
import { DispensationRepository } from './ports/dispensation.repository'
import { Dispensation, DispenseCommand } from '../domain/dispensation'

const validCommand: DispenseCommand = {
  sku: 'MED-01',
  quantity: 2,
  prescriptionFolio: 'RX-01',
  prescriberId: 'MD-01',
  userId: 'user-01',
}

const validResult: Dispensation = {
  id: 'sale-01',
  sku: validCommand.sku,
  quantity: validCommand.quantity,
  batches: [],
  userId: validCommand.userId,
  timestamp: new Date('2026-01-01T00:00:00.000Z'),
  prescription: {
    folio: validCommand.prescriptionFolio,
    prescriberId: validCommand.prescriberId,
  },
}

describe('controlled medication application use case', () => {
  it.each([
    ['SKU', { sku: ' ' }],
    ['prescription folio', { prescriptionFolio: '' }],
    ['prescriber ID', { prescriberId: '' }],
    ['authenticated user', { userId: '' }],
    ['zero quantity', { quantity: 0 }],
    ['fractional quantity', { quantity: 1.5 }],
    ['unsafe integer quantity', { quantity: Number.MAX_SAFE_INTEGER + 1 }],
  ])('rejects invalid %s before repository access', (_field, overrides) => {
    const repository: DispensationRepository = { dispense: vi.fn<DispensationRepository['dispense']>() }
    const useCase = new DispenseControlledMedication(repository)

    expect(() => useCase.execute({ ...validCommand, ...overrides })).toThrow(TypeError)
    expect(repository.dispense).not.toHaveBeenCalled()
  })

  it('delegates a valid command to the repository unchanged', async () => {
    const expected = validResult
    const repository: DispensationRepository = {
      dispense: vi.fn<DispensationRepository['dispense']>().mockResolvedValue(expected),
    }
    const useCase = new DispenseControlledMedication(repository)

    await expect(useCase.execute(validCommand)).resolves.toEqual(expected)
    expect(repository.dispense).toHaveBeenCalledWith(validCommand)
  })
})
