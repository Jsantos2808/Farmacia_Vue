<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../lib/api'
import type { Product, StockBatch } from '../types'

const products = ref<Product[]>([])
const batches = ref<StockBatch[]>([])
const error = ref('')
const success = ref('')
const loading = ref(false)

const form = ref({
  sku: '',
  batchId: '',
  quantity: 1,
  expiresAt: '',
  unitCost: 0,
  notes: '',
})

async function refresh() {
  const [productList, batchList] = await Promise.all([
    api<Product[]>('/api/products'),
    api<StockBatch[]>('/api/inventory/batches'),
  ])
  products.value = productList
  batches.value = batchList
  if (!form.value.sku && productList[0]) form.value.sku = productList[0].sku
}

onMounted(async () => {
  try {
    await refresh()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar inventario'
  }
})

async function submit() {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    await api('/api/inventory/receipts', {
      method: 'POST',
      body: JSON.stringify({
        sku: form.value.sku,
        batchId: form.value.batchId,
        quantity: form.value.quantity,
        expiresAt: new Date(form.value.expiresAt).toISOString(),
        unitCost: form.value.unitCost || undefined,
        notes: form.value.notes || undefined,
      }),
    })
    success.value = 'Ingreso registrado. Los despachos usarán FEFO (primero vence, primero sale).'
    form.value.batchId = ''
    form.value.quantity = 1
    form.value.notes = ''
    await refresh()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo registrar el ingreso'
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}
</script>

<template>
  <section class="page">
    <header class="page-intro">
      <p class="eyebrow">Inventario</p>
      <h1>Ingresos de mercancía</h1>
      <p>
        Registra lotes con cantidad y fecha de vencimiento. Al despachar se consume primero el lote que caduca antes (FEFO).
      </p>
    </header>

    <div class="pos-grid">
      <form class="panel stack-form" @submit.prevent="submit">
        <h2>Nuevo ingreso</h2>
        <label>
          Producto
          <select v-model="form.sku" required>
            <option v-for="product in products" :key="product.sku" :value="product.sku">
              {{ product.name }} ({{ product.sku }})
            </option>
          </select>
        </label>
        <label>
          ID de lote
          <input v-model="form.batchId" required autocomplete="off" placeholder="LOT-2026-A" />
        </label>
        <div class="two-col">
          <label>
            Cantidad (unidades)
            <input v-model.number="form.quantity" type="number" min="1" required />
          </label>
          <label>
            Vence
            <input v-model="form.expiresAt" type="date" required />
          </label>
        </div>
        <label>
          Costo unitario (opcional)
          <input v-model.number="form.unitCost" type="number" min="0" step="0.01" />
        </label>
        <label>
          Notas
          <input v-model="form.notes" />
        </label>
        <p v-if="error" class="feedback feedback--error">{{ error }}</p>
        <p v-if="success" class="feedback feedback--success">{{ success }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Registrando…' : 'Registrar ingreso' }}
        </button>
      </form>

      <div class="panel">
        <h2>Lotes disponibles (orden FEFO)</h2>
        <ul v-if="batches.length" class="data-list">
          <li v-for="batch in batches" :key="`${batch.sku}-${batch.batchId}`">
            <strong>{{ batch.sku }} · {{ batch.batchId }}</strong>
            <span>
              {{ batch.quantityAvailable }} und · vence {{ formatDate(batch.expiresAt) }}
            </span>
          </li>
        </ul>
        <p v-else class="empty">Sin lotes con stock.</p>
      </div>
    </div>
  </section>
</template>
