<script setup lang="ts">
import { ref } from 'vue';
import { t } from '../../i18n';

export interface NavItem {
  key: string;
  text: string;
  icon: string;
}

const props = defineProps<{
  navItems: NavItem[];
  selectedKey: string;
}>();

const emit = defineEmits<{
  (e: 'update:selectedKey', key: string): void;
}>();

const collapsed = ref(false);

function selectNav(key: string) {
  emit('update:selectedKey', key);
}
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <div class="header-left">
        <button class="toggle-btn" @click="collapsed = !collapsed" aria-label="Toggle Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div class="header-titles">
          <span class="primary-title">{{ t('shell.primaryTitle') }}</span>
          <span class="secondary-title">{{ t('shell.secondaryTitle') }}</span>
        </div>
      </div>
      <div class="header-right">
        <div class="avatar">CD</div>
      </div>
    </header>

    <div class="app-shell__body">
      <aside class="app-shell__nav" :class="{ 'is-collapsed': collapsed }">
        <nav class="nav-list">
          <button
            v-for="item in props.navItems"
            :key="item.key"
            class="nav-item"
            :class="{ 'is-selected': item.key === props.selectedKey }"
            @click="selectNav(item.key)"
            :title="item.text"
          >
            <span class="nav-item__icon">
              <svg v-if="item.icon === 'home'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              <svg v-else-if="item.icon === 'list'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              <svg v-else-if="item.icon === 'action-settings'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            </span>
            <span class="nav-item__text" v-if="!collapsed">{{ item.text }}</span>
          </button>
        </nav>
      </aside>

      <main class="app-shell__content">
        <slot></slot>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.25rem;
  height: 3.25rem;
  background-color: var(--app-header-bg, #1a252c);
  color: var(--app-header-color, #ffffff);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-btn {
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-btn:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.header-titles {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.primary-title {
  font-weight: 700;
  font-size: 1.1rem;
}

.secondary-title {
  font-size: 0.875rem;
  opacity: 0.8;
}

.header-right {
  display: flex;
  align-items: center;
}

.avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  background-color: #354a5f;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.app-shell__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.app-shell__nav {
  width: 220px;
  flex-shrink: 0;
  height: 100%;
  background-color: var(--app-nav-bg, #24313d);
  color: var(--app-nav-color, #e0e6ed);
  transition: width 0.2s ease;
  border-inline-end: 1px solid var(--app-border-color, #2d3d4c);
}

.app-shell__nav.is-collapsed {
  width: 60px;
}

.nav-list {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: none;
  background: transparent;
  color: inherit;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.95rem;
  text-align: start;
  width: 100%;
  transition: background-color 0.15s ease;
}

.nav-item:hover {
  background-color: var(--app-nav-hover-bg, rgba(255, 255, 255, 0.08));
}

.nav-item.is-selected {
  background-color: var(--app-nav-active-bg, #0070f3);
  color: #ffffff;
  font-weight: 600;
}

.nav-item__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nav-item__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-shell__content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: var(--app-bg, #f4f6f8);
  padding: 1.5rem;
}
</style>
