# BGRMV — Agent Manifest

## Project Overview

**bgrmv** is an AI-powered image generation and background removal application.
Users generate images using Google's Nano Banana Pro model (via fal.ai) and can remove
backgrounds with multiple precision-focused AI providers. All outputs maintain original
quality with optional upscaling.

---

## Agent Roles

### 1. Image Generation Agent
**Responsibility:** Generate images from text prompts using the Nano Banana Pro model.

- **Model:** `fal-ai/nano-banana-pro`
- **Capabilities:** Text-to-image, aspect ratio control, resolution up to 4K, seed control
- **Trigger:** User submits a text prompt in the generator UI
- **Output:** Full-resolution PNG/WebP stored temporarily; passed to background removal agent if requested

### 2. Background Removal Agent
**Responsibility:** Remove image backgrounds with extreme precision, preserving hair, fur, fine details, and semi-transparent edges.

**Supported Providers (in quality order):**

| Priority | Provider | Model | Strength |
|---|---|---|---|
| 1 | fal.ai BiRefNet v2 | `fal-ai/birefnet` | SOTA, best for hair/fine detail |
| 2 | BRIA RMBG-2.0 | `fal-ai/bria/rmbg` | Alpha matte output, semi-transparency |
| 3 | Remove.bg | `remove.bg` npm | Battle-tested, fast |
| 4 | Clipdrop (Stability AI) | REST API | Good quality + companion upscaler |
| 5 | @imgly/background-removal | Browser ONNX | Zero API cost, client-side |

- **Trigger:** User clicks "Remove Background" and selects a provider
- **Output:** RGBA PNG with transparent background; quality is verified post-processing

### 3. Upscaling Agent
**Responsibility:** Restore or enhance image resolution if quality degradation occurs during background removal.

- **Primary:** fal.ai Real-ESRGAN (`fal-ai/real-esrgan`)
- **Secondary:** Clipdrop Upscaling API (companion to Clipdrop BG removal)
- **Trigger:** Automatically if output resolution is below 80% of input, or on user request
- **Output:** Upscaled RGBA PNG matching or exceeding original resolution

---

## Skills Used

| Skill File | Purpose |
|---|---|
| `skills/generate-image.md` | Image generation with Nano Banana Pro via fal.ai |
| `skills/remove-background.md` | Multi-provider background removal orchestration |
| `skills/upscale-image.md` | AI upscaling with Real-ESRGAN / Clipdrop |
| `skills/quality-check.md` | Resolution & quality verification logic |

---

## Architecture

```
User Prompt
     │
     ▼
[Image Generation Agent]  ───► fal-ai/nano-banana-pro
     │
     ▼
Generated Image (full-res PNG/WebP)
     │
     ├──► Display to user (with download option)
     │
     └──► [Background Removal Agent]  (on user request)
               │
               ├── BiRefNet v2 (fal.ai) ─────────────────┐
               ├── BRIA RMBG-2.0 (fal.ai) ───────────────┤
               ├── Remove.bg API ────────────────────────┤
               ├── Clipdrop API ──────────────────────────┤
               └── @imgly/background-removal (browser) ──┘
                              │
                              ▼
                    Background-Removed RGBA PNG
                              │
                    [Quality Check Agent]
                              │
                    Resolution < threshold?
                         Yes ─────► [Upscaling Agent] ──► Real-ESRGAN / Clipdrop
                         No ──────► Display + Download
```

---

## Environment Variables Required

```
FAL_KEY                    # fal.ai API key
REMOVE_BG_API_KEY          # remove.bg API key
CLIPDROP_API_KEY           # Clipdrop (Stability AI) API key
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Image Generation:** fal.ai (`@fal-ai/client`)
- **Background Removal:** Multiple providers (see above)
- **Upscaling:** fal.ai Real-ESRGAN
- **State Management:** React hooks + server actions

---

## Industry Standards Followed

- All API keys in environment variables (`.env.local`, never committed)
- Agents have single, clear responsibilities (SRP)
- Skills documented in `/skills/` directory
- Error boundaries on all async operations
- Image quality verified before delivery
- Graceful fallback chain if a provider fails
