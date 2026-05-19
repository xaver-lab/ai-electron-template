# Agents & Architecture Guides

Guidance for Claude Code working in this repo. Hard rules first, explanations only when non-obvious.

## Core Philosophy

Priority order — when in conflict, higher wins:

1. **Maintainability** — readable without archaeology.
2. **Consistency** — one pattern per problem. Follow the existing one or replace it; never run two in parallel without a written migration plan to one.
3. **Clear boundaries** — main / preload / renderer never leak. Cross-process contracts in `src/shared/`.
4. **Type safety** — strict, no `any`, contracts derived from `src/shared/`.
5. **Security** — renderer is untrusted. Validate at the boundary.
6. **Simplicity** — explicit beats clever. Duplicate ~3× before abstracting.

**Meta-rules (override almost everything):**

> Prefer explicit duplication over generic abstraction.
> Optimize for readability and predictability, not maximal reuse.

Heavy AI assistance makes overengineering the dominant risk. Boring, explicit, named code is the target.

## Process Boundaries

| Process | Owns | Forbidden |
| --- | --- | --- |
| **main** | filesystem, OS, persistence, windows/tray/menu, IPC handlers, background work, native modules | React, DOM, UI rendering |
| **preload** | typed `contextBridge` API surface, IPC binding | business logic, UI logic, state, anything beyond `ipcRenderer.invoke` |
| **renderer** | UI, local state, user interaction | Node APIs, `fs`, `child_process`, raw `ipcRenderer`, bypassing `window.api` |

Features cut **vertically**: shared contract → main handler → preload binding → renderer hook. Never horizontally by technology.

## IPC Rules

- Single source of truth: `src/shared/ipc-contracts.ts` (channels + request/response types). `api.ts` is a thin derived surface — never define new types there, only reference `typeof IpcChannels.<…>`.
- Renderer calls typed domain methods: `window.api.<domain>.<method>()`. No generic `invoke`, no raw channel strings.
- Handlers live in `src/main/ipc/<domain>.ts`, registered centrally by `registerIpcHandlers()`. **One handler per channel.** Handlers never throw — uncaught exceptions are converted to `{ ok: false, error: 'internal' }` by a single wrapper in `registerIpcHandlers`; the renderer treats `window.api.*` as never-rejecting.
- Preload (`src/preload/index.ts`) is a domain-oriented facade typed by `RendererApi` (`src/shared/api.ts`). Every method derives from `IpcContracts`.
- Plain objects only across the bridge — no functions, Symbols, class instances, or `undefined`.
- **Validate every payload in main** with zod via `src/shared/validate.ts`, except payloads that are a single primitive (`string` / `number` / `boolean` / `null`). Strings that are paths, IDs, or URLs always validate. Renderer input is not trusted.
- Adding the first validated handler also installs `zod` — call this out in the commit message.

### Adding an IPC method

1. Channel name → `IpcChannels` in `src/shared/ipc-contracts.ts`
2. Request/response type → `IpcContracts` in same file
3. Method signature → `RendererApi` in `src/shared/api.ts` (use `typeof IpcChannels.<domain>.<method>`)
4. Handler → `src/main/ipc/<domain>.ts` (register in `src/main/ipc/index.ts` if new domain)
5. Binding → `src/preload/index.ts` via `ipcRenderer.invoke(IpcChannels.<domain>.<method>, payload)`
6. If payload is non-trivial: zod schema in `src/shared/`, `validate(schema, raw)` at top of handler

## State & Components

**State ladder — climb only when the rung below breaks down:**

1. Local (`useState`, `useReducer`) — default.
2. Lifted to nearest common parent.
3. React Context — only for shared, low-frequency state (theme, current user). Not a substitute for prop drilling.
4. Zustand (global) or Jotai (atomic) — only when context causes re-render storms. Do not add without explicit user approval in the current conversation. **Never Redux.**

**Components:**

