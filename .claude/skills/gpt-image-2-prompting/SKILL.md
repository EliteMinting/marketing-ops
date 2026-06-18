---
name: gpt-image-2-prompting
description: >-
  Use when writing, structuring, or refining prompts for OpenAI's GPT Image 2
  (gpt-image-2) — and its variants gpt-image-1.5, gpt-image-1, gpt-image-1-mini.
  Covers prompt ordering, photorealism, in-image text rendering, editing/identity
  preservation, and size/quality parameters. Optionally generates images via the
  OpenAI Images API. Trigger for requests like "write a GPT Image prompt",
  "make an ad/poster/logo/UI mockup with gpt-image", or "improve this image prompt".
---

# GPT Image 2 Prompting

Helps you craft precise, production-grade prompts for OpenAI's `gpt-image-2`
image generation model (and refine existing ones). All guidance is distilled
from the official OpenAI Cookbook image-generation prompting guide.

## When to use this skill

- You need to write a prompt for `gpt-image-2` (text-to-image or image edit).
- You want to improve a prompt that produced a weak result.
- You need correct API parameters (size, quality, fidelity) or help choosing
  the right model variant (gpt-image-2 vs gpt-image-1-mini).

## Core workflow

Follow these steps to build any prompt:

1. **Name the intended use** first (ad, social post, UI mockup, infographic,
   logo, product photo). This sets the model's "mode" and polish level.
2. **Order the prompt consistently:** `scene/background → subject → key details
   → constraints`. Use line breaks or labeled segments for complex prompts —
   not one dense paragraph.
3. **Be concrete** about materials, shapes, textures, and the visual medium
   (photo, watercolor, 3D render).
4. **Add targeted quality levers only when needed.** For realism, prefer
   photography language (lens, lighting, framing) over "8K/ultra-detailed".
5. **Handle in-image text explicitly:** put literal text in quotes or ALL CAPS
   and specify typography. Raise `quality` to `medium`/`high` for small/dense text.
6. **State exclusions/invariants:** e.g. "no watermark", "preserve identity/
   geometry/layout".
7. **Iterate small:** start from a clean base prompt, then make single-change
   follow-ups rather than rewriting everything.

For editing: use **"change only X" + "keep everything else the same"**, and
repeat the preserve-list on every iteration.

## Prompt skeleton

```
[Intended use: e.g. Instagram ad creative]
Scene: <environment, setting, mood, lighting>
Subject: <who/what, framing, pose, gaze>
Key details: <materials, textures, colors, medium>
Text: "<literal text>" — <font style, size, placement>
Constraints: <preserve / exclude list, aspect intent>
```

### Worked example

```
Intended use: product launch poster.
Scene: minimalist studio, soft diffused top light, warm beige seamless backdrop.
Subject: a matte-black wireless headphone floating center, slight 3/4 angle.
Key details: brushed aluminium ear cups, soft fabric headband, realistic
  reflections, shallow depth of field.
Text: "PURE SOUND" in bold uppercase sans-serif, centered lower third, white.
Constraints: no extra props, no watermark, clean negative space for cropping.
```

## References

Load the detailed references when you need depth:

- `reference/prompt-structure.md` — full technique catalog (realism, text,
  editing, identity, multi-image, style transfer).
- `reference/parameters.md` — size/quality/`input_fidelity` rules and the
  model-selection table (when to use gpt-image-2 vs mini vs 1.5).
- `reference/templates.md` — copy-paste templates per marketing use case.

## Optional: generate the image

`scripts/generate.py` calls the OpenAI Images API directly. It is optional —
the skill is fully usable for prompt-writing alone.

```bash
export OPENAI_API_KEY=sk-...
python .claude/skills/gpt-image-2-prompting/scripts/generate.py \
  --prompt "PURE SOUND poster ..." --size 1024x1536 --quality high --out poster.png
```

Requires `OPENAI_API_KEY`; without it the script exits with a clear message.
