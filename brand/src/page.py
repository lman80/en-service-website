"""Mockup sheet for the E&N logo. Every mockup is inline SVG built from the traced
mark, so the page is vector top to bottom."""
import json, os, re
P = json.load(open('paths.json'))
PEB, LET = P['pebble_clean'], P['letters']
B = os.path.expanduser('~/en-service-website/brand')

def inner(name):
    s = open(os.path.join(B, name)).read()
    vb = re.search(r'viewBox="([^"]+)"', s).group(1)
    body = re.sub(r'^.*?</title>', '', s, flags=re.S).replace('</svg>', '').strip()
    return vb, body

files = ['en-logo.svg', 'en-logo-reverse.svg', 'en-wordmark.svg', 'en-wordmark-white.svg',
         'en-lockup-horizontal.svg', 'en-lockup-horizontal-white.svg', 'en-lockup-stacked.svg',
         'en-badge.svg', 'en-wordmark-line.svg', 'en-wordmark-stacked.svg']
sym = {f: inner(f) for f in files}
def sid(f): return 's-' + f[:-4]
defs = ''.join(f'<symbol id="{sid(f)}" viewBox="{vb}">{body}</symbol>' for f, (vb, body) in sym.items())
# recolourable mark: pebble in currentColor, letters punched through in the ground colour
defs += (f'<symbol id="s-peb" viewBox="0 0 866 606.34"><path d="{PEB}"/></symbol>'
         f'<symbol id="s-let" viewBox="0 0 866 606.34"><path d="{LET}"/></symbol>')

def use(f, x, y, w, h=None, extra=''):
    vb = [float(v) for v in sym[f][0].split()]
    h = h if h is not None else w * vb[3] / vb[2]
    return f'<use href="#{sid(f)}" x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}"{extra}/>'

def tile(f, dark=False, label=''):
    vb = [float(v) for v in sym[f][0].split()]
    ratio = vb[2] / vb[3]
    return (f'<figure class="tile{" dark" if dark else ""}"><div class="art"><svg viewBox="{sym[f][0]}" role="img" aria-label="{label}" '
            f'style="aspect-ratio:{ratio:.3f}"><use href="#{sid(f)}"/></svg></div>'
            f'<figcaption><b>{label}</b><span>{f}</span></figcaption></figure>')

# ---------------------------------------------------------------- scenes
cards = f'''<svg viewBox="0 0 900 620" role="img" aria-label="Business cards">
  <defs><filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-opacity=".22"/></filter></defs>
  <rect width="900" height="620" fill="#d9d8d4"/>
  <g transform="translate(90 170) rotate(-6)" filter="url(#sh)">
    <rect width="385" height="220" rx="6" fill="#111"/>
    {use('en-logo-reverse.svg', 112, 50, 160)}
  </g>
  <g transform="translate(430 250) rotate(4)" filter="url(#sh)">
    <rect width="385" height="220" rx="6" fill="#fbfbfa"/>
    {use('en-lockup-horizontal.svg', 30, 30, 170)}
    <text x="30" y="150" class="mk" font-size="13" font-weight="600" fill="#111">Send us the list. We&#8217;ll handle the rest.</text>
    <text x="30" y="178" class="mk" font-size="12" fill="#444">enservicecompany@gmail.com</text>
    <text x="30" y="196" class="mk" font-size="12" fill="#444">262-206-2108</text>
  </g>
</svg>'''

