import { NextResponse } from "next/server";
import { db } from "../../db";
import type { ResourceDefinition } from "next-webmcp";

/** MCP Resource: full product catalog (static-ish, no params) */
export const resource: ResourceDefinition = {
  description: "Full product catalog with all available products",
  data: async () => db.products.findMany(),
};

export async function GET() {
  const products = db.products.findMany();
  return NextResponse.json(products);
}
