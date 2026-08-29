<script setup lang="ts">
import { todoService } from './todo.service';

const { todos, toggleTodo, removeTodo } = todoService;
</script>

<template>
  <ul class="list">
    <li
      v-for="todo in todos"
      :key="todo.id"
      class="list-item"
      @click="toggleTodo(todo.id)"
    >
      <span :style="{ textDecoration: todo.done ? 'line-through' : 'none', flex: 1, cursor: 'pointer' }">
        {{ todo.title }}
      </span>
      <button
        type="button"
        class="button button--icon"
        @click.stop="removeTodo(todo.id)"
        aria-label="Delete"
      >
        🗑️
      </button>
    </li>
  </ul>
</template>
