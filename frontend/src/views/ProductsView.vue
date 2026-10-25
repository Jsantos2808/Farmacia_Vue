<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../lib/api'
import type { ControlCategory, Product, SellMode } from '../types'

const products = ref<Product[]>([])
const error = ref('')
const success = ref('')
const loading = ref(false)

const form = ref({
  sku: '',
  name: '',
  description: '',
  sellMode: 'UNIT' as SellMode,
  unitsPerBox: 1,
  unitPrice: 0,
  controlCategory: 'OTC' as ControlCategory,
  minimumStock: 5,
})

async function load() {
  products.value = await api<Product[]>('/api/products')
}

onMounted(async () => {
  try {
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudieron cargar productos'
  }
})

async function submit() {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const payload = {
      ...form.value,
      sku: form.value.sku.trim(),
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      unitsPerBox: form.value.sellMode === 'UNIT' ? 1 : form.value.unitsPerBox,
    }
    await api('/api/products', { method: 'POST', body: JSON.stringify(payload) })
    success.value = 'Producto registrado.'
    form.value = {
      sku: '',
      name: '',
      description: '',
      sellMode: 'UNIT',
      unitsPerBox: 1,
      unitPrice: 0,
      controlCategory: 'OTC',
      minimumStock: 5,
    }
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo guardar'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="page">
    <header class="page-intro">
      <p class="eyebrow">Catálogo</p>
      <h1>Productos</h1>
      <p>Nombre, descripción, modo de venta (unidad/caja), precio y clasificación de control.</p>
    </header>

    <div class="pos-grid">
      <form class="panel stack-form" @submit.prevent="submit">
        <h2>Agregar producto</h2>
        <label>
          SKU
          <input v-model="form.sku" required autocomplete="off" />
        </label>
        <label>
          Nombre
          <input v-model="form.name" required />
        </label>
        <label>
          Descripción
          <textarea v-model="form.description" rows="3" required />
        </label>
        <div class="two-col">
          <label>
            Venta
            <select v-model="form.sellMode">
              <option value="UNIT">Solo unidades</option>
              <option value="BOX">Unidades y cajas</option>
            </select>
          </label>
          <label>
            Unidades por caja
            <input
              v-model.number="form.unitsPerBox"
              type="number"
              min="1"
              :disabled="form.sellMode === 'UNIT'"
              required
            />
          </label>
        </div>
        <div class="two-col">
          <label>
            Precio por unidad (Q)
            <input v-model.number="form.unitPrice" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Stock mínimo
            <input v-model.number="form.minimumStock" type="number" min="0" required />
          </label>
        </div>
        <label>
          Clasificación
          <select v-model="form.controlCategory">
            <option value="OTC">OTC (venta libre)</option>
            <option value="PRESCRIPTION">Receta</option>
            <option value="ANTIBIOTIC">Antibiótico</option>
            <option value="PSYCHOTROPIC">Psicotrópico</option>
          </select>
        </label>
        <p v-if="error" class="feedback feedback--error">{{ error }}</p>
        <p v-if="success" class="feedback feedback--success">{{ success }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Guardando…' : 'Guardar producto' }}
        </button>
      </form>

      <div class="panel">
        <h2>Inventario de catálogo</h2>
        <ul v-if="products.length" class="data-list">
          <li v-for="product in products" :key="product.sku">
            <strong>{{ product.name }}</strong>
            <span>{{ product.sku }} · {{ product.controlCategory }} · Q{{ product.unitPrice.toFixed(2) }}</span>
            <span class="hint">{{ product.description }}</span>
          </li>
        </ul>
        <p v-else class="empty">Aún no hay productos.</p>
      </div>
    </div>
  </section>
</template>
