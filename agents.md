# BGRMV — Agent Manifest

## Project Overview

**bgrmv** is an AI-powered image generation, editing, and background removal application.
Users generate images using multiple AI providers (fal.ai, Replicate, Hugging Face, Bria) and can remove
backgrounds with precision-focused AI providers. Additional Bria AI editing tools provide
replace background, generative fill, erase, enhance, expand, blur, and more.
All outputs maintain original quality with optional upscaling.

---

## Agent Roles

### 1. Image Generation Agent
**Responsibility:** Generate images from text prompts using multiple provider options.

**Supported Providers:**

| Provider | Model | Cost/image | Strength |
|---|---|---|---|
| Replicate | `black-forest-labs/flux-schnell` | ~$0.003 | Fast, cheap, high quality |
| Hugging Face | `black-forest-labs/FLUX.1-dev` | ~$0.005 | Cheap, good quality |
| fal.ai | `fal-ai/nano-banana-pro` | ~$0.04 | Premium, resolution control up to 4K |
| Bria | FIBO (standard) | varies | Two-stage VLM+generation, high fidelity |
| Bria | FIBO Lite | varies | Faster, supports on-prem deployment |

- **Trigger:** User submits a text prompt in the generator UI
- **Output:** Full-resolution PNG stored temporarily; passed to background removal agent if requested

### 2. Background Removal Agent
**Responsibility:** Remove image backgrounds with extreme precision, preserving hair, fur, fine details, and semi-transparent edges.

**Supported Providers (in quality order):**

| Priority | Provider | Model | Cost/image | Strength |
|---|---|---|---|---|
| 1 | fal.ai BiRefNet v2 | `fal-ai/birefnet` | ~$0.02 | SOTA, best for hair/fine detail |
| 2 | fal.ai BRIA RMBG-2.0 | `fal-ai/bria/rmbg` | ~$0.02 | Alpha matte output, semi-transparency |
| 3 | Bria Direct API | RMBG-2.0 | varies | Direct Bria API, preserves alpha |
| 4 | Hugging Face RMBG-2.0 | `briaai/RMBG-2.0` | ~$0.001 | Cheap, good quality |
| 5 | Replicate rembg | `cjwbw/rembg` | ~$0.004 | Cheap, solid quality |
| 6 | Remove.bg | REST API | ~$0.07-0.20 | Battle-tested, fast |
| 7 | @imgly/background-removal | Browser ONNX | FREE | Zero API cost, client-side |

- **Trigger:** User clicks "Remove Background" and selects a provider
- **Output:** RGBA PNG with transparent background; quality is verified post-processing

### 3. Upscaling Agent
**Responsibility:** Restore or enhance image resolution if quality degradation occurs during background removal.

- **Primary:** Replicate Real-ESRGAN (`nightmareai/real-esrgan`) — ~$0.004/image
- **Secondary:** fal.ai Real-ESRGAN (`fal-ai/real-esrgan`) — ~$0.02/image
- **Tertiary:** Bria Increase Resolution (`/v2/image/edit/increase_resolution`) — 2x or 4x
- **Trigger:** Automatically if output resolution is below 80% of input, or on user request
- **Output:** Upscaled RGBA PNG matching or exceeding original resolution

### 4. Bria AI Editing Agent
**Responsibility:** Provide advanced AI image editing tools via the Bria API.

**Supported Tools:**

| Tool | Endpoint | Description |
|---|---|---|
| Replace Background | `/v2/image/edit/replace_background` | Replace BG with text-described scene |
| Generative Fill | `/v2/image/edit/gen_fill` | Fill masked area with AI content |
| Erase Object | `/v2/image/edit/erase` | Remove objects via mask |
| Enhance | `/v2/image/edit/enhance` | Improve image quality (1-4 MP) |
| Expand (Outpaint) | `/v2/image/edit/expand` | Extend image beyond borders |
| Blur Background | `/v2/image/edit/blur_background` | Keep subject sharp, blur BG |
| Erase Foreground | `/v2/image/edit/erase_foreground` | Remove subject, reconstruct BG |
| Crop Foreground | `/v2/image/edit/crop_foreground` | Auto-crop to main subject |

- **Base URL:** `https://engine.prod.bria-api.com/v2`
- **Auth:** `api_token` header
- **Mode:** Synchronous (`sync: true`) for immediate results
- **Trigger:** User selects a Bria tool and clicks "Run"
- **Output:** Processed image URL

---

## Skills Used

| Skill File | Purpose |
|---|---|
| `skills/generate-image.md` | Multi-provider image generation |
| `skills/remove-background.md` | Multi-provider background removal orchestration |
| `skills/upscale-image.md` | AI upscaling with Real-ESRGAN (Replicate / fal.ai) |
| `skills/quality-check.md` | Resolution & quality verification logic |

---

## Architecture

```
User Prompt
     |
     v
[Image Generation Agent]
     |-- Replicate Flux Schnell (default, cheap)
     |-- Hugging Face FLUX.1-dev (cheap)
     |-- Bria FIBO / FIBO Lite (quality)
     +-- fal.ai nano-banana-pro (premium)
     |
     v
Generated Image (full-res PNG)
     |
     |---> Display to user (with download option)
     |
     |---> [Background Removal Agent]  (on user request)
     |          |
     |          |-- BiRefNet v2 (fal.ai)
     |          |-- BRIA RMBG-2.0 (fal.ai)
     |          |-- BRIA RMBG-2.0 (Bria API direct)
     |          |-- RMBG-2.0 (Hugging Face)
     |          |-- rembg (Replicate)
     |          |-- Remove.bg API
     |          +-- @imgly/background-removal (browser)
     |          |
     |          v
     |   Background-Removed RGBA PNG
     |          |
     |   [Quality Check Agent]
     |          |
     |   Resolution < threshold?
     |        Yes --> [Upscaling Agent] --> Real-ESRGAN / Bria
     |        No  --> Display + Download
     |
     +---> [Bria AI Editing Agent]  (on user request)
               |
               |-- Replace Background
               |-- Generative Fill
               |-- Erase Object
               |-- Enhance
               |-- Expand (Outpaint)
               |-- Blur Background
               |-- Erase Foreground
               +-- Crop Foreground
               |
               v
            Edited Image URL --> Display + Download
```

---

## Environment Variables Required

```
FAL_KEY                    # fal.ai API key (premium providers)
HF_TOKEN                   # Hugging Face API token
REPLICATE_API_TOKEN        # Replicate API token
REMOVE_BG_API_KEY          # remove.bg API key (optional)
BRIA_API_TOKEN             # Bria AI API token (generation, editing, bg removal)
```

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Image Generation:** fal.ai (`@fal-ai/client`), Replicate (`replicate`), Hugging Face (`@huggingface/inference`), Bria API
- **Background Removal:** Multiple providers (see above)
- **Image Editing:** Bria AI API (replace bg, gen fill, erase, enhance, expand, blur, etc.)
- **Upscaling:** Replicate / fal.ai Real-ESRGAN, Bria Increase Resolution
- **Client-side BG Removal:** `@imgly/background-removal` (ONNX)
- **State Management:** React hooks

---

## Industry Standards Followed

- All API keys in environment variables (`.env.local`, never committed)
- Agents have single, clear responsibilities (SRP)
- Skills documented in `/skills/` directory
- Error boundaries on all async operations
- Image quality verified before delivery
- Graceful fallback chain if a provider fails
