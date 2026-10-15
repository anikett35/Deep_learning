import { NextResponse, NextRequest } from "next/server";
import fs from "fs";
import path from "path";

let cachedResponse: any = null;

function loadTriggerData() {
  const projectRoot = path.resolve(process.cwd(), "..");
  const manifestPath = path.join(projectRoot, "artifacts", "triggers", "trigger_manifest.json");
  const previewsDir = path.join(projectRoot, "artifacts", "triggers", "previews");

  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  const raw = fs.readFileSync(manifestPath, "utf-8");
  const manifest = JSON.parse(raw);

  // Map trigger items with lightweight preview URLs
  const enhancedTriggers = (manifest.triggers || []).map((t: any) => ({
    ...t,
    preview_url: `/api/triggers/preview/${t.trigger_id}`,
    thumbnail_base64: null,
  }));

  return {
    trigger_count: manifest.trigger_count ?? enhancedTriggers.length,
    target_class_name: manifest.target_class_name || "airplane",
    target_class_idx: manifest.target_class_idx ?? 0,
    patch_size: manifest.patch_size || "4x4",
    corner: manifest.corner || "bottom_right",
    pattern: manifest.pattern || "checkerboard",
    intensity: manifest.intensity ?? 1.0,
    sha256_fingerprint: manifest.sha256_fingerprint,
    hash_algorithm: manifest.hash_algorithm || "SHA-256",
    triggers: enhancedTriggers,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!forceRefresh && cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    const data = loadTriggerData();
    if (!data) {
      return NextResponse.json(
        { error: "Trigger manifest artifact not found", triggers: [] },
        { status: 404 }
      );
    }

    cachedResponse = data;
    return NextResponse.json(cachedResponse);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Forward to FastAPI backend
    const backendRes = await fetch("http://127.0.0.1:8000/api/v1/triggers/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.detail || `Backend generation failed with status ${backendRes.status}` },
        { status: backendRes.status }
      );
    }

    // Invalidate local memory cache
    cachedResponse = null;
    const refreshed = loadTriggerData();
    if (refreshed) {
      cachedResponse = refreshed;
    }

    return NextResponse.json({
      status: "SUCCESS",
      message: "Probes successfully regenerated",
      data: cachedResponse,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to trigger probe generation" },
      { status: 500 }
    );
  }
}

