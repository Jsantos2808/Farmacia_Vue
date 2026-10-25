<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { clearSession, getUser } from '../lib/session'

const router = useRouter()
const user = computed(() => getUser())

function logout() {
  clearSession()
  void router.replace('/login')
}
</script>

<template>
  <div class="app-frame">
    <header class="topbar">
      <div class="topbar-brand">
        <RouterLink to="/despacho" class="brand-link">Farmacia Aurora</RouterLink>
        <span class="role-tag">{{ user?.role === 'admin' ? 'Admin' : 'Cajero' }}</span>
      </div>
      <nav class="topnav" aria-label="Principal">
        <RouterLink to="/despacho">Despacho</RouterLink>
        <RouterLink to="/productos">Productos</RouterLink>
        <RouterLink to="/ingresos">Ingresos</RouterLink>
        <RouterLink to="/ventas">Ventas</RouterLink>
        <RouterLink to="/controlados">Controlados</RouterLink>
      </nav>
      <div class="topbar-user">
        <span>{{ user?.fullName }}</span>
        <button type="button" class="ghost-btn" @click="logout">Salir</button>
      </div>
    </header>
    <main class="workspace">
      <RouterView />
    </main>
  </div>
</template>
