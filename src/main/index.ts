import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'

const isDev = !!process.env['ELECTRON_RENDERER_URL']

function buildCsp(): string {
  const base = [
    "default-src 'self'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'"
  ]
  if (isDev) {
    // Vite-HMR braucht WebSocket + Inline-Script-Eval im Dev-Modus.
    base.push("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    base.push("connect-src 'self' ws://localhost:* http://localhost:*")
  } else {
    base.push("script-src 'self'")
    base.push("connect-src 'self'")
  }
  return base.join('; ')
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#fafafa',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // Security defaults — non-negotiable. Any change requires written
      // justification in this file. See CLAUDE.md → "Security Defaults".
      contextIsolation: true, // isolate preload from renderer JS world
      nodeIntegration: false, // no Node globals in renderer
      sandbox: true, // OS-level sandbox even if isolation is bypassed
      webSecurity: true // enforce same-origin / no mixed content
    }
  })

  // External links open in the user's browser, never in a new BrowserWindow.
  // Whitelist auf http/https — verhindert file://, javascript:, custom-scheme-Missbrauch.
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const { protocol } = new URL(url)
      if (protocol === 'http:' || protocol === 'https:') shell.openExternal(url)
    } catch {
      // ungültige URL → einfach verwerfen
    }
    return { action: 'deny' }
  })

  // Renderer darf nicht aus seinem Origin ausbrechen (per location.href etc.).
  const initialUrl = process.env['ELECTRON_RENDERER_URL']
  win.webContents.on('will-navigate', (event, url) => {
    if (initialUrl && url.startsWith(initialUrl)) return
    if (!initialUrl && url.startsWith('file://')) return
    event.preventDefault()
  })

  if (initialUrl) {
    win.loadURL(initialUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Default-CSP für alle Responses. Dev erlaubt Vite-HMR-WebSocket + Inline,
  // Prod ist strikt 'self'.
  const csp = buildCsp()
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    })
  })

  registerIpcHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
