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

function onSideNavSelect(e: CustomEvent<{ item: HTMLElement }>) {
  const key = e.detail.item.getAttribute('data-key');
  if (key) emit('update:selectedKey', key);
}
</script>

<template>
  <div class="app-shell">
    <ui5-shellbar
      :primary-title="t('shell.primaryTitle')"
      :secondary-title="t('shell.secondaryTitle')"
      show-notifications
      @menu-item-click="collapsed = !collapsed"
    >
      <ui5-avatar slot="profile" initials="CD"></ui5-avatar>
    </ui5-shellbar>

    <div class="app-shell__body">
      <ui5-side-navigation
        class="app-shell__nav"
        :collapsed="collapsed"
        @selection-change="onSideNavSelect"
      >
        <ui5-side-navigation-item
          v-for="item in props.navItems"
          :key="item.key"
          :data-key="item.key"
          :text="item.text"
          :icon="item.icon"
          :selected="item.key === props.selectedKey"
        ></ui5-side-navigation-item>
      </ui5-side-navigation>

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

.app-shell__body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.app-shell__nav {
  flex-shrink: 0;
  height: 100%;
}

.app-shell__content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  background: var(--sapBackgroundColor);
  padding: 1.5rem;
}
</style>
