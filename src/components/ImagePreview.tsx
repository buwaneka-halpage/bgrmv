"use client";

import Image from "next/image";

interface Props {
  url: string;
  width?: number;
  height?: number;
  label?: string;
  showCheckerboard?: boolean;
}

export default function ImagePreview({ url, width, height, label, showCheckerboard = false }: Props) {
  const isDataUrl = url.startsWith("data:");

  function handleDownload() {
    const a = document.createElement("a");
    a.href = url;
    a.download = `bgrmv-${Date.now()}.png`;
    a.click();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ── Meta row ──────────────────────────────── */}
      {(label || (width && height)) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {label && (
            <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
              {label}
            </span>
          )}
          {width && height && (
            <span style={{
              fontSize: 11, color: "var(--text-muted)",
              fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em",
            }}>
              {width} × {height}
            </span>
          )}
        </div>
      )}

      {/* ── Image container ─────────────────────── */}
      <div
        className={showCheckerboard ? "checkerboard" : ""}
        style={{
          position: "relative",
          overflow: "hidden",
          borderRadius: 12,
          border: "1px solid var(--border)",
          background: showCheckerboard ? undefined : "var(--surface-2)",
        }}
      >
        {isDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label ?? "Generated image"}
            style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
          />
        ) : (
          <Image
            src={url}
            alt={label ?? "Generated image"}
            width={width ?? 800}
            height={height ?? 800}
            style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
            unoptimized
          />
        )}
      </div>

      {/* ── Download button ─────────────────────── */}
      <button
        onClick={handleDownload}
        style={{
          height: 34,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 8,
          border: "1px solid var(--border)",
          background: "transparent",
          color: "var(--text-secondary)",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          transition: "border-color 0.15s, color 0.15s",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = "var(--border-bright)";
          btn.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          btn.style.borderColor = "var(--border)";
          btn.style.color = "var(--text-secondary)";
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PNG
      </button>
    </div>
  );
}
