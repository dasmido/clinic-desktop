import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	database: {
		isReady: () => ipcRenderer.invoke('database:is-ready'),
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
	patients: {
		list: (search?: string) => ipcRenderer.invoke('patients:list', search),
		create: (input: unknown) => ipcRenderer.invoke('patients:create', input),
		update: (patientId: number, input: unknown) => ipcRenderer.invoke('patients:update', patientId, input),
		delete: (patientId: number) => ipcRenderer.invoke('patients:delete', patientId),
	},
	appointments: {
		listForRange: (from: string, to: string) => ipcRenderer.invoke('appointments:list-for-range', from, to),
		create: (input: unknown) => ipcRenderer.invoke('appointments:create', input),
		update: (appointmentId: number, input: unknown) => ipcRenderer.invoke('appointments:update', appointmentId, input),
		delete: (appointmentId: number) => ipcRenderer.invoke('appointments:delete', appointmentId),
	},
	doctors: {
		list: () => ipcRenderer.invoke('doctors:list'),
		createProfile: (userId: number, displayName: string) => ipcRenderer.invoke('doctors:create-profile', userId, displayName),
		delete: (doctorId: number) => ipcRenderer.invoke('doctors:delete', doctorId),
		listAvailability: (doctorId: number) => ipcRenderer.invoke('doctors:list-availability', doctorId),
		addAvailability: (doctorId: number, dayOfWeek: number, startsAt: string, endsAt: string) =>
			ipcRenderer.invoke('doctors:add-availability', doctorId, dayOfWeek, startsAt, endsAt),
		removeAvailability: (availabilityId: number) => ipcRenderer.invoke('doctors:remove-availability', availabilityId),
	},
	inventory: {
		list: () => ipcRenderer.invoke('inventory:list'),
		createItem: (input: unknown) => ipcRenderer.invoke('inventory:create-item', input),
		updateItem: (itemId: number, input: unknown) => ipcRenderer.invoke('inventory:update-item', itemId, input),
		deleteItem: (itemId: number) => ipcRenderer.invoke('inventory:delete-item', itemId),
		adjustQuantity: (itemId: number, quantityChange: number, reason: string, notes?: string) =>
			ipcRenderer.invoke('inventory:adjust-quantity', itemId, quantityChange, reason, notes),
	},
	finance: {
		getSummary: (monthStart: string) => ipcRenderer.invoke('finance:get-summary', monthStart),
		listTransactions: (limit?: number) => ipcRenderer.invoke('finance:list-transactions', limit),
		createTransaction: (input: unknown) => ipcRenderer.invoke('finance:create-transaction', input),
		deleteTransaction: (transactionId: number) => ipcRenderer.invoke('finance:delete-transaction', transactionId),
	},
	medicalRecords: {
		listByPatient: (patientId: number) => ipcRenderer.invoke('medical-records:list-by-patient', patientId),
		listForRange: (from: string, to: string) => ipcRenderer.invoke('medical-records:list-for-range', from, to),
		create: (input: unknown) => ipcRenderer.invoke('medical-records:create', input),
		update: (recordId: number, input: unknown) => ipcRenderer.invoke('medical-records:update', recordId, input),
		delete: (recordId: number) => ipcRenderer.invoke('medical-records:delete', recordId),
		addAttachment: (input: unknown) => ipcRenderer.invoke('medical-records:add-attachment', input),
		deleteAttachment: (attachmentId: number) => ipcRenderer.invoke('medical-records:delete-attachment', attachmentId),
	},
	prescriptions: {
		listAll: () => ipcRenderer.invoke('prescriptions:list-all'),
		listByPatient: (patientId: number) => ipcRenderer.invoke('prescriptions:list-by-patient', patientId),
		listByMedicalRecord: (medicalRecordId: number) => ipcRenderer.invoke('prescriptions:list-by-medical-record', medicalRecordId),
		create: (input: unknown) => ipcRenderer.invoke('prescriptions:create', input),
		update: (prescriptionId: number, input: unknown) => ipcRenderer.invoke('prescriptions:update', prescriptionId, input),
		updateStatus: (prescriptionId: number, status: string) => ipcRenderer.invoke('prescriptions:update-status', prescriptionId, status),
		delete: (prescriptionId: number) => ipcRenderer.invoke('prescriptions:delete', prescriptionId),
	},
	labs: {
		listByPatient: (patientId: number) => ipcRenderer.invoke('labs:list-by-patient', patientId),
		listOpenOrders: () => ipcRenderer.invoke('labs:list-open-orders'),
		listResultsByOrder: (orderId: number) => ipcRenderer.invoke('labs:list-results-by-order', orderId),
		createOrder: (input: unknown) => ipcRenderer.invoke('labs:create-order', input),
		createResult: (orderId: number, input: unknown) => ipcRenderer.invoke('labs:create-result', orderId, input),
		updateStatus: (orderId: number, status: string) => ipcRenderer.invoke('labs:update-status', orderId, status),
		deleteOrder: (orderId: number) => ipcRenderer.invoke('labs:delete-order', orderId),
	},
	visitTemplates: {
		list: (includeInactive?: boolean) => ipcRenderer.invoke('visit-templates:list', includeInactive),
		create: (input: unknown) => ipcRenderer.invoke('visit-templates:create', input),
		update: (templateId: number, input: unknown) => ipcRenderer.invoke('visit-templates:update', templateId, input),
		deactivate: (templateId: number) => ipcRenderer.invoke('visit-templates:deactivate', templateId),
	},
	clinicalAlerts: {
		listActive: (patientId: number) => ipcRenderer.invoke('clinical-alerts:list-active', patientId),
		create: (input: unknown) => ipcRenderer.invoke('clinical-alerts:create', input),
		dismiss: (alertId: number) => ipcRenderer.invoke('clinical-alerts:dismiss', alertId),
		deactivate: (alertId: number) => ipcRenderer.invoke('clinical-alerts:deactivate', alertId),
	},
	patientFiles: {
		add: (medicalRecordId: number) => ipcRenderer.invoke('patient-files:add', medicalRecordId),
		open: (medicalRecordId: number, storedName: string) => ipcRenderer.invoke('patient-files:open', medicalRecordId, storedName),
		delete: (medicalRecordId: number, storedName: string) => ipcRenderer.invoke('patient-files:delete', medicalRecordId, storedName),
		deleteRecord: (medicalRecordId: number) => ipcRenderer.invoke('patient-files:delete-record', medicalRecordId),
	},
});