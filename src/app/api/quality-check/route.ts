import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";

async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function suggestedScale(width: number, height: number): 2 | 4 {
  const maxDim = Math.max(width, height);
  return maxDim < 512 ? 4 : 2;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originalImageUrl,
      processedImageUrl,
    }: {
      originalImageUrl: string;
      processedImageUrl: string;
    } = body;

    if (!originalImageUrl || !processedImageUrl) {
      return NextResponse.json(
        { error: "originalImageUrl and processedImageUrl are required" },
        { status: 400 }
      );
    }

    const [origBuffer, procBuffer] = await Promise.all([
      fetchImageBuffer(originalImageUrl),
      fetchImageBuffer(processedImageUrl),
    ]);

    const [origMeta, procMeta] = await Promise.all([
      sharp(origBuffer).metadata(),
      sharp(procBuffer).metadata(),
    ]);

    const origPx = (origMeta.width ?? 0) * (origMeta.height ?? 0);
    const procPx = (procMeta.width ?? 0) * (procMeta.height ?? 0);
    const qualityRatio = origPx > 0 ? procPx / origPx : 1;

    const hasTransparency =
      procMeta.hasAlpha === true && procMeta.channels === 4;

    // Minimum file size sanity check: width * height * 0.5 bytes
    const minExpectedSize = procPx * 0.5;
    const fileSizeOk = procBuffer.byteLength >= minExpectedSize;

    const passed = qualityRatio >= 0.8 && hasTransparency && fileSizeOk;

    let recommendation: "upscale" | "retry" | "ok";
    if (!fileSizeOk) {
      recommendation = "retry";
    } else if (qualityRatio < 0.8) {
      recommendation = "upscale";
    } else if (!hasTransparency) {
      recommendation = "retry";
    } else {
      recommendation = "ok";
    }

    const response: {
      passed: boolean;
      qualityRatio: number;
      hasTransparency: boolean;
      recommendation: "upscale" | "retry" | "ok";
      suggestedScale?: 2 | 4;
      originalSize: { width: number; height: number };
      outputSize: { width: number; height: number };
    } = {
      passed,
      qualityRatio,
      hasTransparency,
      recommendation,
      originalSize: { width: origMeta.width ?? 0, height: origMeta.height ?? 0 },
      outputSize: { width: procMeta.width ?? 0, height: procMeta.height ?? 0 },
    };

    if (recommendation === "upscale") {
      response.suggestedScale = suggestedScale(
        procMeta.width ?? 0,
        procMeta.height ?? 0
      );
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("quality-check error:", err);
    const msg = err instanceof Error ? err.message : "Quality check failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
