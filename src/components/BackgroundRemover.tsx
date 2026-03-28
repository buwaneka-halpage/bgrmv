"use client";

import { useState } from "react";

type ServerProvider = "birefnet" | "bria" | "removebg" | "hf-rmbg" | "replicate-rembg" | "bria-rmbg";
type Provider = ServerProvider | "imgly";

interface ProviderMeta {
  value: Provider;
  label: string;
  badge: string;
  cost: string;
  quality: "S" | "A" | "B";
}

const PROVIDERS: ProviderMeta[] = [
  { value: "birefnet",        label: "BiRefNet v2",      badge: "fal.ai",        cost: "~$0.02",  quality: "S" },
  { value: "bria",            label: "BRIA RMBG-2.0",    badge: "fal.ai",        cost: "~$0.02",  quality: "S" },
  { value: "bria-rmbg",       label: "BRIA RMBG-2.0",    badge: "Bria direct",   cost: "varies",  quality: "S" },
  { value: "hf-rmbg",         label: "RMBG-2.0",         badge: "Hugging Face",  cost: "~$0.001", quality: "A" },
  { value: "replicate-rembg", label: "rembg",            badge: "Replicate",     cost: "~$0.004", quality: "A" },
  { value: "removebg",        label: "Remove.bg",        badge: "REST API",      cost: "~$0.07",  quality: "B" },
  { value: "imgly",           label: "@imgly (browser)", badge: "Free / offline",cost: "Free",    quality: "B" },
];

const QUALITY_COLOR: Record<string, string> = {
  S: "#a78bfa",
  A: "#38bdf8",
  B: "#4ade80",
};

const BIREFNET_MODELS = [
  { value: "General Use (Heavy)", label: "General (Heavy)" },
  { value: "General Use (Light)", label: "General (Light)" },
  { value: "Portrait",            label: "Portrait" },
];

type ImglyModel = "isnet" | "isnet_fp16" | "isnet_quint8";

interface Props {
  imageUrl: string;
  onRemoved: (resultUrl: string, provider: string) => void;
}

const label11: React.CSSProperties = {
  color: "var(--text-muted)",
  fontSize: 11,
  letterSpacing: "0.08em",
  fontWeight: 600,
  textTransform: "uppercase",
};

const inputBase: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

export default function BackgroundRemover({ imageUrl, onRemoved }: Props) {
  const [provider, setProvider]           = useState<Provider>("hf-rmbg");
  const [birefnetModel, setBirefnetModel] = useState("General Use (Heavy)");
  const [imglyModel, setImglyModel]       = useState<ImglyModel>("isnet");
  const [loading, setLoading]             = useState(false);
  const [progress, setProgress]           = useState<string | null>(null);
  const [error, setError]                 = useState<string | null>(null);

  async function handleRemove() {
    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      if (provider === "imgly") { await runImgly(); return; }

      const res = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          provider,
          options: provider === "birefnet" ? { birefnetModel } : {},
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Background removal failed"); return; }
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
      setError(err instanceof Error ? err.message : "imgly failed");
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

  const selectedMeta = PROVIDERS.find((p) => p.value === provider);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Provider grid ───────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label11}>Provider</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 8 }}>
          {PROVIDERS.map((p) => {
            const sel = provider === p.value;
            return (
              <label
                key={p.value}
                style={{
                  display: "flex", flexDirection: "column", gap: 3,
                  padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  background: sel ? "var(--accent-dim)" : "var(--surface-2)",
                  cursor: "pointer", transition: "border-color 0.12s, background 0.12s",
                }}
              >
                <input type="radio" name="bgProvider" value={p.value} checked={sel}
                  onChange={() => setProvider(p.value)} style={{ display: "none" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>{p.label}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                    color: QUALITY_COLOR[p.quality],
                    background: `${QUALITY_COLOR[p.quality]}18`,
                    padding: "1px 6px", borderRadius: 4,
                  }}>
                    {p.quality}-tier
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.badge}</span>
                  <span style={{
                    fontSize: 11, fontVariantNumeric: "tabular-nums",
                    color: p.cost === "Free" ? "#4ade80" : "var(--text-muted)",
                  }}>
                    {p.cost}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Sub-options ─────────────────────────────── */}
      {provider === "birefnet" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>BiRefNet Model</span>
          <select value={birefnetModel} onChange={(e) => setBirefnetModel(e.target.value)}
            style={{ ...inputBase, padding: "5px 28px 5px 10px", width: "fit-content" }}>
            {BIREFNET_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      )}

      {provider === "imgly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Model Size</span>
          <select value={imglyModel} onChange={(e) => setImglyModel(e.target.value as ImglyModel)}
            style={{ ...inputBase, padding: "5px 28px 5px 10px", width: "fit-content" }}>
            <option value="isnet_quint8">isnet_quint8 — fastest</option>
            <option value="isnet_fp16">isnet_fp16 — balanced</option>
            <option value="isnet">isnet — best quality</option>
          </select>
        </div>
      )}

      {/* ── Feedback ────────────────────────────────── */}
      {error && (
        <div className="animate-in" style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "8px 12px", color: "var(--red)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {progress && !error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
          <span className="spinner" style={{ width: 11, height: 11 }} />
          {progress}
        </div>
      )}

      {/* ── Action ──────────────────────────────────── */}
      <button
        onClick={handleRemove}
        disabled={loading}
        style={{
          height: 40, paddingLeft: 24, paddingRight: 24, borderRadius: 8, border: "none",
          background: loading ? "var(--surface-3)" : "var(--accent)",
          color: loading ? "var(--text-muted)" : "white",
          fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
          display: "inline-flex", alignItems: "center", gap: 8, transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)"; }}
        onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)"; }}
      >
        {loading && <span className="spinner" />}
        {loading
          ? (progress ?? "Processing…")
          : `Remove Background${selectedMeta ? ` · ${selectedMeta.label}` : ""}`}
      </button>
    </div>
  );
}
