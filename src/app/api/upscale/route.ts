import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

async function upscaleRealESRGAN(
  imageUrl: string,
  scale: 2 | 4,
  faceEnhance: boolean
): Promise<{ url: string; width: number; height: number }> {
  const model =
    scale === 4 ? "RealESRGAN_x4plus" : "RealESRGAN_x2plus";

  const result = await fal.subscribe("fal-ai/real-esrgan", {
    input: {
      image_url: imageUrl,
      scale,
      face_enhance: faceEnhance,
      model,
    },
    logs: false,
  });

  const data = result.data as { image: { url: string; width: number; height: number } };
  return data.image;
}

async function upscaleClipdrop(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const apiKey = process.env.CLIPDROP_API_KEY;
  if (!apiKey) throw new Error("CLIPDROP_API_KEY not configured");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to fetch source image for Clipdrop upscale");
  const imgBuffer = await imgRes.arrayBuffer();

  const formData = new FormData();
  formData.append(
    "image_file",
    new Blob([imgBuffer], { type: "image/png" }),
    "image.png"
  );
  formData.append("target_width", String(targetWidth));
  formData.append("target_height", String(targetHeight));

  const res = await fetch("https://clipdrop-api.co/image-upscaling/v1/upscale", {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Clipdrop upscale error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageUrl,
      targetScale = 2,
      faceEnhance = true,
      provider = "real-esrgan",
      originalWidth,
      originalHeight,
    }: {
      imageUrl: string;
      targetScale?: 2 | 4;
      faceEnhance?: boolean;
      provider?: "real-esrgan" | "clipdrop";
      originalWidth?: number;
      originalHeight?: number;
    } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    if (provider === "clipdrop") {
      if (!originalWidth || !originalHeight) {
        return NextResponse.json(
          { error: "originalWidth and originalHeight required for Clipdrop upscale" },
          { status: 400 }
        );
      }
      const resultUrl = await upscaleClipdrop(
        imageUrl,
        originalWidth * targetScale,
        originalHeight * targetScale
      );
      return NextResponse.json({
        resultUrl,
        originalSize: { width: originalWidth, height: originalHeight },
        outputSize: { width: originalWidth * targetScale, height: originalHeight * targetScale },
        scaleApplied: targetScale,
      });
    }

    const output = await upscaleRealESRGAN(imageUrl, targetScale, faceEnhance);
    return NextResponse.json({
      resultUrl: output.url,
      originalSize: { width: originalWidth ?? null, height: originalHeight ?? null },
      outputSize: { width: output.width, height: output.height },
      scaleApplied: targetScale,
    });
  } catch (err) {
    console.error("upscale error:", err);
    const msg = err instanceof Error ? err.message : "Upscaling failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
