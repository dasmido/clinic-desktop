import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	database: {
		isReady: () => ipcRenderer.invoke('database:is-ready'),
		query: (text: string, values: unknown[] = []) => ipcRenderer.invoke('database:query', text, values),
	},
	auth: {
		hasUsers: () => ipcRenderer.invoke('auth:has-users'),
		register: (username: string, password: string) => ipcRenderer.invoke('auth:register', username, password),
		login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
		logout: () => ipcRenderer.invoke('auth:logout'),
		getCurrentUser: () => ipcRenderer.invoke('auth:get-current-user'),
		createUser: (username: string, password: string, role: string) =>
			ipcRenderer.invoke('auth:create-user', username, password, role),
	},
});