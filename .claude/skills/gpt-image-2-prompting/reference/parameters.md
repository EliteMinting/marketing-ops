# GPT Image 2 — Parameters & Model Selection

Source: OpenAI Cookbook image-generation prompting guide (`openai/openai-cookbook`).

## Size constraints (gpt-image-2)

`gpt-image-2` supports flexible sizing within these limits:

- **Max edge:** < 3840 px
- **Both edges:** multiples of 16
- **Aspect ratio:** max 3:1 (either orientation)
- **Total pixels:** 655,360 – 8,294,400 (≈0.66 MP – 8.29 MP)

### Popular sizes

| Use | Size |
|-----|------|
| HD portrait (stories, reels covers) | 1024 × 1536 |
| HD landscape (banners, slides) | 1536 × 1024 |
| Square (feed posts) | 1024 × 1024 |
| 2K / QHD (recommended upper boundary) | 2560 × 1440 |

## Quality

Values: `low`, `medium`, `high`.

- **`low`** — latency-sensitive or high-volume; fastest, cheapest. Good default
  when speed and unit economics dominate.
- **`medium` / `high`** — small or dense text, detailed infographics, close-up
  portraits, customer-facing assets.

## input_fidelity

- Controls how strongly the model preserves an input image during edits.
- Available for **gpt-image-1.5 and gpt-image-1** only.
- **Disabled for gpt-image-2** — it defaults to high fidelity.
- Use `input_fidelity="high"` (on the supporting models) when larger scene edits
  must still maintain likeness.

## Output format

Returns base64-encoded image data. Decode to PNG/JPEG/WebP as needed.

## Model selection

| Model | Best for | Notes |
|-------|----------|-------|
| **gpt-image-2** | **Default** for most production workflows: highest quality, best editing, text-heavy images, photorealism, customer-facing assets | Choose with `quality: low` when speed/economics dominate |
| **gpt-image-1.5** | Legacy workflows during migration | Supports `input_fidelity` |
| **gpt-image-1** | Legacy compatibility only | Supports `input_fidelity` |
| **gpt-image-1-mini** | Cost/throughput priority: large batch variant generation, rapid ideation, previews, lightweight personalization, draft assets | Trades peak generation/editing quality for cost & speed |

**Rules of thumb**

- Start new work on **gpt-image-2**.
- Drop to **gpt-image-1-mini** for big batches, drafts, and ideation where top
  quality isn't required.
- Keep **gpt-image-1 / 1.5** only for short-term stability while validating an
  upgrade, or when you specifically need `input_fidelity`.
