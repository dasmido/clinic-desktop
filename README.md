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

## Structure

- `electron/main.ts`: Electron main process, native window lifecycle, IPC handlers, and embedded database startup.
- `electron/preload.ts`: secure bridge exposed to the renderer through `window.electronAPI`.
- `src/`: Vue renderer application shown inside the Electron window.
- `dist-electron/`: generated Electron main/preload build output.
- `dist/`: generated renderer build output loaded by Electron in packaged releases.
- `release/`: generated installers and packaged desktop apps.
