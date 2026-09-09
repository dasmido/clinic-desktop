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
		listUsers: () => ipcRenderer.invoke('auth:list-users'),
		deleteUser: (userId: number) => ipcRenderer.invoke('auth:delete-user', userId),
	},
	patientFiles: {
		add: (medicalRecordId: number) => ipcRenderer.invoke('patient-files:add', medicalRecordId),
		open: (medicalRecordId: number, storedName: string) => ipcRenderer.invoke('patient-files:open', medicalRecordId, storedName),
		delete: (medicalRecordId: number, storedName: string) => ipcRenderer.invoke('patient-files:delete', medicalRecordId, storedName),
		deleteRecord: (medicalRecordId: number) => ipcRenderer.invoke('patient-files:delete-record', medicalRecordId),
	},
});