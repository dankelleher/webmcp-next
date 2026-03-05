import { NextResponse } from "next/server";
import { db } from "../../db";
import type { ResourceDefinition } from "next-webmcp";

/** MCP Resource: current shopping cart contents with product details */
export const resource: ResourceDefinition = {
  description: "Current shopping cart contents with product details",
  data: () => {
    const items = db.cart.items();
    return items.map((item) => {
      const product = db.products.findById(item.productId);
      return {
        ...item,
        productName: product?.name ?? "Unknown",
        price: product?.price ?? 0,
        subtotal: (product?.price ?? 0) * item.quantity,
      };
    });
  },
};

export async function GET() {
  const items = db.cart.items();
  const enriched = items.map((item) => {
    const product = db.products.findById(item.productId);
    return {
      ...item,
      productName: product?.name ?? "Unknown",
      price: product?.price ?? 0,
      subtotal: (product?.price ?? 0) * item.quantity,
    };
  });
  const total = enriched.reduce((sum, item) => sum + item.subtotal, 0);
  return NextResponse.json({ items: enriched, total });
}
