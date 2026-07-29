# Snext

Snext is a desktop gaming companion built with Tauri, React, TypeScript and Vite.

It is designed to run on a secondary monitor while you play, showing the active gaming session, ambient widgets, weather, music, social presence, system status and contextual assistant tips.

## Current Status

This branch contains the shell v3 foundation converted into a runnable application foundation:

- dashboard layout aligned with the approved visual reference mockup;
- responsive Snext dashboard shell;
- reusable UI primitives;
- persisted settings in `localStorage`;
- Spanish, English and Portuguese copy foundation;
- light, dark and automatic themes;
- live weather lookup through Open-Meteo or OpenWeatherMap;
- native Tauri commands for CPU, RAM, platform and process count;
- active-game detection from running processes, emulator arguments and RetroArch history;
- platform visual badges for common Bazzite/EmuDeck targets;
- SteamGridDB artwork enrichment when an API key is configured;
- RetroAchievements recent activity when user/API key are configured;
- achievements carousel with 30s default rotation, hover pause and detail modal;
- Spotify currently-playing support when a valid access token is available;
- contextual assistant tips through Gemini, Ollama or local fallback;
- browser-readable system/network fallback metrics when not running inside Tauri;
- local fallback artwork so the UI renders without missing assets;
- prepared data contracts for game, Spotify, weather, system and integration widgets;
- recovered implementation plan in `docs/conversation-plan.md`.

Some integrations still need provider-specific authentication before they can be fully live:

- Spotify requires OAuth;
- Discord presence requires an app/client integration;
- SteamGridDB and RetroAchievements require API keys;
- GPU, VRAM, temperatures and battery still need Linux/Bazzite-specific native readers;
- Snext AI currently runs from the frontend for MVP; production should proxy secrets through Tauri/keyring.

## Requirements

- Node.js 20 or newer;
- npm;
- Rust stable;
- Tauri 2 prerequisites for your OS.

## Development

```bash
npm ci
npm run dev
```

For the desktop app:

```bash
npm run tauri dev
```

## Build

```bash
npm run build
npm run tauri build
```

## Project Structure

```text
src/
  components/
    layout/          Shared dashboard layout primitives
    ui/              Badge, Card, Modal, ProgressBar and related UI pieces
  features/
    game/            Active game hero widget
    spotify/         Spotify now-playing widget
    weather/         Weather and forecast widget
  services/
    dashboardData.ts Live/fallback data adapter layer
  styles/
    globals.css      Global app styles
    tokens.css       Snext design tokens
  App.tsx            Main application shell

src-tauri/
  Tauri 2 desktop wrapper and native commands

docs/
  design-system-v2.md Product and visual direction
  conversation-plan.md Decisions recovered from the planning chat
```

## Weather

Weather can use the public Open-Meteo APIs:

- geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- forecast: `https://api.open-meteo.com/v1/forecast`

No API key is required. Set a location in Settings, for example `Mexico City`, `Monterrey`, `Madrid` or `Sao Paulo`.

OpenWeatherMap is also selectable from Settings when an API key is available.

## Native Commands

The Tauri backend exposes:

- `get_system_snapshot`: CPU usage, RAM usage, platform and process count.
- `detect_active_game`: conservative game detection for Steam, Proton, RetroArch, Ryujinx, Citra, Heroic, Lutris and similar flows. It inspects process names, executable paths, command arguments and RetroArch `content_history.lpl`.

The detector is intentionally heuristic. It is a base for richer rules, Steam metadata and emulator-specific adapters.

## Platforms

Snext includes an internal platform catalog with visual badges for likely Bazzite/EmuDeck usage:

- Steam, PC/Proton, Heroic and Lutris;
- Nintendo Switch, Wii U, Wii, GameCube, 3DS, DS, GBA, Game Boy, N64, SNES and NES;
- PlayStation, PS2, PS3 and PSP;
- Sega Dreamcast, Genesis and Saturn;
- Arcade/MAME and RetroArch.

The badges use local CSS/SVG-style marks rather than bundled trademark assets. Replace them with licensed assets later if you want exact official logos.

## Achievement Card

The achievements card follows the planning chat:

- automatic carousel of games with progress;
- default duration: 30 seconds per game;
- configurable duration: 10, 20, 30 or 60 seconds;
- hover pauses rotation;
- opening the detail modal pauses rotation;
- each slide shows game image, title, platform, provider, unlocked/total achievements, progress bar and recent achievement;
- click opens a detail modal with an achievement grid;
- RetroAchievements shows points;
- Steam shows rarity when available and does not invent points.

## Weather Card

The weather card follows the approved direction:

- dynamic sky based on condition and day/night;
- dominant temperature;
- condition, clock, date, location and short forecast;
- weather animation setting: full, reduced or off.

## Visual Direction

The first screen is the actual experience, not a landing page:

- compact top bar with Snext identity, profile and settings;
- large active-game hero as the dominant element;
- music and achievements side by side;
- weather/clock as a full-width atmospheric strip;
- Discord, system metrics and AI as the lower utility row.

## Assistant

The assistant card uses the detected game as context:

1. Gemini, when `Gemini API key` is configured.
2. Ollama, when `Ollama URL` and model are available locally.
3. Local fallback text when no AI provider responds.

Responses are cached in `localStorage` for 30 minutes per game/language to reduce repeated calls.

## Registry Note

This repo includes a local `.npmrc` pointing to the public npm registry so installs do not depend on a private corporate registry.

## Next Implementation Steps

1. Move secrets, Gemini calls and OAuth flows out of the frontend and into Tauri/Rust commands.
2. Add GPU, VRAM, temperatures, battery and monitor selection commands.
3. Add provider adapters for Spotify, Discord, RetroAchievements and SteamGridDB.
4. Replace remaining hardcoded Spanish strings inside feature components with the i18n layer.
5. Add automated checks with TypeScript, Vitest and Playwright screenshot smoke tests.
