import { NextRequest, NextResponse } from "next/server";

const BRIA_BASE = "https://engine.prod.bria-api.com/v2";

/** Bria API accepts raw base64 without the data URL prefix */
function stripDataUrlPrefix(input: string): string {
  if (input.startsWith("data:")) {
    return input.replace(/^data:image\/\w+;base64,/, "");
  }
  return input;
}

type BriaAction =
  | "generate"
  | "generate_lite"
  | "remove_background"
  | "replace_background"
  | "gen_fill"
  | "erase"
  | "enhance"
  | "expand"
  | "blur_background"
  | "increase_resolution"
  | "crop_foreground"
  | "erase_foreground";

const ACTION_PATHS: Record<BriaAction, string> = {
  generate: "/image/generate",
  generate_lite: "/image/generate/lite",
  remove_background: "/image/edit/remove_background",
  replace_background: "/image/edit/replace_background",
  gen_fill: "/image/edit/gen_fill",
  erase: "/image/edit/erase",
  enhance: "/image/edit/enhance",
  expand: "/image/edit/expand",
  blur_background: "/image/edit/blur_background",
  increase_resolution: "/image/edit/increase_resolution",
  crop_foreground: "/image/edit/crop_foreground",
  erase_foreground: "/image/edit/erase_foreground",
};

async function callBria(
  action: BriaAction,
  params: Record<string, unknown>
): Promise<{ image_url: string; [key: string]: unknown }> {
  const apiToken = process.env.BRIA_API_TOKEN;
  if (!apiToken) throw new Error("BRIA_API_TOKEN not configured");

  const path = ACTION_PATHS[action];
  if (!path) throw new Error(`Unknown Bria action: ${action}`);

  const body: Record<string, unknown> = { ...params, sync: true };

  // Strip data URL prefix from image fields — Bria expects raw base64
  for (const key of ["image", "mask"]) {
    if (typeof body[key] === "string" && (body[key] as string).startsWith("data:")) {
      body[key] = stripDataUrlPrefix(body[key] as string);
    }
  }

  const res = await fetch(`${BRIA_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      api_token: apiToken,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const msg =
      errData?.error?.message ?? errData?.message ?? `Bria API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.result ?? data;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body as {
      action: BriaAction;
      [key: string]: unknown;
    };

    if (!action || !ACTION_PATHS[action]) {
      return NextResponse.json(
        { error: `Invalid action. Valid: ${Object.keys(ACTION_PATHS).join(", ")}` },
        { status: 400 }
      );
    }

    const result = await callBria(action, params);
    return NextResponse.json({ result, action });
  } catch (err) {
    console.error("bria error:", err);
    const msg = err instanceof Error ? err.message : "Bria API call failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
