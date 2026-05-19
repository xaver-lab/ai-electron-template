/**
 * Central IPC contracts — single source of truth shared by main, preload, renderer.
 *
 * Add a new IPC method by:
 *   1. registering a channel name in `IpcChannels`
 *   2. declaring its request/response type in `IpcContracts`
 *   3. implementing a handler in `src/main/ipc/<domain>.ts`
 *   4. binding it as a typed method in `src/preload/index.ts`
 *
 * Never reference channel names as raw strings outside this file.
 */

export const IpcChannels = {
  app: {
    getVersion: 'app:getVersion'
  }
} as const

export interface IpcContracts {
  [IpcChannels.app.getVersion]: {
    request: void
    response: { version: string; electron: string; platform: NodeJS.Platform }
  }
}

export type IpcChannel = keyof IpcContracts
export type IpcRequest<C extends IpcChannel> = IpcContracts[C]['request']
export type IpcResponse<C extends IpcChannel> = IpcContracts[C]['response']
