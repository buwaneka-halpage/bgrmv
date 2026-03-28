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

const GEN_PROVIDERS: {
  value: GenProvider;
  label: string;
  badge: string;
  cost: string;
  tier: "premium" | "standard" | "cheap";
}[] = [
  { value: "replicate-flux-schnell", label: "Flux Schnell",    badge: "Replicate",    cost: "~$0.003", tier: "cheap" },
  { value: "hf-flux",               label: "FLUX.1-dev",      badge: "Hugging Face", cost: "~$0.005", tier: "cheap" },
  { value: "bria",                   label: "FIBO",            badge: "Bria",         cost: "varies",  tier: "standard" },
  { value: "bria-lite",              label: "FIBO Lite",       badge: "Bria · fast",  cost: "varies",  tier: "cheap" },
  { value: "fal",                    label: "Nano Banana Pro", badge: "fal.ai",       cost: "~$0.04",  tier: "premium" },
];

const COST_COLOR: Record<string, string> = {
  premium:  "#a78bfa",
  standard: "#38bdf8",
  cheap:    "#4ade80",
};

const ASPECT_RATIOS: AspectRatio[] = ["1:1", "16:9", "9:16", "4:3", "3:4"];

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

export default function ImageGenerator({ onGenerate }: Props) {
  const [prompt, setPrompt] = useState("");
  const [genProvider, setGenProvider] = useState<GenProvider>("replicate-flux-schnell");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("2K");
  const [numImages, setNumImages] = useState(1);
  const [seed, setSeed] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const singleOnly = genProvider === "hf-flux" || genProvider === "bria" || genProvider === "bria-lite";
  const canSubmit = !loading && prompt.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        prompt,
        aspectRatio,
        numImages: singleOnly ? 1 : numImages,
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
      if (!res.ok) { setError(data.error ?? "Generation failed"); return; }
      onGenerate(data.images);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Prompt ──────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="gen-prompt" style={label11}>Prompt</label>
        <textarea
          id="gen-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate…"
          rows={3}
          style={{ ...inputBase, padding: "10px 12px", resize: "none", width: "100%", lineHeight: 1.6 }}
          onFocus={(e) => (e.target.style.borderColor = "var(--border-bright)")}
          onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
        />
      </div>

      {/* ── Model selector ──────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label11}>Model</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {GEN_PROVIDERS.map((p) => {
            const sel = genProvider === p.value;
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
                <input type="radio" name="genProvider" value={p.value} checked={sel}
                  onChange={() => setGenProvider(p.value)} style={{ display: "none" }} />
                <span style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>{p.label}</span>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.badge}</span>
                  <span style={{ fontSize: 11, color: COST_COLOR[p.tier], fontVariantNumeric: "tabular-nums" }}>
                    {p.cost}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Options row ─────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>

        {/* Aspect ratio pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Aspect Ratio</span>
          <div style={{ display: "flex", gap: 4 }}>
            {ASPECT_RATIOS.map((r) => {
              const sel = aspectRatio === r;
              return (
                <button key={r} type="button" onClick={() => setAspectRatio(r)}
                  style={{
                    padding: "4px 9px", borderRadius: 6,
                    border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                    background: sel ? "var(--accent-dim)" : "transparent",
                    color: sel ? "var(--accent)" : "var(--text-secondary)",
                    fontSize: 12, cursor: "pointer", transition: "all 0.12s",
                    fontWeight: sel ? 600 : 400,
                  }}
                >{r}</button>
              );
            })}
          </div>
        </div>

        {/* Resolution (fal only) */}
        {genProvider === "fal" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label11}>Resolution</span>
            <select value={resolution} onChange={(e) => setResolution(e.target.value as Resolution)}
              style={{ ...inputBase, padding: "5px 28px 5px 10px" }}>
              <option value="1K">1K</option>
              <option value="2K">2K</option>
              <option value="4K">4K (+cost)</option>
            </select>
          </div>
        )}

        {/* Count pills */}
        {!singleOnly && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={label11}>Count</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4].map((n) => {
                const sel = numImages === n;
                return (
                  <button key={n} type="button" onClick={() => setNumImages(n)}
                    style={{
                      width: 32, height: 30, borderRadius: 6,
                      border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                      background: sel ? "var(--accent-dim)" : "transparent",
                      color: sel ? "var(--accent)" : "var(--text-secondary)",
                      fontSize: 13, cursor: "pointer", transition: "all 0.12s",
                      fontWeight: sel ? 600 : 400,
                    }}
                  >{n}</button>
                );
              })}
            </div>
          </div>
        )}

        {/* Seed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Seed</span>
          <input type="number" value={seed} onChange={(e) => setSeed(e.target.value)}
            placeholder="random"
            style={{ ...inputBase, width: 90, padding: "5px 10px" }} />
        </div>
      </div>

      {/* ── Error ───────────────────────────────────── */}
      {error && (
        <div className="animate-in" style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "8px 12px", color: "var(--red)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Submit ──────────────────────────────────── */}
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          height: 40, paddingLeft: 24, paddingRight: 24, borderRadius: 8, border: "none",
          background: canSubmit ? "var(--accent)" : "var(--surface-3)",
          color: canSubmit ? "white" : "var(--text-muted)",
          fontSize: 14, fontWeight: 500, cursor: canSubmit ? "pointer" : "not-allowed",
          display: "inline-flex", alignItems: "center", gap: 8, transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent-hover)"; }}
        onMouseLeave={(e) => { if (canSubmit) (e.currentTarget as HTMLButtonElement).style.background = "var(--accent)"; }}
      >
        {loading && <span className="spinner" />}
        {loading ? "Generating…" : "Generate"}
      </button>
    </form>
  );
}
