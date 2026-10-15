import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectRoot = path.resolve(process.cwd(), "..");
    const previewPath = path.join(
      projectRoot,
      "artifacts",
      "triggers",
      "previews",
      `${id}.png`
    );

    if (!fs.existsSync(previewPath)) {
      return new NextResponse("Trigger preview not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(previewPath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error: any) {
    return new NextResponse("Error reading trigger image", { status: 500 });
  }
}
