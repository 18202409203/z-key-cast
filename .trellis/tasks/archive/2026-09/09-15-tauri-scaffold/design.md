# Design: Tauri scaffold

## Stack

- Tauri 2 (`macos-private-api` for transparent overlay)
- SvelteKit + TypeScript + Vite
- pnpm

## Windows

1. **overlay** (`/overlay`) — transparent, undecorated, always-on-top, ignore cursor events; bottom-right positioned in Rust setup
2. **main** (`/`) — settings placeholder

## Later

- Rust input listener + CastEvent emit
- Permission prompts
- Tray menu wiring
