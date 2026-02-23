# Skill: Quality Check

## Purpose
Verify that generated and processed images meet quality standards before presenting to the user.
Automatically trigger upscaling if quality degradation is detected.

## Checks Performed

### 1. Resolution Check
```typescript
function checkResolutionQuality(
  original: { width: number; height: number },
  output: { width: number; height: number }
): { pass: boolean; ratio: number } {
  const originalPx = original.width * original.height;
  const outputPx = output.width * output.height;
  const ratio = outputPx / originalPx;
  return { pass: ratio >= 0.8, ratio };
}
```

**Threshold:** `ratio >= 0.8` → pass. Below triggers upscaling.

### 2. Alpha Channel Integrity Check
For background-removed images:
```typescript
function checkAlphaCoverage(imageBuffer: Buffer): {
  hasTransparency: boolean;
  edgeQuality: "good" | "blocky" | "missing";
} {
  // Check PNG alpha channel for expected transparency
  // Uses sharp library to inspect metadata
}
```

### 3. File Size Sanity Check
- Minimum expected: `width * height * 0.5` bytes (rough PNG floor)
- If returned file is suspiciously small → provider may have returned error image

## Automatic Actions

| Condition | Action |
|---|---|
| `qualityRatio < 0.8` | Auto-trigger upscaling (Real-ESRGAN 2x or 4x) |
| `hasTransparency === false` | Show warning: "Background may not have been removed" |
| File size too small | Retry with next provider in fallback chain |
| Provider returns non-200 | Try next provider in chain |

## Fallback Provider Chain

If a provider fails or quality check fails:

```
BiRefNet v2 → BRIA RMBG-2.0 → Remove.bg → Clipdrop → @imgly (browser)
```

User can override and manually select any provider regardless of fallback.

## API Route (Next.js)

```
POST /api/quality-check
Content-Type: application/json

Body: {
  originalImageUrl: string,
  processedImageUrl: string
}

Response: {
  passed: boolean,
  qualityRatio: number,
  hasTransparency: boolean,
  recommendation: "upscale" | "retry" | "ok",
  suggestedScale?: 2 | 4
}
```
