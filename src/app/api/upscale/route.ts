import { fal } from "@fal-ai/client";
import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

// --- fal.ai Real-ESRGAN ---
async function upscaleRealESRGAN(
  imageUrl: string,
  scale: 2 | 4,
  faceEnhance: boolean
): Promise<{ url: string; width: number; height: number }> {
  const model = scale === 4 ? "RealESRGAN_x4plus" : "RealESRGAN_x2plus";

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

// --- Replicate Real-ESRGAN ---
async function upscaleReplicateESRGAN(
  imageUrl: string,
  scale: 2 | 4,
  faceEnhance: boolean
): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  const output = await replicate.run("nightmareai/real-esrgan", {
    input: {
      image: imageUrl,
      scale,
      face_enhance: faceEnhance,
    },
  });

  if (typeof output === "string") return output;
  const fileOutput = output as { url(): URL };
  if (typeof fileOutput.url === "function") return fileOutput.url().toString();

  throw new Error("Unexpected Replicate ESRGAN response format");
}

// --- Bria Increase Resolution ---
async function upscaleBria(
  imageUrl: string,
  scale: 2 | 4
): Promise<string> {
  const apiToken = process.env.BRIA_API_TOKEN;
  if (!apiToken) throw new Error("BRIA_API_TOKEN not configured");

  // Bria accepts raw base64 without the data URL prefix
  let image = imageUrl;
  if (image.startsWith("data:")) {
    image = image.replace(/^data:image\/\w+;base64,/, "");
  }

  const res = await fetch(
    "https://engine.prod.bria-api.com/v2/image/edit/increase_resolution",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_token: apiToken,
      },
      body: JSON.stringify({
        image,
        desired_increase: scale,
        sync: true,
      }),
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message ?? `Bria error ${res.status}`);
  }

  const data = await res.json();
  return data.result?.image_url ?? "";
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
      provider?: "real-esrgan" | "replicate-esrgan" | "bria";
      originalWidth?: number;
      originalHeight?: number;
    } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    if (provider === "bria") {
      const resultUrl = await upscaleBria(imageUrl, targetScale);
      return NextResponse.json({
        resultUrl,
        originalSize: { width: originalWidth ?? null, height: originalHeight ?? null },
        outputSize: {
          width: (originalWidth ?? 0) * targetScale,
          height: (originalHeight ?? 0) * targetScale,
        },
        scaleApplied: targetScale,
      });
    }

    if (provider === "replicate-esrgan") {
      const resultUrl = await upscaleReplicateESRGAN(imageUrl, targetScale, faceEnhance);
      return NextResponse.json({
        resultUrl,
        originalSize: { width: originalWidth ?? null, height: originalHeight ?? null },
        outputSize: {
          width: (originalWidth ?? 0) * targetScale,
          height: (originalHeight ?? 0) * targetScale,
        },
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
