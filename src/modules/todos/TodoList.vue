<script setup lang="ts">
import { todoService } from './todo.service';

const { todos, toggleTodo, removeTodo } = todoService;
</script>

<template>
  <ui5-list separators="Inner">
    <ui5-standard-list-item
      v-for="todo in todos"
      :key="todo.id"
      @click="toggleTodo(todo.id)"
    >
      <span :style="{ textDecoration: todo.done ? 'line-through' : 'none' }">
        {{ todo.title }}
      </span>
      <ui5-button
        slot="deleteButton"
        icon="delete"
        design="Transparent"
        @click.stop="removeTodo(todo.id)"
      ></ui5-button>
    </ui5-standard-list-item>
  </ui5-list>
</template>