# isometric box: C = front-bottom corner; L = left depth, D = right depth, H = height
box = f'''<svg viewBox="0 0 900 620" role="img" aria-label="Shipping box">
  <rect width="900" height="620" fill="#e7e5e0"/>
  <ellipse cx="455" cy="560" rx="330" ry="46" fill="#000" opacity=".12"/>
  <g transform="translate(60 0)">
    <polygon points="400,560 140.2,410 140.2,180 400,330" fill="#c4945a"/>
    <polygon points="400,560 590.5,450 590.5,220 400,330" fill="#a97a45"/>
    <polygon points="400,330 140.2,180 330.7,70 590.5,220" fill="#d6a86e"/>
    <line x1="270" y1="255" x2="460" y2="145" stroke="#b58750" stroke-width="2"/>
    <g transform="matrix(.866 .5 0 1 140.2 180)">{use('en-badge.svg', 40, 38, 220)}</g>
    <g transform="matrix(.866 .5 .866 -.5 140.2 180)">
      <rect x="0" y="92" width="300" height="36" fill="#161616"/>
      {''.join(use('en-wordmark-white.svg', 12 + i * 58, 104, 30) for i in range(5))}
    </g>
    <g transform="matrix(.866 -.5 0 1 400 330)">
      <rect x="92" y="0" width="36" height="70" fill="#161616"/>
      <rect x="28" y="110" width="160" height="96" rx="3" fill="#f7f6f2"/>
      {use('en-lockup-horizontal.svg', 40, 122, 80)}
      <rect x="40" y="160" width="100" height="5" fill="#bbb"/><rect x="40" y="172" width="70" height="5" fill="#bbb"/>
      {''.join(f'<rect x="{146 + i*3.2:.1f}" y="152" width="{1.4 if i % 3 else 2.4}" height="42" fill="#111"/>' for i in range(10))}
    </g>
  </g>
</svg>'''

van = f'''<svg viewBox="0 0 900 460" role="img" aria-label="Delivery van" preserveAspectRatio="xMidYMid slice">
  <rect width="900" height="460" fill="#dfe3e6"/>
  <rect y="372" width="900" height="88" fill="#cfd4d8"/>
  <ellipse cx="440" cy="378" rx="360" ry="16" fill="#000" opacity=".18"/>
  <g transform="translate(80 70)">
    <path d="M20 292 L20 60 Q20 20 60 20 L500 20 Q540 20 566 52 L664 176 Q700 186 712 214 L716 292 Z" fill="#fafafa" stroke="#c9cdd1" stroke-width="2"/>
    <path d="M512 44 L548 44 Q560 46 574 64 L640 158 L512 158 Z" fill="#2a3440"/>
    <line x1="500" y1="30" x2="500" y2="288" stroke="#d3d7db" stroke-width="2"/>
    <rect x="520" y="176" width="30" height="7" rx="3" fill="#b9bec3"/>
    <path d="M688 214 h26 v26 h-22 z" fill="#f2c14e"/>
    {use('en-lockup-horizontal.svg', 70, 70, 360)}
    <rect x="20" y="258" width="696" height="34" fill="#1b1b1b"/>
    {''.join(f'<g transform="translate({cx} 292)"><circle r="54" fill="#dfe3e6"/><circle r="44" fill="#1c1c1c"/><circle r="22" fill="#9aa1a8"/><circle r="7" fill="#555"/></g>' for cx in (160, 580))}
  </g>
</svg>'''

