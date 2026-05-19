/**
 * Validation foundation for IPC payloads.
 *
 * Pattern (once zod is installed):
 *
 *   import { z } from 'zod'
 *   const SaveSettings = z.object({ theme: z.enum(['light', 'dark']) })
 *   export type SaveSettingsInput = z.infer<typeof SaveSettings>
 *
 *   // in main handler:
 *   ipcMain.handle('settings:save', (_e, raw) => {
 *     const input = validate(SaveSettings, raw)  // throws on mismatch
 *     return service.save(input)
 *   })
 *
 * The renderer is not trusted. Every payload crossing the IPC boundary into
 * main MUST be validated before being passed to business logic.
 */

export interface Validator<T> {
  parse: (value: unknown) => T
}

export function validate<T>(schema: Validator<T>, value: unknown): T {
  return schema.parse(value)
}
