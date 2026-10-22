import { readonly, shallowRef } from 'vue'

export type SaleIntent =
  | { type: 'skuChanged'; value: string }
  | { type: 'quantityChanged'; value: string }
  | { type: 'folioChanged'; value: string }
  | { type: 'prescriberChanged'; value: string }
  | { type: 'dispenseRequested' }

export interface SaleState {
  readonly sku: string
  readonly quantity: string
  readonly prescriptionFolio: string
  readonly prescriberId: string
  readonly status: 'idle' | 'submitting' | 'success' | 'error'
  readonly message: string
}

const initialState: SaleState = Object.freeze({
  sku: '',
  quantity: '1',
  prescriptionFolio: '',
  prescriberId: '',
  status: 'idle',
  message: '',
})

function freezeState(state: SaleState): SaleState {
  return Object.freeze(state)
}

export function useControlledSaleModel() {
  const current = shallowRef<SaleState>(initialState)

  function update(fields: Partial<SaleState>) {
    current.value = freezeState({ ...current.value, ...fields })
  }

  async function dispatch(intent: SaleIntent): Promise<void> {
    switch (intent.type) {
      case 'skuChanged':
        update({ sku: intent.value, status: 'idle', message: '' })
        return
      case 'quantityChanged':
        update({ quantity: intent.value, status: 'idle', message: '' })
        return
      case 'folioChanged':
        update({ prescriptionFolio: intent.value, status: 'idle', message: '' })
        return
      case 'prescriberChanged':
        update({ prescriberId: intent.value, status: 'idle', message: '' })
        return
      case 'dispenseRequested': {
        const state = current.value
        const quantity = Number(state.quantity)
        if (!state.sku.trim() || !state.prescriptionFolio.trim() || !state.prescriberId.trim()) {
          update({ status: 'error', message: 'Completa el SKU, folio de receta e ID del médico.' })
          return
        }
        if (!Number.isSafeInteger(quantity) || quantity <= 0) {
          update({ status: 'error', message: 'La cantidad debe ser un entero mayor que cero.' })
          return
        }

        update({ status: 'submitting', message: '' })
        try {
          const response = await fetch('/api/dispensations', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sku: state.sku.trim(),
              quantity,
              prescriptionFolio: state.prescriptionFolio.trim(),
              prescriberId: state.prescriberId.trim(),
            }),
          })
          if (!response.ok) {
            const details = await response.text()
            throw new Error(details || `La solicitud falló (${response.status}).`)
          }
          update({ status: 'success', message: 'Dispensación registrada correctamente.' })
        } catch (error) {
          update({
            status: 'error',
            message: error instanceof Error ? error.message : 'No fue posible registrar la dispensación.',
          })
        }
      }
    }
  }

  return { state: readonly(current), dispatch }
}
