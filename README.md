# ClinicDesktop

ClinicDesktop is an Electron desktop application for macOS, Windows, and Linux. Vue, Vite, and Nuxt UI are used only for the renderer UI that runs inside the Electron window.

## Requirements

- Node.js `22.22.3` via `nvm`
- npm

```bash
nvm use
npm install
```

## Development

Run the desktop app in Electron:

```bash
npm run dev
```

The renderer-only Vite server is kept as an internal UI debugging target:

```bash
npm run dev:renderer
```

## Build

Build the Electron main process, preload script, and renderer bundle:

```bash
npm run build
```

Create a macOS release:

```bash
npm run dist:mac
```

The macOS release currently targets Apple Silicon (`arm64`) to keep the installer smaller. The release script cleans the generated `release/` folder before packaging so old artifacts are not mixed with the current build.

## Structure

- `electron/main.ts`: Electron main process, native window lifecycle, IPC handlers, and embedded database startup.
- `electron/preload.ts`: secure bridge exposed to the renderer through `window.electronAPI`.
- `src/`: Vue renderer shell shown inside the Electron window.
- `src/modules/auth/`: login, registration, auth state, and auth routes.
- `src/modules/dashboard/`: home dashboard route and view.
- `src/modules/clinic-sections/`: shared placeholder views for clinic sections such as patients, appointments, and finance.
- `src/modules/settings/`: settings routes and views.
- `src/database/types.ts`: shared Kysely table and entity types.
- `src/database/migrations/`: ordered SQL migrations loaded automatically when the embedded database starts.
- `electron/repositories/`: Kysely-backed repositories used by Electron IPC handlers.
- `src/components/`: shared renderer components used across modules.
- `dist-electron/`: generated Electron main/preload build output.
- `dist/`: generated renderer build output loaded by Electron in packaged releases.
- `release/`: generated installers and packaged desktop apps.
