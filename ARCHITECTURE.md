# bgrmv — Architecture Documentation

> AI image generation + precision background removal
> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS
> **Last updated:** 2026-03-17

---

## 1. System Overview

bgrmv is a single-page Next.js application that orchestrates multiple AI provider APIs from a thin server layer. The browser never holds API keys — all provider calls are proxied through Next.js Route Handlers.

```mermaid
flowchart TB
    subgraph Browser["Browser (Client)"]
        UI["page.tsx\n(React SPA)"]
        IMGLY["@imgly/background-removal\n(ONNX — runs in browser)"]
    end

    subgraph NextJS["Next.js Server (Route Handlers)"]
        GEN["/api/generate"]
        RMBG["/api/remove-background"]
        UP["/api/upscale"]
        QC["/api/quality-check"]
        BRIA_R["/api/bria"]
        LOG["lib/logger.ts\n(logs/api.log)"]
    end

    subgraph Providers["External AI Providers"]
        FAL["fal.ai\n(nano-banana-pro, birefnet,\nbria/rmbg, real-esrgan)"]
        REP["Replicate\n(flux-schnell, rembg,\nreal-esrgan)"]
        HF["Hugging Face\n(FLUX.1-dev, RMBG-2.0)"]
        BRIAAPI["Bria API\n(FIBO, FIBO-Lite, RMBG-2.0,\nreplace_bg, gen_fill, enhance…)"]
        REMOVEBG["remove.bg API"]
    end

    UI -->|"POST /api/generate"| GEN
    UI -->|"POST /api/remove-background"| RMBG
    UI -->|"POST /api/upscale"| UP
    UI -->|"POST /api/quality-check"| QC
    UI -->|"POST /api/bria"| BRIA_R
    UI -->|"local ONNX inference"| IMGLY

    GEN --> FAL & REP & HF & BRIAAPI
    RMBG --> FAL & HF & REP & BRIAAPI & REMOVEBG
    UP --> FAL & REP & BRIAAPI
    QC -->|"sharp metadata"| QC
    BRIA_R --> BRIAAPI

    GEN & RMBG & UP & QC & BRIA_R --> LOG
```

---

## 2. Frontend Component Hierarchy

```mermaid
flowchart TB
    PAGE["page.tsx\n(Home — owns all state)"]

    PAGE --> IG["ImageGenerator\n(prompt → provider → generate)"]
    PAGE --> IU["ImageUpload\n(drag-drop / file picker)"]
    PAGE --> IP1["ImagePreview\n(original image)"]
    PAGE --> TAB["Tab Bar\n(bgremove / bria / upscale)"]
    TAB --> BR["BackgroundRemover\n(7 providers)"]
    TAB --> BTP["BriaToolsPanel\n(8 tools)"]
    TAB --> UP["UpscalePanel\n(3 providers)"]
    PAGE --> QS["Quality Status\n(inline pass/fail/upscale nudge)"]
    PAGE --> IP2["ImagePreview\n(bg-removed result)"]
    PAGE --> IP3["ImagePreview\n(Bria tool result)"]

    style PAGE fill:#1e1e21,stroke:#8b5cf6,color:#fafafa
    style TAB fill:#1e1e21,stroke:#3f3f46,color:#fafafa
```

### State held in `page.tsx`

| State variable | Type | Purpose |
|---|---|---|
| `generatedImages` | `GeneratedImage[]` | Strip of generated images |
| `selectedImage` | `GeneratedImage \| null` | Currently active image |
| `removedUrl` | `string \| null` | BG-removed result URL |
| `removedProvider` | `string \| null` | Which provider produced the result |
| `qualityResult` | `QualityResult \| null` | Metrics from quality check |
| `qualityChecking` | `boolean` | Quality check in flight |
| `finalUrl` / `finalSize` | `string \| null` | Upscaled output |
| `briaResultUrl` | `string \| null` | Bria tool output |
| `briaToolUsed` | `string \| null` | Which Bria tool ran |
| `activeTab` | `"bgremove" \| "bria" \| "upscale"` | Active panel tab |

---

