import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_MODEL_API_URL || "http://127.0.0.1:8000";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role");
    const query = role ? `?role=${role}` : "";
    const res = await fetch(`${BACKEND_URL}/api/v1/models${query}`, { cache: "no-store" });
    if (!res.ok) {
        return NextResponse.json({ error: `Backend responded with ${res.status}` }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to reach model service" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/api/v1/models/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to register model" }, { status: 500 });
  }
}
