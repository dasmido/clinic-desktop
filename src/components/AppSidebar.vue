<script setup lang="ts">
import { ref, computed } from 'vue'
import { useColorMode } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { useAuth } from '@/modules/auth'
import { defineShortcuts, extractShortcuts } from '@nuxt/ui/runtime/composables/defineShortcuts.js'

const { t } = useI18n()
const router = useRouter()
const { currentUser, logout } = useAuth()

const open = defineModel<boolean>('open', { default: true })

const colorMode = useColorMode()

const teams = ref([
  {
    label: 'MyClinic',
    avatar: {
      src: 'https://github.com/nuxt.png',
      alt: 'Nuxt'
    }
  }
])
const selectedTeam = ref(teams.value[0])

const teamsItems = computed<DropdownMenuItem[][]>(() => {
  return [
    teams.value.map((team, index) => ({
      ...team,
      kbds: ['meta', String(index + 1)],
      onSelect() {
        selectedTeam.value = team
      }
    })),
    [
      {
        label: t('sidebar.createTeam'),
        icon: 'i-lucide-circle-plus'
      }
    ]
  ]
})

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
      label: t('sidebar.finance'),
      icon: 'i-lucide-wallet-cards',
      to: '/finance'
    },
    {
      label: t('sidebar.settings'),
      icon: 'i-lucide-settings',
      to: '/settings/general'
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
      label: t('user.profile'),
      icon: 'i-lucide-user'
    },
    {
      label: t('user.billing'),
      icon: 'i-lucide-credit-card'
    },
    {
      label: t('user.settings'),
      icon: 'i-lucide-settings',
      to: '/settings'
    }
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
      label: t('user.github'),
      icon: 'i-simple-icons-github',
      to: 'https://github.com/nuxt/ui',
      target: '_blank'
    },
    {
      label: t('user.logout'),
      icon: 'i-lucide-log-out',
      onSelect: onLogout
    }
  ]
])

defineShortcuts(extractShortcuts(teamsItems.value))
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
      <UDropdownMenu
        :items="teamsItems"
        :content="{ align: 'start', collisionPadding: 12 }"
        :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
      >
        <UButton
          v-bind="selectedTeam"
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
