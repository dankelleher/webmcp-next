import { NextResponse } from "next/server";
import { db } from "../../../db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ category: string }> }
) {
  const { category } = await params;
  return NextResponse.json(await db.products.findMany({ category }));
}

GET.resource = { description: "Products filtered by category" };
