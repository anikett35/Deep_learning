import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/verification/results`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend unreachable, attempt filesystem read
  }

  // Fallback to local artifact file
  const projectRoot = path.resolve(process.cwd(), "..");
  const resultsPath = path.join(
    projectRoot,
    "artifacts",
    "verification",
    "watermark_results.json"
  );

  if (fs.existsSync(resultsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json(
        { error: `Corrupt verification results file: ${e.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error:
        "No verification results found. Run statistical verification to generate results.",
      verified_models: {},
      trigger_response_matrix: [],
    },
    { status: 404 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "run";

    if (action === "verify-signature") {
      const res = await fetch(`${BACKEND_URL}/api/v1/verification/verify-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body.payload || body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // Default action: run live verification
    const res = await fetch(`${BACKEND_URL}/api/v1/verification/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    console.error("Verification proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute verification" },
      { status: 500 }
    );
  }
}
