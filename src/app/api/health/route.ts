import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "voidexx-web",
    version: process.env.npm_package_version ?? "0.1.0",
    time: new Date().toISOString(),
  });
}
