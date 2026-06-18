# Nano Banana — Prompt Structure & Techniques

Sources: `JimmyLv/awesome-nano-banana` (community collection, 8.8k★) and Google's
official `gemini-cli-extensions/nanobanana` tooling.

## Mental model

Nano Banana (`gemini-2.5-flash-image`) understands **context, lighting, physical
logic, and creative intent** — treat it as a collaborative creative partner, not
a keyword parser. **Narrative, descriptive prompts** outperform terse tag lists.

## 1. Core structural elements

- **Reference images** — often required for editing tasks.
- **Descriptive placeholders** — `[SUBJECT]`, `{variable}` for reusable templates.
- **Specific visual attributes** — materials, lighting, composition, style.
- **Optional JSON** — structured blocks for complex parameter sets (material,
  lighting, color, post-processing, background).

### JSON-based approach (optional, for complex specs)

```json
{
  "material": "frosted translucent glass",
  "lighting": "soft diffused studio light from upper left",
  "color_scheme": ["#0B5FFF", "#7C3AED"],
  "post_processing": "subtle bloom, shallow depth of field",
  "background": "seamless light-grey gradient"
}
```

## 2. Identity & subject consistency

- Upload **reference images** for accurate facial features and clothing.
- Use phrases: **"accurately reproduce", "preserve the subject's", "based on the
  attached photo"**.
- Supports **multi-step edits** — keep refining in natural language while the
  identity stays locked.

## 3. Multi-image integration / blending

- Specify **spatial relationships** and **occlusion** (what sits in front).
- Request **lighting consistency** across all combined elements.
- Describe the **interaction** between disparate objects.

## 4. Text rendering

- Put text specs on **separate lines** (or as JSON parameters).
- Specify **typography**: font style, size, placement, effects (glow, blur).
- Example: `Include bold black text at top center: "SUMMER SALE"`.

## 5. Material & texture control

- Specify exact materials: **"glossy metal", "matte surface", "translucent glass"**.
- Describe finish: **"polished", "frosted", "iridescent"**.

## 6. Lighting direction

- State directional sources: **"soft diffused studio lighting"**.
- Time-of-day effects: **"golden hour", "cinematic lighting", "blue hour"**.

## 7. Color consistency

- Use **hex codes** or descriptive palettes.
- Reference existing **brand colors**; specify gradients and chromatic effects.

## 8. Specialized patterns observed in the collection

- **Retexturing:** JSON aesthetic params drive material transformation.
- **Trading cards:** structured JSON with template variables for customization.
- **Dioramas / miniatures:** emphasize "isometric angle", "tilt-shift lens
  effect", "miniature perspective".
- **Fake media / UI:** request specific UI elements, timestamps, platform-authentic
  details.

## Nano Banana vs Nano Banana Pro

| | Nano Banana | Nano Banana Pro |
|---|---|---|
| Model id | `gemini-2.5-flash-image` | `gemini-3-pro-image-preview` |
| Best for | Fast, cheap, high-volume generation & edits | Top quality, complex composition, fine text |
| Resolution | Standard | Up to **4K** (1K / 2K / 4K) |
| Aspect ratios | Standard | 1:1, 16:9, 9:16, 4:3, 3:4 |
| Text rendering | Good | Stronger |

Use **Pro** for hero assets, dense in-image text, and 4K deliverables; use the
standard model for drafts, iterations, and batch work.
