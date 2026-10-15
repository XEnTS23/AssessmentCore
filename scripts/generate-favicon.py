import os
from PIL import Image, ImageDraw, ImageFont

public_dir = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(public_dir, exist_ok=True)

# 1. Generate SVG Favicon
svg_content = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#000000" />
  <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" fill="#ffffff" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-weight="800" font-size="36" letter-spacing="-0.05em">H</text>
</svg>
'''

svg_path = os.path.join(public_dir, "favicon.svg")
with open(svg_path, "w", encoding="utf-8") as f:
    f.write(svg_content)
print(f"Generated {svg_path}")

# 2. Generate PNG / ICO using PIL
def create_h_icon(size):
    # Render at 4x for smooth supersampling
    scale = 4
    canvas_size = size * scale
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle
    radius = int(canvas_size * 0.25)
    draw.rounded_rectangle([0, 0, canvas_size - 1, canvas_size - 1], radius=radius, fill=(0, 0, 0, 255))

    # Font - try Segoe UI Bold or Arial Bold
    font_size = int(canvas_size * 0.58)
    font = None
    font_candidates = [
        "C:\\Windows\\Fonts\\segoeuib.ttf",
        "C:\\Windows\\Fonts\\segoeui.ttf",
        "C:\\Windows\\Fonts\\arialbd.ttf",
        "C:\\Windows\\Fonts\\arial.ttf",
    ]
    for candidate in font_candidates:
        if os.path.exists(candidate):
            try:
                font = ImageFont.truetype(candidate, font_size)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()

    # Draw letter 'H' centered
    text = "H"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    # Calculate exact center
    x = (canvas_size - text_w) / 2 - bbox[0]
    y = (canvas_size - text_h) / 2 - bbox[1]

    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    # Downsample with Lanczos for anti-aliasing
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

# Generate various sizes
icon_512 = create_h_icon(512)
icon_512.save(os.path.join(public_dir, "logo-dark-1.png"))
icon_512.save(os.path.join(public_dir, "AC_logo.png")) # Replace old AC logo so legacy references get new icon

icon_180 = create_h_icon(180)
icon_180.save(os.path.join(public_dir, "apple-touch-icon.png"))

icon_64 = create_h_icon(64)
icon_64.save(os.path.join(public_dir, "favicon.png"))

icon_32 = create_h_icon(32)
icon_32.save(os.path.join(public_dir, "favicon-32x32.png"))

icon_16 = create_h_icon(16)
icon_16.save(os.path.join(public_dir, "favicon-16x16.png"))

# Save multi-size favicon.ico
icon_512.save(
    os.path.join(public_dir, "favicon.ico"),
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64)]
)
print("All favicon variants generated successfully!")
