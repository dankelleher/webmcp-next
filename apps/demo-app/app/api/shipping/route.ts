import { NextResponse } from "next/server";
import { db } from "../../db";
import type { ResourceDefinition } from "next-webmcp";

/** MCP Resource: static list of supported shipping regions */
export const resource: ResourceDefinition<string[]> = {
  description: "Supported shipping regions",
  data: db.shippingRegions,
};

export async function GET() {
  return NextResponse.json(db.shippingRegions);
}
