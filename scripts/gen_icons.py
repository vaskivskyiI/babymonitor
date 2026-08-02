"""One-off script to generate PWA PNG icons (not a runtime dependency)."""
import os

from PIL import Image, ImageDraw

BG = (99, 102, 241, 255)  # #6366f1
FG = (255, 255, 255, 255)


def _draw_bottle(draw: ImageDraw.ImageDraw, ox: float, oy: float, s: float, color) -> None:
    def pt(x, y):
        return (ox + x * s, oy + y * s)

    draw.rounded_rectangle([*pt(82, 30), *pt(110, 44)], radius=4 * s, fill=color)
    draw.rounded_rectangle([*pt(86, 42), *pt(106, 54)], radius=3 * s, fill=color)
    draw.rounded_rectangle([*pt(70, 58), *pt(122, 156)], radius=14 * s, fill=color)


def draw_icon(size: int) -> Image.Image:
    """'any' purpose icon: rounded-square badge, transparent outside it."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = int(size * 0.21)
    draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=BG)
    s = size / 192
    _draw_bottle(draw, 0, 0, s, FG)
    draw.rectangle([0 + 70 * s, 0 + 96 * s, 0 + 122 * s, 0 + 104 * s], fill=BG)
    return img


def draw_icon_maskable(size: int) -> Image.Image:
    """Maskable icon: solid background edge-to-edge, content within the ~80% safe zone."""
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    safe = size * 0.8
    pad = (size - safe) / 2
    s = safe / 192
    _draw_bottle(draw, pad, pad, s, FG)
    draw.rectangle([pad + 70 * s, pad + 96 * s, pad + 122 * s, pad + 104 * s], fill=BG)
    return img


def main():
    out_dir = os.path.join(os.path.dirname(__file__), "..", "app", "static")
    draw_icon(192).save(os.path.join(out_dir, "icon-192.png"))
    draw_icon(512).save(os.path.join(out_dir, "icon-512.png"))
    draw_icon_maskable(192).save(os.path.join(out_dir, "icon-192-maskable.png"))
    draw_icon_maskable(512).save(os.path.join(out_dir, "icon-512-maskable.png"))
    print("icons written")


if __name__ == "__main__":
    main()
