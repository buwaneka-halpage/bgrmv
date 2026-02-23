# Skill: Generate Image

## Purpose
Generate high-quality images from text prompts using Google's Nano Banana Pro model via fal.ai.

## Model
- **fal.ai endpoint:** `fal-ai/nano-banana-pro`
- **Underlying model:** `gemini-3-pro-image-preview` (Google Nano Banana Pro)

## Parameters

| Parameter | Type | Values | Default |
|---|---|---|---|
| `prompt` | string | Any text description | required |
| `num_images` | number | 1–4 | 1 |
| `aspect_ratio` | string | `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"` | `"1:1"` |
| `resolution` | string | `"1K"`, `"2K"`, `"4K"` | `"2K"` |
| `output_format` | string | `"jpeg"`, `"png"`, `"webp"` | `"png"` |
| `safety_tolerance` | number | 1–6 | 3 |
| `seed` | number | Any integer | random |
| `enable_web_search` | boolean | true/false | false |

## Usage (TypeScript)

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/nano-banana-pro", {
  input: {
    prompt: "A professional portrait photo of a woman with flowing hair",
    num_images: 1,
    aspect_ratio: "1:1",
    resolution: "2K",
    output_format: "png",
    safety_tolerance: 3,
  },
  logs: true,
  onQueueUpdate: (update) => {
    if (update.status === "IN_PROGRESS") {
      update.logs?.forEach((log) => console.log(log.message));
    }
  },
});

const imageUrl = result.data.images[0].url;
```

## API Route (Next.js)

```
POST /api/generate
Content-Type: application/json

Body: {
  prompt: string,
  aspectRatio?: string,
  resolution?: string,
  numImages?: number,
  seed?: number
}

Response: {
  images: Array<{ url: string, width: number, height: number }>,
  seed: number,
  timings: object
}
```

## Error Handling
- Queue timeout: retry up to 3 times with exponential backoff
- Safety filter rejection: return user-friendly error with sanitization suggestion
- Rate limit: 429 response triggers client-side queue indicator

## Pricing
- $0.15 per image (1K/2K resolution)
- $0.30 per image (4K resolution — billed at double rate)
