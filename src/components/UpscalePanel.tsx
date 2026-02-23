"use client";

import { useState } from "react";

interface Props {
  imageUrl: string;
  originalWidth?: number;
  originalHeight?: number;
  suggestedScale?: 2 | 4;
  onUpscaled: (resultUrl: string, outputWidth: number, outputHeight: number) => void;
}

export default function UpscalePanel({
  imageUrl,
  originalWidth,
  originalHeight,
  suggestedScale = 2,
  onUpscaled,
}: Props) {
  const [scale, setScale] = useState<2 | 4>(suggestedScale);
  const [faceEnhance, setFaceEnhance] = useState(true);
  const [provider, setProvider] = useState<"real-esrgan" | "clipdrop">("real-esrgan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpscale() {
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        imageUrl,
        targetScale: scale,
        faceEnhance,
        provider,
      };
      if (originalWidth) body.originalWidth = originalWidth;
      if (originalHeight) body.originalHeight = originalHeight;

      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upscaling failed");
        return;
      }

      onUpscaled(data.resultUrl, data.outputSize.width, data.outputSize.height);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Scale
          </label>
          <div className="flex gap-2">
            {([2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={`flex h-9 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                  scale === s
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as "real-esrgan" | "clipdrop")}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="real-esrgan">Real-ESRGAN (fal.ai)</option>
            <option value="clipdrop">Clipdrop</option>
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={faceEnhance}
          onChange={(e) => setFaceEnhance(e.target.checked)}
          className="rounded border-zinc-300"
        />
        Face enhancement (GFPGAN)
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        onClick={handleUpscale}
        disabled={loading}
        className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading ? "Upscaling…" : `Upscale ${scale}x`}
      </button>
    </div>
  );
}
