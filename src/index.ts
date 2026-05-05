import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import OBSWebSocket from "obs-websocket-js";

const OBS_URL = process.env.OBS_WS_URL ?? "ws://localhost:4455";
const OBS_PASSWORD = process.env.OBS_WS_PASSWORD ?? "";

let obs: OBSWebSocket | null = null;
let connected = false;

async function getOBS(): Promise<OBSWebSocket> {
  if (obs && connected) return obs;
  obs = new OBSWebSocket();
  try {
    await obs.connect(OBS_URL, OBS_PASSWORD || undefined);
    connected = true;
    obs.on("ConnectionClosed", () => { connected = false; });
    obs.on("ConnectionError", () => { connected = false; });
  } catch (err) {
    connected = false;
    throw new McpError(
      ErrorCode.InternalError,
      `Cannot connect to OBS WebSocket at ${OBS_URL}. Ensure OBS is running with obs-websocket v5 plugin enabled. Error: ${String(err)}`
    );
  }
  return obs;
}

const SetCurrentSceneSchema = z.object({
  scene_name: z.string().min(1).describe("Exact name of the scene to switch to"),
});

const ToggleMuteSchema = z.object({
  source_name: z.string().min(1).describe("Name of the audio source to toggle"),
});

const SetVolumeSchema = z.object({
  source_name: z.string().min(1).describe("Name of the audio source"),
  volume_db: z.number().min(-100).max(0).describe("Volume in dB (0 = max, -100 = silent)"),
});

const server = new Server(
  { name: "mcp-obs-websocket", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "start_recording",
      description: "Start OBS recording.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "stop_recording",
      description: "Stop OBS recording and return the output file path.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "start_streaming",
      description: "Start OBS streaming to the configured stream destination.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "stop_streaming",
      description: "Stop OBS streaming.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "get_scene_list",
      description: "List all available OBS scenes and the currently active scene.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "set_current_scene",
      description: "Switch OBS to a specific scene by name.",
      inputSchema: {
        type: "object",
        properties: {
          scene_name: { type: "string", description: "Exact scene name" },
        },
        required: ["scene_name"],
      },
    },
    {
      name: "get_recording_status",
      description: "Get current OBS recording state (active, paused, stopped) and file path if active.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "toggle_mute",
      description: "Toggle the mute state of an OBS audio source.",
      inputSchema: {
        type: "object",
        properties: {
          source_name: { type: "string", description: "Name of the audio source" },
        },
        required: ["source_name"],
      },
    },
    {
      name: "get_stats",
      description: "Get OBS performance stats: CPU, memory, render time, dropped frames.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "set_volume",
      description: "Set volume (in dB) for an OBS audio source.",
      inputSchema: {
        type: "object",
        properties: {
          source_name: { type: "string", description: "Audio source name" },
          volume_db: { type: "number", description: "Volume in dB (0=max, -100=silent)", minimum: -100, maximum: 0 },
        },
        required: ["source_name", "volume_db"],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const client = await getOBS();

    switch (name) {
      case "start_recording": {
        await client.call("StartRecord");
        return { content: [{ type: "text", text: JSON.stringify({ status: "recording_started" }) }] };
      }

      case "stop_recording": {
        const result = await client.call("StopRecord");
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ status: "recording_stopped", output_path: (result as Record<string, unknown>).outputPath }),
          }],
        };
      }

      case "start_streaming": {
        await client.call("StartStream");
        return { content: [{ type: "text", text: JSON.stringify({ status: "streaming_started" }) }] };
      }

      case "stop_streaming": {
        await client.call("StopStream");
        return { content: [{ type: "text", text: JSON.stringify({ status: "streaming_stopped" }) }] };
      }

      case "get_scene_list": {
        const result = await client.call("GetSceneList") as Record<string, unknown>;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              current_scene: result.currentProgramSceneName,
              scenes: (result.scenes as Array<Record<string, unknown>>).map(s => ({
                name: s.sceneName,
                index: s.sceneIndex,
              })),
            }, null, 2),
          }],
        };
      }

      case "set_current_scene": {
        const input = SetCurrentSceneSchema.parse(args);
        await client.call("SetCurrentProgramScene", { sceneName: input.scene_name });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ status: "scene_changed", scene: input.scene_name }),
          }],
        };
      }

      case "get_recording_status": {
        const result = await client.call("GetRecordStatus") as Record<string, unknown>;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              output_active: result.outputActive,
              output_paused: result.outputPaused,
              output_timecode: result.outputTimecode,
              output_duration: result.outputDuration,
              output_bytes: result.outputBytes,
            }, null, 2),
          }],
        };
      }

      case "toggle_mute": {
        const input = ToggleMuteSchema.parse(args);
        await client.call("ToggleInputMute", { inputName: input.source_name });
        const muteStatus = await client.call("GetInputMute", { inputName: input.source_name }) as Record<string, unknown>;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              source: input.source_name,
              muted: muteStatus.inputMuted,
            }),
          }],
        };
      }

      case "get_stats": {
        const result = await client.call("GetStats") as Record<string, unknown>;
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              cpu_usage: result.cpuUsage,
              memory_usage: result.memoryUsage,
              active_fps: result.activeFps,
              average_frame_render_time: result.averageFrameRenderTime,
              render_skipped_frames: result.renderSkippedFrames,
              render_total_frames: result.renderTotalFrames,
              output_skipped_frames: result.outputSkippedFrames,
              output_total_frames: result.outputTotalFrames,
            }, null, 2),
          }],
        };
      }

      case "set_volume": {
        const input = SetVolumeSchema.parse(args);
        await client.call("SetInputVolume", {
          inputName: input.source_name,
          inputVolumeDb: input.volume_db,
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ source: input.source_name, volume_db: input.volume_db }),
          }],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (err) {
    if (err instanceof McpError) throw err;
    if (err instanceof z.ZodError) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid parameters: ${err.message}`);
    }
    throw new McpError(ErrorCode.InternalError, `OBS error: ${String(err)}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("mcp-obs-websocket server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
