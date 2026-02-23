# Skill: Upscale Image

## Purpose
Restore or enhance image resolution after background removal if output quality degrades.
Also available on-demand from the UI.

## Trigger Conditions
- `qualityRatio < 0.8` (output resolution below 80% of input)
- User manually clicks "Upscale" button
- Provider: Remove.bg or Clipdrop returned lower resolution than input

## Provider 1: Real-ESRGAN via fal.ai (Primary)

**Endpoint:** `fal-ai/real-esrgan`

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/real-esrgan", {
  input: {
    image_url: imageUrl,
    scale: 2,            // 2x or 4x
    face_enhance: true,  // Enables GFPGAN face enhancement
    model: "RealESRGAN_x4plus",   // or "RealESRGAN_x2plus" for 2x
  },
});

const upscaledUrl = result.data.image.url;
```

**Models:**
- `RealESRGAN_x4plus` — 4x, general photography
- `RealESRGAN_x2plus` — 2x, sharp textures
- `RealESRGAN_x4plus_anime_6B` — 4x, stylized/anime

## Provider 2: Clipdrop Upscaler (Secondary — requires Clipdrop key)

```typescript
const response = await fetch("https://clipdrop-api.co/image-upscaling/v1/upscale", {
  method: "POST",
  headers: {
    "x-api-key": process.env.CLIPDROP_API_KEY!,
  },
  body: formData, // image_file + target_width + target_height
});
const buffer = await response.arrayBuffer();
```

## Scale Strategy

| Input Resolution | Target | Scale Factor |
|---|---|---|
| < 512px | 2048px | 4x |
| 512–1024px | 2048px | 2x |
| 1024–2048px | Original | 1x (skip) |
| > 2048px | Original | 1x (skip) |

## API Route (Next.js)

```
POST /api/upscale
Content-Type: application/json

Body: {
  imageUrl: string,
  targetScale?: 2 | 4,
  faceEnhance?: boolean,
  provider?: "real-esrgan" | "clipdrop"
}

Response: {
  resultUrl: string,
  originalSize: { width: number, height: number },
  outputSize: { width: number, height: number },
  scaleApplied: number
}
```

## Notes
- Always upscale RGBA PNG (with transparency) — Real-ESRGAN preserves alpha channel
- Face enhancement (`GFPGAN`) significantly improves portrait quality
- Upscaling is chained automatically after background removal if quality drops
