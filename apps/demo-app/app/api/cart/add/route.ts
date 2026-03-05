import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../db";
import type { ToolDefinition } from "next-webmcp";

export const tool: ToolDefinition = {
  description: "Add a product to the shopping cart",
  inputSchema: z.object({
    productId: z.string().describe("The product ID to add"),
    quantity: z.number().describe("Number of items to add"),
  }),
};

export async function POST(req: Request) {
  const { productId, quantity } = await req.json();

  const product = db.products.findById(productId);
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const cart = db.cart.add(productId, quantity);
  return NextResponse.json({ cart, message: `Added ${quantity}x ${product.name} to cart` });
}
