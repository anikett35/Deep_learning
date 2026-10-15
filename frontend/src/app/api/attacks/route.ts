import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_MODEL_API_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/attacks/benchmark`, { cache: "no-store" });
    if (!res.ok) {
        return NextResponse.json({ error: `Backend responded with ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch attack benchmarks" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/attacks/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to trigger benchmark" }, { status: 500 });
  }
}
