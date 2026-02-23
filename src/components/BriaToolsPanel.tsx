"use client";

import { useState } from "react";

type BriaTool =
  | "replace_background"
  | "gen_fill"
  | "erase"
  | "enhance"
  | "expand"
  | "blur_background"
  | "erase_foreground"
  | "crop_foreground";

const TOOLS: { value: BriaTool; label: string; description: string }[] = [
  {
    value: "replace_background",
    label: "Replace Background",
    description: "Replace the background with a new scene described by text",
  },
  {
    value: "gen_fill",
    label: "Generative Fill",
    description: "Fill a masked area with AI-generated content",
  },
  {
    value: "erase",
    label: "Erase Object",
    description: "Remove objects from an image using a mask",
  },
  {
    value: "enhance",
    label: "Enhance",
    description: "Improve image quality and details",
  },
  {
    value: "expand",
    label: "Expand (Outpaint)",
    description: "Extend the image beyond its original borders",
  },
  {
    value: "blur_background",
    label: "Blur Background",
    description: "Blur the background while keeping the subject sharp",
  },
  {
    value: "erase_foreground",
    label: "Erase Foreground",
    description: "Remove the foreground subject and fill with background",
  },
  {
    value: "crop_foreground",
    label: "Crop Foreground",
    description: "Auto-crop to the main subject",
  },
];

interface Props {
  imageUrl: string;
  onResult: (resultUrl: string, tool: string) => void;
}

export default function BriaToolsPanel({ imageUrl, onResult }: Props) {
  const [tool, setTool] = useState<BriaTool>("replace_background");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tool-specific params
  const [prompt, setPrompt] = useState("");
  const [maskUrl, setMaskUrl] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [blurScale, setBlurScale] = useState(3);
  const [enhanceResolution, setEnhanceResolution] = useState("1MP");

  async function handleRun() {
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { action: tool, image: imageUrl };

      switch (tool) {
        case "replace_background":
          if (!prompt.trim()) {
            setError("Prompt is required for Replace Background");
            return;
          }
          body.prompt = prompt.trim();
          break;
        case "gen_fill":
          if (!prompt.trim() || !maskUrl.trim()) {
            setError("Prompt and mask URL are required for Generative Fill");
            return;
          }
          body.prompt = prompt.trim();
          body.mask = maskUrl.trim();
          break;
        case "erase":
          if (!maskUrl.trim()) {
            setError("Mask URL is required for Erase");
            return;
          }
          body.mask = maskUrl.trim();
          break;
        case "enhance":
          body.resolution = enhanceResolution;
          break;
        case "expand":
          body.aspect_ratio = aspectRatio;
          break;
        case "blur_background":
          body.scale = blurScale;
          break;
      }

      const res = await fetch("/api/bria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bria tool failed");
        return;
      }

      const resultUrl = data.result?.image_url ?? data.result?.url ?? "";
      if (!resultUrl) {
        setError("No image URL in Bria response");
        return;
      }
      onResult(resultUrl, tool);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const needsPrompt = tool === "replace_background" || tool === "gen_fill";
  const needsMask = tool === "gen_fill" || tool === "erase";

  return (
    <div className="flex flex-col gap-4">
      {/* Tool selector */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Tool
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <label
              key={t.value}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                tool === t.value
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="briaTool"
                value={t.value}
                checked={tool === t.value}
                onChange={() => setTool(t.value)}
                className="sr-only"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {t.label}
              </span>
              <span className="text-xs text-zinc-400">{t.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Prompt input */}
      {needsPrompt && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {tool === "replace_background" ? "Background Description" : "Fill Description"}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              tool === "replace_background"
                ? "A tropical beach at sunset with palm trees…"
                : "A red sports car parked on the street…"
            }
            rows={2}
            className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
        </div>
      )}

      {/* Mask URL input */}
      {needsMask && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Mask Image URL
          </label>
          <input
            type="text"
            value={maskUrl}
            onChange={(e) => setMaskUrl(e.target.value)}
            placeholder="URL to a black/white mask image (white = area to fill/erase)"
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <p className="text-xs text-zinc-400">
            White pixels = area to modify, black pixels = preserve
          </p>
        </div>
      )}

      {/* Expand settings */}
      {tool === "expand" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Target Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9"].map(
              (r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {/* Blur scale */}
      {tool === "blur_background" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Blur Intensity (1-5)
          </label>
          <input
            type="range"
            min={1}
            max={5}
            value={blurScale}
            onChange={(e) => setBlurScale(parseInt(e.target.value))}
            className="w-full"
          />
          <span className="text-xs text-zinc-400">Level {blurScale}</span>
        </div>
      )}

      {/* Enhance settings */}
      {tool === "enhance" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Output Resolution
          </label>
          <select
            value={enhanceResolution}
            onChange={(e) => setEnhanceResolution(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="1MP">1 MP</option>
            <option value="2MP">2 MP</option>
            <option value="4MP">4 MP</option>
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handleRun}
        disabled={loading}
        className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading
          ? "Processing…"
          : `Run ${TOOLS.find((t) => t.value === tool)?.label ?? tool}`}
      </button>
    </div>
  );
}
