import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	database: {
		isReady: () => ipcRenderer.invoke('database:is-ready'),
		query: (text: string, values: unknown[] = []) => ipcRenderer.invoke('database:query', text, values),
	},
});