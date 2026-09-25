/* E&N Service Company — "Conveyor" concept */
(() => {
  'use strict';
  const doc = document.documentElement;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = () => window.matchMedia('(max-width: 900px)').matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const INK = '#17191C', SIGNAL = '#FF5A1F';

  /* ---------------- mailto: the one button ---------------- */
  const list = $('#list'), send = $('#send');
  const MAIL = 'mailto:enservicecompany@gmail.com?subject=Quote%20request';
  const syncMail = () => {
    const v = list.value.trim();
    send.href = v ? MAIL + '&body=' + encodeURIComponent('Our list:\n\n' + v + '\n') : MAIL;
  };
  list.addEventListener('input', syncMail);
  syncMail();

  /* ---------------- nav state ---------------- */
  const nav = $('#nav');
  const onScrollNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  /* ---------------- hero belt ---------------- */
  const ITEMS = [
    ['fuse', '30 A fuse'], ['light', 'LED shop light 4 ft'], ['towels', 'Paper towels (case)'],
    ['glasses', 'Safety glasses'], ['bolts', 'Hex bolts'], ['cartridge', 'Faucet cartridge'],
    ['cord', 'Extension cord'], ['bucket', 'Mop bucket'], ['toner', 'Printer toner'],
    ['gloves', 'Work gloves'], ['filter', 'HVAC filter'], ['padlock', 'Padlock']
  ];
  const beltItems = $('#beltItems'), slats = $('#beltSlats'), rail = $('#beltRail');
  const hero = $('#top');
  const belt = { slots: [], offset: 0, speed: 0, boost: 0, spacing: 200, loopW: 0, next: 0, rollers: [] };

  function itemHTML(id, name) {
    return `<svg viewBox="0 0 120 120"><use href="#i-${id}"/></svg><span class="shadow"></span><span class="tag">${name}</span>`;
  }
  function escapeHTML(s) { return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function buildBelt() {
    const vw = beltItems.clientWidth || window.innerWidth;
    belt.spacing = MOBILE() ? 150 : 205;
    const n = Math.max(6, Math.ceil((vw + 320) / belt.spacing));
    belt.loopW = n * belt.spacing;
    // keep existing slots where possible
    while (belt.slots.length < n) {
      const el = document.createElement('div');
      el.className = 'belt-item';
      const [id, name] = ITEMS[belt.next++ % ITEMS.length];
      el.innerHTML = itemHTML(id, name);
      beltItems.appendChild(el);
      belt.slots.push({ el, base: belt.slots.length * belt.spacing, parcel: false });
    }
    while (belt.slots.length > n) belt.slots.pop().el.remove();
    belt.slots.forEach((s, i) => (s.base = i * belt.spacing));
    // rollers
    const want = Math.ceil(vw / 90);
    if (belt.rollers.length !== want) {
      rail.innerHTML = '';
      belt.rollers = [];
      for (let i = 0; i < want; i++) { const r = document.createElement('i'); r.className = 'roller'; rail.appendChild(r); belt.rollers.push(r); }
    }
    placeBelt();
  }
  function slotX(s) {
    const w = s.el.offsetWidth || 128;
    return ((s.base + belt.offset) % belt.loopW + belt.loopW) % belt.loopW - w - 40;
  }
  function placeBelt() {
    for (const s of belt.slots) {
      const x = slotX(s);
      // wrap: when an item re-enters on the left, rotate in the next catalogue item
      if (s.lastX !== undefined && x < s.lastX - 100 && !s.parcel) {
        const [id, name] = ITEMS[belt.next++ % ITEMS.length];
        s.el.innerHTML = itemHTML(id, name);
      }
      s.lastX = x;
      s.el.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    }
    slats.style.transform = `translate3d(${(belt.offset % 38).toFixed(1)}px,0,0)`;
    const rot = (belt.offset / (Math.PI * 18)) * 360;
    for (const r of belt.rollers) r.style.transform = `rotate(${rot.toFixed(1)}deg)`;
  }

  function dropParcel(text) {
    const t = text.trim().slice(0, 40);
    if (!t) return;
    const card = $('#slip').getBoundingClientRect();
    const target = MOBILE() ? window.innerWidth * 0.5 : card.left + card.width * 0.5;
    // choose the slot currently nearest (slightly upstream) of the drop point
    let best = null, bd = Infinity;
    for (const pass of [0, 1]) {
      for (const s of belt.slots) {
        if (s.parcel && pass === 0) continue;
        const cx = slotX(s) + (s.el.offsetWidth || 128) / 2;
        if (cx < -40 || cx > window.innerWidth + 40) continue;
        const d = Math.abs(cx - target + 30);
        if (d < bd) { bd = d; best = s; }
      }
      if (best) break;
    }
    if (!best) return;
    const el = best.el;
    const fresh = () => {
      el.classList.add('parcel');
      el.innerHTML = `<svg viewBox="0 0 150 118"><use href="#i-parcel"/></svg><span class="shadow"></span><span class="pl">${escapeHTML(t)}</span>`;
      best.parcel = true;
    };
    if (!hasGSAP || REDUCED) { fresh(); placeBelt(); return; }
    const old = el.firstElementChild;
    gsap.to(old, {
      y: -60, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: () => {
        fresh();
        const inner = el.firstElementChild, lab = el.querySelector('.pl');
        gsap.fromTo([inner, lab], { y: -320, rotation: -8 }, { y: 0, rotation: 0, duration: 0.95, ease: 'bounce.out' });
        gsap.fromTo(el.querySelector('.shadow'), { scaleX: 0.2, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 0.6, delay: 0.3 });
      }
    });
  }
  list.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const upto = list.value.slice(0, list.selectionStart);
      const line = upto.split('\n').pop();
      if (line.trim()) dropParcel(line);
    }
  });

  buildBelt();
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(buildBelt, 150); });

  let heroVisible = true;
  new IntersectionObserver(es => { heroVisible = es[0].isIntersecting; }).observe(hero);

  if (!REDUCED) {
    let last = performance.now(), lastY = window.scrollY;
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const y = window.scrollY, dy = Math.abs(y - lastY); lastY = y;
      if (heroVisible) {
        const target = Math.min(900, (dy / Math.max(dt, 0.001)) * 0.6);
        belt.boost += (target - belt.boost) * 0.08;
        belt.speed = 46 + belt.boost;
        belt.offset += belt.speed * dt;
        placeBelt();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ================= Everything below needs GSAP ================= */
  if (!hasGSAP) { doc.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- smooth scroll (desktop pointer only) ---------------- */
  let lenis = null;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (!REDUCED && fine && window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const t = id.length > 1 ? $(id) : null;
    if (!t && id !== '#top') return;
    e.preventDefault();
    const el = t || document.body;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
    else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
    if (t && id !== '#top') history.replaceState(null, '', id);
  }));

  /* ---------------- STORY scene ---------------- */
  const WW = 3240, WH = 640, TOP = 36, BELT_Y = 458, ITEM_Y = 350, ISZ = 112;
  const STORY_ITEMS = [
    { id: 'fuse', tag: 'FUSE 30A', r: 'FUSE 30A', q: '12', list: '30 A fuse' },
    { id: 'glasses', tag: 'SAFETY GLASSES', r: 'GLASSES', q: '6', list: 'Safety glasses' },
    { id: 'toner', tag: 'TONER', r: 'TONER', q: '4', list: 'Printer toner' },
    { id: 'padlock', tag: 'PADLOCK', r: 'PADLOCK', q: '10', list: 'Padlock' },
    { id: 'gloves', tag: 'WORK GLOVES', r: 'GLOVES', q: '24', list: 'Work gloves' }
  ];
  const DROP_X = 360, STEP = 135, SC = 1150;        // claw drop point, belt step, scanner centre
  const QUEUE = [0, 1, 2, 3, 4].map(i => DROP_X + (4 - i) * STEP); // item left x after chapter 1
  const SHIFT2 = 800, HOP_X = 1880;                 // belt travel through the scanner; hop point
  // box geometry (oblique)
  const BX = 2000, BW = 250, BH = 150, D = [64, -40];
  const F3 = [BX, BELT_Y - BH], F2 = [BX + BW, BELT_Y - BH], F1 = [BX + BW, BELT_Y], F0 = [BX, BELT_Y];
  const B3 = [F3[0] + D[0], F3[1] + D[1]], B2 = [F2[0] + D[0], F2[1] + D[1]], B1 = [F1[0] + D[0], F1[1] + D[1]];
  const P = pts => pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const FLAPS = {
    left: { a: F3, b: B3, inward: [64, 0], open: 125 },
    right: { a: F2, b: B2, inward: [-64, 0], open: 125 },
    back: { a: B3, b: B2, inward: [-32, 20], open: 112 },
    front: { a: F3, b: F2, inward: [32, -20], open: 118 }
  };
  function flapPts(f, deg) {
    const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const o = [f.inward[0] * c, f.inward[1] * c - 64 * s];
    return P([f.a, f.b, [f.b[0] + o[0], f.b[1] + o[1]], [f.a[0] + o[0], f.a[1] + o[1]]]);
  }
  let uidN = 0;

  function sceneSVG() {
    const u = 's' + (++uidN);
    const legs = [120, 560, 1000, 1440, 1880, 2320, 2330].map(x =>
      `<rect x="${x - 7}" y="494" width="14" height="106" fill="#AAB3BA" stroke="${INK}" stroke-width="3"/><rect x="${x - 16}" y="592" width="32" height="8" fill="${INK}"/>`).join('');
    let hubs = '';
    for (let x = 0; x <= 2340; x += 84) hubs += `<g class="hub" data-x="${x}" transform="translate(${x} 483)"><circle r="7" fill="#EEF1F2" stroke="${INK}" stroke-width="2.5"/><line x1="0" y1="-5" x2="0" y2="5" stroke="${INK}" stroke-width="2"/></g>`;
    const rows = STORY_ITEMS.map((it, i) => {
      const y = 112 + i * 38;
      return `<g class="row"><rect x="34" y="${y - 14}" width="16" height="16" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/>
        <path class="chk" d="M36 ${y - 7} l5 5 l9 -11" fill="none" stroke="${SIGNAL}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="62" y="${y}" font-size="15" fill="${INK}"><tspan font-weight="600">${it.q} ×</tspan> ${it.list}</text></g>`;
    }).join('');
    const receiptLines = STORY_ITEMS.map((it, i) => {
      const y = 44 + i * 17;
      return `<text x="953" y="${y}" font-size="9.5" fill="${INK}">${it.r} ×${it.q}</text><rect x="1030" y="${y - 6}" width="17" height="5" fill="#AAB3BA"/>`;
    }).join('');
    const items = STORY_ITEMS.map((it, i) => {
      const tw = 32 + it.tag.length * 6.7;
      return `<g class="it" transform="translate(${QUEUE[i]} ${ITEM_Y})">
        <ellipse class="sh" cx="${ISZ / 2}" cy="${BELT_Y - ITEM_Y + 1}" rx="42" ry="5" fill="${INK}" opacity=".16"/>
        <g class="bd"><use href="#i-${it.id}" width="${ISZ}" height="${ISZ}"/></g>
        <g transform="translate(${ISZ * 0.62} 6)"><g class="tg">
          <path d="M0 0 Q6 -12 14 -18" fill="none" stroke="${INK}" stroke-width="2"/>
          <path d="M10 -30 H${tw} V-6 H10 L2 -18 Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
          <circle cx="11" cy="-18" r="2.4" fill="${INK}"/>
          <text x="20" y="-14" font-size="10.5" font-weight="600" fill="${INK}">${it.tag}</text>
          <rect x="${tw - 6}" y="-30" width="6" height="24" fill="${SIGNAL}" stroke="${INK}" stroke-width="2.5"/>
        </g></g>
      </g>`;
    }).join('');
    const flapUnder = ['back', 'left', 'right'].map(k => `<polygon class="fu fu-${k}" points="${flapPts(FLAPS[k], FLAPS[k].open)}" fill="#D2A467" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`).join('');
    const flapOver = ['left', 'right', 'back'].map(k => `<polygon class="fo fo-${k}" points="${flapPts(FLAPS[k], FLAPS[k].open)}" fill="#DDB47B" stroke="${INK}" stroke-width="3" stroke-linejoin="round" visibility="hidden"/>`).join('')
      + `<polygon class="fo fo-front" points="${flapPts(FLAPS.front, FLAPS.front.open)}" fill="#E1BB85" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    const tapeD = `M${F3[0] + 32 - 6} ${F3[1] - 20} H${F2[0] + 32} V${F2[1] - 20 + 72}`;
    let wallLines = '';
    for (let x = 2240; x < 3300; x += 56) wallLines += `<line x1="${x}" y1="70" x2="${x}" y2="600" stroke="#B9C0C5" stroke-width="2"/>`;
    let doorSlats = '';
    for (let y = 240; y < 262; y += 6) doorSlats += `<line x1="2282" y1="${y}" x2="2698" y2="${y}" stroke="#7C868E" stroke-width="1.5"/>`;

    return `<svg class="scene" viewBox="0 0 1300 ${WH}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="${u}-slot"><rect x="900" y="-700" width="200" height="864"/></clipPath>
    <clipPath id="${u}-open"><polygon points="${P([F3, F2, B2, B3])}"/></clipPath>
  </defs>
  <!-- floor -->
  <rect x="-200" y="600" width="3800" height="80" fill="#D4D8D6"/>
  <line x1="-200" y1="600" x2="3600" y2="600" stroke="${INK}" stroke-width="3"/>
  <line x1="-200" y1="624" x2="3600" y2="624" stroke="#B8BDBF" stroke-width="3" stroke-dasharray="40 26"/>
  <!-- dock / destination -->
  <g class="dock" transform="translate(240 0)">
    <rect x="2200" y="70" width="1200" height="530" fill="#DDE1E3" stroke="${INK}" stroke-width="3"/>
    ${wallLines}
    <rect x="2290" y="262" width="400" height="338" fill="#2F343A" stroke="${INK}" stroke-width="3"/>
    <path d="M2290 600 L2330 540 H2650 L2690 600 Z" fill="#454C53"/>
    <line x1="2330" y1="540" x2="2650" y2="540" stroke="#596169" stroke-width="2"/>
    <rect x="2280" y="232" width="420" height="32" fill="#C3CAD0" stroke="${INK}" stroke-width="3"/>${doorSlats}
    <rect x="2268" y="470" width="18" height="60" rx="3" fill="${INK}"/><rect x="2694" y="470" width="18" height="60" rx="3" fill="${INK}"/>
    <path d="M2470 200 h40 l-8 14 h-24 z" fill="#AAB3BA" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path class="lamp" d="M2474 216 L2440 262 H2540 L2506 216 Z" fill="#FFE39A" opacity=".0"/>
  </g>
  <!-- belt -->
  <g class="beltg">
    ${legs}
    <rect x="-60" y="470" width="2430" height="26" fill="#CDD3D8" stroke="${INK}" stroke-width="3"/>
    ${hubs}
    <rect x="-60" y="${BELT_Y}" width="2430" height="14" fill="#2A2E33" stroke="${INK}" stroke-width="3"/>
    <line class="slats" x1="-60" y1="465" x2="2368" y2="465" stroke="#58616A" stroke-width="8" stroke-dasharray="4 30"/>
    <circle cx="2370" cy="477" r="19" fill="#CDD3D8" stroke="${INK}" stroke-width="3"/>
    <g class="hub endhub" transform="translate(2370 477)"><circle r="8" fill="#EEF1F2" stroke="${INK}" stroke-width="2.5"/><line x1="0" y1="-6" x2="0" y2="6" stroke="${INK}" stroke-width="2"/></g>
  </g>
  <!-- clipboard (the list) -->
  <g class="clipb">
    <rect x="12" y="30" width="270" height="310" rx="12" fill="#C9955A" stroke="${INK}" stroke-width="3"/>
    <rect x="22" y="52" width="250" height="276" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
    <rect x="102" y="18" width="90" height="30" rx="7" fill="#AAB3BA" stroke="${INK}" stroke-width="3"/>
    <circle cx="147" cy="28" r="3.5" fill="${INK}"/>
    <text x="34" y="80" font-size="13" font-weight="600" letter-spacing="1.6" fill="${INK}">YOUR LIST</text>
    <path d="M200 70v12M203 70v12M205 70v12M209 70v12M212 70v12M214 70v12M218 70v12M221 70v12M225 70v12M227 70v12M231 70v12M234 70v12M236 70v12M240 70v12M244 70v12M246 70v12M250 70v12M253 70v12M256 70v12" stroke="${INK}" stroke-width="1.4"/>
    <line x1="34" y1="92" x2="260" y2="92" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>
    ${rows}
    <line class="sig" x1="34" y1="312" x2="150" y2="312" stroke="#8C959D" stroke-width="2"/>
  </g>
  <!-- scanner + printer + receipt -->
  <g class="scanner" transform="translate(${SC - 1000} 0)">
    <g clip-path="url(#${u}-slot)"><g class="receipt">
      <path d="M945 0 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l8 6 l8 -6 l5 4 V172 H945 Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <text x="1000" y="22" font-size="12" font-weight="600" letter-spacing="2" text-anchor="middle" fill="${INK}">QUOTE</text>
      ${receiptLines}
      <line x1="953" y1="130" x2="1047" y2="130" stroke="${INK}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="953" y="146" font-size="9.5" fill="${INK}">SHIPPING</text><text x="1047" y="146" font-size="9.5" font-weight="600" text-anchor="end" fill="${INK}">INCL.</text>
      <text x="953" y="164" font-size="10.5" font-weight="600" fill="${INK}">TOTAL</text><rect x="1016" y="156" width="31" height="9" fill="${SIGNAL}"/>
    </g></g>
    <rect x="928" y="160" width="144" height="48" rx="4" fill="#353B41" stroke="${INK}" stroke-width="3"/>
    <line x1="944" y1="165" x2="1056" y2="165" stroke="#0E0F11" stroke-width="5"/>
    <circle class="led" cx="1058" cy="190" r="4.5" fill="#6C737B"/>
    <rect x="916" y="206" width="26" height="394" fill="#C3CAD0" stroke="${INK}" stroke-width="3"/>
    <rect x="1058" y="206" width="26" height="394" fill="#AAB3BA" stroke="${INK}" stroke-width="3"/>
    <rect x="904" y="206" width="192" height="40" fill="#E4E8EB" stroke="${INK}" stroke-width="3"/>
    <rect x="926" y="244" width="148" height="9" fill="${SIGNAL}" stroke="${INK}" stroke-width="2.5"/>
    <line x1="912" y1="215" x2="1000" y2="215" stroke="#fff" stroke-width="3"/>
  </g>
  <!-- box: under layer -->
  <g class="boxu">
    <ellipse cx="${BX + 150}" cy="${BELT_Y + 2}" rx="170" ry="7" fill="${INK}" opacity=".18"/>
    <polygon points="${P([F3, F2, B2, B3])}" fill="#7A5428" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <g clip-path="url(#${u}-open)"><polygon points="${P([B3, B2, [B2[0], B2[1] + 40], [B3[0], B3[1] + 40]])}" fill="#A57841"/><polygon points="${P([F3, B3, [B3[0], B3[1] + 40], [F3[0], F3[1] + 40]])}" fill="#936732"/></g>
    ${flapUnder}
  </g>
  <!-- items -->
  <g class="items">${items}</g>
  <!-- gantry picker -->
  <g class="gantry">
    <path d="M${DROP_X - 70} -700 V0 M${DROP_X + ISZ + 70} -700 V0" stroke="${INK}" stroke-width="4"/><rect x="${DROP_X - 90}" y="-8" width="${ISZ + 180}" height="18" fill="#C3CAD0" stroke="${INK}" stroke-width="3"/>
    <line class="cable" x1="${DROP_X + ISZ / 2}" y1="36" x2="${DROP_X + ISZ / 2}" y2="36" stroke="${INK}" stroke-width="3"/>
    <rect x="${DROP_X + ISZ / 2 - 24}" y="8" width="48" height="26" rx="3" fill="#353B41" stroke="${INK}" stroke-width="3"/>
    <circle cx="${DROP_X + ISZ / 2 + 13}" cy="21" r="3.5" fill="${SIGNAL}"/>
    <g class="claw" transform="translate(${DROP_X + ISZ / 2} -520)">
      <g class="pr-l"><path d="M-26 0 V20 L-17 28" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>
      <g class="pr-r"><path d="M26 0 V20 L17 28" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>
      <rect x="-32" y="-10" width="64" height="12" rx="3" fill="${SIGNAL}" stroke="${INK}" stroke-width="3"/>
    </g>
  </g>
  <!-- box: over layer -->
  <g class="boxo">
    <polygon points="${P([F1, F2, B2, B1])}" fill="#BC8B4E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="${BX}" y="${BELT_Y - BH}" width="${BW}" height="${BH}" fill="#D9AE74" stroke="${INK}" stroke-width="3"/>
    <line x1="${BX + 8}" y1="${BELT_Y - BH + 10}" x2="${BX + 8}" y2="${BELT_Y - 40}" stroke="#F1D3A4" stroke-width="3" stroke-linecap="round"/>
    ${flapOver}
    <path class="tape0" d="${tapeD}" fill="none" stroke="${INK}" stroke-width="21" stroke-linejoin="miter"/>
    <path class="tape1" d="${tapeD}" fill="none" stroke="${SIGNAL}" stroke-width="15" stroke-linejoin="miter"/>
    <g class="label">
      <rect x="${BX + 26}" y="${BELT_Y - 118}" width="128" height="84" rx="2" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
      <svg x="${BX + 34}" y="${BELT_Y - 112}" width="36" height="25.2" viewBox="0 0 866 606.34"><path fill="${INK}" d="${window.EN_LOGO ? EN_LOGO.PEB : ''}"/><path fill="#fff" d="${window.EN_LOGO ? EN_LOGO.LET : ''}"/></svg>
      <text x="${BX + 144}" y="${BELT_Y - 99}" font-size="8" font-weight="600" letter-spacing="1" text-anchor="end" fill="${INK}">SHIP TO</text>
      <line x1="${BX + 36}" y1="${BELT_Y - 82}" x2="${BX + 144}" y2="${BELT_Y - 82}" stroke="${INK}" stroke-width="2"/>
      <line x1="${BX + 36}" y1="${BELT_Y - 74}" x2="${BX + 118}" y2="${BELT_Y - 74}" stroke="#8C959D" stroke-width="3"/>
      <path d="M${BX + 36} ${BELT_Y - 66}v22M${BX + 40} ${BELT_Y - 66}v22M${BX + 42} ${BELT_Y - 66}v22M${BX + 47} ${BELT_Y - 66}v22M${BX + 50} ${BELT_Y - 66}v22M${BX + 55} ${BELT_Y - 66}v22M${BX + 57} ${BELT_Y - 66}v22M${BX + 61} ${BELT_Y - 66}v22M${BX + 66} ${BELT_Y - 66}v22M${BX + 68} ${BELT_Y - 66}v22M${BX + 73} ${BELT_Y - 66}v22M${BX + 77} ${BELT_Y - 66}v22M${BX + 79} ${BELT_Y - 66}v22M${BX + 84} ${BELT_Y - 66}v22M${BX + 87} ${BELT_Y - 66}v22M${BX + 92} ${BELT_Y - 66}v22M${BX + 94} ${BELT_Y - 66}v22M${BX + 99} ${BELT_Y - 66}v22M${BX + 103} ${BELT_Y - 66}v22M${BX + 105} ${BELT_Y - 66}v22" stroke="${INK}" stroke-width="1.6"/>
      <rect x="${BX + 118}" y="${BELT_Y - 66}" width="26" height="22" fill="${SIGNAL}"/>
    </g>
  </g>
  <!-- laser -->
  <g transform="translate(${SC - 1000} 0)"><g class="laser">
    <rect class="glow" x="982" y="253" width="36" height="205" fill="${SIGNAL}" opacity=".12"/>
    <rect class="beam" x="998" y="253" width="4" height="205" fill="${SIGNAL}" opacity=".85"/>
  </g></g>
  <!-- dust + stamp -->
  <g transform="translate(240 0)"><g class="dust" opacity="0">
    <ellipse cx="2345" cy="596" rx="22" ry="7" fill="#B8BDBF"/><ellipse cx="2690" cy="592" rx="26" ry="8" fill="#B8BDBF"/><ellipse cx="2380" cy="586" rx="12" ry="5" fill="#C9CDCF"/>
  </g></g>
  <g class="stamp" transform="translate(2830 160)">
    <g class="stamp-in">
      <circle r="58" fill="#fff" stroke="${SIGNAL}" stroke-width="5"/>
      <circle r="49" fill="none" stroke="${SIGNAL}" stroke-width="2" stroke-dasharray="4 4"/>
      <path d="M-22 -8 l14 14 l28 -30" fill="none" stroke="${SIGNAL}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="0" y="30" font-size="12" font-weight="600" letter-spacing="1.5" text-anchor="middle" fill="${SIGNAL}">DELIVERED</text>
    </g>
  </g>
</svg>`;
  }

  /* Build a scrubbable timeline for one scene. Returns {tl, layout} */
  function storyTimeline(host, opts = {}) {
    host.innerHTML = sceneSVG();
    const svg = host.querySelector('svg');
    const q = s => svg.querySelector(s), qa = s => Array.from(svg.querySelectorAll(s));
    const cam = { c: 330, w: 1300, h: WH + TOP };
    const applyCam = () => {
      const x = Math.max(-40, Math.min(WW - cam.w, cam.c - cam.w / 2));
      svg.setAttribute('viewBox', `${x.toFixed(1)} ${(WH - cam.h).toFixed(1)} ${cam.w.toFixed(1)} ${cam.h.toFixed(1)}`);
    };
    const layout = () => {
      if (opts.fixedW) { cam.w = opts.fixedW; cam.h = WH + TOP; }
      else {
        const r = host.getBoundingClientRect();
        const w = Math.max(1, r.width), h = Math.max(1, r.height);
        cam.w = Math.max(540, Math.min(2000, (WH + TOP) * w / h));
        cam.h = Math.max(WH + TOP, cam.w * h / w);
      }
      applyCam();
    };
    layout();

    const items = qa('.it'), tags = qa('.it .tg'), rows = qa('.row'), chks = qa('.chk');
    const hubs = qa('.hub');
    const slatsEl = q('.slats');
    const beltP = { s: 0 };
    const beltUpd = () => {
      slatsEl.setAttribute('stroke-dashoffset', (-beltP.s).toFixed(1));
      const a = (beltP.s * 1.4) % 360;
      hubs.forEach(h => {
        const t = h.getAttribute('transform').replace(/ rotate\([^)]*\)/, '');
        h.setAttribute('transform', `${t} rotate(${a.toFixed(1)})`);
      });
    };
    // flap state
    const flap = { left: FLAPS.left.open, right: FLAPS.right.open, back: FLAPS.back.open, front: FLAPS.front.open };
    const flapEls = {};
    ['left', 'right', 'back'].forEach(k => (flapEls[k] = { u: q('.fu-' + k), o: q('.fo-' + k) }));
    flapEls.front = { o: q('.fo-front') };
    const flapUpd = () => {
      for (const k of ['left', 'right', 'back', 'front']) {
        const pts = flapPts(FLAPS[k], flap[k]);
        const e = flapEls[k];
        e.o.setAttribute('points', pts);
        if (e.u) {
          e.u.setAttribute('points', pts);
          const over = flap[k] < 90;
          e.o.setAttribute('visibility', over ? 'visible' : 'hidden');
          e.u.setAttribute('visibility', over ? 'hidden' : 'visible');
        }
      }
    };
    const tapes = qa('.tape0, .tape1');
    const tapeLen = tapes[0].getTotalLength ? tapes[0].getTotalLength() : 400;
    const receipt = q('.receipt');

    // ---------- initial state ----------
    gsap.set(items, { y: -520, x: DROP_X });
    gsap.set(items.map(i => i.querySelector('.bd')), { rotation: 0, transformOrigin: '50% 100%' });
    gsap.set(tags, { scaleX: 0, transformOrigin: '0% 50%' });
    gsap.set(rows, { opacity: 0, x: -14 });
    gsap.set(chks, { opacity: 0 });
    gsap.set(q('.clipb'), { y: 40, opacity: 0 });
    gsap.set(receipt, { y: 180 });
    tapes.forEach(t => { t.style.strokeDasharray = tapeLen; t.style.strokeDashoffset = tapeLen; });
    gsap.set(q('.label'), { opacity: 0, scale: 1.5, rotation: -10, transformOrigin: '50% 50%' });
    gsap.set(q('.stamp-in'), { scale: 2.4, opacity: 0, rotation: -30, transformOrigin: '50% 50%' });
    gsap.set(q('.laser'), { opacity: 0.25 });
    beltUpd(); flapUpd();

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    const camTo = (c, at, d = 1) => tl.to(cam, { c, duration: d, ease: 'power2.inOut', onUpdate: applyCam }, at);

    /* ---- CH 1: Send your list (0 → 8) ---- */
    tl.to(q('.clipb'), { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0.2);
    tl.to(rows, { opacity: 1, x: 0, duration: 0.5, stagger: 0.28, ease: 'power2.out' }, 0.8);
    const claw = q('.claw'), cable = q('.cable'), prL = q('.pr-l'), prR = q('.pr-r');
    const clawP = { y: -520 };
    const CX = DROP_X + ISZ / 2;
    const clawUpd = () => {
      claw.setAttribute('transform', `translate(${CX} ${clawP.y.toFixed(1)})`);
      cable.setAttribute('y2', Math.max(36, clawP.y - 8).toFixed(1));
    };
    clawUpd();
    STORY_ITEMS.forEach((_, i) => {
      const at = 2.3 + i * 1.1;
      tl.to(chks[i], { opacity: 1, duration: 0.2 }, at);
      tl.fromTo(chks[i], { strokeDasharray: 30, strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.3 }, at);
      // the picker lowers the item onto the belt
      tl.fromTo(clawP, { y: -520 }, { y: ITEM_Y - 2, duration: 0.6, ease: 'power2.inOut', onUpdate: clawUpd, immediateRender: false }, at);
      tl.to(items[i], { y: ITEM_Y, duration: 0.6, ease: 'power2.inOut' }, at);
      tl.fromTo(items[i].querySelector('.sh'), { opacity: 0 }, { opacity: 0.16, duration: 0.3 }, at + 0.35);
      tl.to(prL, { rotation: 24, transformOrigin: '0% 0%', duration: 0.15 }, at + 0.6);
      tl.to(prR, { rotation: -24, transformOrigin: '100% 0%', duration: 0.15 }, at + 0.6);
      tl.to(items[i].querySelector('.bd'), { keyframes: [{ rotation: -5, duration: 0.12 }, { rotation: 3, duration: 0.12 }, { rotation: 0, duration: 0.14 }] }, at + 0.6);
      tl.to(clawP, { y: -520, duration: 0.4, ease: 'power2.in', onUpdate: clawUpd }, at + 0.72);
      tl.to([prL, prR], { rotation: 0, duration: 0.1 }, at + 1.0);
      if (i < 4) {
        tl.to(beltP, { s: '+=' + STEP, duration: 0.4, ease: 'power1.inOut', onUpdate: beltUpd }, at + 0.72);
        tl.to(items.slice(0, i + 1), { x: '+=' + STEP, duration: 0.4, ease: 'power1.inOut' }, at + 0.72);
      }
    });
    camTo(560, 3, 4.4);
    tl.to(q('.laser'), { opacity: 1, duration: 0.6 }, 7.2);

    /* ---- CH 2: We quote it (8 → 17) ---- */
    const t2 = 8.4, d2 = 8;
    camTo(SC, 8.0, 1.6);
    tl.to(q('.clipb'), { opacity: 0.35, duration: 1 }, 8.2);
    tl.to(beltP, { s: '+=' + SHIFT2, duration: d2, onUpdate: beltUpd }, t2);
    tl.to(items, { x: i => QUEUE[i] + SHIFT2, duration: d2 }, t2);
    tl.to(receipt, { y: 150, duration: 0.5, ease: 'power1.out' }, t2);
    STORY_ITEMS.forEach((_, i) => {
      const cross = (SC - (QUEUE[i] + ISZ / 2)) / SHIFT2;
      const at = t2 + cross * d2;
      tl.to(tags[i], { scaleX: 1, duration: 0.45, ease: 'back.out(2.2)' }, at);
      tl.fromTo(tags[i], { rotation: -18 }, { rotation: 0, duration: 0.6, ease: 'elastic.out(1,0.45)' }, at);
      tl.fromTo(q('.laser .glow'), { opacity: 0.55, attr: { width: 72, x: 964 } }, { opacity: 0.12, attr: { width: 36, x: 982 }, duration: 0.5, immediateRender: false }, at);
      tl.fromTo(q('.led'), { fill: SIGNAL }, { fill: '#6C737B', duration: 0.4, immediateRender: false }, at);
      tl.to(receipt, { y: 150 - (22 + (i + 1) * 17), duration: 0.35, ease: 'steps(4)' }, at + 0.05);
    });
    tl.to(receipt, { y: 0, duration: 0.6, ease: 'steps(5)' }, t2 + d2 + 0.1);

    /* ---- CH 3: It arrives (17 → 30) ---- */
    const t3 = 17.2, v = SHIFT2 / d2;
    camTo(BX - 20, 16.8, 1.4);
    tl.to(q('.laser'), { opacity: 0.25, duration: 0.5 }, t3);
    const lastArrive = (HOP_X - (QUEUE[4] + SHIFT2)) / v;
    tl.to(beltP, { s: '+=' + (HOP_X - (QUEUE[4] + SHIFT2)), duration: lastArrive, onUpdate: beltUpd }, t3);
    const openC = [F3[0] + 32 + BW / 2, F3[1] - 20];
    STORY_ITEMS.forEach((_, i) => {
      const x0 = QUEUE[i] + SHIFT2;
      const dur = (HOP_X - x0) / v;
      tl.to(items[i], { x: HOP_X, duration: dur }, t3);
      const at = t3 + dur;
      const tx = openC[0] - ISZ * 0.62 / 2 + (i - 2) * 16;
      tl.to(items[i], { x: tx, duration: 0.9, ease: 'power1.inOut' }, at);
      tl.to(items[i], { y: 150, duration: 0.45, ease: 'power2.out' }, at);
      tl.to(items[i], { y: 318, duration: 0.45, ease: 'power2.in' }, at + 0.45);
      tl.to(items[i], { scale: 0.62, duration: 0.9 }, at);
      tl.to(items[i].querySelector('.bd'), { rotation: 18, duration: 0.9 }, at);
      tl.to(items[i].querySelector('.sh'), { opacity: 0, duration: 0.2 }, at);
      tl.to(tags[i], { scaleX: 0, duration: 0.3 }, at + 0.5);
      tl.set(items[i], { opacity: 0 }, at + 0.92);
    });
    let tt = t3 + lastArrive + 1.0;
    // flaps fold: sides, back, front
    tl.to(flap, { left: 0, right: 0, duration: 0.8, ease: 'power2.inOut', onUpdate: flapUpd }, tt);
    tl.to(flap, { back: 0, duration: 0.7, ease: 'power2.inOut', onUpdate: flapUpd }, tt + 0.6);
    tl.to(flap, { front: 0, duration: 0.7, ease: 'power2.inOut', onUpdate: flapUpd }, tt + 1.1);
    tt += 1.9;
    tl.to(tapes, { strokeDashoffset: 0, duration: 0.8, ease: 'power1.inOut' }, tt);
    tt += 0.9;
    tl.to(q('.label'), { opacity: 1, scale: 1, rotation: -2, duration: 0.5, ease: 'back.out(2.5)' }, tt);
    tt += 0.7;
    // ship: along the belt, off the end, into the dock
    const box = [q('.boxu'), q('.boxo')];
    camTo(2740, tt, 2.2);
    tl.to(beltP, { s: '+=380', duration: 1.1, ease: 'power1.in', onUpdate: beltUpd }, tt);
    tl.to(box, { x: 380, duration: 1.1, ease: 'power1.in' }, tt);
    tl.to(box, { x: 470, y: 142, rotation: 7, svgOrigin: `${BX + 150} ${BELT_Y - 60}`, duration: 0.45, ease: 'power2.in' }, tt + 1.1);
    tl.to(box, { x: 600, rotation: 0, duration: 0.8, ease: 'power3.out', svgOrigin: `${BX + 150} ${BELT_Y - 60}` }, tt + 1.55);
    tl.fromTo(q('.dust'), { opacity: 0 }, { opacity: 1, duration: 0.15, immediateRender: false }, tt + 1.55);
    tl.to(q('.dust'), { opacity: 0, duration: 0.6 }, tt + 1.8);
    tl.to(q('.lamp'), { opacity: 0.8, duration: 0.4 }, tt + 1.9);
    tt += 2.5;
    tl.to(q('.stamp-in'), { scale: 1, opacity: 1, rotation: -12, duration: 0.5, ease: 'back.out(2)' }, tt);
    tl.to({}, { duration: 1.2 }, tt + 0.5);

    const marks = [0, 8.0 / tl.duration(), 16.8 / tl.duration()];
    return { tl, layout, marks, svg };
  }

  /* ---------------- HERO intro ---------------- */
  if (!REDUCED) {
    const words = $$('.hero-title .w');
    $$('.hero-title .ln').forEach(l => { l.style.overflow = 'hidden'; l.style.paddingBottom = '.1em'; l.style.marginBottom = '-.1em'; });
    gsap.from(words, { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.06, delay: 0.1 });
    gsap.from('.hero-sub', { y: 20, opacity: 0, duration: 0.8, delay: 0.55, ease: 'power3.out' });
    gsap.from('#slip', { y: 40, rotation: 2.5, opacity: 0, duration: 1, delay: 0.35, ease: 'power3.out', clearProps: 'transform,opacity' });
    gsap.from('#beltItems .belt-item svg', { y: -220, duration: 1, ease: 'bounce.out', stagger: 0.07, delay: 0.5, clearProps: 'transform' });
  }

  /* ---------------- PARADE ---------------- */
  const parade = $('#parade'), paradeView = $('#paradeView');
  if (!REDUCED) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      paradeView.style.setProperty('--scan', '1');
      const dist = () => Math.max(0, parade.scrollWidth - window.innerWidth);
      const cards = $$('.card', parade);
      const skew = gsap.quickTo(cards, 'skewX', { duration: 0.4, ease: 'power3' });
      const tw = gsap.to(parade, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: '#paradePin', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.6, anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: self => { const v = gsap.utils.clamp(-7, 7, self.getVelocity() / -260); skew(v); },
          onScrubComplete: () => skew(0)
        }
      });
      cards.forEach(c => ScrollTrigger.create({ trigger: c, containerAnimation: tw, start: 'left-=10 42%', end: 'right+=10 42%', toggleClass: 'is-hot' }));
      gsap.from(cards, { y: 80, opacity: 0, duration: 0.9, stagger: 0.06, ease: 'power3.out', scrollTrigger: { trigger: '#supplies', start: 'top 70%' } });
      return () => { gsap.set(cards, { skewX: 0 }); };
    });
    mm.add('(max-width: 900px)', () => {
      const cards = $$('.card', parade);
      gsap.from(cards.slice(0, 3), { x: 80, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', scrollTrigger: { trigger: '#paradeView', start: 'top 85%' } });
      // highlight the card that is centred in the swipe track
      const hot = () => {
        const mid = window.innerWidth / 2;
        cards.forEach(c => { const r = c.getBoundingClientRect(); c.classList.toggle('is-hot', r.left < mid && r.right > mid); });
      };
      paradeView.addEventListener('scroll', hot, { passive: true });
      hot();
    });
  }

  /* ---------------- STORY mount ---------------- */
  const story = $('#story'), stage = $('#stage'), chapters = $$('.chap'), bar = $('#storyBar');
  function mountStatic() {
    const how = $('#how');
    how.classList.add('is-static');
    const box = $('#storyStatic');
    box.innerHTML = '';
    const titles = ['Send your list', 'We quote it', 'It arrives'];
    const ends = [7.9, 16.9, null];
    titles.forEach((t, i) => {
      const p = document.createElement('div');
      p.className = 'static-panel';
      p.innerHTML = `<h3><span>0${i + 1}</span>${t}</h3><div class="sv"></div>`;
      box.appendChild(p);
      const { tl } = storyTimeline(p.querySelector('.sv'), { fixedW: 1300 });
      tl.progress(ends[i] === null ? 1 : ends[i] / tl.duration()).pause();
    });
    // the static panels carry visible headings; hide the duplicates for AT
    $('#chapters').setAttribute('aria-hidden', 'true');
    box.removeAttribute('aria-hidden');
  }

  if (REDUCED) {
    mountStatic();
  } else {
    const S = storyTimeline(stage);
    gsap.set(chapters, { yPercent: 105, opacity: 0 });
    gsap.set(chapters[0], { yPercent: 0, opacity: 1 });
    const T = S.tl.duration();
    // chapter swaps & progress bar ride on the same timeline
    const swap = (from, to, at) => {
      S.tl.to(chapters[from], { yPercent: -105, opacity: 0, duration: 0.5, ease: 'power2.in' }, at);
      S.tl.fromTo(chapters[to], { yPercent: 105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, at + 0.35);
    };
    swap(0, 1, 8.0);
    swap(1, 2, 16.8);
    S.tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: T, ease: 'none' }, 0);
    // position progress ticks at chapter starts
    const ticks = $$('.progress .tick');
    [0, 8.0 / T, 16.8 / T].forEach((p, i) => ticks[i] && ticks[i].style.setProperty('--p', p.toFixed(3)));
    ScrollTrigger.create({
      trigger: story,
      start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * (MOBILE() ? 5.2 : 6)),
      pin: true,
      anticipatePin: 1,
      scrub: MOBILE() ? 0.4 : 0.8,
      animation: S.tl,
      onRefresh: () => S.layout(),
      invalidateOnRefresh: false
    });
    window.addEventListener('resize', () => S.layout());
  }

  /* ---------------- SERVE: labels slap onto the carton ---------------- */
  if (!REDUCED) {
    const labels = $$('.ship-label');
    const tlS = gsap.timeline({ scrollTrigger: { trigger: '#carton', start: 'top 72%' } });
    tlS.from('.carton-tape', { scaleX: 0, duration: 0.6, ease: 'power3.inOut' })
      .from(labels, { scale: 1.45, opacity: 0, y: -30, rotation: i => (i % 2 ? 14 : -14), duration: 0.5, stagger: 0.12, ease: 'back.out(1.6)', clearProps: 'transform,opacity' }, '-=.2');
    gsap.from('.serve-copy > *', { y: 30, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '#serve', start: 'top 70%' } });
  }

  /* ---------------- PROMISE: kinetic type ---------------- */
  function splitChars(el) {
    const t = el.textContent; el.textContent = '';
    return Array.from(t).map(ch => { const s = document.createElement('span'); s.textContent = ch === ' ' ? '\u00a0' : ch; s.style.display = 'inline-block'; el.appendChild(s); return s; });
  }
  if (!REDUCED) {
    const ex = splitChars($('.pw-exact .pw-t')), dl = splitChars($('.pw-deliv .pw-t'));
    const fast = $('.pw-fast .pw-t');
    const tlP = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tlP.from(ex, { y: i => [-90, 70, -40, 110, -70, 50][i % 6], x: i => [-40, 20, -10, 30, -20, 10][i % 6], rotation: i => [-18, 12, -8, 20, -14, 9][i % 6], opacity: 0, duration: 1, stagger: 0.05 }, 0)
      .from('.pw-exact .reg', { scale: 2.2, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(2)' }, 0.8)
      .from('.pw-exact .dim', { scaleX: 0, duration: 0.6 }, 0.9)
      .from('.pw-deliv .tape', { scaleX: 0, duration: 0.8, ease: 'power2.inOut' }, 1.3)
      .from(dl, { y: -140, opacity: 0, duration: 0.8, stagger: 0.05, ease: 'bounce.out' }, 1.5)
      .from(fast, { xPercent: 90, skewX: -28, opacity: 0, duration: 0.9, ease: 'expo.out' }, 2.4)
      .from('.pw-fast .streak', { scaleX: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }, 2.55)
      .to('.pw-fast .streak', { scaleX: 0.35, opacity: 0.7, duration: 0.6, stagger: 0.05 }, 3.1)
      .to({}, { duration: 0.6 });
    const mmP = gsap.matchMedia();
    mmP.add('(min-width: 901px)', () => {
      const pinST = ScrollTrigger.create({ trigger: '#promisePin', start: 'top top', end: '+=150%', pin: true, anticipatePin: 1 });
      ScrollTrigger.create({ trigger: '#promise', start: 'top 45%', end: () => pinST.end - window.innerHeight * 0.3, scrub: 0.6, animation: tlP });
    });
    mmP.add('(max-width: 900px)', () => {
      ScrollTrigger.create({ trigger: '#promisePin', start: 'top 75%', end: 'bottom 70%', scrub: 0.5, animation: tlP });
    });
  }

  /* ---------------- ABOUT: words ink in ---------------- */
  if (!REDUCED) {
    const about = $('#aboutText');
    const words = about.textContent.split(/(\s+)/);
    about.innerHTML = words.map(w => (/^\s+$/.test(w) ? w : `<span class="aw">${escapeHTML(w)}</span>`)).join('');
    gsap.fromTo('.aw', { color: '#A9AFB4' }, { color: INK, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: about, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  }

  /* ---------------- CONTACT ---------------- */
  if (!REDUCED) {
    const ct = $('.contact-title');
    const ch = splitChars(ct);
    ct.style.overflow = 'hidden';
    gsap.from(ch, { yPercent: 110, duration: 0.9, stagger: 0.04, ease: 'power4.out', scrollTrigger: { trigger: '#contact', start: 'top 70%' } });
    gsap.from('.contact-links li', { x: 60, opacity: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', scrollTrigger: { trigger: '.contact-links', start: 'top 85%' } });
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
