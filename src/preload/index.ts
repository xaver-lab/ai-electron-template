import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc-contracts'
import type { RendererApi } from '../shared/api'

/**
 * Typed API surface exposed to the renderer.
 *
 * The renderer NEVER sees `ipcRenderer`, raw channel names, or a generic
 * `invoke`. Every callable is a named domain method whose signature is
 * derived from `IpcContracts` in `src/shared/`.
 */
const api: RendererApi = {
  app: {
    getVersion: () => ipcRenderer.invoke(IpcChannels.app.getVersion)
  }
}

contextBridge.exposeInMainWorld('api', api)
