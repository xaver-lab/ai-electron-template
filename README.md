# ai-electron-template

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
![Node](https://img.shields.io/badge/node-18%2B-brightgreen)
![Electron](https://img.shields.io/badge/electron-42-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue)

A production-ready Electron + React template with AI-ready architecture. Built for type-safe, secure desktop applications with Claude Code integration.

## What It Is

A modern Electron application template combining:
- **Electron 42** — Cross-platform desktop framework
- **React 18 + TypeScript** — UI with strict type checking
- **Tailwind CSS 4** — Modern styling (Windows 11 design language)
- **Vite** — Fast bundling and HMR
- **shadcn/ui** — Radix-based component library
- **IPC Architecture** — Typed, secure main/renderer communication

## Use Cases

Perfect for building:
- **AI-integrated desktop tools** — Chat apps, code editors, analysis tools powered by Claude or other LLMs
- **Secure file utilities** — Apps that safely handle files with system-level access (encrypted storage, batch processing)
- **Developer tools** — Cross-platform CLIs with rich UIs, dashboards, code generators
- **System integrations** — Real-time monitoring, background workers with typed async communication

## What It Can Do

### Core Architecture
- **Process Boundaries** — Strict separation: main (OS/filesystem), preload (IPC binding), renderer (UI)
- **Type-Safe IPC** — Contracts in `src/shared/`, derived types in main/preload/renderer
- **Validated Payloads** — All main handlers validate with zod; renderer is untrusted
- **Structured Errors** — `{ ok: true; value } | { ok: false; error }` across the bridge

### Security Built-In
- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- Window open handler blocks popups; only external URLs via `shell.openExternal`
- CSP header guards (dev allows Vite HMR; prod is strict)
- No `@electron/remote`

### Component Model
- Functional components, ~200 LOC max, one responsibility
- State ladder: local → parent → Context → Zustand (don't skip rungs)
- Renderer calls typed domain methods: `window.api.<domain>.<method>()`
- shadcn/ui primitives, no re-skins

### Developer Experience
- Hot Module Reload (Vite + electron-vite)
- ESLint + Prettier configured
- No `any`; strict TypeScript everywhere
- Simple → explicit > clever (resist overengineering)

## Quick Start

```bash
npm install
npm run dev       # Electron + HMR
npm run build     # Production → out/
npm run type-check
npm run lint
npm run format
```

## Project Structure

```
src/
├── main/              # OS, filesystem, IPC handlers
├── preload/           # Typed contextBridge surface
├── shared/            # Cross-process contracts (types, validation)
└── renderer/          # React UI (features, components, hooks, pages)
```

## Key Patterns

- **IPC**: Define once in `src/shared/ipc-contracts.ts`, derive everywhere else
- **Validation**: Zod schemas in `src/shared/`, validate at the main boundary
- **Components**: Only call `window.api` from pages/ or hooks/
- **Async**: One owner per resource; hooks orchestrate IPC
- **Testing**: Test IPC handlers, schemas, business logic; skip snapshots

See [CLAUDE.md](./CLAUDE.md) for full architecture, security model, and constraints.
