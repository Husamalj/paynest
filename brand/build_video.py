# -*- coding: utf-8 -*-
"""Build a polished PayNest product demo MP4 from screenshots in ../pect."""
import os, glob, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio.v2 as imageio

W, H = 1600, 900
FPS = 30
SHOTS_DIR = os.path.join(os.path.dirname(__file__), "..", "pect")
ICON = os.path.join(os.path.dirname(__file__), "paynest-icon.png")
BOLD = "C:/Windows/Fonts/segoeuib.ttf"
REG  = "C:/Windows/Fonts/segoeui.ttf"
OUT  = os.path.join(os.path.dirname(__file__), "PayNest-Demo.mp4")

NAVY=(0x0A,0x23,0x3A); BRAND=(0x0C,0x8C,0xE8); SLATE=(0x47,0x55,0x69)
DEEP=(0x04,0x2A,0x4A); WHITE=(255,255,255)

def F(path,sz): return ImageFont.truetype(path,sz)

# ----- ordered scenes: (filename_glob_time, Title, Subtitle, crop_taskbar) -----
ORDER = [
    ("174939","Modern marketing site","A clean, professional first impression",False),
    ("175005","One login, two portals","Staff and employees, clearly separated",False),
    ("175042","Secure staff portal","Owners, HR and super admins sign in here",False),
    ("175203","Owner portal","Company overview at a glance",True),
    ("175229","HR team management","Add and manage HR managers",False),
    ("175321","HR dashboard","Live payroll, attendance and requests",False),
    ("175451","Upload & calculate","Drop attendance, pick the period, calculate",False),
    ("175406","Employee management","Full employee records and details",False),
    ("180109","Flexible payroll engine","Hourly or daily — your rules",False),
    ("180137","Per-employee settings","Toggle social security individually",False),
    ("175902","Bonuses & deductions","Track every adjustment with reasons",False),
    ("175943","Employee evaluations","Periodic performance reviews & bonuses",False),
    ("180017","Org structure","Drag-and-drop supervisor assignment",False),
    ("180207","Employee portal","A dedicated portal for every employee",False),
    ("180452","Self-service for staff","Salary, supervision and tasks in one place",False),
    ("180522","Supervisor reviews","Evaluate your team in seconds",True),
    ("180549","Assign tasks","Delegate work with deadlines",False),
]

def find(token):
    g = glob.glob(os.path.join(SHOTS_DIR, f"*{token}*.png"))
    return g[0] if g else None

def vgrad(top, bot):
    a=np.linspace(0,1,H)[:,None]
    img=np.zeros((H,W,3),np.uint8)
    for i in range(3):
        img[:,:,i]=(top[i]+(bot[i]-top[i])*a).astype(np.uint8)
    return Image.fromarray(img,"RGB")

def rounded(size,rad,fill):
    m=Image.new("RGBA",size,(0,0,0,0)); d=ImageDraw.Draw(m)
    d.rounded_rectangle([0,0,size[0]-1,size[1]-1],rad,fill=fill); return m

def shadow(size,rad,blur=28,alpha=70,off=(0,16)):
    pad=blur*3
    s=Image.new("RGBA",(size[0]+pad*2,size[1]+pad*2),(0,0,0,0))
    d=ImageDraw.Draw(s)
    d.rounded_rectangle([pad,pad,pad+size[0],pad+size[1]],rad,fill=(4,40,80,alpha))
    s=s.filter(ImageFilter.GaussianBlur(blur))
    return s,pad,off

icon_img=Image.open(ICON).convert("RGBA").resize((58,58),Image.LANCZOS)

def base_frame():
    f=vgrad((0xEF,0xF6,0xFD),(0xDD,0xEC,0xFA)).convert("RGBA")
    f.alpha_composite(icon_img,(64,40))
    d=ImageDraw.Draw(f)
    d.text((132,52),"Pay",font=F(BOLD,34),fill=NAVY)
    pw=d.textlength("Pay",font=F(BOLD,34))
    d.text((132+pw,52),"Nest",font=F(BOLD,34),fill=BRAND)
    d.text((1536,60),"Product Tour",font=F(REG,20),fill=SLATE,anchor="ra")
    return f

