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
  <form @submit.prevent="handleAdd" style="display: flex; gap: 0.5rem; width: 100%;">
    <input
      class="input"
      :value="title"
      @input="title = ($event.target as HTMLInputElement).value"
      :placeholder="t('todos.placeholder')"
      style="flex: 1;"
    />
    <button type="submit" class="button button--primary">{{ t('todos.add') }}</button>
  </form>
</template>
