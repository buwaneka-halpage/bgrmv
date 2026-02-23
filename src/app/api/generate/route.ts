import { fal } from "@fal-ai/client";
import { InferenceClient } from "@huggingface/inference";
import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import type { NanoBananaProInput } from "@fal-ai/client/endpoints";

fal.config({ credentials: process.env.FAL_KEY });

type GenerationProvider = "fal" | "replicate-flux-schnell" | "hf-flux" | "bria" | "bria-lite";

interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

// --- fal.ai nano-banana-pro ---
async function generateFal(
  prompt: string,
  aspectRatio: string,
  resolution: string,
  numImages: number
): Promise<GeneratedImage[]> {
  const input: NanoBananaProInput = {
    prompt,
    num_images: numImages,
    aspect_ratio: aspectRatio as NanoBananaProInput["aspect_ratio"],
    resolution: resolution as NanoBananaProInput["resolution"],
    output_format: "png",
  };

  const result = await fal.subscribe("fal-ai/nano-banana-pro", {
    input,
    logs: false,
  });

  return result.data.images.map((img) => ({
    url: img.url,
    width: img.width ?? 0,
    height: img.height ?? 0,
  }));
}

// --- Replicate Flux Schnell ---
async function generateReplicateFlux(
  prompt: string,
  aspectRatio: string,
  numImages: number
): Promise<GeneratedImage[]> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  const output = await replicate.run("black-forest-labs/flux-schnell", {
    input: {
      prompt,
      num_outputs: numImages,
      aspect_ratio: aspectRatio,
      output_format: "png",
    },
  });

  const items = output as Array<{ url(): URL } | string>;
  return items.map((item) => ({
    url: typeof item === "string" ? item : item.url().toString(),
    width: 0,
    height: 0,
  }));
}

// --- Bria FIBO ---
async function generateBria(
  prompt: string,
  aspectRatio: string,
  lite: boolean
): Promise<GeneratedImage[]> {
  const apiToken = process.env.BRIA_API_TOKEN;
  if (!apiToken) throw new Error("BRIA_API_TOKEN not configured");

  const endpoint = lite ? "/image/generate/lite" : "/image/generate";
  const body: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    sync: true,
  };
  if (!lite) body.resolution = "1MP";

  const res = await fetch(`https://engine.prod.bria-api.com/v2${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      api_token: apiToken,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.error?.message ?? `Bria error ${res.status}`);
  }

  const data = await res.json();
  const imageUrl: string = data.result?.image_url ?? data.result?.url ?? "";
  if (!imageUrl) throw new Error("No image URL in Bria response");

  return [{ url: imageUrl, width: 0, height: 0 }];
}

// --- Hugging Face FLUX.1-dev ---
async function generateHfFlux(prompt: string): Promise<GeneratedImage[]> {
  const hf = new InferenceClient(process.env.HF_TOKEN);

  const result = await hf.textToImage({
    model: "black-forest-labs/FLUX.1-dev",
    inputs: prompt,
    parameters: { num_inference_steps: 28 },
  });

  // SDK returns a URL string
  return [{ url: result, width: 0, height: 0 }];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      prompt,
      aspectRatio = "1:1",
      resolution = "2K",
      numImages = 1,
      provider = "fal" as GenerationProvider,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    let images: GeneratedImage[];
    let lastError: unknown;

    switch (provider) {
      case "replicate-flux-schnell":
        images = await generateReplicateFlux(prompt.trim(), aspectRatio, numImages);
        break;

      case "hf-flux":
        images = await generateHfFlux(prompt.trim());
        break;

      case "bria":
        images = await generateBria(prompt.trim(), aspectRatio, false);
        break;

      case "bria-lite":
        images = await generateBria(prompt.trim(), aspectRatio, true);
        break;

      case "fal":
      default:
        // retry up to 3 times for fal.ai
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            images = await generateFal(prompt.trim(), aspectRatio, resolution, numImages);
            return NextResponse.json({ images });
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
        return NextResponse.json({ error: msg }, { status: msg.includes("safety") ? 422 : 500 });
    }

    return NextResponse.json({ images });
  } catch (err) {
    console.error("generate error:", err);
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
