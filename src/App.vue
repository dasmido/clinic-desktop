<script setup lang="ts">
import { ref } from 'vue';

const username = ref<string>('');
const items = ref<string[]>(['SAP UI5', 'Vue 3', 'Electron', 'TypeScript']);

const handleAdd = () => {
  if (username.value.trim()) {
    items.value.push(username.value.trim());
    username.value = '';
  }
};
</script>

<template>
  <div style="padding: 2rem; font-family: var(--sapFontFamily);">
    <ui5-card style="width: 400px; margin: 0 auto;">
      <ui5-card-header 
        title-text="Electron + UI5 + Vue 3" 
        subtitle-text="TypeScript Desktop App"
      ></ui5-card-header>

      <div style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem;">
        <div style="display: flex; gap: 0.5rem;">
          <ui5-input 
            :value="username" 
            @input="username = ($event.target as HTMLInputElement).value" 
            placeholder="Type something..."
          ></ui5-input>
          
          <ui5-button design="Emphasized" @click="handleAdd">
            Add Item
          </ui5-button>
        </div>

        <ui5-list separators="Inner">
          <ui5-standard-list-item v-for="(item, index) in items" :key="index">
            {{ item }}
          </ui5-standard-list-item>
        </ui5-list>
      </div>
    </ui5-card>
  </div>
</template>