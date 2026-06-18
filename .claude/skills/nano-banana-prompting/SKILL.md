---
name: nano-banana-prompting
description: >-
  Use when writing, structuring, or refining prompts for Google's Nano Banana
  image model (gemini-2.5-flash-image) and Nano Banana Pro (gemini-3-pro-image-preview).
  Covers narrative scene-description prompts, reference-image editing, identity/likeness
  consistency, multi-image blending, in-image text, and material/lighting/color control.
  Optionally generates images via the Google Gemini API. Trigger for requests like
  "write a Nano Banana prompt", "edit this photo with Nano Banana", "blend these
  images", or "make a Gemini image prompt".
---

# Nano Banana Prompting

Helps you craft and refine prompts for Google's **Nano Banana**
(`gemini-2.5-flash-image`) and **Nano Banana Pro** (`gemini-3-pro-image-preview`)
image generation/editing models. Guidance is distilled from the most-starred
community collection and Google's official tooling.

## When to use this skill

- Writing a Nano Banana prompt for generation **or** editing.
- Editing a photo while keeping a person/product **identity** consistent.
- **Blending multiple reference images** into one coherent scene.
- Choosing between Nano Banana (fast, cheap) and Nano Banana Pro (up to 4K).

## Mental model

Nano Banana behaves like a **collaborative creative partner**: it reasons about
context, lighting, physical logic, and creative intent. Prefer **rich narrative
descriptions** of the scene over terse keyword lists. For editing, **provide a
reference image** and describe the change in natural language.

## Core workflow

1. **Decide: generate or edit.** Editing tasks almost always need a reference image.
2. **Describe the scene as a narrative** — environment, subject, action, mood —
   not just comma-separated tags.
3. **Be explicit about what to preserve** when editing: "accurately reproduce /
   preserve the subject's <face, hairstyle, clothing>".
4. **For multi-image blends**, specify spatial relationships, occlusion (what is
   in front), and lighting consistency across the combined elements.
5. **Control materials, lighting, color** precisely (see references). Optionally
   wrap complex specs in a small JSON block.
6. **Place in-image text** on its own line with typography details.
7. **Edit iteratively** in natural language: "Now make it a night scene with stars".

## Prompt skeleton

```
<Narrative description of the full scene: setting, subject, action, mood.>
Subject details: <materials, textures, colors, distinguishing features>.
Lighting: <direction, quality, time of day>.
Camera/composition: <angle, framing, lens feel>.
Text: "<literal text>" — <font, placement, effect>.
Preserve (edit mode): <identity / clothing / geometry to keep unchanged>.
```

### Worked examples

Generate:
```
A photorealistic close-up of a handmade ceramic coffee mug held in two hands on a
rustic wooden table. The matte terracotta glaze has subtle speckles; steam rises
gently. Background: a softly blurred sunlit kitchen, warm natural morning light.
Square composition.
```

Edit (identity-preserving):
```
Using the attached photo, change only the jacket to a navy wool peacoat.
Accurately preserve the person's face, hairstyle, pose, and the background.
Match the original lighting and shadows.
```

## References

- `reference/prompt-structure.md` — full technique catalog (editing, identity,
  multi-image blending, text, materials, lighting, color, JSON specs).
- `reference/use-cases.md` — case categories with what each needs.
- `reference/templates.md` — copy-paste templates.

## Optional: generate the image

`scripts/generate.py` calls the Google Gemini image API. Optional — the skill is
fully usable for prompt-writing alone.

```bash
export GEMINI_API_KEY=...
python .claude/skills/nano-banana-prompting/scripts/generate.py \
  --prompt "ceramic mug ..." --out mug.png
# Pro / 4K + reference image:
python .claude/skills/nano-banana-prompting/scripts/generate.py \
  --model gemini-3-pro-image-preview --ref person.png \
  --prompt "change only the jacket ..." --out edited.png
```

Requires `GEMINI_API_KEY`; without it the script exits with a clear message.
