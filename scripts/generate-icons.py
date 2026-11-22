import os
import subprocess
import sys
from PIL import Image

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons_dir = os.path.join(repo_root, "src-tauri", "icons")
    svg_path = os.path.join(icons_dir, "mark.svg")

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # Create an HTML wrapper that renders the SVG with transparency at 1024x1024
    html_content = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{
  width: 1024px;
  height: 1024px;
  background: transparent !important;
  overflow: hidden;
}}
svg {{
  width: 1024px;
  height: 1024px;
  display: block;
}}
</style>
</head>
<body>
{svg_content}
</body>
</html>
"""
    temp_dir = os.environ.get("TEMP", os.path.expanduser("~"))
    temp_html = os.path.join(temp_dir, "render_skerry_icon.html")
    temp_png = os.path.join(temp_dir, "render_skerry_master.png")

    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html_content)

    chrome_candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ]
    browser = None
    for cand in chrome_candidates:
        if os.path.exists(cand):
            browser = cand
            break

    if not browser:
        print("Error: neither Chrome nor Edge found", file=sys.stderr)
        sys.exit(1)

    print(f"Using browser: {browser}")
    cmd = [
        browser,
        "--headless=new",
        "--disable-gpu",
        "--default-background-color=00000000",
        "--window-size=1024,1024",
        f"--screenshot={temp_png}",
        f"file:///{os.path.abspath(temp_html).replace('\\', '/')}"
    ]

    subprocess.run(cmd, check=True)

    master = Image.open(temp_png).convert("RGBA")
    print(f"Master rendered image: size={master.size}, mode={master.mode}")
    corner_pixel = master.getpixel((0, 0))
    print(f"Corner pixel at (0,0): {corner_pixel} (alpha={corner_pixel[3]})")
    center_pixel = master.getpixel((512, 512))
    print(f"Center pixel at (512,512): {center_pixel}")

    # Ensure corner transparency is zero
    if corner_pixel[3] != 0:
        print("Warning: corner pixel alpha is not 0!", file=sys.stderr)

    # 1. Output PNG files
    targets = {
        "32x32.png": (32, 32),
        "128x128.png": (128, 128),
        "128x128@2x.png": (256, 256),
        "icon.png": (512, 512),
        "Square30x30Logo.png": (30, 30),
        "Square44x44Logo.png": (44, 44),
        "Square71x71Logo.png": (71, 71),
        "Square89x89Logo.png": (89, 89),
        "Square107x107Logo.png": (107, 107),
        "Square142x142Logo.png": (142, 142),
        "Square150x150Logo.png": (150, 150),
        "Square284x284Logo.png": (284, 284),
        "Square310x310Logo.png": (310, 310),
        "StoreLogo.png": (50, 50),
    }

    for name, (w, h) in targets.items():
        resized = master.resize((w, h), Image.Resampling.LANCZOS)
        out_path = os.path.join(icons_dir, name)
        resized.save(out_path, format="PNG")
        print(f"Saved {name} ({w}x{h})")

    # 2. Output multi-resolution icon.ico: 16, 24, 32, 48, 64, 256
    ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (256, 256)]
    ico_path = os.path.join(icons_dir, "icon.ico")
    master.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Saved icon.ico with sizes: {ico_sizes}")

    # 3. Output icon.icns
    icns_path = os.path.join(icons_dir, "icon.icns")
    try:
        master.save(icns_path, format="ICNS")
        print("Saved icon.icns")
    except Exception as e:
        print(f"ICNS save failed: {e}")

    print("All icons generated successfully!")

if __name__ == "__main__":
    main()
