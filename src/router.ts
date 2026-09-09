import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SectionView from './views/SectionView.vue'
import SettingsGeneralView from './views/SettingsGeneralView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import { useAuth } from './lib/auth'

export const router = createRouter({
  history: createWebHashHistory(),
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

// electronAPI is injected by the preload script before any renderer code runs, but during
// dev-server reloads (e.g. Vite re-optimizing deps mid-navigation) it can be briefly
// unavailable while the document is torn down. Wait for it instead of crashing the guard.
async function waitForElectronAPI(timeoutMs = 2000): Promise<boolean> {
  const start = Date.now()
  while (!window.electronAPI) {
    if (Date.now() - start > timeoutMs) return false
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  return true
}

router.beforeEach(async (to) => {
  const electronAPIReady = await waitForElectronAPI()
  if (!electronAPIReady) {
    // Let the in-flight reload finish; the guard will run again once the page reloads.
    return true
  }

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

router.onError((error) => {
  console.error('[router]', error)
})