## 3. Image Generation Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as ImageGenerator.tsx
    participant API as /api/generate
    participant FAL as fal.ai
    participant REP as Replicate
    participant HF as Hugging Face
    participant BRIA as Bria API

    User->>UI: Enter prompt, select provider, click Generate
    UI->>API: POST {prompt, provider, aspectRatio, numImages, resolution?, seed?}

    alt provider = "fal" (Nano Banana Pro)
        API->>FAL: fal.subscribe("fal-ai/nano-banana-pro", input)
        Note right of FAL: Retried up to 3× with exponential backoff
        FAL-->>API: {images: [{url, width, height}]}
    else provider = "replicate-flux-schnell"
        API->>REP: replicate.run("black-forest-labs/flux-schnell", input)
        REP-->>API: FileOutput[]
    else provider = "hf-flux"
        API->>HF: hf.textToImage({model: "black-forest-labs/FLUX.1-dev"})
        HF-->>API: URL string
    else provider = "bria" / "bria-lite"
        API->>BRIA: POST /v2/image/generate[/lite] {sync: true}
        BRIA-->>API: {result: {image_url}}
    end

    API-->>UI: {images: [{url, width, height}]}
    UI-->>User: Show image strip, auto-select first image
```

### Generation Provider Matrix

| Provider Key | Model ID | Platform | Cost/image | Multi-image | Resolution control |
|---|---|---|---|---|---|
| `replicate-flux-schnell` | `black-forest-labs/flux-schnell` | Replicate | ~$0.003 | ✅ up to 4 | aspect ratio only |
| `hf-flux` | `black-forest-labs/FLUX.1-dev` | Hugging Face | ~$0.005 | ❌ | none |
| `bria` | FIBO (standard) | Bria API | varies | ❌ | 1MP fixed |
| `bria-lite` | FIBO Lite | Bria API | varies | ❌ | none |
| `fal` | `fal-ai/nano-banana-pro` | fal.ai | ~$0.04 | ✅ up to 4 | 1K / 2K / 4K |

---

## 4. Background Removal Pipeline

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as BackgroundRemover.tsx
    participant API as /api/remove-background
    participant QC as /api/quality-check
    participant FAL as fal.ai
    participant HF as Hugging Face
    participant REP as Replicate
    participant BRIA as Bria API
    participant REMOVEBG as remove.bg

    User->>UI: Select provider, click Remove Background

    alt provider = "imgly" (browser ONNX)
        UI->>UI: Dynamic import @imgly/background-removal
        Note right of UI: Runs entirely in browser — no server call
        UI-->>User: RGBA PNG (data URL)
    else server providers
        UI->>API: POST {imageUrl, provider, options?}

        alt provider = "birefnet"
            API->>FAL: fal.subscribe("fal-ai/birefnet", {model, operating_resolution})
            FAL-->>API: {image: {url}}
        else provider = "bria"
            API->>FAL: fal.subscribe("fal-ai/bria/rmbg")
            FAL-->>API: {image: {url}}
        else provider = "bria-rmbg"
            API->>BRIA: POST /v2/image/edit/remove_background {sync: true}
            BRIA-->>API: {result: {image_url}}
        else provider = "hf-rmbg"
            API->>HF: hf.imageSegmentation("briaai/RMBG-2.0")
            HF-->>API: Blob (PNG)
            Note right of API: Converts to base64 data URL
        else provider = "replicate-rembg"
            API->>REP: replicate.run("cjwbw/rembg")
            REP-->>API: FileOutput URL
        else provider = "removebg"
            API->>REMOVEBG: POST /v1.0/removebg (multipart)
            REMOVEBG-->>API: PNG binary
            Note right of API: Converts to base64 data URL
        end

        API-->>UI: {resultUrl, provider}
    end

    UI->>QC: POST {originalImageUrl, processedImageUrl}
    Note right of QC: Uses sharp to inspect metadata
    QC-->>UI: {passed, qualityRatio, hasTransparency, recommendation, suggestedScale?}

    alt recommendation = "upscale"
        UI-->>User: ⚠️ Quality degraded — prompt to switch to Upscale tab
    else recommendation = "retry"
        UI-->>User: ⚠️ No transparency detected — suggest retry
    else passed
        UI-->>User: ✅ Quality passed
    end
```

### Background Removal Provider Matrix

| Provider Key | Model | Platform | Cost/image | Quality | Output format |
|---|---|---|---|---|---|
| `birefnet` | BiRefNet v2 | fal.ai | ~$0.02 | S-tier | PNG URL |
| `bria` | BRIA RMBG-2.0 | fal.ai | ~$0.02 | S-tier | PNG URL |
| `bria-rmbg` | BRIA RMBG-2.0 | Bria direct API | varies | S-tier | URL |
| `hf-rmbg` | briaai/RMBG-2.0 | Hugging Face | ~$0.001 | A-tier | data URL |
| `replicate-rembg` | cjwbw/rembg | Replicate | ~$0.004 | A-tier | URL |
| `removebg` | Proprietary | remove.bg | ~$0.07 | B-tier | data URL |
| `imgly` | ISNet (ONNX) | Browser | Free | B-tier | data URL |

