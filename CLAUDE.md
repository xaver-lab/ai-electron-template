# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

- **Electron 42** with electron-vite 3
- **React 18** with TypeScript (strict mode)
- **Tailwind CSS 4** via `@tailwindcss/vite` — no `tailwind.config.ts`, config lives in `App.css` via `@theme`
- **shadcn/ui** (Radix UI primitives + `cn()` helper) for components
- **Windows 11-style** design language

## Development Setup

### Prerequisites

- Node.js at `C:\Users\bx.ASA-WIEN\nodejs` (add to PATH before running npm/node)
- npm 11+

### Commands

```bash
npm install          # install dependencies
npm run dev          # Electron + HMR dev server
npm run build        # production build → out/
npm run type-check   # TypeScript check without emit
npm run lint         # ESLint (flat config, eslint.config.mjs)
npm run format       # Prettier over src/**
```

## Project Structure

```text
src/
├── main/
│   └── index.ts          # Electron main process, BrowserWindow, IPC handlers
├── preload/
│   └── index.ts          # Context bridge — exposes window.api to renderer
└── renderer/
    ├── index.html         # HTML entry point
    ├── main.tsx           # React entry point
    ├── App.tsx            # Root component
    ├── App.css            # Tailwind v4 @import + @theme (Windows 11 fonts/colors)
    ├── env.d.ts           # Vite env types + window.api type declaration
    ├── components/        # Reusable UI components
    ├── pages/             # Page-level components
    ├── hooks/             # Custom React hooks
    └── lib/
        └── utils.ts       # cn() helper (clsx + tailwind-merge)

electron.vite.config.ts    # Bundler config (main / preload / renderer)
tsconfig.json              # References tsconfig.node.json + tsconfig.web.json
tsconfig.node.json         # Main + preload TypeScript config
tsconfig.web.json          # Renderer TypeScript config (jsx: react-jsx)
eslint.config.mjs          # ESLint 9 flat config
.prettierrc                # No semicolons, single quotes, LF
```

## Architecture Patterns

### IPC Communication

- `window.api` is exposed via `src/preload/index.ts` using `contextBridge`
- Renderer calls: `window.api.invoke(channel, data)` → `ipcMain.handle(channel)`
- Types for channels and payloads go in `src/renderer/lib/types.ts`
- Never pass functions, Symbols, or `undefined` across IPC — plain objects only

### React Components

- Functional components only, no class components
- State: `useState`, `useContext`, `useCallback` — no external state library unless needed
- Components in `src/renderer/components/` — one file per component, focused and reusable
- Compose shadcn/ui primitives; don't rebuild what Radix already provides

### Styling

- Tailwind classes directly in JSX — no CSS Modules unless truly necessary
- Tailwind v4: no `tailwind.config.ts` — extend theme in `App.css` via `@theme { ... }`
- Global CSS only in `App.css` (Tailwind import + resets)
- Windows 11 style: `rounded-lg` (8-12px), `shadow-sm`, neutral grays, Segoe UI font

### TypeScript

- Strict mode — no implicit `any`
- Shared types in `src/renderer/lib/types.ts`
- Path alias `@/` → `src/renderer/` (configured in both vite + tsconfig.web.json)

## Common Tasks

### Adding a New Page

1. Create `src/renderer/pages/PageName.tsx`
2. Add route/state in `App.tsx`
3. Use shadcn/ui + Tailwind for layout

### Adding a New Component

1. Create `src/renderer/components/ComponentName.tsx`
2. Use `cn()` from `@/lib/utils` for conditional classes
3. Compose Radix/shadcn primitives where possible

### Adding IPC Channel

1. Add handler in `src/main/index.ts`: `ipcMain.handle('channel', async (_, data) => { ... })`
2. Add type in `src/renderer/lib/types.ts`
3. Call from renderer: `window.api.invoke('channel', data)`

### Building & Packaging

- `npm run build` → `out/main/`, `out/preload/`, `out/renderer/`
- For `.exe`/`.msi`: add `electron-builder`, configure `electron-builder.config.js`

## Key Files

| File | Purpose |
| --- | --- |
| `electron.vite.config.ts` | Bundler entry points, aliases, plugins |
| `src/renderer/App.css` | Tailwind v4 theme (fonts, colors, radii) |
| `src/preload/index.ts` | IPC bridge definition |
| `src/renderer/env.d.ts` | `window.api` type declaration |
| `tsconfig.web.json` | Renderer TS config incl. path aliases |

## Windows 11 Design Guidelines

- **Font**: `Segoe UI` → system-ui → sans-serif (set in `@theme`)
- **Colors**: neutral palette (`neutral-50` … `neutral-900`)
- **Radii**: `rounded-lg` (8px) for cards, `rounded-xl` (12px) for modals
- **Shadows**: `shadow-sm` / `shadow-md` only — no heavy elevation
- **Motion**: subtle transitions, instant feedback

## Common Gotchas

1. **Tailwind v4**: no `tailwind.config.ts` — use `@theme` in CSS. `@apply` works but prefer direct classes.
2. **IPC serialization**: plain objects only across the bridge — no functions, Symbols, class instances.
3. **Path aliases**: `@/` works in renderer only (vite scope). Don't use it in `src/main/`.
4. **Node.js PATH**: `C:\Users\bx.ASA-WIEN\nodejs` must be in PATH — not auto-added on this machine.
5. **tsconfig split**: `tsconfig.node.json` (main/preload) vs `tsconfig.web.json` (renderer) — keep them separate to avoid module resolution conflicts.
