<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { api } from '../lib/api'
import { saveSession, type SessionUser } from '../lib/session'

const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const result = await api<{ token: string; user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    saveSession(result.token, result.user)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/despacho'
    await router.replace(redirect)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo iniciar sesión'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-screen">
    <section class="auth-panel">
      <p class="brand">Farmacia Aurora</p>
      <h1>Ingreso del personal</h1>
      <p class="lede">Accede con tu cuenta de cajero o administrador para despachar e ingresar inventario.</p>

      <form class="auth-form" @submit.prevent="submit">
        <label>
          Correo
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
        <label>
          Contraseña
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>
        <p v-if="error" class="feedback feedback--error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Verificando…' : 'Entrar' }}
        </button>
      </form>

      <p class="auth-switch">
        ¿Sin cuenta?
        <RouterLink to="/register">Crear cuenta</RouterLink>
      </p>
    </section>
  </main>
</template>
