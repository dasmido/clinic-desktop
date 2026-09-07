import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import SectionView from './views/SectionView.vue'
import SettingsGeneralView from './views/SettingsGeneralView.vue'

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
    }
  ]
})