- Functional only. ~200 LOC max. One responsibility.
- `window.api` is called only from `pages/` or hooks in `*/hooks/`. Components never call it directly.
- Compose shadcn/Radix primitives. Never re-skin to rename.

**Async flow:**

- One owner per async resource. Same loading/error/data triple in 3 components → extract one hook.
- Hooks orchestrate IPC; components render the result.
- No hidden side effects: effects in `useEffect` with explicit deps or in event handlers.
- No global async cache (React Query/SWR) until server-like complexity arrives.

## Feature Organization

Within the renderer, group by feature once it owns 3+ files:

```text
renderer/
├── features/<feature>/      # feature-internal page, components, hooks, types
├── components/              # cross-feature reusable UI
├── hooks/                   # cross-feature reusable hooks
├── lib/                     # generic utilities (cn, formatters)
└── pages/                   # standalone pages
```

- File belongs in `features/<x>/` if only feature `x` uses it. Second consumer → lift to `components/` / `hooks/` / `lib/`.
- Features never import from sibling features. Shared code lifts to `components/` / `hooks/` / `lib/` or `src/shared/`.
- Deleting a feature = deleting its folder + a few imports.
- Cross-process types stay in `src/shared/`, never under `features/`.

## Security

Renderer is untrusted. `src/main/index.ts` sets these — written justification required to weaken any of them:

| Flag | Value |
| --- | --- |
| `contextIsolation` | `true` |
| `nodeIntegration` | `false` |
| `sandbox` | `true` |
| `webSecurity` | `true` |

Additional hardening already in place:

- `setWindowOpenHandler` denies new windows; only `http(s):` URLs forwarded to `shell.openExternal`.
- `will-navigate` guard pins the renderer to its initial origin.
- Default CSP via `session.defaultSession.webRequest.onHeadersReceived` (Dev allows Vite HMR; Prod is strict `'self'`).
- `@electron/remote` is forbidden.

## Error Handling

- IPC handlers return structured results, not raw throws. Tagged result type for expected failures: `{ ok: true; value } | { ok: false; error }`. Throws are for genuine bugs only.
- Validation errors travel as typed result, not as exceptions across the bridge.
- User-facing messages are actionable (`"Datei nicht gefunden: {pfad}"`), not raw error codes.
- Unexpected errors logged in main. Renderer shows a generic message + retry path.
- No `alert()` / `window.confirm()`. Use shadcn dialogs/toasts.
- No copy-pasted try/catch — extract one hook that maps errors once.

## Logging

- No stray `console.log` in committed code.
- Add a shared logger only when ad-hoc logging hits 3+ places. Wrapper goes in `src/main/log.ts` (or `src/shared/log.ts` if renderer truly needs it): `info` / `warn` / `error`.
- Main is the logging home. Renderer logs are minimal, dev-only.
- No observability frameworks, no telemetry, no Sentry until there is a stated operational need.

## Testing

Test what carries risk; skip the rest.

**Test:** IPC handlers, zod schemas, pure utilities with real logic, critical business rules.

**Don't test:** presentational components, snapshot churn, implementation details, shadcn rendering.

- Co-locate: `foo.ts` → `foo.test.ts`.
- Add Vitest only when the first real test is written.

## Never Rules

Hard constraints. No exceptions without an in-file written reason.

