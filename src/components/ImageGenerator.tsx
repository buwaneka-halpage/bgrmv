"use client";

import { useState } from "react";

type AspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";
type Resolution = "1K" | "2K" | "4K";
type GenProvider = "fal" | "replicate-flux-schnell" | "hf-flux" | "bria" | "bria-lite";

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

interface Props {
  onGenerate: (images: GeneratedImage[]) => void;
}

const GEN_PROVIDERS: { value: GenProvider; label: string; badge: string }[] = [
  { value: "fal", label: "Nano Banana Pro", badge: "fal.ai" },
  { value: "replicate-flux-schnell", label: "Flux Schnell", badge: "Replicate · cheap" },
  { value: "hf-flux", label: "FLUX.1-dev", badge: "HF · cheap" },
  { value: "bria", label: "FIBO", badge: "Bria" },
  { value: "bria-lite", label: "FIBO Lite", badge: "Bria · fast" },
];

export default function ImageGenerator({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [genProvider, setGenProvider] = useState<GenProvider>("replicate-flux-schnell");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("2K");
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        prompt,
        aspectRatio,
        numImages,
        provider: genProvider,
      };
      if (genProvider === "fal") body.resolution = resolution;
      if (seed.trim()) body.seed = parseInt(seed, 10);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Generation failed");
        return;
      }

      onGenerate(data.images);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate…"
          rows={3}
          className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Model
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {GEN_PROVIDERS.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                genProvider === p.value
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="genProvider"
                value={p.value}
                checked={genProvider === p.value}
                onChange={() => setGenProvider(p.value)}
                className="sr-only"
              />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {p.label}
              </span>
              <span className="ml-auto text-xs text-zinc-400">{p.badge}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Aspect Ratio
          </label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {(["1:1", "16:9", "9:16", "4:3", "3:4"] as AspectRatio[]).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {genProvider === "fal" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Resolution
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as Resolution)}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K (+cost)</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Images
          </label>
          <select
            value={numImages}
            onChange={(e) => setNumImages(parseInt(e.target.value))}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {(genProvider === "hf-flux" || genProvider === "bria" || genProvider === "bria-lite" ? [1] : [1, 2, 3, 4]).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Seed (optional)
          </label>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            placeholder="random"
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 placeholder-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !prompt.trim()}
        className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
