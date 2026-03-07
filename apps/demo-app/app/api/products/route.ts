import { NextResponse } from "next/server";
import { db } from "../../db";

export async function GET() {
  return NextResponse.json(await db.products.findMany());
}

GET.resource = { description: "Full product catalog with all available products" };
