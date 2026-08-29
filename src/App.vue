<script setup lang="ts">
import { ref } from 'vue';
import { AppShell } from './modules/shell';
import type { NavItem } from './modules/shell';
import { DashboardPage } from './modules/dashboard';
import { TodoForm, TodoList } from './modules/todos';
import { SettingsPage } from './modules/settings';
import { t } from './i18n';

const navItems: NavItem[] = [
  { key: 'dashboard', text: t('nav.dashboard'), icon: 'home' },
  { key: 'todos', text: t('nav.todos'), icon: 'list' },
  { key: 'settings', text: t('nav.settings'), icon: 'action-settings' },
];

const selectedKey = ref('dashboard');
</script>

<template>
  <AppShell :nav-items="navItems" v-model:selected-key="selectedKey">
    <DashboardPage v-if="selectedKey === 'dashboard'" />

    <div v-else-if="selectedKey === 'todos'" class="card" style="max-width: 480px; margin: 0 auto; padding: 1.25rem;">
      <div class="card__header" style="margin-bottom: 1rem;">
        <div>
          <h3 class="card__title">{{ t('todos.title') }}</h3>
          <span class="card__subtitle">{{ t('todos.subtitle') }}</span>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <TodoForm />
        <TodoList />
      </div>
    </div>

    <SettingsPage v-else-if="selectedKey === 'settings'" />
  </AppShell>
</template>