import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "../../../db";

export async function POST(req: Request) {
  const { query } = await req.json();
  const results = db.products.search(query);
  return NextResponse.json({ results, count: results.length });
}

POST.tool = {
  description: "Search products by keyword",
  inputSchema: z.object({
    query: z.string().describe("Search keyword to match against product name or category"),
  }),
};
