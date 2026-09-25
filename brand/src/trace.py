import numpy as np, potrace, json
from PIL import Image
from collections import deque
im = Image.open('../../images/2.webp').convert('L')
S = 3
im = im.resize((im.width*S, im.height*S), Image.LANCZOS)
from PIL import ImageFilter
im = im.filter(ImageFilter.GaussianBlur(4))
g = np.array(im)
black = g < 128
H, W = black.shape
# background = white pixels connected to the border
bg = np.zeros_like(black)
q = deque()
for x in range(W):
    for y in (0, H-1):
        if not black[y,x] and not bg[y,x]: bg[y,x]=True; q.append((y,x))
for y in range(H):
    for x in (0, W-1):
        if not black[y,x] and not bg[y,x]: bg[y,x]=True; q.append((y,x))
while q:
    y,x = q.popleft()
    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny,nx=y+dy,x+dx
        if 0<=ny<H and 0<=nx<W and not bg[ny,nx] and not black[ny,nx]:
            bg[ny,nx]=True; q.append((ny,nx))
pebble = ~bg
letters = pebble & ~black
ys,xs = np.where(pebble); x0,x1,y0,y1 = xs.min(),xs.max(),ys.min(),ys.max()
ly,lx = np.where(letters); print('pebble bbox', x0,y0,x1,y1, 'letters bbox', lx.min(),ly.min(),lx.max(),ly.max())

def trace(mask):
    bm = potrace.Bitmap(~mask)
    plist = bm.trace(turdsize=60, alphamax=1.0, opticurve=True, opttolerance=1.2)
    d=[]
    for c in plist:
        sp=c.start_point; d.append(f"M{(sp.x-x0)/S:.2f} {(sp.y-y0)/S:.2f}")
        for seg in c.segments:
            if seg.is_corner:
                d.append(f"L{(seg.c.x-x0)/S:.2f} {(seg.c.y-y0)/S:.2f}L{(seg.end_point.x-x0)/S:.2f} {(seg.end_point.y-y0)/S:.2f}")
            else:
                d.append(f"C{(seg.c1.x-x0)/S:.2f} {(seg.c1.y-y0)/S:.2f} {(seg.c2.x-x0)/S:.2f} {(seg.c2.y-y0)/S:.2f} {(seg.end_point.x-x0)/S:.2f} {(seg.end_point.y-y0)/S:.2f}")
        d.append("Z")
    return "".join(d)
out = {"w": (x1-x0+1)/S, "h": (y1-y0+1)/S, "pebble": trace(pebble), "letters": trace(letters),
       "letters_bbox": [(lx.min()-x0)/S, (ly.min()-y0)/S, (lx.max()-x0+1)/S, (ly.max()-y0+1)/S]}
json.dump(out, open('paths.json','w'))
np.save('pebble_mask.npy', pebble[y0:y1+1, x0:x1+1])
print(out['w'], out['h'], out['letters_bbox'], len(out['pebble']), len(out['letters']))
