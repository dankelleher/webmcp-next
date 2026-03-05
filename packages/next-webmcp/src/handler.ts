import type {
  DiscoveredResource,
  DiscoveredTool,
  MCPManifest,
} from "./types.js";

/** Creates the MCP manifest response for /.well-known/mcp */
export const createManifestHandler = (manifest: MCPManifest) =>
  (): Response =>
    Response.json(manifest, {
      headers: { "Content-Type": "application/json" },
    });

/** Creates a handler that proxies tool calls to the actual API route */
export const createToolCallHandler = (tools: DiscoveredTool[]) =>
  async (req: Request): Promise<Response> => {
    const { name, arguments: args } = (await req.json()) as {
      name: string;
      arguments: Record<string, unknown>;
    };

    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      return Response.json(
        { error: `Unknown tool: ${name}` },
        { status: 404 }
      );
    }

    // Forward to the actual API route
    const url = new URL(tool.routePath, req.url);
    const response = await fetch(url, {
      method: tool.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });

    const result = await response.json();
    return Response.json({
      content: [{ type: "text", text: JSON.stringify(result) }],
    });
  };

/** Creates a handler that serves resource data */
export const createResourceHandler = (resources: DiscoveredResource[]) =>
  async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const uri = url.searchParams.get("uri");

    if (!uri) {
      return Response.json(
        { error: "Missing uri parameter" },
        { status: 400 }
      );
    }

    const resource = resources.find((r) => r.uriTemplate === uri || r.name === uri);
    if (!resource) {
      return Response.json(
        { error: `Unknown resource: ${uri}` },
        { status: 404 }
      );
    }

    // The actual data fetching is handled by the resource's data function,
    // which is loaded at runtime from the route module
    return Response.json({ uri, resource });
  };
