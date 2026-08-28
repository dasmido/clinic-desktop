<script setup lang="ts">
import { ref } from 'vue';
import { todoService } from './todo.service';
import { t } from '../../i18n';

const title = ref('');

const handleAdd = () => {
  todoService.addTodo(title.value);
  title.value = '';
};
</script>

<template>
  <div style="display: flex; gap: 0.5rem;">
    <ui5-input
      :value="title"
      @input="title = ($event.target as HTMLInputElement).value"
      :placeholder="t('todos.placeholder')"
    ></ui5-input>
    <ui5-button design="Emphasized" @click="handleAdd">{{ t('todos.add') }}</ui5-button>
  </div>
</template>
