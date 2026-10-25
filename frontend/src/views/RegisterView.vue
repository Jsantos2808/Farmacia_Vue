<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { api } from '../lib/api'
import { saveSession, type SessionUser } from '../lib/session'

const router = useRouter()
const fullName = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    const result = await api<{ token: string; user: SessionUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        fullName: fullName.value,
        email: email.value,
        password: password.value,
      }),
    })
    saveSession(result.token, result.user)
    await router.replace('/despacho')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo crear la cuenta'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth-screen">
    <section class="auth-panel">
      <p class="brand">Farmacia Aurora</p>
      <h1>Crear cuenta</h1>
      <p class="lede">Registra un cajero para operar el punto de venta. Usa un correo laboral y una contraseña de al menos 8 caracteres.</p>

      <form class="auth-form" @submit.prevent="submit">
        <label>
          Nombre completo
          <input v-model="fullName" autocomplete="name" required minlength="2" />
        </label>
        <label>
          Correo
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
        <label>
          Contraseña
          <input v-model="password" type="password" autocomplete="new-password" required minlength="8" />
        </label>
        <p v-if="error" class="feedback feedback--error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Creando…' : 'Crear y entrar' }}
        </button>
      </form>

      <p class="auth-switch">
        ¿Ya tienes cuenta?
        <RouterLink to="/login">Iniciar sesión</RouterLink>
      </p>
    </section>
  </main>
</template>
