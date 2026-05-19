import { registerAppHandlers } from './app'

/**
 * Single entry point for IPC registration. Each domain owns its handlers in
 * a sibling file (`<domain>.ts`) and is wired up here. Keeps `main/index.ts`
 * focused on lifecycle, not business plumbing.
 */
export function registerIpcHandlers(): void {
  registerAppHandlers()
}
