#!/usr/bin/env python3
"""Downscales and re-encodes the NASA maps used by the Orrery and writes textures.json (name -> JPEG data URI)
and a sizes report. Usage: python3 -I prep_textures.py NASA_REPO_DIR OUT_DIR"""
import base64, io, json, math, os, sys
from PIL import Image, ImageFilter, ImageChops, ImageStat
SRC = os.path.join(sys.argv[1], "Images and Textures")
OUT = sys.argv[2]

def load(name):
    return Image.open(os.path.join(SRC, name, name + ".jpg")).convert("RGB")

def fill(im, lo=None, hi=None):
    """Replaces no-data pixels (near black when lo is set, near white when hi is set) with the mean of the rest, feathered."""
    g = im.convert("L")
    if lo is not None:
        mask = g.point(lambda v: 255 if v <= lo else 0)
    else:
        mask = g.point(lambda v: 255 if v >= hi else 0)
    valid = ImageChops.invert(mask)
    mean = tuple(int(v) for v in ImageStat.Stat(im, valid).mean)
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(6))
    return Image.composite(Image.new("RGB", im.size, mean), im, mask)

def moon_from_disc(im, w, h):
    """The source is a photo of the near side as a disc. Projects it onto the near hemisphere of an
    equirectangular map; the far side is a blurred, mirrored copy of the near side."""
    g = im.convert("L"); bbox = g.point(lambda v: 255 if v > 24 else 0).getbbox()
    disc = im.crop(bbox); dw, dh = disc.size; px = disc.load()
    out = Image.new("RGB", (w, h)); o = out.load()
    for y in range(h):
        lat = (0.5 - (y + 0.5) / h) * math.pi
        for x in range(w):
            lon = ((x + 0.5) / w - 0.5) * 2 * math.pi
            near = abs(lon) <= math.pi / 2
            l2 = lon if near else (math.pi - abs(lon)) * (1 if lon > 0 else -1)
            sx = math.cos(lat) * math.sin(l2) * 0.985; sy = math.sin(lat) * 0.985
            o[x, y] = px[min(dw - 1, int((sx * 0.5 + 0.5) * dw)), min(dh - 1, int((0.5 - sy * 0.5) * dh))]
    far = out.filter(ImageFilter.GaussianBlur(w / 300))
    mask = Image.new("L", (w, h), 0); m = mask.load()
    for x in range(w):
        lon = abs(((x + 0.5) / w - 0.5) * 360)
        v = int(max(0, min(1, (lon - 84) / 10)) * 255)
        for y in range(h):
            m[x, y] = v
    return Image.composite(far, out, mask)

SPEC = [
    ("earth", "Earth (A)", (1024, 512), 80, None, False),
    ("mars", "Mars", (1024, 512), 78, None, False),
    ("venus", "Venus", (1024, 512), 74, None, False),
    ("jupiter", "Jupiter", (1024, 512), 80, None, False),
    ("saturn", "Saturn", (1024, 512), 78, None, False),
    ("neptune", "Neptune", (512, 256), 80, None, False),
    ("moon", "Moon", (512, 256), 78, "disc", False),
    ("io", "Jupiter - Io (B)", (512, 256), 76, None, False),
    ("europa", "Jupiter - Europa", (512, 256), 72, ("hi", 250), True),
    ("ganymede", "Jupiter - Ganymede", (512, 256), 72, ("hi", 236), True),
    ("callisto", "Jupiter - Callisto", (512, 256), 72, ("hi", 225), True),
    ("phobos", "Mars - Phobos", (256, 128), 72, None, True),
    ("deimos", "Mars - Deimos", (256, 128), 72, None, True),
    ("mimas", "Saturn - Mimas", (256, 128), 72, None, True),
    ("enceladus", "Saturn - Enceladus", (256, 128), 72, None, True),
    ("tethys", "Saturn - Tethys", (256, 128), 72, None, True),
    ("dione", "Saturn - Dione", (256, 128), 72, None, True),
    ("rhea", "Saturn - Rhea", (256, 128), 72, None, True),
    ("titan", "Saturn - Titan", (256, 128), 80, None, False),
    ("iapetus", "Saturn - Iapetus", (256, 128), 72, None, True),
    ("miranda", "Uranus - Miranda", (256, 128), 72, ("lo", 10), True),
    ("ariel", "Uranus - Ariel", (256, 128), 72, ("lo", 10), True),
    ("umbriel", "Uranus - Umbriel", (256, 128), 72, ("lo", 10), True),
    ("titania", "Uranus - Titania", (256, 128), 72, ("lo", 10), True),
    ("oberon", "Uranus - Oberon", (256, 128), 72, ("lo", 10), True),
    ("triton", "Neptune - Triton", (256, 128), 76, ("lo", 10), False),
]
tex, report, total = {}, [], 0
sheet = Image.new("RGB", (256 * 6, 128 * 5), (30, 30, 30))
for i, (key, name, size, q, fix, grey) in enumerate(SPEC):
    im = load(name)
    if fix == "disc":
        im = moon_from_disc(im, *size)
    elif fix:
        im = fill(im, **{fix[0]: fix[1]})
    im = im.resize(size, Image.LANCZOS)
    if grey:
        im = im.convert("L")
    buf = io.BytesIO(); im.save(buf, "JPEG", quality=q, optimize=True)
    tex[key] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()
    total += len(tex[key]); report.append((key, name, size, len(buf.getvalue())))
    sheet.paste(im.convert("RGB").resize((256, 128)), ((i % 6) * 256, (i // 6) * 128))
json.dump(tex, open(os.path.join(OUT, "textures.json"), "w"))
sheet.save(os.path.join(OUT, "textures-sheet.jpg"), quality=80)
for r in report:
    print("%-10s %-24s %4dx%-4d %6d bytes" % (r[0], r[1], r[2][0], r[2][1], r[3]))
print("base64 total", total)
