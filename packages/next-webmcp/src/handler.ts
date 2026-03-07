import { join } from "node:path";
import { buildManifest } from "./scanner.js";
import type {
  MCPManifest,
  WebMCPConfig,
} from "./types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Cached manifest for production (scan once, serve forever) */
let cachedManifest: MCPManifest | undefined;

/** Cached registry loaded from the generated module */
let registry: Record<string, (...args: any[]) => any> | undefined;

const getManifest = async (): Promise<MCPManifest> => {
  if (!cachedManifest || process.env.NODE_ENV === "development") {
    const appDir = join(process.cwd(), "app");
    const config: WebMCPConfig = JSON.parse(
      process.env.WEBMCP_CONFIG ?? "{}"
    );
    cachedManifest = await buildManifest(appDir, config);
  }
  return cachedManifest;
};

const getRegistry = async (): Promise<Record<string, (...args: any[]) => any>> => {
  if (!registry) {
    const mod = await import("@webmcp/actions");
    registry = mod.actions;
  }
  return registry ?? {};
};

/** Strips internal fields before sending to client */
const toPublicManifest = (manifest: MCPManifest): MCPManifest => ({
  ...manifest,
  tools: manifest.tools.map(({ sourceFile: _s, exportName: _e, callStyle: _c, ...tool }) => tool),
  resources: manifest.resources.map(({ sourceFile: _s, dataExport: _d, ...resource }) => resource),
});

/**
 * Ready-made Next.js GET handler for the MCP manifest route.
 *
 * Usage — one line:
 * ```ts
 * // app/api/mcp/manifest/route.ts
 * export { GET, POST } from "next-webmcp";
 * ```
 */
export async function GET(): Promise<Response> {
  const manifest = await getManifest();
  return Response.json(toPublicManifest(manifest));
}

/**
 * POST handler that executes server actions and reads component resources.
 *
 * Action call: `{ name: "addToCart", input: { productId: "abc", quantity: 1 } }`
 * Resource read: `{ type: "resource", name: "cart" }`
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const manifest = await getManifest();
    const body = await req.json();
    const { name, input, type } = body;

    if (!name) {
      return Response.json(
        { error: "Missing name" },
        { status: 400 }
      );
    }

    const reg = await getRegistry();

    // Component resource read
    if (type === "resource") {
      const resourceMeta = manifest.resources.find((r) => r.name === name);
      if (!resourceMeta?.dataExport) {
        return Response.json(
          { error: `Unknown component resource: ${name}` },
          { status: 404 }
        );
      }
      const dataFn = reg[resourceMeta.dataExport];
      if (typeof dataFn !== "function") {
        return Response.json(
          { error: `Resource data function not found: ${resourceMeta.dataExport}` },
          { status: 404 }
        );
      }
      const data = await dataFn();
      return Response.json(data);
    }

    // Action execution
    const action = reg[name];

    if (typeof action !== "function") {
      return Response.json(
        { error: `Unknown action: ${name}` },
        { status: 404 }
      );
    }

    const toolMeta = manifest.tools.find((t) => t.name === name);

    if (toolMeta?.callStyle === "formData") {
      const formData = new FormData();
      for (const [key, value] of Object.entries(input ?? {})) {
        formData.append(key, String(value));
      }
      await action(formData);
    } else {
      const result = await action(input);
      if (result) return Response.json(result);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
