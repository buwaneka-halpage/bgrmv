import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";

fal.config({ credentials: process.env.FAL_KEY });

type ServerProvider = "birefnet" | "bria" | "removebg" | "clipdrop";
type Provider = ServerProvider | "imgly";

type BiRefNetModel = "General Use (Light)" | "General Use (Heavy)" | "Portrait";

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

async function removeBria(imageUrl: string): Promise<string> {
  const result = await fal.subscribe("fal-ai/bria/rmbg", {
    input: { image_url: imageUrl },
    logs: false,
  });
  const data = result.data as { image: { url: string } };
  return data.image.url;
}

async function removeRemoveBg(imageUrl: string): Promise<string> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) throw new Error("REMOVE_BG_API_KEY not configured");

  const formData = new FormData();
  formData.append("image_url", imageUrl);
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

async function removeClipdrop(imageUrl: string): Promise<string> {
  const apiKey = process.env.CLIPDROP_API_KEY;
  if (!apiKey) throw new Error("CLIPDROP_API_KEY not configured");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to fetch source image for Clipdrop");
  const imgBuffer = await imgRes.arrayBuffer();

  const formData = new FormData();
  formData.append(
    "image_file",
    new Blob([imgBuffer], { type: "image/png" }),
    "image.png"
  );

  const res = await fetch("https://clipdrop-api.co/remove-background/v1", {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Clipdrop error ${res.status}: ${errText}`);
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
      case "clipdrop":
        resultUrl = await removeClipdrop(imageUrl);
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
