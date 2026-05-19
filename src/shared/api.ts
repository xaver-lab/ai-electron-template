/**
 * Shape of `window.api` exposed by the preload script.
 *
 * Domain-oriented surface — no generic `invoke`, no raw channel strings.
 * Each method is typed via `IpcContracts` so renderer and main stay in sync.
 */

import { IpcChannels, type IpcResponse } from './ipc-contracts'

export interface RendererApi {
  app: {
    getVersion: () => Promise<IpcResponse<typeof IpcChannels.app.getVersion>>
  }
}
