import { NextResponse } from "next/server";
import { db } from "../../../db";
import type { ResourceDefinition } from "next-webmcp";

/** MCP Resource: products filtered by category (dynamic resource template) */
export const resource: ResourceDefinition = {
  description: "Products filtered by category",
  data: async (category: string) => db.products.findMany({ category }),
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  const products = db.products.findMany({ category });
  return NextResponse.json(products);
}
