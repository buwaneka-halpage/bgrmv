# Skill: Remove Background

## Purpose
Remove image backgrounds with extreme precision — preserving hair strands, fur, fine edges,
and semi-transparent regions. Supports 5 different AI providers selectable from the UI.

## Provider Comparison

| Provider | Model / Engine | Hair Quality | Output | Cost | API Type |
|---|---|---|---|---|---|
| **BiRefNet v2** | `fal-ai/birefnet` | S (SOTA) | RGBA PNG | Pay-per-compute (fal.ai) | REST |
| **BRIA RMBG-2.0** | `fal-ai/bria/rmbg` | S (alpha matte) | RGBA PNG | Pay-per-compute (fal.ai) | REST |
| **Remove.bg** | Proprietary | B+ | PNG | $0.20/img | REST + npm |
| **Clipdrop** | Stability AI | B+ | PNG | ~1 credit/call | REST |
| **@imgly (browser)** | ONNX (client-side) | B | RGBA PNG | Free (AGPL) | In-browser |

## Provider 1: BiRefNet v2 (fal.ai) — Recommended for Hair

```typescript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/birefnet", {
  input: {
    image_url: imageUrl,
    model: "General Use (Heavy)",   // or "Portrait", "Matting", "Anime"
    operating_resolution: "1024",
    output_format: "png",
  },
});

const cutoutUrl = result.data.image.url;
```

**Models available:**
- `"General Use (Light)"` — faster, slightly lower quality
- `"General Use (Heavy)"` — best for detailed images
- `"Portrait"` — optimized for human subjects and hair
- `"Matting"` — hardest cases (glass, hair against complex BG)
- `"Anime"` — stylized/anime content

## Provider 2: BRIA RMBG-2.0 (Alpha Matte Output)

```typescript
const result = await fal.subscribe("fal-ai/bria/rmbg", {
  input: {
    image_url: imageUrl,
  },
});

const cutoutUrl = result.data.image.url;
```

Key advantage: BRIA outputs a grayscale **alpha matte** (0–255 per pixel), not a binary mask.
This enables semi-transparent edges, ideal for hair and motion blur compositing.

## Provider 3: Remove.bg

```typescript
// Via API
const response = await fetch("https://api.remove.bg/v1.0/removebg", {
  method: "POST",
  headers: {
    "X-Api-Key": process.env.REMOVE_BG_API_KEY!,
  },
  body: formData, // include image_file or image_url
});
const buffer = await response.arrayBuffer();
// Returns PNG binary data
```

## Provider 4: Clipdrop (Stability AI)

```typescript
const response = await fetch("https://clipdrop-api.co/remove-background/v1", {
  method: "POST",
  headers: {
    "x-api-key": process.env.CLIPDROP_API_KEY!,
  },
  body: formData, // include image_file
});
const buffer = await response.arrayBuffer();
```

## Provider 5: @imgly/background-removal (Client-Side)

```typescript
import { removeBackground } from "@imgly/background-removal";

const blob = await removeBackground(imageUrl, {
  debug: false,
  model: "medium", // or "small" (faster) / "large" (better quality)
  output: { format: "image/png", quality: 1.0 },
  progress: (key, current, total) => {
    console.log(`${key}: ${current}/${total}`);
  },
});

const url = URL.createObjectURL(blob);
```

## API Route (Next.js)

```
POST /api/remove-background
Content-Type: application/json

Body: {
  imageUrl: string,
  provider: "birefnet" | "bria" | "removebg" | "clipdrop" | "imgly",
  options?: {
    birefnetModel?: "General Use (Heavy)" | "Portrait" | "Matting",
    imglySizeModel?: "small" | "medium" | "large"
  }
}

Response: {
  resultUrl: string,
  provider: string,
  originalSize: { width: number, height: number },
  outputSize: { width: number, height: number },
  qualityRatio: number  // outputSize / originalSize — triggers upscale if < 0.8
}
```

## Quality Verification
After removal:
1. Measure output image dimensions
2. Compute `qualityRatio = outputPx / inputPx`
3. If `qualityRatio < 0.8`, trigger upscaling agent automatically
4. Log provider used + quality ratio for telemetry
