# bgrmv Design System

## Direction
**Neural Dark** — A precision dark interface that lets generated images be the hero.
Inspired by Midjourney, Runway, and Ideogram. Dense but breathable, with a single violet accent.

## Foundation
- Base: Near-black `#09090b` — avoids pure black harshness
- Surface hierarchy: 3 levels of dark layering
- Accent: Electric violet `#8b5cf6` — signals AI capability
- Typography: Tight, technical. Small caps labels, confident weights

## Depth System (Dark → Light)
| Token | Value | Usage |
|---|---|---|
| `--bg` | `#09090b` | Page background |
| `--surface-1` | `#111113` | Card backgrounds |
| `--surface-2` | `#18181b` | Raised elements, hover targets |
| `--surface-3` | `#1e1e21` | Selected state, active inputs |
| `--border` | `#27272a` | Default borders |
| `--border-bright` | `#3f3f46` | Focus/hover borders |

## Color Tokens
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#fafafa` | Headings, body |
| `--text-secondary` | `#a1a1aa` | Labels, descriptions |
| `--text-muted` | `#52525b` | Placeholders, disabled |
| `--accent` | `#8b5cf6` | Primary actions, selected state |
| `--accent-hover` | `#7c3aed` | Button hover |
| `--accent-dim` | `rgba(139,92,246,0.15)` | Accent backgrounds |
| `--green` | `#22c55e` | Success, quality pass |
| `--amber` | `#f59e0b` | Warnings |
| `--red` | `#ef4444` | Errors |

## Spacing
- Base: 4px
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48

## Radius Scale
| Use | Value |
|---|---|
| Tags / badges | `4px` |
| Inputs, buttons | `8px` |
| Cards, panels | `12px` |
| Large sections | `16px` |

## Typography
- Body: 14px / 1.5
- Labels: 11px uppercase tracking-wider (small caps)
- Headings: 16–20px semibold tight
- Code / monospace: 12px

## Patterns

### Button Primary
- `h-10 px-5 rounded-[8px] bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium`
- Disabled: `opacity-40 cursor-not-allowed`
- Loading: spinner + dimmed text

### Button Secondary
- `h-9 px-4 rounded-[8px] border border-[--border] hover:border-[--border-bright] hover:bg-[--surface-2] text-[--text-secondary] text-sm`

### Card
- `rounded-[16px] border border-[--border] bg-[--surface-1] p-5`

### Input / Textarea
- `rounded-[8px] border border-[--border] bg-[--surface-2] px-3 py-2 text-sm text-[--text-primary]`
- Focus: `border-[--border-bright] outline-none ring-0`
- Placeholder: `text-[--text-muted]`

### Radio Card (Provider / Tool selector)
- Default: `border-[--border] bg-transparent`
- Selected: `border-violet-600 bg-[--accent-dim]`
- Text: label in `text-[--text-primary]`, badge in `text-[--text-muted] text-xs`

### Section Label
- `text-[11px] font-semibold uppercase tracking-widest text-[--text-muted]`

### Quality Badge
- Pass: `bg-green-500/10 text-green-400 border-green-500/20`
- Warn: `bg-amber-500/10 text-amber-400 border-amber-500/20`
- Error: `bg-red-500/10 text-red-400 border-red-500/20`

## Checkerboard (for transparent images)
```css
background-image: linear-gradient(45deg, #1e1e21 25%, transparent 25%),
  linear-gradient(-45deg, #1e1e21 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #1e1e21 75%),
  linear-gradient(-45deg, transparent 75%, #1e1e21 75%);
background-size: 12px 12px;
background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
background-color: #111113;
```

## Last updated: 2026-03-16
