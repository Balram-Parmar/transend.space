<p align="center">
  <img src="build/icon.png" alt="TranSends" width="180" />
</p>

<p align="center"><strong>Local file sharing across all your devices — fast, offline, and free.</strong></p>

<p align="center">
  <a href="https://transends.space">Website</a> ·
  <a href="https://github.com/Balram-Parmar/transend.space">Source</a> ·
  <a href="https://github.com/Balram-Parmar/transend.space/issues">Issues</a>
</p>

---

## What is TranSends?

**TranSends** (repo codename `transend.ts`) is an open-source **desktop application for peer-to-peer file transfer over a Local Area Network**. It discovers other machines on the same Wi-Fi / hotspot, lets you pick files with a native dialog, asks the receiver to accept, and streams the bytes directly between the two devices — with **no internet connection, cloud service, or account required**.

Built as an **Electron + React + TypeScript** app, it ships as native installers for **Windows, macOS, and Linux**.

## Features

- **Fully offline / LAN-only** — no server, no cloud, no sign-in; data never leaves the local network.
- **Automatic device discovery** — nearby peers appear instantly via UDP broadcast; no IP addresses to type.
- **Fast, parallel transfers** — multi-connection, chunked HTTP range downloads that saturate local bandwidth.
- **Resilient** — per-chunk retries with backoff and connection-aware progress tracking.
- **Encrypted in transit** — every transfer runs over a locally generated HTTPS (TLS) server.
- **No limits** — no file-size caps, no recompression; files are copied byte-for-byte.
- **Cross-platform** — one codebase, native builds for Windows, macOS, and Linux.
- **Intuitive UI** — dark, cyan-themed interface with device cards, accept/reject dialogs, and live progress bars.

---

## Table of Contents

- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Build & Packaging](#build--packaging)
- [Configuration](#configuration)
- [Security](#security)
- [Known Limitations](#known-limitations)
- [License](#license)

---

## How it works

A transfer is a short request/accept handshake followed by a chunked download:

1. **Discover** — Every second each app UDP-broadcasts a JSON beacon (`name`, `httpPort`, `address`, `arch`, `os`) on port **6321** to the directed broadcast address of each active IPv4 interface. Peers store devices by IP, ignore their own beacons, and drop devices not seen for 5 seconds.
2. **Select** — Clicking a device opens the native file dialog (multi-select). Each file gets a random 16-byte hex ID and a `/download/<id>` link.
3. **Request** — The sender `POST`s the file list to the peer's `/downloadRequest` endpoint. The peer sees an **Accept / Reject** dialog listing the files.
4. **Accept** — On accept, the peer sends the files back with fully-qualified `https://<ip>:<port>/download/<id>` links and begins downloading; the sender shows the transfer in its Transfer tab.
5. **Transfer** — The receiving app splits each file into **0.5 MB byte ranges** and fetches them with **2 parallel workers** using HTTP `Range` headers. The sender streams the requested slice with `206 Partial Content`. Failed chunks are retried up to 3 times.
6. **Track** — Both sides emit byte counters over IPC to the renderer, driving live percentage/byte progress bars. Completed transfers are removed from the list.

## Architecture

The app is split into a **main process** (Node/Electron networking), a **preload bridge**, and a **renderer** (React UI):

| Layer | Files | Responsibility |
| --- | --- | --- |
| Main process | `electron/main.ts` | App lifecycle, window setup, IPC handlers, HTTPS/discovery/downloader wiring, runtime TLS certificate generation |
| Discovery | `electron/core/DiscoveryService.ts` | UDP broadcast beaconing, device registry, device-found/lost events |
| Server | `electron/core/Server.ts` | HTTPS REST server, file registration, range-request streaming, upload progress |
| Downloader | `electron/core/Downloader.ts` | Parallel ranged downloads, retries, byte-accurate write offsets, download progress |
| Types | `electron/utils/types.ts` | Shared TypeScript types (`DeviceInfo`, `fileInfo`, `PeerDownloadRequest`, options) |
| Preload bridge | `electron/preload.ts` | Exposes a safe `window.api` via `contextBridge` (no direct Node access in renderer) |
| Renderer | `src/` | React UI, routing, dialogs, progress store, styling |

**IPC contract (`window.api`)** — `handleDeviceFound`, `getAllDevices`, `sendDownloadRequest`, `handleDownloadRequest`, `acceptRequest`, `rejectRequest`, `addActiveTransfer`, `progress`, `downloadProgress`, `fileDialogCanceled`.

**REST endpoints** — `POST /downloadRequest` (transfer handshake), `GET /download/<id>` (file bytes, range-aware), plus extensible GET/POST route maps and a catch-all 404 handler.

## Technology Stack

| Area | Technology |
| --- | --- |
| Desktop shell | Electron 41 |
| UI | React 19, React DOM, React Router 7 (`HashRouter`) |
| Language | TypeScript 6 (project references: app, node, electron) |
| Build tooling | Vite 8, `vite-plugin-electron`, `vite-plugin-electron-renderer` |
| Packaging | electron-builder 26 |
| Networking | Node `https`, `dgram` (UDP), `get-port` |
| Crypto | `node-forge` (runtime self-signed TLS certificate) |
| Styling | CSS Modules, Inter variable font |
| Quality | ESLint 10 (typescript-eslint, react-hooks, react-refresh) |

## Project Structure

```text
transend.ts/
├── electron/
│   ├── main.ts                  # App entry, window, IPC, orchestration
│   ├── preload.ts               # contextBridge API
│   ├── core/
│   │   ├── DiscoveryService.ts  # UDP device discovery
│   │   ├── Downloader.ts        # Parallel ranged downloads
│   │   └── Server.ts            # HTTPS file server
│   ├── utils/types.ts           # Shared types
│   └── tsconfig.json
├── src/
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Router + header/nav
│   ├── Components/
│   │   ├── Home/                # Device grid, request dialogs, scan button
│   │   └── Transfer/            # Active transfer progress view
│   ├── utils/activeTransfers.ts # Frontend progress store/subscription
│   ├── electron.d.ts            # window.api typings
│   └── global.css               # Reset + Inter font
├── electron-builder.json        # Installer targets per platform
├── vite.config.ts               # Vite + Electron build
├── index.html
└── package.json
```

## Getting Started

**Prerequisites:** Node.js (with npm) and a LAN/Wi-Fi network shared by at least two machines.

```bash
git clone https://github.com/Balram-Parmar/transend.space.git
cd transend.space
npm install
npm run dev          # launches the Electron app in development mode
```

To try a transfer, run the app on **two devices on the same network**. They discover each other automatically — select a file on device A, then click device B and accept the request.

> Development loads the Vite URL from `VITE_DEV_SERVER_URL`; production loads the bundled `dist/index.html`.

## Build & Packaging

```bash
npm run build        # typecheck (tsc) + production Vite bundle
```

Build installers with the `build:*` scripts (all run `npm run build` first):

| Script | Output |
| --- | --- |
| `build:all` | macOS + Windows + Linux in one pass |
| `build:mac` / `:x64` / `:arm64` / `:universal` | `.dmg` and `.zip` |
| `build:win` / `:x64` / `:ia32` / `:arm64` | NSIS installer + portable `.exe` |
| `build:linux` / `:x64` / `:arm64` / `:armv7l` | `.AppImage` |

Artifacts are written to `release/<version>/`. The NSIS installer is per-machine, allows choosing the install directory, and creates a desktop shortcut.

## Configuration

| Setting | Value / Source |
| --- | --- |
| App ID / product name | `space.transends` / `TranSends` |
| Discovery port | UDP `6321` (fixed) |
| HTTPS port | Auto-selected free port at startup (`get-port`) |
| Chunk size (server stream high-water mark) | `1 MB` |
| Download chunk / concurrency | `0.5 MB` ranges, `2` workers, `3` retries |
| Device timeout | `5 s` since last beacon |
| TLS certificate | Generated at runtime: 2048-bit RSA, SHA-256, self-signed, 1-year validity, SAN `localhost` / `127.0.0.1` |
| Downloads folder | OS default (`app.getPath('downloads')`) |
| Window | Min `1024 × 768`, context isolation on, Node integration off |

## Security

- **TLS for all transfers.** A fresh self-signed certificate is generated in-process on every launch; peers connect with certificate verification relaxed (`rejectUnauthorized: false`) because certificates are ephemeral and LAN-scoped.
- **Isolated renderer.** `contextIsolation: true` and `nodeIntegration: false`; the renderer only reaches Node features through the narrow `window.api` bridge.
- **Browser shortcuts disabled** — `Ctrl+R`, `Ctrl+Shift+I`, `F5`, and `Ctrl+T` are blocked to keep the app behaving like a native program.
- **Scoped routing** — unknown endpoints return 404 and invalid file IDs return 404; invalid byte ranges return `416`.
- See [`SECURITY.md`](SECURITY.md) for the vulnerability-reporting policy.

## Known Limitations

- Transfers are protected by opportunistic TLS (self-signed, unverified by peers) rather than a trusted PKI — appropriate for a trusted LAN, not for untrusted networks.
- Device names shown in dialogs and transfer speed/ETA values in the Transfer view are currently placeholders rather than live sender identity / measured throughput.
- The app currently targets desktop OSes; discovery data includes an `os` field with an Android fallback icon, but there is no mobile build yet.

## License

This project is licensed under the **MIT License**.

---

<p align="center">Made by <strong>Balram</strong> · <a href="https://transends.space">transends.space</a> · © 2026</p>
