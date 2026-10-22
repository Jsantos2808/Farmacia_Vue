// Runtime validation coverage for: controlled medication sale MVI model
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useControlledSaleModel } from './model'

describe('controlled medication sale model', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('starts with an empty, immutable state and quantity one', () => {
    const { state } = useControlledSaleModel()

    expect(state.value).toEqual({
      sku: '',
      quantity: '1',
      prescriptionFolio: '',
      prescriberId: '',
      status: 'idle',
      message: '',
    })
    expect(Object.isFrozen(state.value)).toBe(true)
  })

  it('applies each field-change intent without mutating the previous state', async () => {
    const { state, dispatch } = useControlledSaleModel()
    const initial = state.value

    await dispatch({ type: 'skuChanged', value: 'MED-01' })
    await dispatch({ type: 'quantityChanged', value: '3' })
    await dispatch({ type: 'folioChanged', value: 'RX-01' })
    await dispatch({ type: 'prescriberChanged', value: 'MD-01' })

    expect(initial.sku).toBe('')
    expect(state.value).toMatchObject({
      sku: 'MED-01',
      quantity: '3',
      prescriptionFolio: 'RX-01',
      prescriberId: 'MD-01',
    })
    expect(Object.isFrozen(state.value)).toBe(true)
  })

  it('rejects a dispense intent when required prescription fields are missing', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { state, dispatch } = useControlledSaleModel()

    await dispatch({ type: 'dispenseRequested' })

    expect(state.value.status).toBe('error')
    expect(state.value.message).toContain('folio de receta')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a fractional quantity before making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { state, dispatch } = useControlledSaleModel()
    await dispatch({ type: 'skuChanged', value: 'MED-01' })
    await dispatch({ type: 'quantityChanged', value: '1.5' })
    await dispatch({ type: 'folioChanged', value: 'RX-01' })
    await dispatch({ type: 'prescriberChanged', value: 'MD-01' })

    await dispatch({ type: 'dispenseRequested' })

    expect(state.value.message).toContain('entero mayor que cero')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a zero quantity before making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { state, dispatch } = useControlledSaleModel()
    await dispatch({ type: 'skuChanged', value: 'MED-01' })
    await dispatch({ type: 'quantityChanged', value: '0' })
    await dispatch({ type: 'folioChanged', value: 'RX-01' })
    await dispatch({ type: 'prescriberChanged', value: 'MD-01' })

    await dispatch({ type: 'dispenseRequested' })

    expect(state.value.status).toBe('error')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits normalized fields with cookies and displays success', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const { state, dispatch } = useControlledSaleModel()
    await dispatch({ type: 'skuChanged', value: ' MED-01 ' })
    await dispatch({ type: 'quantityChanged', value: '2' })
    await dispatch({ type: 'folioChanged', value: ' RX-01 ' })
    await dispatch({ type: 'prescriberChanged', value: ' MD-01 ' })

    await dispatch({ type: 'dispenseRequested' })

    expect(fetchMock).toHaveBeenCalledWith('/api/dispensations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'MED-01',
        quantity: 2,
        prescriptionFolio: 'RX-01',
        prescriberId: 'MD-01',
      }),
    })
    expect(state.value.status).toBe('success')
    expect(state.value.message).toContain('correctamente')
  })

  it('surfaces API validation errors to the user', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('Prescription is invalid', { status: 409 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const { state, dispatch } = useControlledSaleModel()
    await dispatch({ type: 'skuChanged', value: 'MED-01' })
    await dispatch({ type: 'folioChanged', value: 'RX-BAD' })
    await dispatch({ type: 'prescriberChanged', value: 'MD-01' })

    await dispatch({ type: 'dispenseRequested' })

    expect(state.value.status).toBe('error')
    expect(state.value.message).toBe('Prescription is invalid')
  })

  it('surfaces network errors and clears prior feedback when an input changes', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network unavailable'))
    vi.stubGlobal('fetch', fetchMock)
    const { state, dispatch } = useControlledSaleModel()
    await dispatch({ type: 'skuChanged', value: 'MED-01' })
    await dispatch({ type: 'folioChanged', value: 'RX-01' })
    await dispatch({ type: 'prescriberChanged', value: 'MD-01' })
    await dispatch({ type: 'dispenseRequested' })

    expect(state.value.message).toBe('Network unavailable')
    await dispatch({ type: 'skuChanged', value: 'MED-02' })

    expect(state.value.status).toBe('idle')
    expect(state.value.message).toBe('')
    expect(state.value.sku).toBe('MED-02')
  })
})
