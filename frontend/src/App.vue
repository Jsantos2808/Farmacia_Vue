<script setup lang="ts">
import ControlledMedicationSale from './features/controlled-sale/ControlledMedicationSale.vue'
</script>

<template>
  <main class="shell">
    <header class="page-header">
      <p class="eyebrow">Farmacia · Punto de venta</p>
      <h1>Dispensación de medicamento controlado</h1>
      <p>Verifica la receta y el médico prescriptor antes de registrar la venta.</p>
    </header>
    <ControlledMedicationSale />
  </main>
</template>
