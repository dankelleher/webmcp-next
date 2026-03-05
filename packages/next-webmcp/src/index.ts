export { withWebMCP } from "./plugin.js";
export { buildManifest } from "./scanner.js";
export { resolveInputSchema } from "./schema.js";
export { WebMCPScript } from "./WebMCPScript.js";
export { createManifestHandler, createToolCallHandler, createResourceHandler } from "./handler.js";
export type {
  ToolDefinition,
  ResourceDefinition,
  WebMCPConfig,
  JsonSchema,
  DiscoveredTool,
  DiscoveredResource,
  MCPManifest,
} from "./types.js";
