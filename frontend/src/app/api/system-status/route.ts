import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let apiOnline = false;
  let totalQueries = 0;
  let dbOnline = false;
  let savedAuditsCount = 0;

  // 1. Check Python ML Backend
  try {
    const res = await fetch("http://localhost:8000/metrics", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      apiOnline = true;
      totalQueries = data.total_queries || 0;
    }
  } catch {
    apiOnline = false;
  }

  // 2. Check PostgreSQL Database via Prisma
  try {
    savedAuditsCount = await prisma.ownershipAudit.count();
    dbOnline = true;
  } catch (err) {
    console.error("PostgreSQL connection notice:", err);
    dbOnline = false;
  }

  return NextResponse.json({
    status: "ok",
    apiOnline,
    totalQueries,
    dbOnline,
    savedAuditsCount,
    timestamp: new Date().toISOString(),
  });
}
