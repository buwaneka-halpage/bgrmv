"use client";

import { useRef, useState, useCallback } from "react";
import type { GeneratedImage } from "./ImageGenerator";

const MAX_SIZE = 12 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

interface Props {
  onUpload: (image: GeneratedImage) => void;
}

export default function ImageUpload({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      if (!ACCEPTED.includes(file.type)) { setError("Unsupported format. Use PNG, JPG, or WEBP."); return; }
      if (file.size > MAX_SIZE)          { setError("File too large. Maximum size is 12 MB."); return; }

      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const img = new Image();
        img.onload  = () => { onUpload({ url: dataUrl, width: img.width, height: img.height }); setLoading(false); };
        img.onerror = () => { setError("Failed to read image dimensions."); setLoading(false); };
        img.src = dataUrl;
      };
      reader.onerror = () => { setError("Failed to read file."); setLoading(false); };
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
        disabled={loading}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: "28px 24px",
          borderRadius: 12,
          border: `1.5px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
          background: dragging ? "var(--accent-dim)" : "transparent",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1,
          transition: "border-color 0.15s, background 0.15s",
          width: "100%",
        }}
      >
        {/* Upload icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: dragging ? "var(--accent-dim)" : "var(--surface-2)",
          border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={dragging ? "var(--accent)" : "var(--text-secondary)"}
            strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", margin: 0 }}>
            {loading ? "Reading image…" : "Click to upload or drag and drop"}
          </p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0" }}>
            PNG, JPG, or WEBP — max 12 MB
          </p>
        </div>
      </button>

      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp"
        onChange={handleChange} style={{ display: "none" }} />

      {error && (
        <div className="animate-in" style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "8px 12px", color: "var(--red)", fontSize: 13,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
