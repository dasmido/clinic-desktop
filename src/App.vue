<script setup lang="ts">
import { TodoForm, TodoList } from './modules/todos';
</script>

<template>
  <div style="padding: 2rem; font-family: var(--sapFontFamily);">
    <ui5-card style="width: 400px; margin: 0 auto;">
      <ui5-card-header 
        title-text="Electron + UI5 + Vue 3" 
        subtitle-text="Modular Monolith: Todos Module"
      ></ui5-card-header>

      <div style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem;">
        <TodoForm />
        <TodoList />
      </div>
    </ui5-card>
  </div>
</template>