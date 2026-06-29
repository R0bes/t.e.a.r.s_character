#!/usr/bin/env python3
"""
Extract circular badge icons from one image sheet.

What it does:
1. Loads one input image.
2. Finds separated icon blobs on a light/checkerboard background.
3. Crops every icon to a precise square.
4. Makes the square corners transparent with a circular alpha mask.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw


@dataclass(frozen=True)
class Box:
    x: int
    y: int
    w: int
    h: int

    @property
    def cx(self) -> float:
        return self.x + self.w / 2

    @property
    def cy(self) -> float:
        return self.y + self.h / 2


def make_foreground_mask(image_rgb: np.ndarray) -> np.ndarray:
    """Detect icon pixels against a mostly light background."""
    hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)
    saturation = hsv[:, :, 1]
    value = hsv[:, :, 2]

    # Colored icon areas have saturation. Gray/dark icon areas have lower value.
    mask = ((saturation > 22) | (value < 225)).astype(np.uint8) * 255

    # Remove small checker/texture artifacts without merging separate icons.
    scale = max(mask.shape)
    kernel_size = max(3, int(round(scale * 0.003)) | 1)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))
    return cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)


def sort_boxes_reading_order(boxes: list[Box]) -> list[Box]:
    """Sort boxes row by row, left to right."""
    if not boxes:
        return []

    boxes_by_y = sorted(boxes, key=lambda box: box.cy)
    median_height = float(np.median([box.h for box in boxes_by_y]))
    row_tolerance = median_height * 0.45

    rows: list[list[Box]] = []
    for box in boxes_by_y:
        for row in rows:
            row_center = float(np.mean([item.cy for item in row]))
            if abs(box.cy - row_center) <= row_tolerance:
                row.append(box)
                break
        else:
            rows.append([box])

    rows.sort(key=lambda row: np.mean([box.cy for box in row]))

    result: list[Box] = []
    for row in rows:
        result.extend(sorted(row, key=lambda box: box.cx))
    return result


def find_icon_boxes(mask: np.ndarray, min_area_ratio: float) -> list[Box]:
    """Find large separated icon components."""
    image_area = mask.shape[0] * mask.shape[1]
    min_area = image_area * min_area_ratio

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    boxes: list[Box] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        x, y, w, h = cv2.boundingRect(contour)
        aspect = w / h if h else 0

        # Avoid accidental huge horizontal/vertical background components.
        if 0.45 <= aspect <= 2.2:
            boxes.append(Box(x=x, y=y, w=w, h=h))

    return sort_boxes_reading_order(boxes)


def square_bounds(box: Box, padding: float) -> tuple[int, int, int, int]:
    """Return square crop bounds around the detected box."""
    cx = box.x + box.w / 2

    # When h > w, a label below the icon is inflating the height.
    # Use width as the diameter reference and align the crop to the top.
    if box.h > box.w:
        ref = box.w
        cy = box.y + ref / 2
    else:
        ref = max(box.w, box.h)
        cy = box.y + box.h / 2

    size = int(np.ceil(ref * (1.0 + 2.0 * padding)))
    left = int(round(cx - size / 2))
    top = int(round(cy - size / 2))
    return left, top, left + size, top + size


def crop_with_transparent_padding(image: Image.Image, bounds: tuple[int, int, int, int]) -> Image.Image:
    """Crop square bounds and pad outside-image areas transparently."""
    left, top, right, bottom = bounds
    size = right - left

    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    source_left = max(0, left)
    source_top = max(0, top)
    source_right = min(image.width, right)
    source_bottom = min(image.height, bottom)

    if source_right <= source_left or source_bottom <= source_top:
        return result

    crop = image.crop((source_left, source_top, source_right, source_bottom))
    result.paste(crop, (source_left - left, source_top - top))
    return result


def apply_circular_alpha(image: Image.Image) -> Image.Image:
    """Make all pixels outside the centered crop circle transparent."""
    image = image.convert("RGBA")

    # High-resolution mask for clean antialiased edges.
    scale = 4
    mask = Image.new("L", (image.width * scale, image.height * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(
        (0, 0, image.width * scale - 1, image.height * scale - 1),
        fill=255,
    )
    mask = mask.resize(image.size, Image.Resampling.LANCZOS)

    image.putalpha(mask)
    return image


def save_debug_image(image_rgb: np.ndarray, boxes: list[Box], output_path: Path) -> None:
    """Save a preview with detected bounding boxes."""
    debug = image_rgb.copy()

    for index, box in enumerate(boxes, start=1):
        cv2.rectangle(
            debug,
            (box.x, box.y),
            (box.x + box.w, box.y + box.h),
            (255, 0, 0),
            3,
        )
        cv2.putText(
            debug,
            str(index),
            (box.x + 10, box.y + 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 0, 0),
            2,
            cv2.LINE_AA,
        )

    Image.fromarray(debug).save(output_path)


def extract_icons(
    input_path: Path,
    output_dir: Path,
    padding: float,
    size: int | None,
    min_area_ratio: float,
    debug: bool,
) -> None:
    source = Image.open(input_path).convert("RGBA")
    image_rgb = np.array(source.convert("RGB"))

    mask = make_foreground_mask(image_rgb)
    boxes = find_icon_boxes(mask, min_area_ratio=min_area_ratio)

    sheet_output_dir = output_dir / input_path.stem
    sheet_output_dir.mkdir(parents=True, exist_ok=True)

    for index, box in enumerate(boxes, start=1):
        icon = crop_with_transparent_padding(source, square_bounds(box, padding))
        icon = apply_circular_alpha(icon)

        if size:
            icon = icon.resize((size, size), Image.Resampling.LANCZOS)

        icon.save(sheet_output_dir / f"{input_path.stem}_{index:02d}.png")

    if debug:
        Image.fromarray(mask).save(sheet_output_dir / f"{input_path.stem}_mask.png")
        save_debug_image(image_rgb, boxes, sheet_output_dir / f"{input_path.stem}_boxes.png")

    print(f"Found {len(boxes)} icons.")
    print(f"Saved output to: {sheet_output_dir}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract icons as square PNGs with transparent corners."
    )
    parser.add_argument("input", type=Path, help="Input icon sheet")
    parser.add_argument("--out-dir", type=Path, default=Path("extracted_icons"))
    parser.add_argument("--padding", type=float, default=0.02)
    parser.add_argument("--size", type=int, default=None, help="Optional final square size, for example 512")
    parser.add_argument("--min-area-ratio", type=float, default=0.004)
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    extract_icons(
        input_path=args.input,
        output_dir=args.out_dir,
        padding=args.padding,
        size=args.size,
        min_area_ratio=args.min_area_ratio,
        debug=args.debug,
    )


if __name__ == "__main__":
    main()
