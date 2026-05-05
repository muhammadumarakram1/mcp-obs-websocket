# mcp-obs-websocket

MCP server for OBS Studio control via the WebSocket v5 protocol. Start/stop recordings, switch scenes, toggle mute, and monitor performance stats — all from Claude Code without touching OBS's UI.

## Tools

| Tool | Description |
|------|-------------|
| `start_recording` | Begin OBS recording |
| `stop_recording` | Stop recording, returns output file path |
| `start_streaming` | Begin streaming to configured destination |
| `stop_streaming` | Stop streaming |
| `get_scene_list` | List all scenes + active scene |
| `set_current_scene` | Switch to a scene by name |
| `get_recording_status` | Recording state, timecode, bytes written |
| `toggle_mute` | Toggle mute on an audio source |
| `get_stats` | CPU, memory, dropped frames, render time |
| `set_volume` | Set volume (dB) on an audio source |

## Free Tier Limits

| Item | Cost |
|------|------|
| OBS Studio | **Free, open source** |
| obs-websocket plugin | **Free** (built into OBS 28+) |
| API key | None — local WebSocket only |
| Network traffic | Local only (localhost:4455) |

## Prerequisites

- **OBS Studio 28+** (obs-websocket is bundled): https://obsproject.com
- For OBS < 28: install the plugin separately: https://github.com/obsproject/obs-websocket

## OBS WebSocket Setup

1. Open OBS Studio
2. **Tools → WebSocket Server Settings**
3. Enable WebSocket server ✓
4. Set a password (optional but recommended for security)
5. Port: 4455 (default)
6. Click OK

## Environment Variables

```bash
OBS_WS_URL=ws://localhost:4455
OBS_WS_PASSWORD=your_obs_websocket_password
```

Leave `OBS_WS_PASSWORD` empty if you haven't set a password in OBS.

## Install

```bash
cd mcp-obs-websocket
npm install
npm run build
```

## Claude Code `.mcp.json` Config

```json
{
  "mcpServers": {
    "obs": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-obs-websocket/dist/index.js"],
      "env": {
        "OBS_WS_URL": "ws://localhost:4455",
        "OBS_WS_PASSWORD": "your_password_here"
      }
    }
  }
}
```

## Example Prompts

```
List all my OBS scenes
```

```
Switch OBS to the "Talking Head" scene and start recording
```

```
What are OBS's current performance stats? Is it dropping frames?
```

```
Mute the Desktop Audio source in OBS
```

## Scene Automation Ideas

- Pre-recording checklist: check stats → switch to intro scene → start recording
- Auto-stop: monitor recording status and stop after X minutes
- Multi-scene workflow: switch scenes at defined timestamps via Claude Code scripting

## Connection Notes

The MCP maintains a persistent WebSocket connection to OBS. If OBS is restarted, the next tool call will automatically reconnect. The server does not need to be restarted.

## How I Built This — Channel 1 Angle

**Video idea:** *"I control OBS with Claude Code — AI-assisted recording workflow"*

This is the most visually compelling demo in the pipeline: you can record a Claude Code session that includes Claude itself telling OBS to start recording. The `get_stats` tool is also useful mid-recording — if you ask Claude to check performance and it detects dropped frames, it can suggest switching to a lower bitrate profile.

The `obs-websocket-js` library (used under the hood) supports all OBS WebSocket v5 requests, so this MCP can be extended to control any OBS feature — virtual camera, scene item visibility, source filters — without changing the server code, just by adding new tool definitions.

## License

MIT — see [LICENSE](LICENSE)