web = f'''<svg viewBox="0 0 900 560" role="img" aria-label="Website header">
  <rect width="900" height="560" fill="#cfd3d6"/>
  <g transform="translate(40 36)">
    <rect width="820" height="500" rx="12" fill="#fff"/>
    <path d="M0 12 Q0 0 12 0 H808 Q820 0 820 12 V44 H0 Z" fill="#e9ebed"/>
    <circle cx="22" cy="22" r="6" fill="#ff5f57"/><circle cx="42" cy="22" r="6" fill="#febc2e"/><circle cx="62" cy="22" r="6" fill="#28c840"/>
    <path d="M90 44 V16 Q90 8 98 8 H290 Q298 8 298 16 V44 Z" fill="#fff"/>
    {use('en-logo.svg', 104, 18, 22)}
    <text x="134" y="31" class="mk" font-size="12" fill="#333">E&amp;N Service Company</text>
    <rect x="0" y="44" width="820" height="34" fill="#fff"/>
    <rect x="16" y="50" width="788" height="22" rx="11" fill="#f1f2f4"/>
    <text x="34" y="65" class="mk" font-size="11" fill="#777">lman80.github.io/en-service-website</text>
    <line x1="0" y1="78" x2="820" y2="78" stroke="#e5e5e5"/>
    {use('en-wordmark.svg', 40, 98, 66)}
    <text x="780" y="120" text-anchor="end" class="mk" font-size="13" fill="#333"><tspan>Supplies</tspan><tspan dx="22">How it works</tspan><tspan dx="22">Who we serve</tspan><tspan dx="22">Contact</tspan></text>
    <text x="40" y="250" class="mk" font-size="52" font-weight="700" fill="#111" letter-spacing="-1.5">Send us the list.</text>
    <text x="40" y="312" class="mk" font-size="52" font-weight="700" fill="#111" letter-spacing="-1.5">We&#8217;ll handle the rest.</text>
    <text x="40" y="354" class="mk" font-size="17" fill="#555">Tell us what you need. We&#8217;ll find it, price it and get it to you.</text>
    <rect x="40" y="384" width="150" height="46" rx="23" fill="#111"/>
    <text x="115" y="412" text-anchor="middle" class="mk" font-size="15" font-weight="600" fill="#fff">Send your list</text>
    {use('en-logo.svg', 520, 190, 250)}
  </g>
</svg>'''

icons = f'''<svg viewBox="0 0 900 420" role="img" aria-label="Profile picture and app icon">
  <rect width="900" height="420" fill="#ecebe8"/>
  <g transform="translate(150 70)">
    <circle cx="120" cy="120" r="120" fill="#111"/>
    {use('en-wordmark-white.svg', 40, 84, 160)}
    <text x="120" y="290" text-anchor="middle" class="mk" font-size="16" font-weight="600" fill="#111">Profile picture</text>
  </g>
  <g transform="translate(510 70)">
    <rect width="240" height="240" rx="54" fill="#fff" stroke="#d6d6d2"/>
    {use('en-logo.svg', 30, 64, 180)}
    <text x="120" y="290" text-anchor="middle" class="mk" font-size="16" font-weight="600" fill="#111">App / favicon</text>
  </g>
</svg>'''

colors = [('#111111', 'Black'), ('#17264a', 'Navy'), ('#e2531e', 'Signal orange'), ('#2d6a4f', 'Forest')]
color_tiles = ''.join(f'''<figure class="tile"><div class="art"><svg viewBox="0 0 866 606.34" role="img" aria-label="{n}" style="aspect-ratio:1.428">
  <use href="#s-peb" fill="{c}"/><use href="#s-let" fill="#fff"/></svg></div><figcaption><b>{n}</b><span>{c}</span></figcaption></figure>''' for c, n in colors)

