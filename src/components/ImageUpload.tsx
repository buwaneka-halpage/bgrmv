"use client";

import { useRef, useState, useCallback } from "react";
import type { GeneratedImage } from "./ImageGenerator";

const MAX_SIZE = 12 * 1024 * 1024; // 12 MB
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

interface Props {
  onUpload: (image: GeneratedImage) => void;
}

export default function ImageUpload({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError("Unsupported format. Use PNG, JPG, or WEBP.");
        return;
      }
      if (file.size > MAX_SIZE) {
        setError("File too large. Maximum size is 12 MB.");
        return;
      }

      setLoading(true);

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;

        const img = new Image();
        img.onload = () => {
          onUpload({ url: dataUrl, width: img.width, height: img.height });
          setLoading(false);
        };
        img.onerror = () => {
          setError("Failed to read image dimensions.");
          setLoading(false);
        };
        img.src = dataUrl;
      };
      reader.onerror = () => {
        setError("Failed to read file.");
        setLoading(false);
      };
      reader.readAsDataURL(file);
    },
    [onUpload]
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={loading}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-sm transition-colors ${
          dragging
            ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500"
        } ${loading ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <svg
          className="h-8 w-8 text-zinc-400 dark:text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
        <span className="font-medium text-zinc-600 dark:text-zinc-300">
          {loading ? "Reading image…" : "Click to upload or drag and drop"}
        </span>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          PNG, JPG, or WEBP — max 12 MB
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
