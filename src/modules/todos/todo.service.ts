import { ref } from 'vue';
import type { Todo } from './todo.model';

// In-memory store; swap for SQLite/electron-store later without touching UI.
const todos = ref<Todo[]>([]);

function addTodo(title: string): void {
  const trimmed = title.trim();
  if (!trimmed) return;
  todos.value.push({ id: crypto.randomUUID(), title: trimmed, done: false });
}

function toggleTodo(id: string): void {
  const todo = todos.value.find((t) => t.id === id);
  if (todo) todo.done = !todo.done;
}

function removeTodo(id: string): void {
  todos.value = todos.value.filter((t) => t.id !== id);
}

export const todoService = { todos, addTodo, toggleTodo, removeTodo };
