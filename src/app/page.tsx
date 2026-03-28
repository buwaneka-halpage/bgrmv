"use client";

import { useState } from "react";
import ImageGenerator, { GeneratedImage } from "@/components/ImageGenerator";
import ImageUpload from "@/components/ImageUpload";
import ImagePreview from "@/components/ImagePreview";
import BackgroundRemover from "@/components/BackgroundRemover";
import UpscalePanel from "@/components/UpscalePanel";
import BriaToolsPanel from "@/components/BriaToolsPanel";

interface QualityResult {
  passed: boolean;
  qualityRatio: number;
  hasTransparency: boolean;
  recommendation: "upscale" | "retry" | "ok";
  suggestedScale?: 2 | 4;
  originalSize: { width: number; height: number };
  outputSize: { width: number; height: number };
}

/* ── Layout constants ──────────────────────────────────────── */
const card: React.CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: "24px",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  marginBottom: 16,
  display: "block",
};

const badge: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  padding: "2px 8px",
  borderRadius: 4,
  background: "var(--surface-3)",
  color: "var(--text-secondary)",
  border: "1px solid var(--border)",
};

/* ── Page ──────────────────────────────────────────────────── */
export default function Home() {
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage,   setSelectedImage]   = useState<GeneratedImage | null>(null);
  const [removedUrl,      setRemovedUrl]       = useState<string | null>(null);
  const [removedProvider, setRemovedProvider]  = useState<string | null>(null);
  const [qualityResult,   setQualityResult]    = useState<QualityResult | null>(null);
  const [qualityChecking, setQualityChecking]  = useState(false);
  const [finalUrl,        setFinalUrl]         = useState<string | null>(null);
  const [finalSize,       setFinalSize]        = useState<{ width: number; height: number } | null>(null);
  const [briaResultUrl,   setBriaResultUrl]    = useState<string | null>(null);
  const [briaToolUsed,    setBriaToolUsed]     = useState<string | null>(null);
  const [activeTab,       setActiveTab]        = useState<"bgremove" | "bria" | "upscale">("bgremove");

  function handleGenerate(images: GeneratedImage[]) {
    setGeneratedImages(images);
    setSelectedImage(images[0]);
    resetProcessed();
  }

  function handleSelectImage(img: GeneratedImage) {
    setSelectedImage(img);
    resetProcessed();
  }

  function handleUpload(img: GeneratedImage) {
    setSelectedImage(img);
    setGeneratedImages([]);
    resetProcessed();
  }

  function resetProcessed() {
    setRemovedUrl(null);
    setRemovedProvider(null);
    setQualityResult(null);
    setFinalUrl(null);
    setFinalSize(null);
    setBriaResultUrl(null);
    setBriaToolUsed(null);
  }

  async function handleRemoved(resultUrl: string, provider: string) {
    setRemovedUrl(resultUrl);
    setRemovedProvider(provider);
    setQualityResult(null);
    setFinalUrl(null);
    setFinalSize(null);

    if (!selectedImage) return;
    setQualityChecking(true);
    try {
      const res = await fetch("/api/quality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalImageUrl: selectedImage.url, processedImageUrl: resultUrl }),
      });
      if (res.ok) setQualityResult(await res.json());
    } catch { /* non-blocking */ }
    finally { setQualityChecking(false); }
  }

  function handleUpscaled(url: string, w: number, h: number) {
    setFinalUrl(url);
    setFinalSize({ width: w, height: h });
    setQualityResult(null);
  }

  function handleBriaResult(resultUrl: string, tool: string) {
    setBriaResultUrl(resultUrl);
    setBriaToolUsed(tool);
  }

  const displayRemovedUrl = finalUrl ?? removedUrl;
  const displaySize = finalSize ??
    (qualityResult ? qualityResult.outputSize :
      selectedImage ? { width: selectedImage.width, height: selectedImage.height } : null);

  const TABS = [
    { id: "bgremove" as const, label: "Background Removal" },
    { id: "bria"     as const, label: "Bria AI Tools" },
    { id: "upscale"  as const, label: "Upscale" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Header ────────────────────────────────── */}
      <header style={{
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-1)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px",
          height: 52,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 7,
              background: "linear-gradient(135deg, var(--accent), #ec4899)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 9l6 6M15 9l-6 6" />
              </svg>
            </div>
            <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              bgrmv
            </span>
          </div>

          <span style={{ color: "var(--border-bright)", fontSize: 16, fontWeight: 200 }}>|</span>

          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            AI image generation + precision background removal
          </span>

          {selectedImage && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {selectedImage.width} × {selectedImage.height}
              </span>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── Top row: Generator + Upload ─────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "start" }}>

          {/* Generator */}
          <div style={card}>
            <span style={sectionLabel}>Generate Image</span>
            <ImageGenerator onGenerate={handleGenerate} />
          </div>

          {/* Upload */}
          <div style={{ ...card, width: 260, flexShrink: 0 }}>
            <span style={sectionLabel}>Upload Image</span>
            <ImageUpload onUpload={handleUpload} />
          </div>
        </div>

        {/* ── Generated images strip ────────────── */}
        {generatedImages.length > 0 && (
          <section className="animate-in">
            <span style={{ ...sectionLabel, marginBottom: 12 }}>Generated ({generatedImages.length})</span>
            <div style={{
              display: "flex",
              gap: 10,
              overflowX: "auto",
              paddingBottom: 4,
            }}>
              {generatedImages.map((img, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectImage(img)}
                  style={{
                    flexShrink: 0,
                    width: 120,
                    borderRadius: 10,
                    overflow: "hidden",
                    border: `2px solid ${selectedImage?.url === img.url ? "var(--accent)" : "var(--border)"}`,
                    background: "var(--surface-1)",
                    padding: 0,
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={`Generated ${i + 1}`}
                    style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Working area ────────────────────────── */}
        {selectedImage && (
          <div className="animate-in" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, alignItems: "start" }}>

            {/* Left: Original image */}
            <div style={card}>
              <span style={sectionLabel}>Original</span>
              <ImagePreview
                url={selectedImage.url}
                width={selectedImage.width}
                height={selectedImage.height}
                label="Source image"
              />
            </div>

            {/* Right: Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Tab bar */}
              <div style={{
                display: "flex",
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 4,
                gap: 2,
              }}>
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1,
                      height: 34,
                      borderRadius: 8,
                      border: "none",
                      background: activeTab === tab.id ? "var(--surface-3)" : "transparent",
                      color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
                      fontSize: 12,
                      fontWeight: activeTab === tab.id ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab panels */}
              {activeTab === "bgremove" && (
                <div className="animate-in" style={card}>
                  <span style={sectionLabel}>Remove Background</span>
                  <BackgroundRemover imageUrl={selectedImage.url} onRemoved={handleRemoved} />
                </div>
              )}

              {activeTab === "bria" && (
                <div className="animate-in" style={card}>
                  <span style={sectionLabel}>Bria AI Tools</span>
                  <BriaToolsPanel imageUrl={selectedImage.url} onResult={handleBriaResult} />
                </div>
              )}

              {activeTab === "upscale" && (
                <div className="animate-in" style={card}>
                  <span style={sectionLabel}>Upscale</span>
                  <UpscalePanel
                    imageUrl={removedUrl ?? selectedImage.url}
                    originalWidth={qualityResult?.outputSize.width ?? selectedImage.width}
                    originalHeight={qualityResult?.outputSize.height ?? selectedImage.height}
                    suggestedScale={qualityResult?.suggestedScale ?? 2}
                    onUpscaled={handleUpscaled}
                  />
                </div>
              )}

              {/* Quality check status */}
              {qualityChecking && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                  background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 10,
                  fontSize: 12, color: "var(--text-muted)",
                }}>
                  <span className="spinner" style={{ width: 11, height: 11 }} />
                  Checking output quality…
                </div>
              )}

              {qualityResult && !qualityResult.passed && (
                <div className="animate-in" style={{
                  padding: "12px 14px", borderRadius: 10,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.25)",
                }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 500, color: "var(--amber)" }}>
                    Quality check:{" "}
                    {qualityResult.recommendation === "upscale"
                      ? `Resolution degraded to ${Math.round(qualityResult.qualityRatio * 100)}% of original`
                      : !qualityResult.hasTransparency
                      ? "Transparency not detected"
                      : "Output may need retry"}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(245,158,11,0.7)" }}>
                    {qualityResult.recommendation === "upscale"
                      ? "Switch to the Upscale tab to restore resolution."
                      : "Try a different provider."}
                  </p>
                </div>
              )}

              {qualityResult && qualityResult.passed && (
                <div className="animate-in" style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span style={{ fontSize: 12, color: "#4ade80" }}>
                    Quality passed — {Math.round(qualityResult.qualityRatio * 100)}% resolution retained
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Results row ───────────────────────────── */}
        {(displayRemovedUrl || briaResultUrl) && (
          <div className="animate-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

            {/* BG removed result */}
            {displayRemovedUrl && (
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={sectionLabel as React.CSSProperties & { marginBottom: number }}>
                    Background Removed
                  </span>
                  {(removedProvider || finalUrl) && (
                    <span style={{ ...badge, marginBottom: 16 }}>
                      {finalUrl ? "upscaled" : removedProvider ?? ""}
                    </span>
                  )}
                </div>
                <ImagePreview
                  url={displayRemovedUrl}
                  width={displaySize?.width}
                  height={displaySize?.height}
                  label="Transparent PNG"
                  showCheckerboard
                />
              </div>
            )}

            {/* Bria result */}
            {briaResultUrl && (
              <div style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={sectionLabel as React.CSSProperties & { marginBottom: number }}>
                    Bria Result
                  </span>
                  {briaToolUsed && (
                    <span style={{ ...badge, marginBottom: 16 }}>
                      {briaToolUsed.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <ImagePreview
                  url={briaResultUrl}
                  label={`${briaToolUsed?.replace(/_/g, " ") ?? "result"}`}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
