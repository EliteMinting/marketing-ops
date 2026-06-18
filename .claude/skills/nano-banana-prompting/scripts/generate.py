#!/usr/bin/env python3
"""Optional image generator for the nano-banana-prompting skill.

Calls Google's Gemini image API (Nano Banana = gemini-2.5-flash-image, or
Nano Banana Pro = gemini-3-pro-image-preview) and writes the result to a PNG.
OPTIONAL — the skill is fully usable for prompt-writing without it. Requires the
GEMINI_API_KEY environment variable and the `google-genai` package
(`pip install google-genai`).

Examples
--------
    export GEMINI_API_KEY=...
    python generate.py --prompt "photoreal ceramic mug ..." --out mug.png

    # Pro model with reference images (editing / blending)
    python generate.py --model gemini-3-pro-image-preview \
        --ref person.png --prompt "change only the jacket to navy" --out edited.png
"""
from __future__ import annotations

import argparse
import mimetypes
import os
import sys


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate/edit images with Nano Banana (Gemini).")
    p.add_argument("--prompt", required=True, help="The image prompt.")
    p.add_argument("--out", default="out.png", help="Output PNG path (default: out.png).")
    p.add_argument("--model", default="gemini-2.5-flash-image",
                   help="Model id (gemini-2.5-flash-image default; "
                        "gemini-3-pro-image-preview for Nano Banana Pro / 4K).")
    p.add_argument("--ref", action="append", default=[],
                   help="Path to a reference image (repeatable) for editing/blending.")
    return p.parse_args()


def main() -> int:
    args = parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: set GEMINI_API_KEY to use this script. It is optional — the "
              "skill works for prompt-writing without it.", file=sys.stderr)
        return 1

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        print("ERROR: the 'google-genai' package is required: pip install google-genai",
              file=sys.stderr)
        return 1

    client = genai.Client(api_key=api_key)

    contents: list = [args.prompt]
    for path in args.ref:
        if not os.path.exists(path):
            print(f"ERROR: reference image not found: {path}", file=sys.stderr)
            return 1
        mime = mimetypes.guess_type(path)[0] or "image/png"
        with open(path, "rb") as fh:
            contents.append(types.Part.from_bytes(data=fh.read(), mime_type=mime))

    try:
        response = client.models.generate_content(model=args.model, contents=contents)
    except Exception as exc:  # noqa: BLE001 — surface any API error clearly
        print(f"ERROR: image request failed: {exc}", file=sys.stderr)
        return 1

    for part in response.candidates[0].content.parts:
        inline = getattr(part, "inline_data", None)
        if inline is not None and inline.data:
            with open(args.out, "wb") as fh:
                fh.write(inline.data)
            print(f"Saved {args.out} ({args.model})")
            return 0

    print("ERROR: no image returned. Model text response:", file=sys.stderr)
    print(getattr(response, "text", "<none>"), file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
