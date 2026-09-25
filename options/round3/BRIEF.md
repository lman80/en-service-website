# Round 3 brief — modern, interactive E&N concepts

Ashton rejected two earlier sites: v1 was "the most AI-looking website of all time" and too wordy, v2 was "too much of a rip of Apple". He called the plain wireframe layouts "boring". What he wants: "incredibly modern, cool, interactive, with animations, cool styles, make it fun and exciting. Just professional."

## The company
E&N Service Company is a procurement company. It sources the tools, parts and supplies organizations need and delivers them, at one price with shipping included. Customers are government agencies, schools, facilities and businesses (public and private sector). NEVER name a state (no Illinois), BidBuy, vendor IDs, addresses, statistics, testimonials, client logos or awards. Invent no claims.

## Exact copy (Ashton picked these — use verbatim, add as few extra words as possible)
1. Menu: Supplies · How it works · Who we serve · Contact
2. Headline: Send us the list. We'll handle the rest.
3. Line under headline: Tell us what you need. We'll find it, price it and get it to you.
4. Main button: Send your list — EXACTLY ONE button with this text on the whole page (Ashton: "One button should appear one time"). No repeated CTAs down the page. Menu links, email and phone are plain links, not buttons.
5. What we supply: heading "Whatever's on your list" / line "From a single fuse to a pallet of paper towels."
6. How it works: Send your list → We quote it → It arrives
7. Who we work with: heading "Whoever keeps things running" / line "Maintenance crews, office managers and purchasing teams."
8. Our promise: Exact. Delivered. Fast.
9. About us: E&N Service Company is a procurement company. We source and deliver the supplies organizations need, so their people can get on with the job.
10. Contact: heading "Let's talk" / line "Call or email. A real person answers." then enservicecompany@gmail.com (mailto) and 262-206-2108 (tel:+12622062108)
11. Footer: E&N Service Company — procurement for the public and private sector.
Small functional microcopy for interactions (an input placeholder, an item name in an animation) is fine. Example supply items you may show: LED shop light 4 ft, faucet cartridge, paper towels (case), 30 A fuse, safety glasses, hex bolts, extension cord, mop bucket, printer toner, work gloves, HVAC filter, padlock.
The "Send your list" button should do something real: a mailto: to enservicecompany@gmail.com with subject "Quote request" (and, where the concept collects a list, the list in the body).

## Tech
- Static HTML/CSS/JS, no build step. Hosted on GitHub Pages under /options/round3/<slug>/.
- Libraries only from cdnjs.cloudflare.com or cdn.jsdelivr.net, exact pinned versions (e.g. GSAP + ScrollTrigger, Three.js, Lenis). Fonts from Google Fonts. Avoid Inter / Space Grotesk / Poppins defaults — choose distinctive, professional faces.
- Photos optional. If used, copy them into YOUR folder (self-contained). Existing free-license Unsplash photos are in ~/en-service-website/assets/ (hero-wrench, parts, screw, truck, warehouse, boxes). You may download more from https://images.unsplash.com/photo-<id>?w=2000&q=80 — no visible brand logos. Keep total page weight reasonable (< ~4 MB).

## Quality bar
- Professional first: a purchasing manager should trust it. Fun comes from motion and interaction, not gimmicky copy.
- Don't recreate any famous site. Avoid AI-default looks: purple/blue gradient hero, cream + serif + terracotta, near-black + acid-green, emoji, glassmorphism everywhere, generic bento grids, everything centered.
- Smooth (transform/opacity animations, no layout thrash). Works at 1440 wide and 390 phone width, no horizontal scroll. Visible keyboard focus.
- prefers-reduced-motion: show the finished state, no big motion. If JS fails, content must still be readable (never leave text stuck at opacity 0).
- Title tag "E&N Service Company". Favicon: copy ~/en-service-website/assets/favicon.svg.

## Checking your work
Serve: `cd ~/en-service-website && setsid python3 -m http.server <PORT> --bind 127.0.0.1 >/dev/null 2>&1 &` then screenshot with
`~/bidbuy-agent/bidbuy-operations/.venv/bin/python` + Playwright (`p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"], headless=True)`) at 1440x900 and 390x844, including several mid-scroll frames and an interaction. That venv has no PIL; use system `python3` for image stitching. Look at the screenshots and fix what's off; iterate until it's genuinely impressive. Stop your server by PID (`kill <pid>`), never `pkill -f` (it kills your own shell).

## Rules
- Write ONLY inside ~/en-service-website/options/round3/<your-slug>/. Don't edit anything else. Don't git commit or push — the lead does that.
- Don't touch ~/bidbuy-agent except to run that venv python. Never run the pricing agent.
- Final report: what you built, what moves/what's interactive, libraries+versions, known issues. Be honest.