---

## 5. Quality Check + Upscaling Pipeline

```mermaid
flowchart LR
    BG["Background\nRemoved Image"] --> QC

    subgraph QC["Quality Check — /api/quality-check"]
        FETCH["Fetch both images\n(supports data: URLs)"] --> META
        META["sharp.metadata()\nwidth × height\nhasAlpha, channels"] --> CALC
        CALC["qualityRatio =\noutputPx / origPx\n\nhasTransparency =\nhasAlpha && channels===4\n\nfileSizeOk =\nbytes ≥ px × 0.5"]
        CALC --> DEC{All pass?}
    end

    DEC -->|"ratio < 0.8"| UPSCALE["recommend: upscale\nsuggestedScale: 2 or 4"]
    DEC -->|"no alpha / bad size"| RETRY["recommend: retry"]
    DEC -->|"all pass"| OK["recommend: ok\n✅"]

    UPSCALE --> UP

    subgraph UP["Upscale — /api/upscale"]
        PROV{Provider?}
        PROV -->|"replicate-esrgan"| REPO["nightmareai/real-esrgan\n~$0.004"]
        PROV -->|"real-esrgan"| FALUP["fal-ai/real-esrgan\n~$0.02"]
        PROV -->|"bria"| BRIAUP["Bria /increase_resolution\nvaries"]
    end

    UP --> RESULT["Final upscaled\nRGBA PNG"]

    style OK fill:#052e16,stroke:#22c55e,color:#4ade80
    style RETRY fill:#431407,stroke:#f59e0b,color:#fbbf24
    style UPSCALE fill:#2d1657,stroke:#8b5cf6,color:#a78bfa
```

### Quality Check Logic (code-level)

```
passed = (qualityRatio >= 0.8) AND hasTransparency AND fileSizeOk

recommendation:
  fileSizeOk === false  → "retry"   (provider returned garbage)
  qualityRatio < 0.8    → "upscale" (resolution degraded)
  hasTransparency false → "retry"   (alpha channel missing)
  otherwise             → "ok"

suggestedScale:
  maxDim < 512px → 4×
  else           → 2×
```

---

## 6. Bria AI Tools Pipeline

The `/api/bria` route is a **generic action dispatcher** — a single endpoint that maps an `action` string to a Bria API path and forwards all remaining params.

```mermaid
flowchart LR
    UI["BriaToolsPanel.tsx\naction + params"] -->|"POST /api/bria\n{action, image, ...params}"| ROUTE

    subgraph ROUTE["/api/bria Route Handler"]
        VALIDATE["Validate action\nfrom ACTION_PATHS map"] --> STRIP["Strip data: URL\nprefix from image/mask"] --> CALL["fetch BRIA_BASE + path\n{...params, sync: true}"]
    end

    CALL --> BRIAAPI["Bria API\nhttps://engine.prod.bria-api.com/v2"]

    BRIAAPI --> R1["replace_background\n/image/edit/replace_background"]
    BRIAAPI --> R2["gen_fill\n/image/edit/gen_fill"]
    BRIAAPI --> R3["erase\n/image/edit/erase"]
    BRIAAPI --> R4["enhance\n/image/edit/enhance"]
    BRIAAPI --> R5["expand\n/image/edit/expand"]
    BRIAAPI --> R6["blur_background\n/image/edit/blur_background"]
    BRIAAPI --> R7["erase_foreground\n/image/edit/erase_foreground"]
    BRIAAPI --> R8["crop_foreground\n/image/edit/crop_foreground"]

    ROUTE -->|"{result, action}"| UI
```

---

## 7. API Route Reference

| Route | Method | Required body fields | Returns |
|---|---|---|---|
| `/api/generate` | POST | `prompt` | `{images: [{url, width, height}]}` |
| `/api/remove-background` | POST | `imageUrl` | `{resultUrl, provider}` |
| `/api/upscale` | POST | `imageUrl` | `{resultUrl, originalSize, outputSize, scaleApplied}` |
| `/api/quality-check` | POST | `originalImageUrl`, `processedImageUrl` | `{passed, qualityRatio, hasTransparency, recommendation, suggestedScale?, originalSize, outputSize}` |
| `/api/bria` | POST | `action`, `image` (+ action-specific) | `{result: {image_url}, action}` |

