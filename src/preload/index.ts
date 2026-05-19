import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  send: (channel: string, data?: unknown) => ipcRenderer.send(channel, data),
  invoke: (channel: string, data?: unknown) => ipcRenderer.invoke(channel, data),
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  }
})
