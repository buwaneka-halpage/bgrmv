"use client";

import { useState } from "react";

type ServerProvider = "birefnet" | "bria" | "removebg" | "hf-rmbg" | "replicate-rembg" | "bria-rmbg";
type Provider = ServerProvider | "imgly";

const PROVIDERS: { value: Provider; label: string; badge: string }[] = [
  { value: "birefnet", label: "BiRefNet v2", badge: "Best quality · fal.ai" },
  { value: "bria", label: "BRIA RMBG-2.0", badge: "Alpha matte · fal.ai" },
  { value: "bria-rmbg", label: "BRIA RMBG-2.0", badge: "Direct · Bria API" },
  { value: "hf-rmbg", label: "RMBG-2.0", badge: "Cheap · HF" },
  { value: "replicate-rembg", label: "rembg", badge: "Cheap · Replicate" },
  { value: "removebg", label: "Remove.bg", badge: "Fast" },
  { value: "imgly", label: "@imgly (browser)", badge: "Free / offline" },
];

const BIREFNET_MODELS = [
  { value: "General Use (Heavy)", label: "General (Heavy)" },
  { value: "General Use (Light)", label: "General (Light)" },
  { value: "Portrait", label: "Portrait" },
];

type ImglyModel = "isnet" | "isnet_fp16" | "isnet_quint8";

interface Props {
  imageUrl: string;
  onRemoved: (resultUrl: string, provider: string) => void;
}

export default function BackgroundRemover({ imageUrl, onRemoved }: Props) {
  const [provider, setProvider] = useState<Provider>("hf-rmbg");
  const [birefnetModel, setBirefnetModel] = useState("General Use (Heavy)");
  const [imglyModel, setImglyModel] = useState<ImglyModel>("isnet");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      if (provider === "imgly") {
        await runImgly();
        return;
      }

      const body: Record<string, unknown> = {
        imageUrl,
        provider,
        options: provider === "birefnet" ? { birefnetModel } : {},
      };

      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Background removal failed");
        return;
      }

      onRemoved(data.resultUrl, data.provider);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function runImgly() {
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      setProgress("Loading model…");

      const blob = await removeBackground(imageUrl, {
        debug: false,
        model: imglyModel,
        output: { format: "image/png", quality: 1.0 },
        progress: (key: string, current: number, total: number) => {
          const pct = total > 0 ? Math.round((current / total) * 100) : 0;
          setProgress(`${key}: ${pct}%`);
        },
      });

      const dataUrl = await blobToDataUrl(blob);
      onRemoved(dataUrl, "imgly");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "imgly failed";
      setError(msg);
    }
  }

  function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Provider
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PROVIDERS.map((p) => (
            <label
              key={p.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                provider === p.value
                  ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-800"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
              }`}
            >
              <input
                type="radio"
                name="provider"
                value={p.value}
                checked={provider === p.value}
                onChange={() => setProvider(p.value)}
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

      {provider === "birefnet" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            BiRefNet Model
          </label>
          <select
            value={birefnetModel}
            onChange={(e) => setBirefnetModel(e.target.value)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {BIREFNET_MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {provider === "imgly" && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Model Size
          </label>
          <select
            value={imglyModel}
            onChange={(e) =>
              setImglyModel(e.target.value as ImglyModel)
            }
            className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-800 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="isnet_quint8">isnet_quint8 (fastest)</option>
            <option value="isnet_fp16">isnet_fp16 (balanced)</option>
            <option value="isnet">isnet (best quality)</option>
          </select>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}

      {progress && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{progress}</p>
      )}

      <button
        onClick={handleRemove}
        disabled={loading}
        className="flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {loading ? (progress ?? "Processing…") : "Remove Background"}
      </button>
    </div>
  );
}
