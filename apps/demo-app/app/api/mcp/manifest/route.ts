import { NextResponse } from "next/server";
import path from "node:path";
import { buildManifest } from "next-webmcp";
import type { MCPManifest } from "next-webmcp";

/** Cache the manifest in production (scan once, serve forever) */
let cachedManifest: MCPManifest | undefined;

export async function GET() {
  if (!cachedManifest || process.env.NODE_ENV === "development") {
    const appDir = path.join(process.cwd(), "app");
    const config = JSON.parse(process.env.WEBMCP_CONFIG ?? "{}");
    cachedManifest = await buildManifest(appDir, config);
  }

  return NextResponse.json(cachedManifest);
}
