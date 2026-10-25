<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '../lib/api'
import type { Product, SaleLineInput, SaleReceipt, SellMode } from '../types'

interface CartLine {
  sku: string
  name: string
  sellMode: SellMode
  quantity: number
  unitPrice: number
  unitsPerBox: number
}

const products = ref<Product[]>([])
const stock = ref<Record<string, number>>({})
const selectedSku = ref('')
const quantity = ref(1)
const sellMode = ref<SellMode>('UNIT')
const cart = ref<CartLine[]>([])
const customerName = ref('')
const error = ref('')
const loading = ref(false)
const receipt = ref<SaleReceipt | null>(null)

const selectedProduct = computed(() => products.value.find((p) => p.sku === selectedSku.value))
const otcProducts = computed(() => products.value.filter((p) => p.controlCategory === 'OTC'))
const cartTotal = computed(() =>
  cart.value.reduce((sum, line) => {
    const units = line.sellMode === 'BOX' ? line.quantity * line.unitsPerBox : line.quantity
    return sum + units * line.unitPrice
  }, 0),
)

onMounted(async () => {
  try {
    const [productList, stockList] = await Promise.all([
      api<Product[]>('/api/products'),
      api<Array<{ sku: string; available: number }>>('/api/inventory/stock'),
    ])
    products.value = productList
    stock.value = Object.fromEntries(stockList.map((row) => [row.sku, row.available]))
    if (otcProducts.value[0]) {
      selectedSku.value = otcProducts.value[0].sku
      sellMode.value = 'UNIT'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo cargar el catálogo'
  }
})

function addToCart() {
  error.value = ''
  receipt.value = null
  const product = selectedProduct.value
  if (!product) {
    error.value = 'Selecciona un producto'
    return
  }
  if (!Number.isSafeInteger(quantity.value) || quantity.value < 1) {
    error.value = 'Cantidad inválida'
    return
  }
  if (sellMode.value === 'BOX' && product.sellMode !== 'BOX') {
    error.value = 'Este producto no se vende por cajas'
    return
  }
  const existing = cart.value.find((line) => line.sku === product.sku && line.sellMode === sellMode.value)
  if (existing) existing.quantity += quantity.value
  else {
    cart.value.push({
      sku: product.sku,
      name: product.name,
      sellMode: sellMode.value,
      quantity: quantity.value,
      unitPrice: product.unitPrice,
      unitsPerBox: product.unitsPerBox,
    })
  }
}

function removeLine(index: number) {
  cart.value.splice(index, 1)
}

async function checkout() {
  error.value = ''
  if (!customerName.value.trim() || customerName.value.trim().length < 2) {
    error.value = 'Indica el nombre de la persona a quien se vende (comprobante).'
    return
  }
  if (!cart.value.length) {
    error.value = 'Agrega al menos un medicamento al despacho.'
    return
  }
  loading.value = true
  try {
    const lines: SaleLineInput[] = cart.value.map((line) => ({
      sku: line.sku,
      quantity: line.quantity,
      sellMode: line.sellMode,
    }))
    receipt.value = await api<SaleReceipt>('/api/sales', {
      method: 'POST',
      body: JSON.stringify({ customerName: customerName.value.trim(), lines }),
    })
    cart.value = []
    customerName.value = ''
    const stockList = await api<Array<{ sku: string; available: number }>>('/api/inventory/stock')
    stock.value = Object.fromEntries(stockList.map((row) => [row.sku, row.available]))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo completar el despacho'
  } finally {
    loading.value = false
  }
}

function lineUnits(line: CartLine) {
  return line.sellMode === 'BOX' ? line.quantity * line.unitsPerBox : line.quantity
}
</script>

<template>
  <section class="page">
    <header class="page-intro">
      <p class="eyebrow">Punto de venta</p>
      <h1>Despacho de mostrador</h1>
      <p>Agrega medicamentos OTC, pide el nombre del comprador y confirma el resumen de la venta.</p>
    </header>

    <div class="pos-grid">
      <div class="panel">
        <h2>Agregar al carrito</h2>
        <form class="stack-form" @submit.prevent="addToCart">
          <label>
            Producto
            <select v-model="selectedSku" required>
              <option disabled value="">Selecciona…</option>
              <option v-for="product in otcProducts" :key="product.sku" :value="product.sku">
                {{ product.name }} ({{ product.sku }}) · stock {{ stock[product.sku] ?? 0 }}
              </option>
            </select>
          </label>
          <div class="two-col">
            <label>
              Cantidad
              <input v-model.number="quantity" type="number" min="1" step="1" required />
            </label>
            <label>
              Vender por
              <select v-model="sellMode">
                <option value="UNIT">Unidad</option>
                <option v-if="selectedProduct?.sellMode === 'BOX'" value="BOX">Caja</option>
              </select>
            </label>
          </div>
          <p v-if="selectedProduct" class="hint">
            {{ selectedProduct.description }} · Q{{ selectedProduct.unitPrice.toFixed(2) }} / unidad
            <template v-if="selectedProduct.sellMode === 'BOX'">
              · {{ selectedProduct.unitsPerBox }} und/caja
            </template>
          </p>
          <button type="submit">Agregar</button>
        </form>
      </div>

      <div class="panel">
        <h2>Carrito</h2>
        <ul v-if="cart.length" class="cart-list">
          <li v-for="(line, index) in cart" :key="`${line.sku}-${line.sellMode}`">
            <div>
              <strong>{{ line.name }}</strong>
              <span>
                {{ line.quantity }} {{ line.sellMode === 'BOX' ? 'caja(s)' : 'und' }}
                · {{ lineUnits(line) }} und · Q{{ (lineUnits(line) * line.unitPrice).toFixed(2) }}
              </span>
            </div>
            <button type="button" class="ghost-btn" @click="removeLine(index)">Quitar</button>
          </li>
        </ul>
        <p v-else class="empty">Sin productos todavía.</p>

        <form class="stack-form checkout" @submit.prevent="checkout">
          <label>
            Nombre del comprador (comprobante)
            <input v-model="customerName" required minlength="2" placeholder="Ej. Juan Méndez" />
          </label>
          <div class="total-row">
            <span>Total</span>
            <strong>Q{{ cartTotal.toFixed(2) }}</strong>
          </div>
          <p v-if="error" class="feedback feedback--error" role="alert">{{ error }}</p>
          <button type="submit" :disabled="loading">
            {{ loading ? 'Registrando…' : 'Cobrar y despachar' }}
          </button>
        </form>
      </div>
    </div>

    <aside v-if="receipt" class="receipt panel" aria-live="polite">
      <h2>Resumen de compra</h2>
      <p><strong>Cliente:</strong> {{ receipt.customerName }}</p>
      <p><strong>Cajero:</strong> {{ receipt.cashierName }}</p>
      <p><strong>Folio:</strong> {{ receipt.id }}</p>
      <p><strong>Fecha:</strong> {{ new Date(receipt.timestamp).toLocaleString() }}</p>
      <ul class="cart-list">
        <li v-for="line in receipt.lines" :key="line.sku">
          <div>
            <strong>{{ line.productName }}</strong>
            <span>
              {{ line.quantity }} {{ line.sellMode === 'BOX' ? 'caja(s)' : 'und' }}
              · Q{{ line.lineTotal.toFixed(2) }}
            </span>
            <span class="hint">
              Lotes FEFO:
              {{ line.batches.map((b) => `${b.batchId}×${b.quantity}`).join(', ') }}
            </span>
          </div>
        </li>
      </ul>
      <div class="total-row">
        <span>Total cobrado</span>
        <strong>Q{{ receipt.totalAmount.toFixed(2) }}</strong>
      </div>
    </aside>
  </section>
</template>
