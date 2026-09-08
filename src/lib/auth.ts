import { ref } from 'vue'

type AuthUser = {
  id: number
  username: string
  role: string
}

// Module-level singleton so all components share the same reactive session state.
const currentUser = ref<AuthUser | null>(null)
const usersExist = ref<boolean | null>(null)

async function hasUsers() {
  usersExist.value = await window.electronAPI.auth.hasUsers()
  return usersExist.value
}

async function register(username: string, password: string) {
  const user = await window.electronAPI.auth.register(username, password)
  currentUser.value = user
  usersExist.value = true
  return user
}

async function login(username: string, password: string) {
  const user = await window.electronAPI.auth.login(username, password)
  currentUser.value = user
  return user
}

async function logout() {
  await window.electronAPI.auth.logout()
  currentUser.value = null
}

export function useAuth() {
  return { currentUser, usersExist, hasUsers, register, login, logout }
}
