"use client";

import { useState } from "react";

type UpscaleProvider = "real-esrgan" | "replicate-esrgan" | "bria";

interface Props {
  imageUrl: string;
  originalWidth?: number;
  originalHeight?: number;
  suggestedScale?: 2 | 4;
  onUpscaled: (resultUrl: string, outputWidth: number, outputHeight: number) => void;
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

export default function UpscalePanel({
  imageUrl,
  originalWidth,
  originalHeight,
  suggestedScale = 2,
  onUpscaled,
}: Props) {
  const [scale, setScale]       = useState<2 | 4>(suggestedScale);
  const [faceEnhance, setFaceEnhance] = useState(true);
  const [provider, setProvider] = useState<UpscaleProvider>("replicate-esrgan");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleUpscale() {
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { imageUrl, targetScale: scale, faceEnhance, provider };
      if (originalWidth)  body.originalWidth  = originalWidth;
      if (originalHeight) body.originalHeight = originalHeight;

      const res = await fetch("/api/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Upscaling failed"); return; }
      onUpscaled(data.resultUrl, data.outputSize.width, data.outputSize.height);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Controls row ──────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>

        {/* Scale pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Scale</span>
          <div style={{ display: "flex", gap: 4 }}>
            {([2, 4] as const).map((s) => {
              const sel = scale === s;
              return (
                <button key={s} type="button" onClick={() => setScale(s)}
                  style={{
                    width: 52, height: 32, borderRadius: 6,
                    border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                    background: sel ? "var(--accent-dim)" : "transparent",
                    color: sel ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: 13, cursor: "pointer", transition: "all 0.12s",
                    fontWeight: sel ? 600 : 400,
                  }}
                >{s}×</button>
              );
            })}
          </div>
        </div>

        {/* Provider */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Provider</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value as UpscaleProvider)}
            style={{ ...inputBase, padding: "5px 28px 5px 10px" }}>
            <option value="replicate-esrgan">Real-ESRGAN · Replicate (~$0.004)</option>
            <option value="real-esrgan">Real-ESRGAN · fal.ai (~$0.02)</option>
            <option value="bria">Increase Resolution · Bria</option>
          </select>
        </div>

        {/* Face enhance */}
        <label style={{
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          fontSize: 13, color: "var(--text-secondary)", paddingBottom: 2,
        }}>
          <input type="checkbox" checked={faceEnhance}
            onChange={(e) => setFaceEnhance(e.target.checked)} />
          Face enhancement (GFPGAN)
        </label>
      </div>

      {/* ── Error ─────────────────────────────────── */}
      {error && (
        <div className="animate-in" style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "8px 12px", color: "var(--red)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Action ────────────────────────────────── */}
      <button
        onClick={handleUpscale}
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
        {loading ? "Upscaling…" : `Upscale ${scale}×`}
      </button>
    </div>
  );
}
