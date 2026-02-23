import { fal } from "@fal-ai/client";
import { InferenceClient } from "@huggingface/inference";
import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

type Provider = "birefnet" | "bria" | "removebg" | "hf-rmbg" | "replicate-rembg" | "bria-rmbg";
type BiRefNetModel = "General Use (Light)" | "General Use (Heavy)" | "Portrait";

// --- fal.ai BiRefNet v2 ---
async function removeBiRefNet(
  imageUrl: string,
  model: BiRefNetModel = "General Use (Heavy)"
): Promise<string> {
  const result = await fal.subscribe("fal-ai/birefnet", {
    input: {
      image_url: imageUrl,
      model,
      operating_resolution: "1024x1024",
      output_format: "png",
    },
    logs: false,
  });
  return result.data.image.url;
}

// --- fal.ai BRIA RMBG-2.0 ---
async function removeBria(imageUrl: string): Promise<string> {
  const result = await fal.subscribe("fal-ai/bria/rmbg", {
    input: { image_url: imageUrl },
    logs: false,
  });
  const data = result.data as { image: { url: string } };
  return data.image.url;
}

// --- Remove.bg ---
async function removeRemoveBg(imageUrl: string): Promise<string> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) throw new Error("REMOVE_BG_API_KEY not configured");

  const formData = new FormData();
  if (imageUrl.startsWith("data:")) {
    // For data URLs, decode and send as image_file
    const base64 = imageUrl.replace(/^data:image\/\w+;base64,/, "");
    const binary = Buffer.from(base64, "base64");
    formData.append("image_file", new Blob([binary]), "image.png");
  } else {
    formData.append("image_url", imageUrl);
  }
  formData.append("size", "auto");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`remove.bg error ${res.status}: ${errText}`);
  }

  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/png;base64,${base64}`;
}

// --- Hugging Face RMBG-2.0 ---
async function removeHfRmbg(imageUrl: string): Promise<string> {
  const hf = new InferenceClient(process.env.HF_TOKEN);

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to fetch source image for HF");
  const imgBlob = await imgRes.blob();

  const resultBlob = await hf.imageSegmentation({
    model: "briaai/RMBG-2.0",
    inputs: imgBlob,
  });

  if (resultBlob instanceof Blob) {
    const buffer = Buffer.from(await resultBlob.arrayBuffer());
    const base64 = buffer.toString("base64");
    return `data:image/png;base64,${base64}`;
  }

  throw new Error("Unexpected HF RMBG-2.0 response format");
}

// --- Replicate rembg ---
async function removeReplicateRembg(imageUrl: string): Promise<string> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

  const output = await replicate.run("cjwbw/rembg", {
    input: { image: imageUrl },
  });

  if (typeof output === "string") return output;
  const fileOutput = output as { url(): URL };
  if (typeof fileOutput.url === "function") return fileOutput.url().toString();

  throw new Error("Unexpected Replicate rembg response format");
}

// --- Bria RMBG-2.0 (direct API) ---
async function removeBriaRmbg(imageUrl: string): Promise<string> {
  const apiToken = process.env.BRIA_API_TOKEN;
  if (!apiToken) throw new Error("BRIA_API_TOKEN not configured");

  // Bria accepts raw base64 without the data URL prefix
  let image = imageUrl;
  if (image.startsWith("data:")) {
    image = image.replace(/^data:image\/\w+;base64,/, "");
  }

  const res = await fetch(
    "https://engine.prod.bria-api.com/v2/image/edit/remove_background",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        api_token: apiToken,
      },
      body: JSON.stringify({ image, sync: true }),
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
      provider = "birefnet",
      options = {},
    }: {
      imageUrl: string;
      provider: Provider;
      options?: { birefnetModel?: BiRefNetModel };
    } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    let resultUrl: string;

    switch (provider) {
      case "birefnet":
        resultUrl = await removeBiRefNet(imageUrl, options.birefnetModel);
        break;
      case "bria":
        resultUrl = await removeBria(imageUrl);
        break;
      case "removebg":
        resultUrl = await removeRemoveBg(imageUrl);
        break;
      case "hf-rmbg":
        resultUrl = await removeHfRmbg(imageUrl);
        break;
      case "replicate-rembg":
        resultUrl = await removeReplicateRembg(imageUrl);
        break;
      case "bria-rmbg":
        resultUrl = await removeBriaRmbg(imageUrl);
        break;
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }

    return NextResponse.json({ resultUrl, provider });
  } catch (err) {
    console.error("remove-background error:", err);
    const msg = err instanceof Error ? err.message : "Background removal failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
