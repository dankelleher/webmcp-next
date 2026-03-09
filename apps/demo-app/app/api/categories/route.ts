import { NextResponse } from "next/server";
import { db } from "../../db";

/** Un-annotated route — auto-discovered as a resource without .resource metadata */
export async function GET() {
  const categories = [...new Set(db.products.findMany().map((p) => p.category))];
  return NextResponse.json(categories);
}
