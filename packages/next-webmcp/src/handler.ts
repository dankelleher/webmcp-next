import { join } from "node:path";
import { buildManifest } from "./scanner.js";
import type {
  MCPManifest,
  WebMCPConfig,
} from "./types.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Cached manifest for production (scan once, serve forever) */
let cachedManifest: MCPManifest | undefined;

/** Cached action registry loaded from the generated module */
let actionRegistry: Record<string, (...args: any[]) => any> | undefined;

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

const getActions = async (): Promise<Record<string, (...args: any[]) => any>> => {
  if (!actionRegistry) {
    const mod = await import("@webmcp/actions");
    actionRegistry = mod.actions;
  }
  return actionRegistry ?? {};
};

/** Strips internal fields (sourceFile, exportName, callStyle) before sending to client */
const toPublicManifest = (manifest: MCPManifest): MCPManifest => ({
  ...manifest,
  tools: manifest.tools.map(({ sourceFile: _s, exportName: _e, callStyle: _c, ...tool }) => tool),
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
 * POST handler that executes server actions by name.
 * Actions are loaded from the generated module (static imports via bundler alias).
 *
 * Request body: `{ name: "addToCart", input: { productId: "abc", quantity: 1 } }`
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const manifest = await getManifest();
    const { name, input } = await req.json();

    if (!name) {
      return Response.json(
        { error: "Missing action name" },
        { status: 400 }
      );
    }

    const actions = await getActions();
    const action = actions[name];

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
