import { NextResponse } from "next/server";
import { getOverview } from "@/lib/analytics";

export async function GET() {
  return NextResponse.json(await getOverview());
}
