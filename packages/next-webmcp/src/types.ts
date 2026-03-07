import type { NextConfig } from "next";
import type { ZodType } from "zod";

/** JSON Schema object for tool input parameters */
export interface JsonSchema {
  type: "object";
  properties: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: readonly string[];
    }
  >;
  required?: readonly string[];
}

/** Tool metadata attached to a function via `fn.tool = { ... }` */
export interface ToolDefinition {
  description: string;
  inputSchema: JsonSchema | ZodType;
}

/** Resource metadata attached to a function via `fn.resource = { ... }` */
export interface ResourceDefinition {
  description: string;
  mimeType?: string;
  data?: unknown;
}

/** Configuration for the withWebMCP Next.js plugin */
export interface WebMCPConfig {
  /**
   * Optional glob patterns to include. If omitted, all routes are included.
   * Supports glob patterns like '/api/products/**'
   */
  paths?: string[];
  /**
   * Optional glob patterns to exclude from discovery.
   * Supports glob patterns like '/api/mcp/**'
   */
  exclude?: string[];
}

/** Internal representation of a discovered tool */
export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  routePath: string;
  method: string;
  /** "route" for API routes, "action" for server actions */
  kind: "route" | "action";
  /** How the action expects its input: "object" for safe-actions, "formData" for plain server actions */
  callStyle?: "object" | "formData";
  /** Absolute path to the source file (action tools only, not serialized to manifest) */
  sourceFile?: string;
  /** Export name in the source file (action tools only, not serialized to manifest) */
  exportName?: string;
}

/** Internal representation of a discovered resource */
export interface DiscoveredResource {
  name: string;
  description: string;
  mimeType: string;
  uriTemplate: string;
  isTemplate: boolean;
}

/** The MCP manifest served at /.well-known/mcp */
export interface MCPManifest {
  tools: DiscoveredTool[];
  resources: DiscoveredResource[];
}

/** Augment the Next.js config type */
export type WithWebMCP = (
  config?: WebMCPConfig
) => (nextConfig: NextConfig) => NextConfig;
