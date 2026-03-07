"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { mcp } from "next-webmcp";
import { db } from "../db";
import { actionClient } from "../lib/safe-action";

/**
 * Add to cart — uses next-safe-action + withMCP.
 * The schema is captured automatically by the withMCP proxy.
 * The description is passed via .use(mcp({...})) middleware.
 */
export const addToCart = actionClient
  .use(mcp({ description: "Add a product to the shopping cart" }))
  .inputSchema(z.object({
    productId: z.string().describe("The product ID to add"),
    quantity: z.number().describe("Number of items to add"),
  }))
  .action(async ({ parsedInput: { productId, quantity } }) => {
    db.cart.add(productId, quantity);
    revalidatePath("/");
  });

/** Form-compatible wrapper for addToCart — used by server component forms */
export async function addToCartForm(formData: FormData) {
  await addToCart({
    productId: formData.get("productId") as string,
    quantity: Number(formData.get("quantity") ?? 1),
  });
}

/**
 * Remove from cart — uses the explicit property pattern.
 * The schema is specified directly on the function via .tool.
 */
export async function removeFromCart(formData: FormData) {
  const productId = formData.get("productId") as string;
  db.cart.remove(productId);
  revalidatePath("/");
}

removeFromCart.tool = {
  description: "Remove a product from the shopping cart",
  inputSchema: z.object({
    productId: z.string().describe("The product ID to remove"),
  }),
};
