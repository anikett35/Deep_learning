import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const audits = await prisma.ownershipAudit.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, audits });
  } catch (error: any) {
    console.error("Error fetching certificates from PostgreSQL:", error);
    return NextResponse.json({ success: false, error: error.message, audits: [] });
  }
}
