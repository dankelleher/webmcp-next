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

/** Tool definition exported from an API route via `export const tool = { ... }` */
export interface ToolDefinition {
  description: string;
  inputSchema: JsonSchema | ZodType;
}

/**
 * Resource definition exported from a route via `export const resource = { ... }`
 * - Static: `data` is a plain value
 * - Dynamic: `data` is an async function whose params match the route's dynamic segments
 */
export interface ResourceDefinition<T = unknown> {
  description: string;
  mimeType?: string;
  data: T | ((...args: string[]) => T | Promise<T>);
}

/** Configuration for the withWebMCP Next.js plugin */
export interface WebMCPConfig {
  /**
   * Optional glob patterns to filter which routes are exposed.
   * If omitted, all routes with `export const tool` or `export const resource` are exposed.
   * Supports glob patterns like '/api/cart/**'
   */
  paths?: string[];
}

/** Internal representation of a discovered tool */
export interface DiscoveredTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  routePath: string;
  method: string;
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
