# -*- coding: utf-8 -*-
"""Render PayNest logo PNGs (icon + horizontal lockup) with Pillow."""
from PIL import Image, ImageDraw, ImageFont

BOLD = "C:/Windows/Fonts/segoeuib.ttf"

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i]-a[i])*t) for i in range(3))

TOP    = (0x1A, 0xA0, 0xF2)
MID    = (0x0C, 0x8C, 0xE8)
BOTTOM = (0x07, 0x5A, 0x9E)

def rounded_mask(size, radius):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size[0]-1, size[1]-1], radius=radius, fill=255)
    return m

def gradient(size):
    w, h = size
    img = Image.new("RGB", size)
    px = img.load()
    for y in range(h):
        t = y / (h-1)
        c = lerp(TOP, MID, t*1.8) if t < 0.55 else lerp(MID, BOTTOM, (t-0.55)/0.45)
        for x in range(w):
            px[x, y] = c
    return img

def make_icon(S=1024):
    """Render the app-icon tile at S x S (transparent rounded corners)."""
    ss = S*3  # supersample for smooth edges
    g = gradient((ss, ss))
    icon = Image.new("RGBA", (ss, ss), (0,0,0,0))
    icon.paste(g, (0,0), rounded_mask((ss, ss), int(ss*0.23)))
    d = ImageDraw.Draw(icon)
    sc = ss/512.0
    def P(x, y): return (x*sc, y*sc)

    # nest arcs as quadratic bezier polylines
    def quad(p0, p1, p2, width, color):
        pts = []
        for i in range(61):
            t = i/60
            x = (1-t)**2*p0[0] + 2*(1-t)*t*p1[0] + t**2*p2[0]
            y = (1-t)**2*p0[1] + 2*(1-t)*t*p1[1] + t**2*p2[1]
            pts.append((x, y))
        d.line(pts, fill=color, width=int(width*sc), joint="curve")
        r = width*sc/2
        for end in (pts[0], pts[-1]):
            d.ellipse([end[0]-r, end[1]-r, end[0]+r, end[1]+r], fill=color)

    quad(P(101,206), P(256,474), P(411,206), 30, (0xA9,0xD6,0xF7,255))
    quad(P(133,212), P(256,430), P(379,212), 26, (0xD6,0xEC,0xFB,255))
    quad(P(163,216), P(256,392), P(349,216), 22, (255,255,255,255))

    # coin
    cx, cy, r = 256*sc, 188*sc, 80*sc
    d.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255,255,255,255))
    r2 = 60*sc
    d.ellipse([cx-r2, cy-r2, cx+r2, cy+r2], outline=(0x7C,0xC7,0xFC,255), width=int(7*sc))
    # dollar glyph from the bold font
    dollar = ImageFont.truetype(BOLD, int(104*sc))
    bb = d.textbbox((0,0), "$", font=dollar)
    dw, dh = bb[2]-bb[0], bb[3]-bb[1]
    d.text((cx-dw/2-bb[0], cy-dh/2-bb[1]), "$", font=dollar, fill=(0x0C,0x8C,0xE8,255))

    return icon.resize((S, S), Image.LANCZOS)

def make_lockup():
    icon = make_icon(360)
    W, H = 1320, 440
    img = Image.new("RGBA", (W, H), (255,255,255,0))
    img.paste(icon, (40, 40), icon)
    d = ImageDraw.Draw(img)
    big = ImageFont.truetype(BOLD, 170)
    sub = ImageFont.truetype(BOLD, 40)
    x = 450
    d.text((x, 130), "Pay", font=big, fill=(0x0A,0x23,0x3A))
    payw = d.textlength("Pay", font=big)
    d.text((x+payw, 130), "Nest", font=big, fill=(0x0C,0x8C,0xE8))
    d.text((x+6, 330), "P A Y R O L L   &   H R", font=sub, fill=(0x64,0x74,0x8B))
    return img

# white-bg versions too
def on_white(img):
    bg = Image.new("RGBA", img.size, (255,255,255,255))
    bg.alpha_composite(img)
    return bg.convert("RGB")

ic = make_icon(1024)
ic.save("paynest-icon.png")
ic.resize((512,512), Image.LANCZOS).save("paynest-icon-512.png")
lk = make_lockup()
lk.save("paynest-logo.png")
on_white(lk).save("paynest-logo-white.png")
print("Rendered: paynest-icon.png, paynest-icon-512.png, paynest-logo.png, paynest-logo-white.png")
