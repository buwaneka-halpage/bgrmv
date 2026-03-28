"use client";

import { useState } from "react";

type BriaTool =
  | "replace_background"
  | "gen_fill"
  | "erase"
  | "enhance"
  | "expand"
  | "blur_background"
  | "erase_foreground"
  | "crop_foreground";

interface ToolDef {
  value: BriaTool;
  label: string;
  description: string;
  icon: string;
}

const TOOLS: ToolDef[] = [
  { value: "replace_background", label: "Replace BG",     description: "Describe a new background", icon: "🌅" },
  { value: "gen_fill",           label: "Gen Fill",        description: "Fill masked area with AI",  icon: "✨" },
  { value: "erase",              label: "Erase Object",    description: "Remove via mask",            icon: "🧹" },
  { value: "enhance",            label: "Enhance",         description: "Improve quality & detail",  icon: "⚡" },
  { value: "expand",             label: "Expand",          description: "Outpaint beyond borders",   icon: "↔️" },
  { value: "blur_background",    label: "Blur BG",         description: "Keep subject sharp",        icon: "🎯" },
  { value: "erase_foreground",   label: "Erase Subject",   description: "Remove subject, fill BG",   icon: "🪄" },
  { value: "crop_foreground",    label: "Crop Subject",    description: "Auto-crop to subject",      icon: "✂️" },
];

interface Props {
  imageUrl: string;
  onResult: (resultUrl: string, tool: string) => void;
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

export default function BriaToolsPanel({ imageUrl, onResult }: Props) {
  const [tool, setTool]           = useState<BriaTool>("replace_background");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [prompt, setPrompt]       = useState("");
  const [maskUrl, setMaskUrl]     = useState("");
  const [aspectRatio, setAspectRatio]       = useState("16:9");
  const [blurScale, setBlurScale]           = useState(3);
  const [enhanceResolution, setEnhanceResolution] = useState("1MP");

  async function handleRun() {
    setLoading(true);
    setError(null);

    try {
      const body: Record<string, unknown> = { action: tool, image: imageUrl };

      switch (tool) {
        case "replace_background":
          if (!prompt.trim()) { setError("Prompt required for Replace Background"); return; }
          body.prompt = prompt.trim();
          break;
        case "gen_fill":
          if (!prompt.trim() || !maskUrl.trim()) { setError("Prompt and mask URL required"); return; }
          body.prompt = prompt.trim();
          body.mask   = maskUrl.trim();
          break;
        case "erase":
          if (!maskUrl.trim()) { setError("Mask URL required for Erase"); return; }
          body.mask = maskUrl.trim();
          break;
        case "enhance":
          body.resolution = enhanceResolution;
          break;
        case "expand":
          body.aspect_ratio = aspectRatio;
          break;
        case "blur_background":
          body.scale = blurScale;
          break;
      }

      const res = await fetch("/api/bria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Bria tool failed"); return; }

      const resultUrl = data.result?.image_url ?? data.result?.url ?? "";
      if (!resultUrl) { setError("No image URL in Bria response"); return; }
      onResult(resultUrl, tool);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const needsPrompt = tool === "replace_background" || tool === "gen_fill";
  const needsMask   = tool === "gen_fill" || tool === "erase";
  const currentTool = TOOLS.find((t) => t.value === tool);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Tool grid ───────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={label11}>Tool</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {TOOLS.map((t) => {
            const sel = tool === t.value;
            return (
              <label
                key={t.value}
                style={{
                  display: "flex", flexDirection: "column", gap: 2,
                  padding: "10px 11px", borderRadius: 8,
                  border: `1px solid ${sel ? "var(--accent)" : "var(--border)"}`,
                  background: sel ? "var(--accent-dim)" : "var(--surface-2)",
                  cursor: "pointer", transition: "border-color 0.12s, background 0.12s",
                }}
              >
                <input type="radio" name="briaTool" value={t.value} checked={sel}
                  onChange={() => setTool(t.value)} style={{ display: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{t.icon}</span>
                  <span style={{ fontWeight: 500, color: "var(--text-primary)", fontSize: 13 }}>{t.label}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.3 }}>{t.description}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* ── Contextual params ───────────────────────── */}
      {needsPrompt && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>
            {tool === "replace_background" ? "Background Description" : "Fill Description"}
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={tool === "replace_background"
              ? "A tropical beach at sunset with palm trees…"
              : "A red sports car parked on the street…"}
            rows={2}
            style={{ ...inputBase, padding: "8px 12px", resize: "none", width: "100%", lineHeight: 1.6 }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-bright)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
          />
        </div>
      )}

      {needsMask && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Mask Image URL</span>
          <input type="text" value={maskUrl} onChange={(e) => setMaskUrl(e.target.value)}
            placeholder="URL to white/black mask (white = area to modify)"
            style={{ ...inputBase, padding: "7px 11px", width: "100%" }}
            onFocus={(e) => (e.target.style.borderColor = "var(--border-bright)")}
            onBlur={(e)  => (e.target.style.borderColor = "var(--border)")}
          />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            White = modify, Black = preserve
          </span>
        </div>
      )}

      {tool === "expand" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Target Aspect Ratio</span>
          <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}
            style={{ ...inputBase, padding: "5px 28px 5px 10px", width: "fit-content" }}>
            {["1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9"].map((r) =>
              <option key={r} value={r}>{r}</option>
            )}
          </select>
        </div>
      )}

      {tool === "blur_background" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={label11}>Blur Intensity</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <input type="range" min={1} max={5} value={blurScale}
              onChange={(e) => setBlurScale(parseInt(e.target.value))} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              {[1,2,3,4,5].map((n) => (
                <span key={n} style={{ fontSize: 10, color: n === blurScale ? "var(--accent)" : "var(--text-muted)" }}>
                  {n}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {tool === "enhance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={label11}>Output Resolution</span>
          <select value={enhanceResolution} onChange={(e) => setEnhanceResolution(e.target.value)}
            style={{ ...inputBase, padding: "5px 28px 5px 10px", width: "fit-content" }}>
            <option value="1MP">1 MP</option>
            <option value="2MP">2 MP</option>
            <option value="4MP">4 MP</option>
          </select>
        </div>
      )}

      {/* ── Error ───────────────────────────────────── */}
      {error && (
        <div className="animate-in" style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "8px 12px", color: "var(--red)", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* ── Action ──────────────────────────────────── */}
      <button
        onClick={handleRun}
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
        {loading ? "Processing…" : `Run ${currentTool?.icon ?? ""} ${currentTool?.label ?? tool}`}
      </button>
    </div>
  );
}
