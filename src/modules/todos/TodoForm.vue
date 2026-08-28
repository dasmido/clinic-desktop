<script setup lang="ts">
import { ref } from 'vue';
import { todoService } from './todo.service';

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
      placeholder="Add a todo..."
    ></ui5-input>
    <ui5-button design="Emphasized" @click="handleAdd">Add</ui5-button>
  </div>
</template>
