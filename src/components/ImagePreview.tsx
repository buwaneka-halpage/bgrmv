"use client";

import Image from "next/image";

interface Props {
  url: string;
  width?: number;
  height?: number;
  label?: string;
  showCheckerboard?: boolean;
}

export default function ImagePreview({
  url,
  width,
  height,
  label,
  showCheckerboard = false,
}: Props) {
  const isDataUrl = url.startsWith("data:");

  function handleDownload() {
    const a = document.createElement("a");
    a.href = url;
    a.download = `bgrmv-${Date.now()}.png`;
    a.click();
  }

  const checkerStyle = showCheckerboard
    ? {
        backgroundImage:
          "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      }
    : {};

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </span>
          {width && height && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {width} × {height}
            </span>
          )}
        </div>
      )}
      <div
        className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
        style={checkerStyle}
      >
        {isDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label ?? "Generated image"}
            className="h-auto w-full object-contain"
          />
        ) : (
          <Image
            src={url}
            alt={label ?? "Generated image"}
            width={width ?? 800}
            height={height ?? 800}
            className="h-auto w-full object-contain"
            unoptimized
          />
        )}
      </div>
      <button
        onClick={handleDownload}
        className="flex h-9 items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Download PNG
      </button>
    </div>
  );
}
