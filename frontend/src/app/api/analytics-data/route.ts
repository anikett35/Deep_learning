import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    const extractionPath = path.join(projectRoot, "artifacts", "extraction", "extraction_summary.json");
    const adaptivePath = path.join(projectRoot, "artifacts", "models", "adaptive_thief", "metrics.json");
    const statusPath = path.join(projectRoot, "artifacts", "experiment_status.json");

    let extractionData: Record<string, any> = {};
    let adaptiveData: any = null;
    let statusData: Record<string, string> = {};

    // 1. Try fetching from live FastAPI backend
    try {
      const extRes = await fetch("http://localhost:8000/api/v1/experiments/extraction", { cache: "no-store" });
      if (extRes.ok) {
        const arr = await extRes.json();
        for (const item of arr) {
          extractionData[String(item.budget)] = item;
        }
      }
      const adRes = await fetch("http://localhost:8000/api/v1/experiments/adaptive", { cache: "no-store" });
      if (adRes.ok) {
        adaptiveData = await adRes.json();
      }
      const stRes = await fetch("http://localhost:8000/api/v1/experiments/status", { cache: "no-store" });
      if (stRes.ok) {
        statusData = await stRes.json();
      }
    } catch {
      // Fallback to local files
    }

    // 2. Direct filesystem read
    if (Object.keys(extractionData).length === 0 && fs.existsSync(extractionPath)) {
      extractionData = JSON.parse(fs.readFileSync(extractionPath, "utf-8"));
    }
    if (!adaptiveData && fs.existsSync(adaptivePath)) {
      adaptiveData = JSON.parse(fs.readFileSync(adaptivePath, "utf-8"));
    }
    if (Object.keys(statusData).length === 0 && fs.existsSync(statusPath)) {
      statusData = JSON.parse(fs.readFileSync(statusPath, "utf-8"));
    }

    return NextResponse.json({
      extraction: extractionData,
      adaptive: adaptiveData,
      status: statusData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
