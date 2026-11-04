import os
import sys

def process():
    try:
        from PIL import Image
    except ImportError:
        print("PIL_NOT_FOUND")
        return

    # Check potential input images
    inputs = [
        "public/icons/astraonyx-app-icon.png",
        "1.webp",
        "2.webp",
        "3.webp"
    ]

    src_path = None
    for p in inputs:
        if os.path.exists(p):
            src_path = p
            break

    if not src_path:
        print("NO_SOURCE_FOUND")
        return

    print(f"USING_SOURCE: {src_path}")
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    print(f"IMAGE_SIZE: {w}x{h}")

    # We want to perform an intelligent auto-cut of the black background.
    # In 1.webp / astraonyx-app-icon.png, the background is near-black (#000000..#0a0a0a).
    # Any pixel with low luminance should be made transparent.
    # Pixels in the transition zone should get proportional alpha to prevent harsh jaggies or fringes.

    pixels = img.load()

    # Analyze corner background color
    corners = [pixels[0, 0], pixels[w-1, 0], pixels[0, h-1], pixels[w-1, h-1]]
    print(f"CORNERS: {corners}")

    # Check if background is dark or light
    bg_dark = sum(c[0] + c[1] + c[2] for c in corners) / 12 < 128
    print(f"BG_IS_DARK: {bg_dark}")

    # Process image for pure transparent cutout
    out_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out_pixels = out_img.load()

    # Bounding box coordinates for auto-crop
    min_x, max_x = w, 0
    min_y, max_y = h, 0

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]

            if bg_dark:
                # Dark background cutout
                # Luminance / max component
                lum = max(r, g, b)

                if lum <= 12:
                    # Pure black background -> transparent
                    new_a = 0
                elif lum < 50:
                    # Transition zone: feather alpha smoothly
                    ratio = (lum - 12) / (50 - 12)
                    new_a = int(a * ratio)
                else:
                    new_a = a

                if new_a > 15:
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y

                out_pixels[x, y] = (r, g, b, new_a)
            else:
                # White/light background cutout
                lum = (r + g + b) / 3.0
                if lum >= 245:
                    new_a = 0
                elif lum > 210:
                    ratio = (245 - lum) / (245 - 210)
                    new_a = int(a * ratio)
                else:
                    new_a = a

                if new_a > 15:
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y

                out_pixels[x, y] = (r, g, b, new_a)

    print(f"BOUNDING_BOX: ({min_x}, {min_y}) to ({max_x}, {max_y})")

    # Add a comfortable 5% padding around bounding box to preserve neon glow
    pad_x = max(8, int((max_x - min_x) * 0.05))
    pad_y = max(8, int((max_y - min_y) * 0.05))
    crop_x1 = max(0, min_x - pad_x)
    crop_y1 = max(0, min_y - pad_y)
    crop_x2 = min(w, max_x + pad_x)
    crop_y2 = min(h, max_y + pad_y)

    cropped_img = out_img.crop((crop_x1, crop_y1, crop_x2, crop_y2))

    # Make a square canvas with centered cropped image to avoid squishing
    cw, ch = cropped_img.size
    side = max(cw, ch)
    square_img = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    offset_x = (side - cw) // 2
    offset_y = (side - ch) // 2
    square_img.paste(cropped_img, (offset_x, offset_y))

    # Generate the required resolutions:
    # 1. Master 1024x1024
    master_1024 = square_img.resize((1024, 1024), Image.Resampling.LANCZOS)

    # 2. Mark / Emblem 512x512
    mark_512 = square_img.resize((512, 512), Image.Resampling.LANCZOS)

    # 3. Glyph 256x256
    glyph_256 = square_img.resize((256, 256), Image.Resampling.LANCZOS)

    # 4. HD Icon 128x128
    icon_128 = square_img.resize((128, 128), Image.Resampling.LANCZOS)

    # 5. Small Glyph 64x64
    glyph_64 = square_img.resize((64, 64), Image.Resampling.LANCZOS)

    # Write destinations
    destinations = [
        ("dashboard/assets/brand/astraonyx-master.png", master_1024),
        ("dashboard/assets/brand/astraonyx-mark.png", mark_512),
        ("dashboard/assets/brand/astraonyx-glyph.png", glyph_256),
        ("dashboard/assets/icons/hd/astraonyx.png", icon_128),
        ("dashboard/assets/icons/hd/astraonyx-core.png", icon_128),
        ("public/icons/astraonyx-glyph.png", glyph_256),
        ("public/icons/astraonyx-mark.png", mark_512),
        ("public/icons/astraonyx-app-icon.png", master_1024)
    ]

    for path, img_obj in destinations:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        img_obj.save(path, "PNG", optimize=True)
        print(f"SAVED: {path} ({img_obj.size[0]}x{img_obj.size[1]})")

    print("AUTOCUT_COMPLETE_SUCCESS")

if __name__ == "__main__":
    process()
