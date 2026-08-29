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

    <ui5-card v-else-if="selectedKey === 'todos'" style="width: 400px; margin: 0 auto;">
      <ui5-card-header
        :title-text="t('todos.title')"
        :subtitle-text="t('todos.subtitle')"
      ></ui5-card-header>

      <div style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem;">
        <TodoForm />
        <TodoList />
      </div>
    </ui5-card>

    <SettingsPage v-else-if="selectedKey === 'settings'" />
  </AppShell>
</template>