html = f'''<title>E&amp;N Logo Mockups</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap">
<style>
:root {{
  --ground: #f3f3f1; --panel: #ffffff; --ink: #121212; --ink-2: #62625e; --line: #deded9;
  --font: "Figtree", "Segoe UI", Helvetica, Arial, sans-serif;
}}
@media (prefers-color-scheme: dark) {{
  :root:not([data-theme="light"]) {{ color-scheme: dark; --ground: #141414; --panel: #1d1d1c; --ink: #f1f1ee; --ink-2: #a3a39e; --line: #30302e; }}
}}
:root[data-theme="dark"] {{ color-scheme: dark; --ground: #141414; --panel: #1d1d1c; --ink: #f1f1ee; --ink-2: #a3a39e; --line: #30302e; }}
* {{ box-sizing: border-box; }}
body {{ background: var(--ground); color: var(--ink); font: 400 16px/1.5 var(--font); }}
.wrap {{ max-width: 1180px; margin: 0 auto; padding-inline: 20px; padding-block: 40px 72px; }}
header {{ display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }}
header svg {{ width: 96px; height: auto; color: var(--ink); }}
h1 {{ font-size: clamp(30px, 5vw, 46px); line-height: 1.05; font-weight: 800; letter-spacing: -.02em; margin: 0; }}
header p {{ margin: 6px 0 0; color: var(--ink-2); max-width: 60ch; }}
h2 {{ font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: var(--ink-2); margin: 56px 0 14px; }}
.grid {{ display: grid; gap: 14px; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }}
.tile {{ margin: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }}
.tile .art {{ flex: 1; display: grid; place-items: center; padding: 34px 28px; min-height: 200px; background: #fff; }}
.tile.dark .art {{ background: #111; }}
.tile svg {{ width: 100%; max-height: 150px; height: auto; }}
figcaption {{ display: flex; justify-content: space-between; gap: 10px; padding: 11px 14px; border-top: 1px solid var(--line); font-size: 13px; }}
figcaption span {{ color: var(--ink-2); font-variant-numeric: tabular-nums; }}
.scenes {{ display: grid; gap: 14px; grid-template-columns: repeat(2, 1fr); }}
.scene {{ margin: 0; border-radius: 10px; overflow: hidden; border: 1px solid var(--line); background: var(--panel); }}
.scene svg {{ display: block; width: 100%; height: auto; }}
.scene figcaption {{ border-top: 1px solid var(--line); }}
.scene.wide {{ grid-column: 1 / -1; }}
.mk {{ font-family: var(--font); }}
.note {{ color: var(--ink-2); font-size: 14px; margin-top: 40px; max-width: 70ch; }}
.note a {{ color: inherit; }}
@media (max-width: 760px) {{ .scenes {{ grid-template-columns: 1fr; }} }}
</style>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>{defs}</defs></svg>
<div class="wrap">
  <header>
    <svg viewBox="0 0 866 606.34" aria-hidden="true"><use href="#s-peb" fill="currentColor"/><use href="#s-let" fill="var(--ground)"/></svg>
    <div><h1>E&amp;N logo</h1><p>Your mark, redrawn as clean vectors, plus versions with &ldquo;service company&rdquo; and a few places it would live.</p></div>
  </header>

  <h2>The logo</h2>
  <div class="grid">
    {tile('en-logo.svg', False, 'Base logo')}
    {tile('en-logo-reverse.svg', True, 'Reversed, for dark')}
    {tile('en-wordmark.svg', False, 'Plain e&amp;n')}
    {tile('en-wordmark-white.svg', True, 'Plain e&amp;n, white')}
  </div>

  <h2>With &ldquo;service company&rdquo;</h2>
  <div class="grid">
    {tile('en-lockup-horizontal.svg', False, 'Side by side')}
    {tile('en-lockup-horizontal-white.svg', True, 'Side by side, dark')}
    {tile('en-lockup-stacked.svg', False, 'Stacked')}
    {tile('en-badge.svg', False, 'Badge')}
    {tile('en-wordmark-line.svg', False, 'One line')}
    {tile('en-wordmark-stacked.svg', False, 'Plain, over caps')}
  </div>

  <h2>In use</h2>
  <div class="scenes">
    <figure class="scene wide">{web}<figcaption><b>Website</b><span>plain e&amp;n in the menu bar, base logo as the tab icon</span></figcaption></figure>
    <figure class="scene">{cards}<figcaption><b>Business cards</b><span>reversed front, side-by-side back</span></figcaption></figure>
    <figure class="scene">{box}<figcaption><b>Shipping box</b><span>badge print, branded tape, label</span></figcaption></figure>
    <figure class="scene">{van}<figcaption><b>Delivery van</b><span>side-by-side lockup</span></figcaption></figure>
    <figure class="scene">{icons}<figcaption><b>Icons</b><span>profile picture and app icon</span></figcaption></figure>
  </div>

  <h2>In color &mdash; just ideas</h2>
  <div class="grid">{color_tiles}</div>

  <p class="note">&ldquo;service company&rdquo; is set in Figtree and converted to shapes, so every file works without the font installed. All ten SVG files are in the <a href="https://github.com/lman80/en-service-website/tree/main/brand">brand folder on GitHub</a>.</p>
</div>
'''
open('mockups.html', 'w').write(html)
open(os.path.join(B, 'mockups.html'), 'w').write(html)
print(len(html) // 1024, 'KB')
