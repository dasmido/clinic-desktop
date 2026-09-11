<script setup lang="ts">
import { computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useAuth } from '@/modules/auth'

const { t } = useI18n()
const router = useRouter()
const { currentUser, logout } = useAuth()

const open = defineModel<boolean>('open', { default: true })

const colorMode = useColorMode()

function getItems() {
  return [
    {
      label: t('sidebar.patients'),
      icon: 'i-lucide-users',
      to: '/patients'
    },
    {
      label: t('sidebar.appointments'),
      icon: 'i-lucide-calendar-days',
      to: '/appointments'
    },
    {
      label: 'مساحة العمل السريري',
      icon: 'i-lucide-stethoscope',
      to: '/clinical-workspace'
    },
    {
      label: 'الوصفات الطبية',
      icon: 'i-lucide-pill',
      to: '/prescriptions'
    },
    {
      label: t('sidebar.finance'),
      icon: 'i-lucide-wallet-cards',
      to: '/finance'
    }
  ] satisfies NavigationMenuItem[]
}

const user = computed(() => ({
  name: currentUser.value?.username ?? '',
  avatar: {
    src: '',
    alt: currentUser.value?.username ?? ''
  }
}))

async function onLogout() {
  await logout()
  await router.push('/login')
}

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('user.settings'),
      icon: 'i-lucide-settings',
      to: '/settings'
    },
    ...(currentUser.value?.role === 'admin'
      ? [
          { label: 'فريق العيادة', icon: 'i-lucide-users-round', to: '/settings/users' },
          { label: 'الأطباء والتواجد', icon: 'i-lucide-stethoscope', to: '/settings/doctors' }
        ]
      : [])
  ],
  [
    {
      label: t('user.appearance'),
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: t('user.light'),
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = 'light'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          }
        },
        {
          label: t('user.dark'),
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          }
        }
      ]
    }
  ],
  [
    {
      label: t('user.logout'),
      icon: 'i-lucide-log-out',
      onSelect: onLogout
    }
  ]
])

</script>

<template>
  <USidebar
    v-model:open="open"
    collapsible="icon"
    rail
    :ui="{
      container: 'h-full',
      inner: 'bg-elevated/25 divide-transparent',
      body: 'py-0'
    }"
  >
    <template #header>
      <div class="px-2 py-1.5 font-semibold">
        {{ t('sidebar.appname') }}
      </div>
    </template>

    <template #default="{ state }">
      <UNavigationMenu
        :key="state"
        :items="getItems()"
        orientation="vertical"
        :ui="{ link: 'p-1.5 overflow-hidden' }"
      />
    </template>

    <template #footer>
      <UDropdownMenu
        :items="userItems"
        :content="{ align: 'center', collisionPadding: 12 }"
        :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
      >
        <UButton
          v-bind="user"
          :label="user?.name"
          trailing-icon="i-lucide-chevrons-up-down"
          color="neutral"
          variant="ghost"
          square
          class="w-full data-[state=open]:bg-elevated overflow-hidden"
          :ui="{
            trailingIcon: 'text-dimmed ms-auto'
          }"
        />
      </UDropdownMenu>
    </template>
  </USidebar>
</template>
