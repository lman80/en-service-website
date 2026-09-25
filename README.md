# E&N Service Company — website

A single-page, dependency-free website for E&N Service Company (Monroe Center, Illinois):
the exact item on the requisition, delivered, at one price, for Illinois state agencies on BidBuy.

- `index.html` — the page (hero "requisition line", what we supply, how we quote, our rules,
  where we quote, a spec card for procurement officers, contact).
- `styles.css` — one stylesheet; light and dark mode; works down to phone width.
- `main.js` — the hero line walks its four steps, sections fade in (off with reduced motion).
- `assets/favicon.svg` — the E&N monogram.

No build step. Open `index.html`, or serve the folder (`python3 -m http.server`) and visit
http://localhost:8000. To publish, enable GitHub Pages on this repository (Settings → Pages →
Deploy from branch → `main` / root).

Content is drawn from E&N's real work: the line items listed are real lines from recent
Illinois requisitions; the facility and agency names are ones E&N quotes for. No testimonials,
awards or figures that could not be checked were added.
