import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const projectRoot = path.resolve(process.cwd(), "..");
    const manifestPath = path.join(projectRoot, "artifacts", "triggers", "trigger_manifest.json");
    const previewsDir = path.join(projectRoot, "artifacts", "triggers", "previews");

    if (!fs.existsSync(manifestPath)) {
      return NextResponse.json(
        { error: "Trigger manifest artifact not found", triggers: [] },
        { status: 404 }
      );
    }

    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    // Attach base64 thumbnails for the first 24 triggers for high-speed client rendering
    const enhancedTriggers = manifest.triggers.slice(0, 48).map((t: any) => {
      const imgName = `${t.trigger_id}.png`;
      const imgPath = path.join(previewsDir, imgName);
      let base64 = null;
      if (fs.existsSync(imgPath)) {
        base64 = `data:image/png;base64,${fs.readFileSync(imgPath).toString("base64")}`;
      }
      return {
        ...t,
        thumbnail_base64: base64,
      };
    });

    return NextResponse.json({
      trigger_count: manifest.trigger_count,
      target_class_name: manifest.target_class_name,
      target_class_idx: manifest.target_class_idx,
      patch_size: manifest.patch_size,
      corner: manifest.corner,
      pattern: manifest.pattern,
      intensity: manifest.intensity,
      sha256_fingerprint: manifest.sha256_fingerprint,
      hash_algorithm: manifest.hash_algorithm,
      triggers: enhancedTriggers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
