import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SectionView from './views/SectionView.vue'
import SettingsGeneralView from './views/SettingsGeneralView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import { useAuth } from './lib/auth'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: HomeView
    },
    {
      path: '/patients',
      component: SectionView,
      props: { titleKey: 'sections.patients' }
    },
    {
      path: '/appointments',
      component: SectionView,
      props: { titleKey: 'sections.appointments' }
    },
    {
      path: '/finance',
      component: SectionView,
      props: { titleKey: 'sections.finance' }
    },
    {
      path: '/settings/general',
      component: SettingsGeneralView
    },
    {
      path: '/login',
      component: LoginView,
      meta: { public: true }
    },
    {
      path: '/register',
      component: RegisterView,
      meta: { public: true }
    }
  ]
})

router.beforeEach(async (to) => {
  const { currentUser, usersExist, hasUsers } = useAuth()

  if (usersExist.value === null) {
    await hasUsers()
  }

  if (!usersExist.value) {
    return to.path === '/register' ? true : '/register'
  }

  if (!currentUser.value) {
    return to.meta.public ? true : '/login'
  }

  if (to.meta.public) {
    return '/'
  }

  return true
})