import { contextBridge } from 'electron';

// Expose IPC APIs to the renderer here if needed
contextBridge.exposeInMainWorld('electronAPI', {});