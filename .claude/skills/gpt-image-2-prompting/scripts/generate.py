#!/usr/bin/env python3
"""Optional image generator for the gpt-image-2-prompting skill.

Calls OpenAI's Images API with the gpt-image-2 model and writes the result to a
PNG file. This is OPTIONAL — the skill is fully usable for prompt-writing without
it. Requires the OPENAI_API_KEY environment variable and the `openai` package
(`pip install openai`).

Examples
--------
    export OPENAI_API_KEY=sk-...
    python generate.py --prompt "PURE SOUND product poster ..." \
        --size 1024x1536 --quality high --out poster.png

    # edit an existing image (preserve identity, change one thing)
    python generate.py --prompt "change only the background to navy blue" \
        --edit input.png --out edited.png
"""
from __future__ import annotations

import argparse
import base64
import os
import sys


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate/edit images with gpt-image-2.")
    p.add_argument("--prompt", required=True, help="The image prompt.")
    p.add_argument("--out", default="out.png", help="Output PNG path (default: out.png).")
    p.add_argument("--model", default="gpt-image-2",
                   help="Model id (gpt-image-2 default; also gpt-image-1-mini, gpt-image-1.5).")
    p.add_argument("--size", default="1024x1024",
                   help="WxH, edges multiples of 16, max edge <3840, ratio <=3:1.")
    p.add_argument("--quality", default="medium", choices=["low", "medium", "high"],
                   help="Render quality (use medium/high for dense text).")
    p.add_argument("--edit", action="append", default=[],
                   help="Path to an input image to edit (repeatable). Triggers edit mode.")
    return p.parse_args()


def main() -> int:
    args = parse_args()

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("ERROR: set OPENAI_API_KEY to use this script. It is optional — the "
              "skill works for prompt-writing without it.", file=sys.stderr)
        return 1

    try:
        from openai import OpenAI
    except ImportError:
        print("ERROR: the 'openai' package is required: pip install openai", file=sys.stderr)
        return 1

    client = OpenAI(api_key=api_key)

    try:
        if args.edit:
            images = [open(path, "rb") for path in args.edit]
            try:
                result = client.images.edit(
                    model=args.model, image=images,
                    prompt=args.prompt, size=args.size, quality=args.quality,
                )
            finally:
                for fh in images:
                    fh.close()
        else:
            result = client.images.generate(
                model=args.model, prompt=args.prompt,
                size=args.size, quality=args.quality,
            )
    except Exception as exc:  # noqa: BLE001 — surface any API error clearly
        print(f"ERROR: image request failed: {exc}", file=sys.stderr)
        return 1

    b64 = result.data[0].b64_json
    with open(args.out, "wb") as fh:
        fh.write(base64.b64decode(b64))
    print(f"Saved {args.out} ({args.model}, {args.size}, quality={args.quality})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
