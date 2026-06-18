# GPT Image 2 — Prompt Structure & Techniques

Source: OpenAI Cookbook, *image-gen models prompting guide*
(`openai/openai-cookbook` → `examples/multimodal/image-gen-models-prompting-guide.ipynb`).

## 1. Ordering

Write prompts in a consistent order:

```
background / scene → subject → key details → constraints
```

Include the **intended use** (ad, UI mock, infographic, logo, product photo) so
the model picks the right "mode" and level of polish. For complex requests, use
**labeled segments or line breaks** instead of one long paragraph.

## 2. Specificity & quality cues

- Be concrete about **materials, shapes, textures, and the visual medium**
  (photo, watercolor, 3D render, vector).
- Add **targeted quality levers only when needed** — don't front-load every cue.
- For photorealism, **camera/composition terms steer realism more reliably than
  generic "8K/ultra-detailed"**: specify lens, aperture feel, lighting, framing.

## 3. Composition control

- **Framing/viewpoint:** close-up, wide, top-down.
- **Perspective/angle:** eye-level, low-angle, isometric.
- **Lighting/mood:** soft diffused studio, golden hour, hard rim light, moody.

## 4. People & action

- Describe **scale, body framing, gaze, and object interactions**.
- Examples: "full body visible, feet included"; "looking down at the open book,
  not at the camera".

## 5. Text in images

- Put **literal text in quotes or ALL CAPS**.
- Specify typography: **font style, size, color, placement**.
- For difficult spellings, **spell them letter-by-letter** to improve accuracy.
- Use **`quality: medium` or `high`** for small or dense text.

## 6. Photorealism

- **Prompt as if a real photo is being captured in the moment.** Use photography
  language (lens, lighting, framing).
- Ask for **real texture** — pores, wrinkles, fabric weave, surface scratches.
- Add "photorealistic", "real photograph", or "professional photography".

## 7. Constraints & invariants

- State exclusions explicitly: "no watermark", "no extra elements".
- State preservation explicitly: "preserve identity / geometry / layout".

## 8. Editing patterns

- **Change only X + keep everything else the same.** Repeat the preserve-list on
  every iteration so it doesn't drift.
- **Identity preservation (try-on / compositing):** lock the person (face, body
  shape, pose, hair, expression); allow changes only to garments; require
  realistic fit (draping, folds, occlusion) and consistent lighting/shadows.
- **Style transfer:** describe what must stay consistent (style cues) and what
  must change (new content); add "no extra elements" to prevent drift.
- **Lighting/weather transforms:** change only environmental conditions while
  preserving identity, geometry, camera angle, and object placement.

## 9. Multi-image inputs

- **Reference each input by index and description.**
- Describe interactions and **be explicit about which elements move where**.

## 10. Iteration strategy

Start with a **clean base prompt**, then refine with **small, single-change
follow-ups** rather than overloading the initial prompt.

## Use-case quick notes

- **Infographics:** `quality="high"` for dense layouts and heavy in-image text.
- **Logos:** describe brand personality and use case, then ask for a clean,
  original mark with strong shape, balanced negative space, scalability.
- **Ads:** write like a **creative brief** — brand positioning, audience cues,
  desired vibe — not a purely technical spec.
- **UI mockups:** describe the product **as if it already exists**; focus on
  layout, hierarchy, spacing, real interface elements (avoid concept-art language).
- **Slides/diagrams:** include actual numbers and labels; landscape orientation;
  `quality="high"` for text-heavy content; avoid tiny text and clutter.
