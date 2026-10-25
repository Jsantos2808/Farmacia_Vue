<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../lib/api'
import type { SaleReceipt } from '../types'

const sales = ref<SaleReceipt[]>([])
const error = ref('')

onMounted(async () => {
  try {
    sales.value = await api<SaleReceipt[]>('/api/sales?limit=50')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar las ventas'
  }
})
</script>

<template>
  <section class="page">
    <header class="page-intro">
      <p class="eyebrow">Historial</p>
      <h1>Ventas / despachos</h1>
      <p>Cada compra guarda el nombre del comprador como comprobante de a quién se despachó.</p>
    </header>

    <p v-if="error" class="feedback feedback--error">{{ error }}</p>

    <div v-if="sales.length" class="panel">
      <ul class="data-list">
        <li v-for="sale in sales" :key="sale.id">
          <strong>{{ sale.customerName }}</strong>
          <span>
            Q{{ sale.totalAmount.toFixed(2) }} · {{ sale.cashierName }} ·
            {{ new Date(sale.timestamp).toLocaleString() }}
          </span>
          <span class="hint">
            {{ sale.lines.map((line) => `${line.productName}×${line.quantity}`).join(' · ') }}
          </span>
          <span class="hint">Folio {{ sale.id }}</span>
        </li>
      </ul>
    </div>
    <p v-else class="empty">Todavía no hay despachos registrados.</p>
  </section>
</template>