- Never use `any`. Use `unknown` + narrowing or a type in `src/shared/`.
- Never disable TS errors (`@ts-ignore`/`@ts-expect-error`) without a one-line reason.
- Never expose `ipcRenderer`, `invoke`, `send`, or Node APIs to the renderer.
- Never reference IPC channel names as raw strings outside `src/shared/ipc-contracts.ts`.
- Never put cross-process types outside `src/shared/`.
- Never trust IPC payloads in main — validate at the boundary.
- Never access `fs`, `child_process`, `shell`, or Node APIs from the renderer — go through IPC.
- Never weaken `webPreferences` security defaults without a written reason in `src/main/index.ts`.
- Never call `window.api` from a component — only from `pages/` or hooks in `*/hooks/`.
- Never create god components (fetching + layout + business + side effects in one file).
- Never wrap/re-skin shadcn primitives just to rename them.
- Never add a dependency without justification (size, alternative, why not stdlib) in the commit message.
- Never introduce a service/repository/manager layer "for future use".
- Never create singletons or global event buses without a strong reason written next to them.
- Never run two patterns in parallel for the same problem without a written migration plan to one.
- Never mix UI and filesystem/system logic in the same file.
- Never use Redux. Never use CQRS, event sourcing, DI containers, plugin systems, or mediators in this repo.

## Anti-Overengineering Checklist

Before adding any of these, name two current callers that need it — or don't add it:

- a service/repository/use-case/DTO mapper layer
- a generic helper factory, abstract base class, or framework-like internal system
- a wrapper around a thin library "to make it swappable"
- a folder for one file
- a split of a file that's still readable
- a "reusable" abstraction with zero or one current consumer

## Scaling Ladder

Walk it in order. Don't skip rungs.

1. More IPC domains → add `src/main/ipc/<domain>.ts`.
2. More renderer state → custom hook in `renderer/hooks/` (or `features/<x>/hooks/`).
3. Cross-cutting renderer state → React Context.
4. Re-render storms or hook sprawl → Zustand or Jotai. Do not add without explicit user approval in the current conversation.
5. Persistent state in main → JSON file in `app.getPath('userData')`. SQLite (`better-sqlite3`) only when JSON breaks down.
6. CPU-bound background work blocking main → `utilityProcess`.

## Tech Stack

- Electron 42 + electron-vite 3
- React 18 + TypeScript strict
- Tailwind CSS 4 via `@tailwindcss/vite` — config lives in `App.css` `@theme`, no `tailwind.config.ts`
- shadcn/ui (Radix + `cn()` from `@/lib/utils`)
- Windows 11 design language: Segoe UI, neutral palette, `rounded-lg`/`rounded-xl`, `shadow-sm`/`shadow-md`, subtle motion

## Project Structure

```text
src/
├── main/
│   ├── index.ts          # lifecycle, BrowserWindow, security
│   └── ipc/
│       ├── index.ts      # registerIpcHandlers()
│       └── <domain>.ts
├── preload/index.ts      # typed contextBridge API
├── shared/               # cross-process contracts
│   ├── ipc-contracts.ts
│   ├── api.ts
│   ├── validate.ts
│   └── index.ts
└── renderer/
    ├── main.tsx, App.tsx, App.css, index.html, env.d.ts
    ├── features/<feature>/
    ├── components/
    ├── hooks/
    ├── pages/
    └── lib/utils.ts
```

`tsconfig.node.json` = main + preload + shared. `tsconfig.web.json` = renderer + shared. `src/shared/` is in both on purpose. `@/` alias is renderer-scoped only — use relative imports in main/preload/shared.

## Commands

```bash
npm run dev          # Electron + HMR
npm run build        # production → out/
npm run type-check   # tsc --noEmit
npm run lint         # ESLint flat config
npm run format       # Prettier
```

Node.js at `C:\Users\bx.ASA-WIEN\nodejs` must be in PATH (not auto-added on this machine).

## Gotchas

- **Tailwind v4**: no `tailwind.config.ts` — extend in `App.css` `@theme`. Prefer direct classes over `@apply`.
- **Path alias**: `@/` works in renderer only. Use relative imports in `main/`, `preload/`, `shared/`.
- **tsconfig split**: `shared/` is included in both configs deliberately.
- **zod**: not yet installed. `npm i zod` before the first schema. `validate()` in `src/shared/validate.ts` is library-agnostic.
- **IPC HMR**: `ipcMain.handle` throws on duplicate registration. If you start reloading handlers, prepend `ipcMain.removeHandler(channel)`.
