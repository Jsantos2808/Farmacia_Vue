<script setup lang="ts">
import ControlledMedicationSale from '../features/controlled-sale/ControlledMedicationSale.vue'
</script>

<template>
  <section class="page">
    <header class="page-intro">
      <p class="eyebrow">Medicamentos controlados</p>
      <h1>Dispensación con receta</h1>
      <p>
        Para antibióticos, psicotrópicos y productos con receta. Valida folio y médico; el stock se
        descuenta por FEFO.
      </p>
    </header>
    <ControlledMedicationSale />
  </section>
</template>
