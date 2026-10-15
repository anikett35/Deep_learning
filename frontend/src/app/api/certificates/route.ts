import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET() {
  let backendCerts: any[] = [];
  let prismaAudits: any[] = [];

  // 1. Fetch from FastAPI backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/verification/certificates`, {
      cache: "no-store",
    });
    if (res.ok) {
      backendCerts = await res.json();
    }
  } catch {
    // Backend offline fallback
  }

  // 2. Fallback to reading artifact certificate files if backend didn't return any
  if (backendCerts.length === 0) {
    try {
      const projectRoot = path.resolve(process.cwd(), "..");
      const certDir = path.join(projectRoot, "artifacts", "verification");
      if (fs.existsSync(certDir)) {
        const files = fs.readdirSync(certDir).filter((f) => f.startsWith("certificate_") && f.endsWith(".json"));
        for (const file of files) {
          try {
            const raw = fs.readFileSync(path.join(certDir, file), "utf-8");
            backendCerts.push(JSON.parse(raw));
          } catch {}
        }
      }
    } catch {}
  }

  // 3. Fetch from Prisma database
  try {
    prismaAudits = await prisma.ownershipAudit.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (err: any) {
    console.warn("Prisma fetch notice (non-fatal):", err.message);
  }

  return NextResponse.json({
    success: true,
    certificates: backendCerts,
    audits: prismaAudits,
  });
}
