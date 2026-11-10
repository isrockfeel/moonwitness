import { NextResponse } from "next/server";
import { ok } from "@moonwitness/core";

export function GET() {
  return NextResponse.json(ok({ status: "healthy", timestamp: new Date().toISOString() }));
}
