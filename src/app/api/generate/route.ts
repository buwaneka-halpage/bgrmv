import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import type { NanoBananaProInput } from "@fal-ai/client/endpoints";

fal.config({ credentials: process.env.FAL_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      aspectRatio = "1:1",
      resolution = "2K",
      numImages = 1,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const input: NanoBananaProInput = {
      prompt: prompt.trim(),
      num_images: numImages,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: "png",
    };

    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await fal.subscribe("fal-ai/nano-banana-pro", {
          input,
          logs: false,
        });

        const data = result.data;

        return NextResponse.json({
          images: data.images.map((img) => ({
            url: img.url,
            width: img.width ?? 0,
            height: img.height ?? 0,
          })),
        });
      } catch (err: unknown) {
        lastError = err;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
        }
      }
    }

    console.error("generate error:", lastError);
    const msg =
      lastError instanceof Error ? lastError.message : "Generation failed";
    const status = msg.includes("safety") ? 422 : 500;
    return NextResponse.json({ error: msg }, { status });
  } catch (err) {
    console.error("generate parse error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
