"""Build session site assets from parsed PPTX data."""

from __future__ import annotations

import base64
import json
import re
from pathlib import Path
from typing import Any


def _slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "slide"


def _save_images(slides: list[dict[str, Any]], assets_dir: Path) -> list[dict[str, Any]]:
    assets_dir.mkdir(parents=True, exist_ok=True)
    processed: list[dict[str, Any]] = []

    for slide in slides:
        slide_copy = dict(slide)
        new_shapes: list[dict[str, Any]] = []

        for shape in slide["shapes"]:
            if shape.get("type") != "image":
                new_shapes.append(shape)
                continue

            ext = Path(shape.get("filename", "image.png")).suffix or ".png"
            filename = f"slide-{slide['index']}-{_slugify(shape.get('filename', 'image'))}{ext}"
            image_path = assets_dir / filename
            image_path.write_bytes(base64.b64decode(shape["data_base64"]))

            new_shapes.append(
                {
                    "type": "image",
                    "src": f"assets/{filename}",
                    "alt": shape.get("filename", "slide image"),
                }
            )

        slide_copy["shapes"] = new_shapes
        processed.append(slide_copy)

    return processed


def build_session_site(parsed: dict[str, Any], output_dir: Path) -> dict[str, Any]:
    """Write session JSON and image assets for the frontend."""
    output_dir.mkdir(parents=True, exist_ok=True)
    assets_dir = output_dir / "assets"

    slides = _save_images(parsed["slides"], assets_dir)
    session_data = {
        "title": parsed["title"],
        "author": parsed["author"],
        "slide_count": parsed["slide_count"],
        "slides": slides,
    }

    session_file = output_dir / "session.json"
    session_file.write_text(json.dumps(session_data, indent=2), encoding="utf-8")

    return {
        "session_file": str(session_file),
        "assets_dir": str(assets_dir),
        "slide_count": parsed["slide_count"],
        "title": parsed["title"],
    }
