import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../db";
import type { ToolDefinition } from "next-webmcp";

export const tool: ToolDefinition = {
  description: "Remove a product from the shopping cart",
  inputSchema: z.object({
    productId: z.string().describe("The product ID to remove"),
  }),
};

export async function POST(req: Request) {
  const { productId } = await req.json();
  const cart = db.cart.remove(productId);
  return NextResponse.json({ cart, message: `Removed product ${productId} from cart` });
}
