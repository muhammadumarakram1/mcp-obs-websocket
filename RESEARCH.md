# OBS WebSocket — Research Report
**Date:** 2026-05-05

## API State (verified)

- **obs-websocket-js version:** v5.0.8 (latest on npm, released March 14, 2024; no v6 exists). Source: [npmjs.com/package/obs-websocket-js](https://www.npmjs.com/package/obs-websocket-js), [GitHub releases](https://github.com/obs-websocket-community-projects/obs-websocket-js/releases)
- **OBS WebSocket protocol:** v5 (RPC version 1), bundled with OBS Studio since v28.0.0; OBS 30/31 continue to ship protocol v5 with no breaking changes. Source: [obsproject.com blog](https://obsproject.com/blog/obs-studio-and-obs-websocket-join-forces)
- **Default port:** 4455 (hardcoded in `src/index.ts` as `ws://localhost:4455`)

## Code vs API Delta

- **npm pinned version** (`^5.0.5` in package.json) vs current (`5.0.8`): MATCH — same major.minor; patch bump is non-breaking type-definition update only.
- **`connect(url, password)` API** (`src/index.ts:22`): MATCH — `obs.connect(OBS_URL, OBS_PASSWORD || undefined)` matches the v5 signature `connect(address, password?, options?)`.
- **`call(request, params)` API** (multiple lines): MATCH — `.call("RequestName", {...})` is the correct v5 method; `send()` was the old v4 method and is not used here.
- **`on(event, handler)` API** (`src/index.ts:24-25`): MATCH — event subscription via `.on()` is unchanged in v5.
- **`GetSceneList`** (`src/index.ts:160`): MATCH — valid protocol v5 request.
- **`SetCurrentProgramScene`** (`src/index.ts:177`): MATCH — valid protocol v5 request.
- **`StartRecord` / `StopRecord`** (`src/index.ts:135, 140`): MATCH — correct v5 names (note: code does NOT use the older `StartRecording`/`StopRecording`; those were v4 names).
- **`StartStream` / `StopStream`** (`src/index.ts:151, 155`): MATCH — valid protocol v5 requests.
- **`GetRecordStatus`** (`src/index.ts:187`): MATCH — valid protocol v5 request.
- **`GetStats`** (`src/index.ts:218`): MATCH — valid protocol v5 request.
- **`ToggleInputMute` / `GetInputMute`** (`src/index.ts:204-205`): MATCH — valid protocol v5 requests.
- **`SetInputVolume`** (`src/index.ts:238`): MATCH — valid protocol v5 request.

## Fixes Required

NONE. All API calls, method signatures, event names, and request identifiers are correct for obs-websocket-js v5.x and OBS WebSocket protocol v5.

## README Updates Needed

- State the obs-websocket-js dependency version range (`^5.0.5`) and confirm compatibility with current `5.0.8`.
- Note that `StartRecording`/`StopRecording` (v4 names) are NOT used — the code correctly uses `StartRecord`/`StopRecord` (v5 names). Worth calling out explicitly since the v4→v5 rename is a common source of confusion.
- Confirm OBS Studio minimum version: 28.0.0 (first release to bundle obs-websocket v5).

## Confidence

HIGH — npm latest version confirmed via search (5.0.8, published March 2024, no v6 in progress). All 11 protocol request names verified against the live `protocol.md` on the obsproject/obs-websocket repo. No breaking changes found in 2025–2026 for the v5 js client.

## Sources

1. [obs-websocket-js on npm](https://www.npmjs.com/package/obs-websocket-js)
2. [obs-websocket-js GitHub releases](https://github.com/obs-websocket-community-projects/obs-websocket-js/releases)
3. [OBS WebSocket protocol.md (master)](https://raw.githubusercontent.com/obsproject/obs-websocket/master/docs/generated/protocol.md)
4. [OBS Studio + obs-websocket join forces (blog)](https://obsproject.com/blog/obs-studio-and-obs-websocket-join-forces)
