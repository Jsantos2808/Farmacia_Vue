<script setup lang="ts">
import { useControlledSaleModel } from './model'

const { state, dispatch } = useControlledSaleModel()
</script>

<template>
  <section class="sale-card" aria-labelledby="sale-title">
    <div class="card-heading">
      <div>
        <p class="eyebrow">Validación obligatoria</p>
        <h2 id="sale-title">Datos de dispensación</h2>
      </div>
      <span class="status-chip">Receta requerida</span>
    </div>

    <form class="sale-form" @submit.prevent="dispatch({ type: 'dispenseRequested' })">
      <label>
        SKU del medicamento
        <input
          :value="state.sku"
          autocomplete="off"
          required
          @input="dispatch({ type: 'skuChanged', value: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label>
        Cantidad
        <input
          :value="state.quantity"
          type="number"
          min="1"
          step="1"
          required
          @input="dispatch({ type: 'quantityChanged', value: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label>
        Folio de receta
        <input
          :value="state.prescriptionFolio"
          autocomplete="off"
          required
          @input="dispatch({ type: 'folioChanged', value: ($event.target as HTMLInputElement).value })"
        />
      </label>
      <label>
        ID del médico prescriptor
        <input
          :value="state.prescriberId"
          autocomplete="off"
          required
          @input="dispatch({ type: 'prescriberChanged', value: ($event.target as HTMLInputElement).value })"
        />
      </label>

      <p v-if="state.message" class="feedback" :class="`feedback--${state.status}`" role="status">
        {{ state.message }}
      </p>

      <button type="submit" :disabled="state.status === 'submitting'">
        {{ state.status === 'submitting' ? 'Validando receta…' : 'Validar y dispensar' }}
      </button>
    </form>
    <p class="privacy-note">
      No introduzcas datos identificables del paciente en este formulario.
    </p>
  </section>
</template>
