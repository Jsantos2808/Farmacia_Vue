import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from './lib/session'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('./views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('./views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('./views/AppShell.vue'),
      children: [
        { path: '', redirect: '/despacho' },
        {
          path: 'despacho',
          name: 'despacho',
          component: () => import('./views/PosView.vue'),
        },
        {
          path: 'productos',
          name: 'productos',
          component: () => import('./views/ProductsView.vue'),
        },
        {
          path: 'ingresos',
          name: 'ingresos',
          component: () => import('./views/InventoryView.vue'),
        },
        {
          path: 'ventas',
          name: 'ventas',
          component: () => import('./views/SalesHistoryView.vue'),
        },
        {
          path: 'controlados',
          name: 'controlados',
          component: () => import('./views/ControlledView.vue'),
        },
      ],
    },
  ],
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!getToken()) return { name: 'login', query: { redirect: to.fullPath } }
  return true
})

export default router
