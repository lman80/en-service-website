"""Build the E&N logo files: the traced mark plus lockups with 'service company'
set in Figtree and converted to outlines, so no SVG depends on an installed font."""
import json, os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

OUT = os.path.expanduser('~/en-service-website/brand')
os.makedirs(OUT, exist_ok=True)
P = json.load(open('paths.json'))
PEB = P['pebble_clean']
LET = P['letters']
PW, PH = 866, 606.34                      # pebble box
LX0, LY0, LX1, LY1 = 91.67, 130.33, 768.67, 433.33   # letters box inside it
LW, LH = LX1 - LX0, LY1 - LY0
X_TOP, BASE = 208 - LY0, 429.5 - LY0      # e/n x-height top and baseline, in letter-box coords

_fonts = {}
def font(w):
    if w not in _fonts:
        _fonts[w] = instancer.instantiateVariableFont(TTFont('Figtree.ttf'), {'wght': w})
    return _fonts[w]

def text(s, size, x, y, weight=600, track=0.0):
    """Outline `s` with its baseline at y, starting at x. Returns (path d, advance width)."""
    f = font(weight); gs = f.getGlyphSet(); cmap = f.getBestCmap(); hm = f['hmtx']
    k = size / f['head'].unitsPerEm
    pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip('0').rstrip('.'))
    cx = 0.0
    for i, ch in enumerate(s):
        g = cmap[ord(ch)]
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x + cx, y)))
        cx += hm[g][0] * k + (track * size if i < len(s) - 1 else 0)
    return pen.getCommands(), cx

def svg(name, w, h, body, title):
    doc = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" width="{w:.0f}" height="{h:.0f}" role="img">'
           f'<title>{title.replace("&", "&amp;")}</title>{body}</svg>\n')
    open(os.path.join(OUT, name), 'w').write(doc)
    return doc

def mark(ink='#000', paper='#fff', dx=0, dy=0, letters_tf=''):
    return (f'<g transform="translate({dx:.2f} {dy:.2f})"><path fill="{ink}" d="{PEB}"/>'
            f'<path fill="{paper}" d="{LET}"{letters_tf}/></g>')

def word(fill='#000', dx=0, dy=0, s=1.0):
    return f'<path fill="{fill}" transform="translate({dx:.2f} {dy:.2f}) scale({s}) translate({-LX0} {-LY0})" d="{LET}"/>'

made = {}
# 1-2. the mark, and reversed for dark grounds
made['en-logo.svg'] = svg('en-logo.svg', PW, PH, mark(), 'E&N Service Company')
made['en-logo-reverse.svg'] = svg('en-logo-reverse.svg', PW, PH, mark('#fff', '#000'), 'E&N Service Company')
# 3-4. plain letters, no pebble
made['en-wordmark.svg'] = svg('en-wordmark.svg', LW, LH, word('#000'), 'E&N')
made['en-wordmark-white.svg'] = svg('en-wordmark-white.svg', LW, LH, word('#fff'), 'E&N')

# 5. horizontal lockup: mark + two lines
size = 250; xh = size * .5
gap = 78
top = PH / 2 - (xh + size) / 2 + 10
d1, w1 = text('service', size, PW + gap, top + xh, 650)
d2, w2 = text('company', size, PW + gap, top + xh + size, 650)
W = PW + gap + max(w1, w2) + 8
made['en-lockup-horizontal.svg'] = svg('en-lockup-horizontal.svg', W, PH,
    mark() + f'<path d="{d1}{d2}"/>', 'E&N Service Company')
made['en-lockup-horizontal-white.svg'] = svg('en-lockup-horizontal-white.svg', W, PH,
    mark('#fff', '#000') + f'<path fill="#fff" d="{d1}{d2}"/>', 'E&N Service Company')

# 6. stacked: mark over one line, the line as wide as the mark
_, w = text('service company', 100, 0, 0, 650)
size = 100 * PW * .92 / w
d, w = text('service company', size, (PW - PW * .92) / 2, PH + 70 + size * .5, 650)
H = PH + 70 + size * .5 + size * .25
made['en-lockup-stacked.svg'] = svg('en-lockup-stacked.svg', PW, H, mark() + f'<path d="{d}"/>', 'E&N Service Company')

# 7. badge: SERVICE COMPANY inside the pebble, under smaller letters
s = .86
lx = (PW - LW * s) / 2; ly = 96
cap = 44; size = cap / .7
_, w = text('SERVICE COMPANY', size, 0, 0, 700, .16)
d, w = text('SERVICE COMPANY', size, (PW - w) / 2, ly + LH * s + 58 + cap, 700, .16)
badge = (f'<path fill="#000" d="{PEB}"/>'
         f'<path fill="#fff" transform="translate({lx:.2f} {ly}) scale({s}) translate({-LX0} {-LY0})" d="{LET}"/>'
         f'<path fill="#fff" d="{d}"/>')
made['en-badge.svg'] = svg('en-badge.svg', PW, PH, badge, 'E&N Service Company')

# 8. one line: e&n service company, text on the letters' baseline
xh_t = (BASE - X_TOP) * .62
size = xh_t / .5
d, w = text('service company', size, LW + 70, BASE, 500)
made['en-wordmark-line.svg'] = svg('en-wordmark-line.svg', LW + 70 + w + 6, LH + size * .25,
    word('#000') + f'<path d="{d}"/>', 'E&N Service Company')

# 9. letters over tracked caps, same width
_, w = text('SERVICE COMPANY', 100, 0, 0, 600, .22)
size = 100 * LW / w
cap = size * .7
d, w = text('SERVICE COMPANY', size, 0, LH + 64 + cap, 600, .22)
made['en-wordmark-stacked.svg'] = svg('en-wordmark-stacked.svg', LW, LH + 64 + cap + 4,
    word('#000') + f'<path d="{d}"/>', 'E&N Service Company')

json.dump({k: v for k, v in made.items()}, open('made.json', 'w'))
print('\n'.join(f'{k}: {len(v)//1024} KB' for k, v in made.items()))
