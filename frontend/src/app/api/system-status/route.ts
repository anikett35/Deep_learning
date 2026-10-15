import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_MODEL_API_URL || "http://127.0.0.1:8000";

export async function GET() {
  let apiOnline = false;
  let totalQueries = 0;
  let dbOnline = false;
  let savedAuditsCount = 0;
  let telemetry: any = null;

  // 1. Fetch telemetry & metrics from Python FastAPI Backend
  try {
    const [metricsRes, telemRes] = await Promise.all([
      fetch(`${BACKEND_URL}/metrics`, { cache: "no-store" }).catch(() => null),
      fetch(`${BACKEND_URL}/system/telemetry`, { cache: "no-store" }).catch(() => null),
    ]);

    if (metricsRes && metricsRes.ok) {
      const data = await metricsRes.json().catch(() => ({}));
      apiOnline = true;
      totalQueries = data.total_inference_queries || data.total_queries || 0;
    }

    if (telemRes && telemRes.ok) {
      telemetry = await telemRes.json().catch(() => null);
      apiOnline = true;
      if (telemetry?.database?.online) {
        dbOnline = true;
        savedAuditsCount = telemetry.database.certificates_count || telemetry.database.audit_events_count || 0;
      }
    }
  } catch (err: any) {
    console.warn("Backend telemetry error:", err.message);
    apiOnline = false;
  }

  // 2. Check PostgreSQL Database via Prisma if not already confirmed
  if (!dbOnline) {
    try {
      savedAuditsCount = await prisma.ownershipAudit.count();
      dbOnline = true;
    } catch (err: any) {
      console.warn("Prisma connection notice:", err.message);
      dbOnline = false;
    }
  }

  return NextResponse.json({
    status: "ok",
    apiOnline,
    totalQueries,
    dbOnline,
    savedAuditsCount,
    telemetry,
    timestamp: new Date().toISOString(),
  });
}
