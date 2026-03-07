"use client";

import { useEffect, useRef } from "react";
import type { DiscoveredTool, DiscoveredResource, MCPManifest } from "./types.js";

interface ModelContextTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: readonly string[] | string[];
  };
  execute: (inputs: Record<string, string>) => Promise<{
    content: Array<{ type: string; text: string }>;
  }>;
}

interface ModelContext {
  registerTool: (tool: ModelContextTool) => void;
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
}

interface WebMCPScriptProps {
  /** Path to the MCP manifest endpoint. Defaults to "/api/mcp/manifest" */
  manifestPath?: string;
}

/** Waits for navigator.modelContext to become available (browser or polyfill) */
const waitForModelContext = (): Promise<ModelContext> =>
  new Promise((resolve) => {
    if (navigator.modelContext) {
      resolve(navigator.modelContext);
      return;
    }
    const interval = setInterval(() => {
      if (navigator.modelContext) {
        clearInterval(interval);
        resolve(navigator.modelContext);
      }
    }, 100);
    // Stop polling after 10s
    setTimeout(() => clearInterval(interval), 10_000);
  });

/** Builds an execute function for a tool that proxies to its API route */
const createToolExecutor =
  (tool: DiscoveredTool, manifestPath: string) =>
  async (inputs: Record<string, string>) => {
    // Action tools POST to the manifest endpoint with name + input
    if (tool.kind === "action") {
      const res = await fetch(manifestPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tool.name, input: inputs }),
      });
      const data = await res.json();
      return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
    }

    // Route tools POST directly to their API route
    const res = await fetch(tool.routePath, {
      method: tool.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputs),
    });
    const data = await res.json();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
  };

/** Extracts template param names from a URI template like "products/{category}" */
const extractTemplateParams = (uriTemplate: string): string[] => {
  const params: string[] = [];
  const re = /\{(\w+)\}/g;
  let match;
  while ((match = re.exec(uriTemplate)) !== null) {
    params.push(match[1]);
  }
  return params;
};

/** Builds an execute function for a resource that fetches its data */
const createResourceExecutor =
  (resource: DiscoveredResource, manifestPath: string) =>
  async (inputs: Record<string, string>) => {
    // Component resources are served via POST to the manifest endpoint
    if (resource.kind === "component") {
      const res = await fetch(manifestPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "resource", name: resource.name }),
      });
      const data = await res.json();
      return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
    }

    // Route resources fetch from their API endpoint
    let uri = resource.uriTemplate;
    for (const param of extractTemplateParams(resource.uriTemplate)) {
      uri = uri.replace(`{${param}}`, encodeURIComponent(inputs[param] ?? ""));
    }
    const res = await fetch(`/${uri}`);
    const data = await res.json();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
  };

/** Builds a JSON Schema for a resource's template params */
const buildResourceInputSchema = (resource: DiscoveredResource) => {
  const params = extractTemplateParams(resource.uriTemplate);
  if (params.length === 0) return { type: "object" as const, properties: {} };

  return {
    type: "object" as const,
    properties: Object.fromEntries(params.map((p) => [p, { type: "string" }])),
    required: params,
  };
};

/** Registers all tools and resources from the manifest with navigator.modelContext */
const registerManifest = (mc: ModelContext, manifest: MCPManifest, manifestPath: string) => {
  for (const tool of manifest.tools) {
    mc.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: createToolExecutor(tool, manifestPath),
    });
  }

  for (const resource of manifest.resources) {
    mc.registerTool({
      name: `get_${resource.name}`,
      description: `Get resource: ${resource.description}`,
      inputSchema: buildResourceInputSchema(resource),
      execute: createResourceExecutor(resource, manifestPath),
    });
  }

  console.log(
    `[next-webmcp] Registered ${manifest.tools.length} tools and ${manifest.resources.length} resources with navigator.modelContext`
  );
};

/**
 * Client component that registers all MCP tools and resources
 * with the browser's navigator.modelContext API.
 *
 * Usage:
 * ```tsx
 * import { WebMCPScript } from 'next-webmcp';
 * <WebMCPScript />
 * ```
 */
export const WebMCPScript = ({
  manifestPath = "/api/mcp/manifest",
}: WebMCPScriptProps) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      const res = await fetch(manifestPath);
      const manifest: MCPManifest = await res.json();
      const mc = await waitForModelContext();
      registerManifest(mc, manifest, manifestPath);
    })();
  }, [manifestPath]);

  return null;
};
