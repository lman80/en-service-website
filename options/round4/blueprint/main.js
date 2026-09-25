/* E&N Service Company — "Blueprint" concept.
   Crosshair + rulers, hover dimensions, plotter intro, exploded views with a live bill of materials,
   self-drawing flow diagram, building section, approval stamps. */
(() => {
  'use strict';
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const hasG = !!(G && ST && window.DrawSVGPlugin);
  const MM = 25.4 / 96; // CSS px → mm
  const FR = () => parseFloat(getComputedStyle(html).getPropertyValue('--fr')) || 18;
  const desktopMQ = matchMedia('(min-width: 1000px) and (min-height: 640px)');

  if (hasG) G.registerPlugin(ST, DrawSVGPlugin);

  /* ------------------------------------------------------------ dates on stamps */
  const now = new Date();
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const stampDate = `${String(now.getDate()).padStart(2, '0')} ${MON[now.getMonth()]} ${now.getFullYear()}`;
  $$('.st-date').forEach(el => { el.textContent = stampDate; });

  /* ------------------------------------------------------------ rulers */
  const rxLabels = $('.rx-labels'), ryLabels = $('.ry-labels'), ryInner = $('.ry-inner');
  const STEP = 50 / MM; // a label every 50 mm
  function buildRulers() {
    if (!rxLabels) return;
    const w = innerWidth, h = document.documentElement.scrollHeight;
    let s = '';
    for (let x = STEP, i = 1; x < w - 40; x += STEP, i++) s += `<span style="left:${x.toFixed(1)}px">${i * 50}</span>`;
    rxLabels.innerHTML = s;
    s = '';
    for (let y = STEP, i = 1; y < h; y += STEP, i++) s += `<span style="top:${y.toFixed(1)}px">${i * 50}</span>`;
    ryLabels.innerHTML = s;
    ryInner.style.height = h + 'px';
  }
  function syncRuler() { if (ryInner) ryInner.style.transform = `translate3d(0,${-scrollY}px,0)`; }
  buildRulers(); syncRuler();
  addEventListener('scroll', syncRuler, { passive: true });

  /* ------------------------------------------------------------ crosshair + live coordinates */
  const xh = $('.xh'), xhH = $('.xh-h'), xhV = $('.xh-v'), xhBox = $('.xh-box'), xhRead = $('.xh-read');
  const xhX = $('.xh-x'), xhY = $('.xh-y'), rxMark = $('.rx-mark'), ryMark = $('.ry-mark');
  let mx = -200, my = -200, queued = false;
  const pad = (v) => v.toFixed(1).padStart(6, ' ');
  function paintCross() {
    queued = false;
    const fr = FR();
    xhH.style.transform = `translate3d(0,${my}px,0)`;
    xhV.style.transform = `translate3d(${mx}px,0,0)`;
    xhBox.style.transform = `translate3d(${mx}px,${my}px,0)`;
    const flipX = mx > innerWidth - 150, flipY = my > innerHeight - 70;
    xhRead.style.transform = `translate3d(${flipX ? mx - 112 : mx + 16}px,${flipY ? my - 48 : my + 16}px,0)`;
    xhX.textContent = `X ${pad((mx - fr) * MM)} mm`;
    xhY.textContent = `Y ${pad((my + scrollY - fr) * MM)} mm`;
    rxMark.style.transform = `translate3d(${mx - fr}px,0,0)`;
    ryMark.style.transform = `translate3d(0,${my - fr}px,0)`;
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(paintCross); } };
  if (fine) {
    html.classList.add('fine-pointer');
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY; html.classList.add('has-pointer'); queue();
      xh.classList.toggle('over-input', !!(e.target.closest && e.target.closest('input')));
    }, { passive: true });
    addEventListener('scroll', queue, { passive: true });
    document.addEventListener('pointerleave', () => { mx = my = -200; html.classList.remove('has-pointer'); queue(); });
  }

  /* ------------------------------------------------------------ hover dimension lines */
  const dimLayer = $('.dimlayer');
  let dimTarget = null, dimTimer = 0;
  const mm = (px) => (px * MM).toFixed(1);
  function dims(el) {
    if (!el) { dimLayer.innerHTML = ''; return; }
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.bottom < 0 || r.top > innerHeight) { dimLayer.innerHTML = ''; return; }
    const fr = FR();
    const out = [];
    // horizontal (width) — above if room, else below
    const above = r.top - 40 > fr + 6;
    const y = above ? r.top - 18 : Math.min(r.bottom + 18, innerHeight - fr - 12);
    const e1 = above ? r.top - 4 : r.bottom + 4, e2 = above ? y - 7 : y + 7;
    const wl = `${mm(r.width)} mm`, wlw = wl.length * 6.9 + 16;
    out.push(`<g>
      <path class="d-ext" d="M${r.left} ${e1}V${e2}M${r.right} ${e1}V${e2}"/>
      <path class="d-line" d="M${r.left + 1} ${y}H${r.right - 1}" marker-start="url(#ahm)" marker-end="url(#ahm)"/>
      <rect class="d-bg" x="${(r.left + r.right) / 2 - wlw / 2}" y="${y - 9}" width="${wlw}" height="18" rx="2"/>
      <text x="${(r.left + r.right) / 2}" y="${y + 4}">${wl}</text></g>`);
    // vertical (height) — left if room, else right
    if (r.height > 24) {
      const left = r.left - 40 > fr + 6;
      const x = left ? r.left - 18 : Math.min(r.right + 18, innerWidth - fr - 12);
      const f1 = left ? r.left - 4 : r.right + 4, f2 = left ? x - 7 : x + 7;
      const top = Math.max(r.top, fr), bot = Math.min(r.bottom, innerHeight - fr);
      const hl = `${mm(r.height)}`, hlw = hl.length * 6.9 + 14, cy = (top + bot) / 2;
      out.push(`<g>
        <path class="d-ext" d="M${f1} ${top}H${f2}M${f1} ${bot}H${f2}"/>
        <path class="d-line" d="M${x} ${top + 1}V${bot - 1}" marker-start="url(#ahm)" marker-end="url(#ahm)"/>
        <g transform="rotate(-90 ${x} ${cy})"><rect class="d-bg" x="${x - hlw / 2}" y="${cy - 9}" width="${hlw}" height="18" rx="2"/>
        <text x="${x}" y="${cy + 4}">${hl}</text></g></g>`);
    }
    dimLayer.innerHTML = out.join('');
  }
  if (fine) {
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest ? e.target.closest('[data-dim]') : null;
      if (t === dimTarget) return;
      dimTarget = t; clearTimeout(dimTimer);
      xh.classList.toggle('snap', !!t);
      dims(t);
    });
    addEventListener('scroll', () => {
      if (!dimTarget) return;
      dimLayer.innerHTML = ''; dimTarget = null; xh.classList.remove('snap');
    }, { passive: true });
  }

  /* ------------------------------------------------------------ bill of materials (your list) */
  const rowsEl = $('#bomRows'), form = $('#bomAdd'), inItem = $('#addItem'), inQty = $('#addQty');
  const tbRev = $('#tbRev'), tbItems = $('#tbItems'), nextNo = $('#nextNo'), bomCount = $('#bomCount'), send = $('#send');
  const SAMPLES = $$('.bom-row.sample', rowsEl).length;
  const KEY = 'en-blueprint-list-v1';
  let mine = [], revs = 0;
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.items)) { mine = s.items.slice(0, 60); revs = s.revs | 0; } } catch (e) { /* storage unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ items: mine, revs })); } catch (e) { /* ignore */ } };
  const revLetter = (n) => { let s = ''; n += 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function rowHTML(m, i) {
    return `<span class="c-n">${SAMPLES + i + 1}</span><span class="c-d">${esc(m.d)}</span><span class="c-q">${esc(m.q)}</span>` +
      `<button class="rm" type="button" aria-label="Remove ${esc(m.d)}">&times;</button>`;
  }
  function renderMine() {
    $$('.bom-row.mine', rowsEl).forEach((r) => r.remove());
    mine.forEach((m, i) => {
      const li = document.createElement('li');
      li.className = 'bom-row mine'; li.innerHTML = rowHTML(m, i); li.dataset.i = i;
      rowsEl.appendChild(li);
    });
  }
  function bump(el, v) {
    if (el.textContent === String(v)) return;
    el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  }
  function updateMeta() {
    bump(tbRev, revLetter(revs));
    bump(tbItems, mine.length);
    nextNo.textContent = SAMPLES + mine.length + 1;
    bomCount.textContent = `${SAMPLES + mine.length} LINES`;
    let body = 'Hello E&N,\n\nHere is my list:\n\n';
    if (mine.length) body += mine.map((m, i) => `${i + 1}. ${m.d} (qty ${m.q})`).join('\n') + '\n\nThank you.';
    if (dimTarget) requestAnimationFrame(() => dims(dimTarget));
    send.href = `mailto:enservicecompany@gmail.com?subject=${encodeURIComponent('Quote request')}&body=${encodeURIComponent(body)}`;
  }
  function addItem(d, q) {
    mine.push({ d, q }); revs += 1; save();
    const li = document.createElement('li');
    li.className = 'bom-row mine'; li.innerHTML = rowHTML(mine[mine.length - 1], mine.length - 1); li.dataset.i = mine.length - 1;
    rowsEl.appendChild(li);
    rowsEl.scrollTop = rowsEl.scrollHeight;
    if (hasG && !reduce) {
      G.fromTo(li, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: .7, ease: 'power2.inOut', clearProps: 'clipPath' });
    }
    li.classList.add('flash');
    updateMeta();
  }
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = inItem.value.trim().replace(/\s+/g, ' ');
    if (!d) {
      inItem.focus();
      if (hasG && !reduce) G.fromTo(form, { x: -6 }, { x: 0, duration: .5, ease: 'elastic.out(1,.3)' });
      return;
    }
    const q = (inQty.value.trim() || '1').slice(0, 6);
    addItem(d, q);
    inItem.value = ''; inQty.value = '1'; inItem.focus();
  });
  rowsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.rm'); if (!b) return;
    const li = b.closest('.bom-row'); const i = +li.dataset.i;
    mine.splice(i, 1); revs += 1; save(); renderMine(); updateMeta();
    const next = $$('.bom-row.mine .rm', rowsEl)[Math.min(i, mine.length - 1)];
    (next || inItem).focus();
  });
  // an item typed but not yet added still goes out with the list
  send.addEventListener('click', () => {
    const d = inItem.value.trim();
    if (d) { addItem(d, (inQty.value.trim() || '1').slice(0, 6)); inItem.value = ''; inQty.value = '1'; }
  });
  renderMine(); updateMeta();

  /* ------------------------------------------------------------ roles ↔ building callouts */
  $$('.role').forEach((r) => {
    const co = $(`.b-co[data-role="${r.dataset.role}"]`);
    const on = (v) => { r.classList.toggle('on', v); if (co) co.classList.toggle('on', v); };
    r.addEventListener('pointerenter', () => on(true));
    r.addEventListener('pointerleave', () => on(false));
    if (co) { co.addEventListener('pointerenter', () => on(true)); co.addEventListener('pointerleave', () => on(false)); }
  });

  /* ------------------------------------------------------------ no GSAP / reduced motion: finished state */
  const partsOf = (fig) => $$('.part', fig);
  function explodeStatic() {
    $$('.fig').forEach((fig) => {
      partsOf(fig).forEach((p) => p.setAttribute('transform', `translate(${p.dataset.dx} ${p.dataset.dy})`));
      const fd = $('.fdim', fig); if (fd) fd.style.opacity = 0;
    });
  }

  if (!hasG || reduce) {
    html.classList.remove('preload');
    explodeStatic();
    window.addEventListener('load', () => { buildFlow(); buildRulers(); });
    addEventListener('resize', debounce(() => { buildFlow(); buildRulers(); }, 150));
    if (!hasG) return;
  }

  /* ------------------------------------------------------------ helpers */
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  /* ------------------------------------------------------------ flow diagram geometry */
  let flowTL = null;
  function buildFlow() {
    const flow = $('#flow'), svg = $('.flow-svg', flow), steps = $$('.step', flow);
    const fr = flow.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${fr.width} ${fr.height}`);
    const B = steps.map((s) => { const r = s.getBoundingClientRect(); return { x: r.left - fr.left, y: r.top - fr.top, w: r.width, h: r.height }; });
    const vertical = B.length > 1 && B[1].x < B[0].x + B[0].w;
    let s = '';
    B.forEach((b, i) => {
      s += `<path class="fbox" data-i="${i}" d="M${b.x} ${b.y}H${b.x + b.w}V${b.y + b.h}H${b.x}Z"/>`;
      const t = 9;
      s += `<path class="ftick" data-i="${i}" d="M${b.x - t - 4} ${b.y}h${t}M${b.x} ${b.y - t - 4}v${t}M${b.x + b.w + 4} ${b.y + b.h}h${t}M${b.x + b.w} ${b.y + b.h + 4}v${t}"/>`;
    });
    for (let i = 0; i < B.length - 1; i++) {
      const a = B[i], b = B[i + 1];
      let d, hx, hy, ang;
      if (!vertical) {
        const y1 = a.y + 70, y2 = b.y + 70, x1 = a.x + a.w, x2 = b.x - 10, mxp = (x1 + b.x) / 2, r = 12;
        d = `M${x1} ${y1}H${mxp - r}Q${mxp} ${y1} ${mxp} ${y1 + r}V${y2 - r}Q${mxp} ${y2} ${mxp + r} ${y2}H${x2}`;
        hx = b.x; hy = y2; ang = 0;
      } else {
        const x = a.x + 55, y1 = a.y + a.h, y2 = b.y - 10;
        d = `M${x} ${y1}V${y2}`; hx = x; hy = b.y; ang = 90;
      }
      s += `<path class="fcon-g" d="${d}"/><path class="fcon" data-i="${i}" d="${d}"/>`;
      s += `<circle class="fnode" data-i="${i}" cx="${d.split(' ')[0].slice(1)}" cy="${d.split(' ')[1].replace(/[A-Z].*$/, '')}" r="4.5"/>`;
      s += `<path class="fhead" data-i="${i}" d="M0 -6L11 0L0 6Z" transform="translate(${hx} ${hy}) rotate(${ang}) translate(-11 0)"/>`;
      s += `<circle class="fpacket" data-i="${i}" r="5" cx="0" cy="0" opacity="0"/>`;
    }
    svg.innerHTML = s;
    return { svg, steps };
  }

  /* ------------------------------------------------------------ everything below: animated build */
  if (reduce) return;

  // Lenis smooth scroll
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on('scroll', ST.update);
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href'); const t = id.length > 1 ? $(id) : null;
    if (!t && id !== '#top') return;
    e.preventDefault();
    const target = id === '#top' ? 0 : t;
    if (lenis) lenis.scrollTo(target, { duration: 1.4 }); else (t || document.body).scrollIntoView({ behavior: 'smooth' });
    if (t && t.tabIndex < 0) { t.setAttribute('tabindex', '-1'); }
    if (t) setTimeout(() => t.focus({ preventScroll: true }), 900);
  }));

  /* ---- plotter wipe: text is revealed left→right behind a travelling red pen */
  function plot(line, tl, at, dur = 0.95) {
    const ink = line.classList.contains('h1-ink') ? line : $('.h1-ink', line) || line;
    const host = ink.parentElement;
    const pen = document.createElement('span'); pen.className = 'plotter'; pen.setAttribute('aria-hidden', 'true');
    host.style.position = 'relative'; host.appendChild(pen);
    const w = () => ink.offsetWidth;
    tl.fromTo(ink, { clipPath: 'inset(-12% 100% -12% 0)' }, { clipPath: 'inset(-12% 0% -12% 0)', duration: dur, ease: 'power2.inOut', clearProps: 'clipPath' }, at)
      .fromTo(pen, { x: 0, opacity: 1 }, { x: w, duration: dur, ease: 'power2.inOut' }, at)
      .to(pen, { opacity: 0, duration: .25 }, at + dur);
  }

  /* ---- hero intro */
  const intro = G.timeline({ defaults: { ease: 'power3.out' }, delay: .15 });
  intro.from('.fl-t, .fl-b', { scaleX: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
    .from('.fl-l, .fl-r', { scaleY: 0, duration: 1.2, ease: 'power2.inOut' }, 0)
    .from('.ruler', { opacity: 0, duration: .8 }, .5)
    .from('.reg', { opacity: 0, scale: .4, duration: .6, stagger: .1 }, .8)
    .from('.top', { opacity: 0, y: -12, duration: .7 }, .35);
  $$('.hero .h1-line').forEach((l, i) => plot(l, intro, .55 + i * .55));
  intro.from('.lede', { opacity: 0, y: 14, duration: .8 }, 1.6)
    .from('.tb', { yPercent: 110, opacity: 0, duration: .9, ease: 'power3.out' }, 1.2)
    .from('.hero-scroll', { opacity: 0, duration: .8 }, 2.2);
  // logo detail drawing
  const lg = $('.logo-dwg');
  intro.from('.hero-fig', { opacity: 0, duration: .01 }, .4)
    .from($$('.lg-cl .cl', lg), { scale: 0, transformOrigin: '50% 50%', duration: 1.1, ease: 'power2.inOut', stagger: .15 }, .45)
    .from($('.lg-ol', lg), { drawSVG: '0%', duration: 1.5, ease: 'power2.inOut' }, .7)
    .from($('.lg-let', lg), { drawSVG: '0%', duration: 1.9, ease: 'power1.inOut' }, 1.1)
    .from($('.lg-fill', lg), { opacity: 0, duration: .9, ease: 'power2.out' }, 2.8)
    .from($$('.lg-dim .ext', lg), { drawSVG: '0%', duration: .5, stagger: .15 }, 2.4)
    .from($$('.lg-dim .dl', lg), { drawSVG: '50% 50%', opacity: 0, duration: .8, ease: 'power2.inOut', stagger: .15 }, 2.6)
    .from($$('.lg-dim .dbg, .lg-dim .dt', lg), { opacity: 0, duration: .5, stagger: .08 }, 3.1)
    .from('.cap', { opacity: 0, duration: .6 }, 3.2);
  // after the plot, measure the headline once so people discover hover dimensions
  if (fine) intro.call(() => {
    if (dimTarget) return;
    const h = $('.hero .h1'); dims(h); xh.classList.add('snap');
    dimTimer = setTimeout(() => { if (!dimTarget) { dims(null); xh.classList.remove('snap'); } }, 2600);
  }, null, 3.4);
  html.classList.remove('preload');
  G.to('.hs-line', { backgroundPosition: '0 44px', duration: 1.6, repeat: -1, ease: 'none' });

  /* ---- B · supplies: draw → explode → bill of materials, one detail at a time */
  const figs = $$('.fig');
  const rows = $$('.bom-row.sample');
  const lineSel = '.part .ln, .part .th, .fdim .th, .fdim .dl';
  figs.forEach((fig) => {
    const hl = document.createElement('span'); hl.className = 'fig-hl'; hl.setAttribute('aria-hidden', 'true');
    Object.assign(hl.style, { position: 'absolute', inset: '-1px', border: '1px solid var(--mark)', opacity: 0, pointerEvents: 'none' });
    fig.appendChild(hl);
    G.set($$('.co', fig), { opacity: 0 });
    G.set($$('.axis .cl', fig), { opacity: 0 });
  });
  G.set(rows, { clipPath: 'inset(0 100% 0 0)' });

  function drawIn(fig, tl, at, dur) {
    tl.from($$(lineSel, fig), { drawSVG: '0%', duration: dur, ease: 'power1.inOut', stagger: dur / 40 }, at)
      .from($$('.part .ln', fig), { fillOpacity: 0, duration: dur * .3 }, at + dur * .8)
      .from($('.fig-cap', fig), { opacity: 0, duration: dur * .3 }, at + dur * .5);
    const extra = $$('.fdim .dbg, .fdim .dt, .lbl', fig);
    if (extra.length) tl.from(extra, { opacity: 0, duration: dur * .25 }, at + dur * .8);
  }
  function explode(fig, tl, at) {
    const parts = partsOf(fig);
    tl.to($$('.axis .cl', fig), { opacity: 1, duration: .3 }, at)
      .fromTo($$('.axis .cl', fig), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .6, ease: 'power2.out' }, at)
      .to($('.fig-hl', fig), { opacity: 1, duration: .3 }, at)
      ;
    if ($('.fdim', fig)) tl.to($('.fdim', fig), { opacity: 0, duration: .25 }, at);
    parts.forEach((p, i) => {
      const dx = +p.dataset.dx || 0, dy = +p.dataset.dy || 0;
      if (dx || dy) tl.to(p, { x: dx, y: dy, duration: 1.2, ease: 'power3.inOut' }, at + .15 + i * .06);
    });
    const cos = $$('.co', fig);
    tl.to(cos, { opacity: 1, duration: .25, stagger: .1 }, at + 1.2)
      .from($$('.co-ld', fig), { drawSVG: '0%', duration: .4, stagger: .1 }, at + 1.2)
      .from($$('.co-bal, .co-n', fig), { scale: 0, transformOrigin: '50% 50%', duration: .35, stagger: .05, ease: 'back.out(2)' }, at + 1.35);
    return at + 1.9;
  }
  function revealRow(row, tl, at) {
    tl.to(row, { clipPath: 'inset(0 0% 0 0)', duration: .7, ease: 'power2.inOut' }, at);
  }

  const mmSup = G.matchMedia();
  mmSup.add('(min-width: 1000px) and (min-height: 640px)', () => {
    // linework draws as the sheet slides into view
    const pre = G.timeline({ scrollTrigger: { trigger: '.sup', start: 'top 92%', end: 'top 8%', scrub: .6 } });
    pre.from('.sup-head > *', { opacity: 0, y: 24, stagger: .1, duration: .5 }, 0)
      .from('.bom', { opacity: 0, y: 30, duration: .5 }, .2);
    figs.forEach((f, i) => drawIn(f, pre, .1 + i * .18, 1));
    // then the exploded views run one after another while the sheet is held
    const tl = G.timeline({ scrollTrigger: { trigger: '.sup-track', start: 'top top', end: 'bottom bottom', scrub: .7 } });
    figs.forEach((f, i) => {
      const at = i * 2.5 + .2;
      const done = explode(f, tl, at);
      revealRow(rows[i], tl, done - .6);
      if (i < figs.length - 1) tl.to($('.fig-hl', f), { opacity: 0, duration: .4 }, at + 2.3);
    });
    tl.to($('.fig-hl', figs[figs.length - 1]), { opacity: 0, duration: .4 }, '+=.3');
    tl.to({}, { duration: .6 });
  });
  mmSup.add('(max-width: 999px), (max-height: 639px)', () => {
    figs.forEach((f, i) => {
      const tl = G.timeline({ scrollTrigger: { trigger: f, start: 'top 82%', end: 'bottom 38%', scrub: .6 } });
      drawIn(f, tl, 0, 1);
      explode(f, tl, 1.1);
      tl.to($('.fig-hl', f), { opacity: 0, duration: .3 });
    });
    const rt = G.timeline({ scrollTrigger: { trigger: '.bom', start: 'top 85%', toggleActions: 'play none none none' } });
    rows.forEach((r, i) => revealRow(r, rt, i * .22));
  });

  /* ---- C · flow diagram: connectors draw themselves as you scroll */
  function armFlow() {
    if (flowTL) { flowTL.scrollTrigger && flowTL.scrollTrigger.kill(); flowTL.kill(); flowTL = null; }
    G.set('.step > *', { clearProps: 'all' });
    const { svg, steps } = buildFlow();
    const tl = G.timeline({ scrollTrigger: { trigger: '#flow', start: 'top 78%', end: 'bottom 62%', scrub: .6 } });
    const sel = (c, i) => svg.querySelectorAll(`.${c}[data-i="${i}"]`);
    steps.forEach((st, i) => {
      const at = i * 1.6;
      tl.from(sel('fbox', i), { drawSVG: '0%', duration: .8, ease: 'power1.inOut' }, at)
        .from(sel('ftick', i), { opacity: 0, duration: .3 }, at + .5)
        .from(st.children, { opacity: 0, y: 16, duration: .5, stagger: .1 }, at + .35);
      if (i < steps.length - 1) {
        const con = sel('fcon', i)[0], pk = sel('fpacket', i)[0], len = con.getTotalLength();
        const o = { p: 0 };
        tl.from(sel('fnode', i), { scale: 0, transformOrigin: '50% 50%', duration: .2 }, at + .8)
          .from(con, { drawSVG: '0%', duration: .8, ease: 'none' }, at + .85)
          .fromTo(o, { p: 0 }, {
            p: 1, duration: .8, ease: 'none',
            onUpdate() { const pt = con.getPointAtLength(o.p * len); pk.setAttribute('cx', pt.x); pk.setAttribute('cy', pt.y); pk.setAttribute('opacity', o.p > 0.01 && o.p < .99 ? 1 : 0); }
          }, at + .85)
          .from(sel('fhead', i), { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: .2 }, at + 1.6);
      }
    });
    flowTL = tl;
  }
  armFlow();

  /* ---- D · building section draws in */
  const bl = G.timeline({ scrollTrigger: { trigger: '.serve-fig', start: 'top 85%', end: 'center 45%', scrub: .6 } });
  ['.b-ground', '.b-shell', '.b-win', '.b-stairs', '.b-roof', '.b-mech', '.b-f1', '.b-f2'].forEach((g, i) => {
    bl.from($$(`${g} .ln, ${g} .th`), { drawSVG: '0%', duration: 1, stagger: .03, ease: 'power1.inOut' }, i * .45);
  });
  bl.from('.b-co', { opacity: 0, duration: .4, stagger: .25 }, '-=.4');
  G.from('.serve-copy > *', { opacity: 0, y: 24, stagger: .1, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.serve', start: 'top 70%' } });
  G.from('.how > .sec-tag', { opacity: 0, y: 16, duration: .7, scrollTrigger: { trigger: '.how', start: 'top 80%' } });

  /* ---- E · approval stamps slam down */
  const stamps = $$('.stamp-in');
  G.set(stamps, { opacity: 0 });
  ST.create({
    trigger: '.stamps', start: 'top 72%', once: true,
    onEnter() {
      const t = G.timeline();
      stamps.forEach((s, i) => {
        t.fromTo(s, { opacity: 0, scale: 2.1, rotation: i % 2 ? 9 : -9 }, { opacity: 1, scale: 1, rotation: 0, duration: .32, ease: 'power4.in' }, i * .55)
          .fromTo('.stamps', { x: 0, y: 0 }, { keyframes: [{ x: -3, y: 2, duration: .04 }, { x: 2, y: -1, duration: .05 }, { x: 0, y: 0, duration: .08 }] }, i * .55 + .32)
          .fromTo(s, { filter: 'blur(0px)' }, { keyframes: [{ filter: 'blur(.6px)', duration: .05 }, { filter: 'blur(0px)', duration: .3 }] }, i * .55 + .32);
      });
    }
  });
  G.from('.promise > .sec-tag', { opacity: 0, y: 16, duration: .7, scrollTrigger: { trigger: '.promise', start: 'top 80%' } });

  /* ---- F · notes, G · contact */
  G.from('.notes-k, .notes-list li', { opacity: 0, y: 26, stagger: .14, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '.notes', start: 'top 75%' } });
  G.from('.about > .sec-tag', { opacity: 0, y: 16, duration: .7, scrollTrigger: { trigger: '.about', start: 'top 80%' } });
  const ct = G.timeline({ scrollTrigger: { trigger: '.contact', start: 'top 70%' } });
  ct.from('.contact > .sec-tag', { opacity: 0, y: 16, duration: .6 }, 0);
  plot($('.contact .h2'), ct, .15, .9);
  ct.from('.contact .sub', { opacity: 0, y: 14, duration: .6 }, .9)
    .from('.reach li', { opacity: 0, y: 18, stagger: .12, duration: .6 }, 1.05);

  /* ---- keep geometry honest on resize / font load */
  const refresh = debounce(() => { buildRulers(); armFlow(); ST.refresh(); }, 180);
  addEventListener('resize', refresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildRulers(); armFlow(); ST.refresh(); });
  addEventListener('load', () => { buildRulers(); ST.refresh(); });
})();
