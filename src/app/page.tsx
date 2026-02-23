"use client";

import { useState } from "react";
import ImageGenerator, { GeneratedImage } from "@/components/ImageGenerator";
import ImagePreview from "@/components/ImagePreview";
import BackgroundRemover from "@/components/BackgroundRemover";
import UpscalePanel from "@/components/UpscalePanel";

interface QualityResult {
  passed: boolean;
  qualityRatio: number;
  hasTransparency: boolean;
  recommendation: "upscale" | "retry" | "ok";
  suggestedScale?: 2 | 4;
  originalSize: { width: number; height: number };
  outputSize: { width: number; height: number };
}

export default function Home() {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [removedUrl, setRemovedUrl] = useState<string | null>(null);
  const [removedProvider, setRemovedProvider] = useState<string | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityResult | null>(null);
  const [qualityChecking, setQualityChecking] = useState(false);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [finalSize, setFinalSize] = useState<{ width: number; height: number } | null>(null);

  function handleGenerate(images: GeneratedImage[]) {
    setGeneratedImages(images);
    setSelectedImage(images[0]);
    setRemovedUrl(null);
    setRemovedProvider(null);
    setQualityResult(null);
    setFinalUrl(null);
    setFinalSize(null);
  }

  function handleSelectImage(img: GeneratedImage) {
    setSelectedImage(img);
    setRemovedUrl(null);
    setRemovedProvider(null);
    setQualityResult(null);
    setFinalUrl(null);
    setFinalSize(null);
  }

  async function handleRemoved(resultUrl: string, provider: string) {
    setRemovedUrl(resultUrl);
    setRemovedProvider(provider);
    setQualityResult(null);
    setFinalUrl(null);
    setFinalSize(null);

    if (!selectedImage) return;

    // Run quality check automatically
    setQualityChecking(true);
    try {
      const res = await fetch("/api/quality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalImageUrl: selectedImage.url,
          processedImageUrl: resultUrl,
        }),
      });
      if (res.ok) {
        const data: QualityResult = await res.json();
        setQualityResult(data);
      }
    } catch {
      // quality check is non-blocking
    } finally {
      setQualityChecking(false);
    }
  }

  function handleUpscaled(url: string, w: number, h: number) {
    setFinalUrl(url);
    setFinalSize({ width: w, height: h });
    setQualityResult(null);
  }

  const displayRemovedUrl = finalUrl ?? removedUrl;
  const displaySize = finalSize ??
    (qualityResult ? qualityResult.outputSize : selectedImage
      ? { width: selectedImage.width, height: selectedImage.height }
      : null);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            bgrmv
          </h1>
          <span className="text-sm text-zinc-400 dark:text-zinc-500">
            AI image generation + background removal
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Generator section */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Generate Image
          </h2>
          <ImageGenerator onGenerate={handleGenerate} />
        </section>

        {/* Generated images grid */}
        {generatedImages.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Generated
            </h2>
            <div
              className={`grid gap-4 ${
                generatedImages.length === 1
                  ? "grid-cols-1 max-w-sm"
                  : generatedImages.length === 2
                  ? "grid-cols-2 max-w-xl"
                  : "grid-cols-2 sm:grid-cols-4"
              }`}
            >
              {generatedImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectImage(img)}
                  className={`overflow-hidden rounded-xl border-2 transition-all ${
                    selectedImage?.url === img.url
                      ? "border-zinc-900 dark:border-zinc-100"
                      : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-600"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Generated ${i + 1}`}
                    className="h-auto w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Working area — selected image + controls */}
        {selectedImage && (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Original image */}
            <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Original
              </h2>
              <ImagePreview
                url={selectedImage.url}
                width={selectedImage.width}
                height={selectedImage.height}
                label={`${selectedImage.width} × ${selectedImage.height}`}
              />
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-6">
              {/* Background removal */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Remove Background
                </h2>
                <BackgroundRemover
                  imageUrl={selectedImage.url}
                  onRemoved={handleRemoved}
                />
              </div>

              {/* Quality check status */}
              {qualityChecking && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  Checking quality…
                </div>
              )}

              {qualityResult && !qualityResult.passed && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="mb-1 text-sm font-medium text-amber-700 dark:text-amber-400">
                    Quality check:{" "}
                    {qualityResult.recommendation === "upscale"
                      ? `Resolution degraded (${Math.round(qualityResult.qualityRatio * 100)}% of original)`
                      : !qualityResult.hasTransparency
                      ? "Transparency not detected"
                      : "Output may need retry"}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    {qualityResult.recommendation === "upscale"
                      ? "Use the upscaler below to restore quality."
                      : "Try a different provider."}
                  </p>
                </div>
              )}

              {qualityResult && qualityResult.passed && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Quality check passed ({Math.round(qualityResult.qualityRatio * 100)}% resolution retained)
                </div>
              )}

              {/* Upscale panel — shown when quality fails with upscale, or removed result exists */}
              {removedUrl && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                  <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Upscale
                  </h2>
                  <UpscalePanel
                    imageUrl={removedUrl}
                    originalWidth={qualityResult?.outputSize.width ?? selectedImage.width}
                    originalHeight={qualityResult?.outputSize.height ?? selectedImage.height}
                    suggestedScale={qualityResult?.suggestedScale ?? 2}
                    onUpscaled={handleUpscaled}
                  />
                </div>
              )}
            </div>
          </section>
        )}

        {/* Result */}
        {displayRemovedUrl && (
          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Result
              </h2>
              {(removedProvider || finalUrl) && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {finalUrl ? "upscaled" : removedProvider ?? ""}
                </span>
              )}
            </div>
            <div className="max-w-sm">
              <ImagePreview
                url={displayRemovedUrl}
                width={displaySize?.width}
                height={displaySize?.height}
                label="Background removed"
                showCheckerboard
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