def scene(path,title,sub,crop_tb):
    f=base_frame(); d=ImageDraw.Draw(f)
    shot=Image.open(path).convert("RGB")
    if crop_tb:
        shot=shot.crop((0,0,shot.width,shot.height-46))
    # window card area
    AX,AY,AW,AH=120,150,1360,610
    bar=44
    # fit screenshot inside (AW, AH-bar)
    iw,ih=shot.width,shot.height
    scale=min(AW/iw,(AH-bar)/ih)
    nw,nh=int(iw*scale),int(ih*scale)
    shot=shot.resize((nw,nh),Image.LANCZOS)
    cardW,cardH=AW,bar+nh
    cx=AX+(AW-cardW)//2; cy=AY+(AH-cardH)//2
    # shadow
    sh,pad,off=shadow((cardW,cardH),18)
    f.alpha_composite(sh,(cx-pad+off[0],cy-pad+off[1]))
    # card (white) with rounded mask
    card=Image.new("RGBA",(cardW,cardH),(0,0,0,0))
    card.alpha_composite(rounded((cardW,cardH),18,(255,255,255,255)))
    cd=ImageDraw.Draw(card)
    cd.rectangle([0,0,cardW,bar],fill=(243,247,251,255))
    for i,col in enumerate([(0xFF,0x5F,0x57),(0xFE,0xBC,0x2E),(0x28,0xC8,0x40)]):
        cd.ellipse([20+i*26,bar//2-7,34+i*26,bar//2+7],fill=col)
    cd.text((cardW//2,bar//2),"paynest-tau.vercel.app",font=F(REG,17),fill=(0x94,0xA3,0xB8),anchor="mm")
    # paste screenshot under bar, centered
    sx=(cardW-nw)//2
    card.alpha_composite(Image.new("RGBA",(nw,nh),(255,255,255,255)),(sx,bar))
    card.paste(shot,(sx,bar))
    # re-clip rounded corners
    clip=rounded((cardW,cardH),18,(255,255,255,255))
    out=Image.new("RGBA",(cardW,cardH),(0,0,0,0)); out.paste(card,(0,0),clip)
    f.alpha_composite(out,(cx,cy))
    # caption
    d.text((W//2,800),title,font=F(BOLD,38),fill=NAVY,anchor="mm")
    d.text((W//2,848),sub,font=F(REG,22),fill=SLATE,anchor="mm")
    return f.convert("RGB")

def intro():
    f=vgrad((0x06,0x33,0x57),(0x03,0x1C,0x33)).convert("RGBA")
    d=ImageDraw.Draw(f)
    big=Image.open(ICON).convert("RGBA").resize((150,150),Image.LANCZOS)
    f.alpha_composite(big,(W//2-75,260))
    pw=d.textlength("Pay",font=F(BOLD,86)); nw=d.textlength("Nest",font=F(BOLD,86))
    total=pw+nw; startx=W//2-total/2
    d.text((startx,470),"Pay",font=F(BOLD,86),fill=WHITE,anchor="la")
    d.text((startx+pw,470),"Nest",font=F(BOLD,86),fill=BRAND,anchor="la")
    d.text((W//2,640),"Payroll & HR, in one complete system",font=F(REG,30),fill=(0xC7,0xDD,0xF0),anchor="mm")
    d.text((W//2,696),"A quick product tour",font=F(REG,22),fill=(0x7F,0xA8,0xC8),anchor="mm")
    return f.convert("RGB")

def outro():
    f=vgrad((0x06,0x33,0x57),(0x03,0x1C,0x33)).convert("RGBA")
    d=ImageDraw.Draw(f)
    big=Image.open(ICON).convert("RGBA").resize((130,130),Image.LANCZOS)
    f.alpha_composite(big,(W//2-65,250))
    d.text((W//2,440),"Ready to get started?",font=F(BOLD,56),fill=WHITE,anchor="mm")
    d.text((W//2,520),"Digitize your HR and payroll today.",font=F(REG,28),fill=(0xC7,0xDD,0xF0),anchor="mm")
    pill=rounded((360,70),35,(0x0C,0x8C,0xE8,255))
    f.alpha_composite(pill,(W//2-180,600))
    d.text((W//2,635),"paynest-tau.vercel.app",font=F(BOLD,26),fill=WHITE,anchor="mm")
    return f.convert("RGB")

# ---- assemble scenes ----
print("Compositing scenes...")
scenes=[np.asarray(intro())]
for tok,t,s,c in ORDER:
    p=find(tok)
    if not p: print("  missing",tok); continue
    scenes.append(np.asarray(scene(p,t,s,c)))
scenes.append(np.asarray(outro()))

HOLD=int(FPS*4.0); FADE=int(FPS*0.6)
HOLD_INTRO=int(FPS*3.0); HOLD_OUTRO=int(FPS*3.2)

print(f"Writing {OUT} ...")
w=imageio.get_writer(OUT,fps=FPS,codec="libx264",quality=8,macro_block_size=8,
                     ffmpeg_params=["-pix_fmt","yuv420p"])
def hold(img,n):
    for _ in range(n): w.append_data(img)
def fade(a,b,n):
    af=a.astype(np.float32); bf=b.astype(np.float32)
    for i in range(n):
        t=(i+1)/(n+1)
        w.append_data((af*(1-t)+bf*t).astype(np.uint8))

for i,img in enumerate(scenes):
    h = HOLD_INTRO if i==0 else (HOLD_OUTRO if i==len(scenes)-1 else HOLD)
    hold(img,h)
    if i<len(scenes)-1: fade(img,scenes[i+1],FADE)
w.close()
print("DONE:",OUT,"| scenes:",len(scenes))
