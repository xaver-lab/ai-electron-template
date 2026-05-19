import { app, ipcMain } from 'electron'
import { IpcChannels, type IpcResponse } from '../../shared/ipc-contracts'

export function registerAppHandlers(): void {
  ipcMain.handle(IpcChannels.app.getVersion, (): IpcResponse<'app:getVersion'> => {
    return {
      version: app.getVersion(),
      electron: process.versions.electron,
      platform: process.platform
    }
  })
}