### Error Responses (all routes)
```json
{ "error": "Human-readable message" }
```
HTTP status: `400` for missing/invalid params, `422` for safety violations (generate), `500` for provider errors.

---

## 8. Logging (`src/lib/logger.ts`)

All route handlers emit structured log lines to `logs/api.log`. Data URLs and raw base64 strings are automatically sanitized.

```
[2026-03-17T10:00:00.000Z] REQ  /api/generate              → request  provider="fal"  prompt="a cat..."
[2026-03-17T10:00:04.382Z] OK   /api/generate              ← 4382ms   provider="fal"  images=1
[2026-03-17T10:00:04.500Z] REQ  /api/remove-background     → request  provider="birefnet"  imageUrl="https://..."
[2026-03-17T10:00:07.120Z] OK   /api/remove-background     ← 2620ms   provider="birefnet"
[2026-03-17T10:00:07.130Z] REQ  /api/quality-check         → request  ...
[2026-03-17T10:00:07.380Z] ERR  /api/quality-check         ← 250ms    error="Failed to fetch image: 403"
```

**Sanitization rules:**
- `data:image/...;base64,...` strings → `[~NNkB base64]`
- Raw base64 > 200 chars with no whitespace → `[~NNkB base64]`
- Strings > 100 chars → truncated with `...`

---

## 9. Environment Variables

| Variable | Used by routes | Required? |
|---|---|---|
| `FAL_KEY` | `/api/generate`, `/api/remove-background`, `/api/upscale` | For fal.ai providers |
| `REPLICATE_API_TOKEN` | `/api/generate`, `/api/remove-background`, `/api/upscale` | For Replicate providers |
| `HF_TOKEN` | `/api/generate`, `/api/remove-background` | For Hugging Face providers |
| `BRIA_API_TOKEN` | `/api/generate`, `/api/remove-background`, `/api/upscale`, `/api/bria` | For all Bria providers |
| `REMOVE_BG_API_KEY` | `/api/remove-background` | For `removebg` provider only |

All variables are read at **request time** (not module init), so missing keys fail gracefully with a 500 error per-request rather than crashing the server.

---

## 10. User Journey

```mermaid
stateDiagram-v2
    [*] --> Idle: App loads

    Idle --> Generating: User submits prompt
    Idle --> ImageSelected: User uploads file

    Generating --> ImageSelected: Images returned
    Generating --> Idle: Error

    ImageSelected --> RemovingBG: User clicks Remove BG\n(server provider)
    ImageSelected --> BriaProcessing: User runs Bria tool
    ImageSelected --> Upscaling: User clicks Upscale

    RemovingBG --> QualityChecking: Result received
    QualityChecking --> ResultReady: Passed
    QualityChecking --> UpscalePrompted: qualityRatio < 0.8
    QualityChecking --> RetryPrompted: No transparency / bad size

    UpscalePrompted --> Upscaling: User switches to Upscale tab
    Upscaling --> ResultReady: Upscaled URL returned

    BriaProcessing --> BriaResultReady: Result URL returned

    ResultReady --> [*]: User downloads PNG
    BriaResultReady --> [*]: User downloads PNG
```

---

## 11. File Structure

```
bgrmv/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout — Geist font, metadata
│   │   ├── page.tsx              # Main SPA — owns all state
│   │   ├── globals.css           # Design tokens + animation utilities
│   │   └── api/
│   │       ├── generate/         # Image generation (4 providers)
│   │       ├── remove-background/# BG removal (6 server providers)
│   │       ├── upscale/          # Upscaling (3 providers)
│   │       ├── quality-check/    # sharp-based quality gate
│   │       └── bria/             # Generic Bria action dispatcher
│   ├── components/
│   │   ├── ImageGenerator.tsx    # Prompt form + model picker
│   │   ├── ImageUpload.tsx       # Drag-drop file upload
│   │   ├── ImagePreview.tsx      # Image display + download
│   │   ├── BackgroundRemover.tsx # 7-provider BG removal UI
│   │   ├── BriaToolsPanel.tsx    # 8 Bria editing tools
│   │   └── UpscalePanel.tsx      # 3-provider upscale UI
│   └── lib/
│       └── logger.ts             # Structured file logger
├── skills/                       # Agent skill documentation
│   ├── generate-image.md
│   ├── remove-background.md
│   ├── upscale-image.md
│   └── quality-check.md
├── .interface-design/
│   └── system.md                 # Design token system (Neural Dark)
├── agents.md                     # Agent role manifest
├── ARCHITECTURE.md               # This file
└── README.md
```
