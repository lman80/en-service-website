/* E&N — Kinetic. GSAP 3.13 + ScrollTrigger + Lenis 1.3 */
(function () {
  'use strict';
  var root = document.documentElement;
  var ready = function () { root.classList.add('ready'); };
  var RM = root.classList.contains('rm');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------- text splitting (runs regardless of motion) ---------------- */
  function splitChars(el) {
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var targets = $$('.line', el);
    if (!targets.length) targets = [el];
    targets.forEach(function (t) {
      var words = t.textContent.trim().split(/\s+/);
      t.textContent = '';
      words.forEach(function (w, i) {
        var ws = document.createElement('span');
        ws.className = 'w';
        Array.from(w).forEach(function (c) {
          var m = document.createElement('span'); m.className = 'chm';
          var s = document.createElement('span'); s.className = 'ch'; s.textContent = c;
          m.appendChild(s); ws.appendChild(m);
        });
        t.appendChild(ws);
        if (i < words.length - 1) t.appendChild(document.createTextNode(' '));
      });
    });
    if (el.tagName !== 'SPAN') {
      el.setAttribute('aria-label', label);
      Array.from(el.children).forEach(function (c) { c.setAttribute('aria-hidden', 'true'); });
    }
  }
  function splitMaskWords(el) {
    var parts = el.innerHTML.split(/<br\s*\/?>/i).map(function (h) {
      var d = document.createElement('div'); d.innerHTML = h; return d.textContent.trim();
    });
    el.setAttribute('aria-label', parts.join(' '));
    el.textContent = '';
    parts.forEach(function (part, pi) {
      var words = part.split(/\s+/);
      words.forEach(function (w, i) {
        var m = document.createElement('span'); m.className = 'mw'; m.setAttribute('aria-hidden', 'true');
        var s = document.createElement('span'); s.textContent = w;
        m.appendChild(s); el.appendChild(m);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
      if (pi < parts.length - 1) el.appendChild(document.createElement('br'));
    });
  }
  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'aw'; s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  function rollLinks() {
    $$('[data-roll]').forEach(function (a) {
      var t = a.textContent;
      a.setAttribute('aria-label', a.getAttribute('aria-label') || t);
      a.innerHTML = '<span class="roll" aria-hidden="true"><span></span><span></span></span>';
      var spans = $$('.roll > span', a);
      spans[0].textContent = t; spans[1].textContent = t;
    });
  }

  rollLinks();

  if (RM || !window.gsap || !window.ScrollTrigger) {
    // libraries missing → fall back to the fully static layout
    if (!RM) { root.classList.remove('js'); root.classList.add('no-js'); }
    ready();
    return; // static, readable page
  }

  $$('[data-split]').forEach(splitChars);
  $$('[data-mask]').forEach(splitMaskWords);
  $$('[data-words]').forEach(splitWords);

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------------- smooth scroll ---------------- */
  var lenis = null, scrollVel = 0, scrollDir = 1;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', function (e) {
      ST.update();
      scrollVel = e.velocity || 0;
      if (e.direction) scrollDir = e.direction;
    });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    var lastY = window.scrollY;
    window.addEventListener('scroll', function () {
      var y = window.scrollY; scrollVel = y - lastY; if (scrollVel) scrollDir = scrollVel > 0 ? 1 : -1; lastY = y;
    }, { passive: true });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
      else window.scrollTo({ top: target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' });
      if (target !== 0) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  });

  /* ---------------- nav: hide on the way down, return on the way up ---------------- */
  var navEl = $('.nav'), lastNavY = 0;
  gsap.ticker.add(function () {
    var y = window.scrollY;
    if (Math.abs(y - lastNavY) < 4) return;
    var down = y > lastNavY; lastNavY = y;
    var inPromise = navEl.classList.contains('nav--dark') || navEl.hasAttribute('data-over-promise');
    navEl.classList.toggle('nav--hide', down && y > innerHeight * 0.5);
    navEl.classList.toggle('nav--solid', y > 60 && !inPromise);
  });

  /* ---------------- hero intro ---------------- */
  var heroChars = $$('.hero-title .ch');
  gsap.set(heroChars, { y: 0, yPercent: 105 });
  gsap.set('.hero [data-fade], .magnet-zone', { autoAlpha: 0 });
  ready();

  var intro = gsap.timeline({ delay: 0.15 });
  $$('.hero-title .line').forEach(function (line, i) {
    intro.to($$('.ch', line), { yPercent: 0, duration: 1.25, ease: 'expo.out', stagger: 0.028 }, i * 0.12);
  });
  intro.fromTo('.hero-sub', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out' }, 0.7)
       .fromTo('.magnet-zone', { autoAlpha: 0, scale: 0.4, rotate: -30 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.3, ease: 'expo.out' }, 0.85);

  // hero parallax out
  gsap.to('.hero-title', {
    yPercent: -12, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
  });

  /* ---------------- cursor ---------------- */
  var mouse = { x: innerWidth / 2, y: innerHeight / 2, active: false };
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouse.x = e.clientX; mouse.y = e.clientY;
    if (!mouse.active) { mouse.active = true; var c = $('.cursor'); if (c) c.classList.remove('is-hidden'); }
  }, { passive: true });

  if (fine) {
    root.classList.add('has-cursor');
    var cur = $('.cursor'), ring = $('.cursor-ring'), dot = $('.cursor-dot');
    var rx = mouse.x, ry = mouse.y;
    gsap.ticker.add(function () {
      rx += (mouse.x - rx) * 0.2; ry += (mouse.y - ry) * 0.2;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      dot.style.transform = 'translate3d(' + mouse.x + 'px,' + mouse.y + 'px,0)';
    });
    document.addEventListener('mouseover', function (e) {
      var t = e.target;
      cur.classList.toggle('is-cta', !!t.closest('.cta'));
      cur.classList.toggle('is-view', !!t.closest('.who-row'));
      cur.classList.toggle('is-link', !t.closest('.cta') && !!t.closest('a, .marquee-track span'));
    });
    document.addEventListener('mouseleave', function () { cur.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { cur.classList.remove('is-hidden'); mouse.active = true; });
  }

  /* ---------------- variable-weight type that reacts to the cursor ---------------- */
  function weightField(container, chars, base, low, radiusVw) {
    var pts = [], cur = chars.map(function () { return base; }), inView = false;
    function measure() {
      pts = chars.map(function (c) {
        var r = c.parentNode.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + window.scrollY + r.height / 2 };
      });
    }
    ST.create({ trigger: container, start: 'top bottom', end: 'bottom top', onToggle: function (s) { inView = s.isActive; if (inView) measure(); }, onRefresh: measure });
    window.addEventListener('resize', measure);
    var settled = true;
    gsap.ticker.add(function () {
      if (!inView || (!mouse.active && settled)) return;
      var R = innerWidth * radiusVw, sy = window.scrollY, moved = false;
      for (var i = 0; i < chars.length; i++) {
        var p = pts[i]; if (!p) continue;
        var dx = mouse.x - p.x, dy = mouse.y - (p.y - sy);
        var d = Math.sqrt(dx * dx + dy * dy);
        var f = Math.max(0, 1 - d / R); f = f * f * (3 - 2 * f);
        var target = mouse.active ? base - (base - low) * f : base;
        var nv = cur[i] + (target - cur[i]) * 0.14;
        if (Math.abs(nv - cur[i]) > 0.5) { cur[i] = nv; chars[i].style.fontWeight = Math.round(nv); moved = true; }
      }
      settled = !moved;
    });
    document.addEventListener('mouseleave', function () { mouse.active = false; });
  }
  if (fine) {
    weightField($('.hero'), heroChars, 800, 180, 0.2);
  }

  /* ---------------- magnetic button ---------------- */
  var zone = $('.magnet-zone'), cta = $('.cta'), label = $('.cta-label');
  if (fine && zone && cta) {
    var xTo = gsap.quickTo(cta, 'x', { duration: 0.7, ease: 'power3.out' });
    var yTo = gsap.quickTo(cta, 'y', { duration: 0.7, ease: 'power3.out' });
    var lxTo = gsap.quickTo(label, 'x', { duration: 0.7, ease: 'power3.out' });
    var lyTo = gsap.quickTo(label, 'y', { duration: 0.7, ease: 'power3.out' });
    zone.addEventListener('mousemove', function (e) {
      var r = cta.getBoundingClientRect();
      var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      xTo(dx * 0.42); yTo(dy * 0.42); lxTo(dx * 0.16); lyTo(dy * 0.16);
    });
    zone.addEventListener('mouseleave', function () {
      gsap.to([cta, label], { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' });
    });
    cta.addEventListener('mouseenter', function (e) {
      var r = cta.getBoundingClientRect();
      cta.style.setProperty('--fx', (e.clientX - r.left) + 'px');
      cta.style.setProperty('--fy', (e.clientY - r.top) + 'px');
    });
  }

  /* ---------------- marquee (scroll-velocity driven) ---------------- */
  $$('.marquee-row').forEach(function (row) {
    var track = $('.marquee-track', row);
    var html = track.innerHTML;
    track.innerHTML = html + html;
    while (track.scrollWidth < innerWidth * 2.2) track.innerHTML += html + html;
    var half = 0, x = 0, dir = parseFloat(row.getAttribute('data-dir')) || 1, hover = false, speedMul = 1;
    // the copies are identical; loop over one copy's width
    function measure() { half = track.scrollWidth / (track.innerHTML.split(html).length - 1); }
    measure(); window.addEventListener('resize', measure);
    if (dir < 0) x = -half;
    row.addEventListener('mouseenter', function () { hover = true; });
    row.addEventListener('mouseleave', function () { hover = false; });
    var visible = true;
    ST.create({ trigger: row, start: 'top bottom', end: 'bottom top', onToggle: function (s) { visible = s.isActive; } });
    gsap.ticker.add(function (t, dt) {
      if (!visible) return;
      var target = hover ? 0.15 : 1;
      speedMul += (target - speedMul) * 0.08;
      var v = Math.min(Math.abs(scrollVel), 60);
      var speed = (0.9 + v * 0.35) * speedMul * (dt / 16.67);
      x -= speed * dir * scrollDir;
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = 'translate3d(' + x + 'px,0,0)';
    });
  });

  /* ---------------- generic reveals ---------------- */
  $$('[data-mask]').forEach(function (el) {
    gsap.from($$('.mw > span', el), {
      yPercent: 115, rotate: 4, duration: 1.3, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: el, start: 'top 85%' }
    });
  });
  $$('[data-fade]').forEach(function (el) {
    if (el.closest('.hero')) return;
    gsap.from(el, { y: 30, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
  $$('[data-clip]').forEach(function (fig) {
    if (fig.closest('.how-track')) return;
    var img = $('img', fig);
    gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut',
      scrollTrigger: { trigger: fig, start: 'top 85%' }
    });
    gsap.fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 85%' } });
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------------- how it works ---------------- */
  function stepAnims(step, opts) {
    var paper = $('.paper', step), quote = $('.quote', step), arrive = $('.arrive', step);
    var tl = gsap.timeline({ paused: true });
    if (paper) {
      tl.from(paper, { y: 60, rotate: 4, autoAlpha: 0, duration: 1, ease: 'expo.out' })
        .from($$('.paper-row', paper), { autoAlpha: 0, x: -14, duration: 0.5, stagger: 0.18, ease: 'power3.out' }, 0.3);
    }
    if (quote) {
      tl.from(quote, { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out' })
        .from($$('em', quote), { scaleX: 0, duration: 0.8, stagger: 0.12, ease: 'expo.out' }, 0.25);
    }
    if (arrive) {
      tl.fromTo(arrive, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' })
        .from($('img', arrive), { scale: 1.3, xPercent: -8, duration: 1.8, ease: 'expo.out' }, 0);
    }
    tl.from($('.step-title', step), { yPercent: 60, autoAlpha: 0, duration: 1, ease: 'expo.out' }, 0);
    ST.create(Object.assign({
      trigger: step,
      onEnter: function () { tl.play(); step.classList.add('on'); },
      onLeaveBack: function () { step.classList.remove('on'); }
    }, opts));
  }

  var mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', function () {
    var track = $('.how-track'), fill = $('.how-fill'), now = $('.how-now'), ticks = $$('.how-ticks li');
    var steps = $$('.step', track);
    var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
    var hTween = gsap.to(track, {
      x: function () { return -dist(); }, ease: 'none',
      scrollTrigger: {
        trigger: '.how', pin: '.how-pin', start: 'top top',
        end: function () { return '+=' + dist() * 1.1; },
        scrub: 0.8, invalidateOnRefresh: true,
        onUpdate: function (s) {
          fill.style.transform = 'scaleX(' + s.progress + ')';
          var idx = Math.min(steps.length - 1, Math.floor(s.progress * steps.length * 0.999 + 0.35));
          now.textContent = '0' + (idx + 1);
          ticks.forEach(function (t, i) { t.classList.toggle('on', i <= idx); });
        }
      }
    });
    steps.forEach(function (step, i) {
      if (i === 0) stepAnims(step, { start: 'top 70%' });
      else stepAnims(step, { containerAnimation: hTween, start: 'left 72%' });
    });
    return function () { gsap.set(track, { x: 0 }); };
  });
  mm.add('(max-width: 899px)', function () {
    $$('.step').forEach(function (step) { stepAnims(step, { start: 'top 72%' }); });
    gsap.fromTo('.how-vfill', { scaleY: 0 }, {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.how-track', start: 'top 60%', end: 'bottom 60%', scrub: true }
    });
  });

  /* ---------------- promise: each word takes the screen ---------------- */
  (function promise() {
    var pin = $('.promise-pin');
    var exact = $('.pw--exact'), deliv = $('.pw--delivered'), fast = $('.pw--fast');
    var wE = $('.pw-word', exact), wD = $('.pw-word', deliv), wF = $('.pw-word', fast);
    var idx = $$('.promise-index span'), nav = $('.nav');

    function fit() {
      [wE, wD, wF].forEach(function (w) {
        var fs = w.style.fontStretch, tr = w.style.transform;
        w.style.fontSize = ''; w.style.fontStretch = ''; w.style.transform = 'none';
        var cs = parseFloat(getComputedStyle(w).fontSize);
        var r = w.getBoundingClientRect();
        var s = Math.min((innerWidth * 0.9) / r.width, (innerHeight * 0.62) / r.height);
        w.style.fontSize = (cs * s) + 'px';
        w.style.fontStretch = fs; w.style.transform = tr;
      });
    }
    // registration mark locked onto the period of "Exact."
    function mark() {
      var dotCh = $$('.ch', wE).pop(); if (!dotCh) return;
      var pr = exact.getBoundingClientRect(), r = dotCh.parentNode.getBoundingClientRect();
      var fsz = parseFloat(wE.style.fontSize) || parseFloat(getComputedStyle(wE).fontSize);
      exact.style.setProperty('--cx', (r.left - pr.left + r.width * 0.47) + 'px');
      exact.style.setProperty('--cy', (r.top - pr.top + fsz * 0.615) + 'px');
      exact.style.setProperty('--cr', (fsz * 0.34) + 'px');
    }
    fit(); mark();
    window.addEventListener('resize', function () { fit(); mark(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); mark(); ST.refresh(); });

    var cE = $$('.ch', wE), cD = $$('.ch', wD), cF = $$('.ch', wF);
    var fastStretch = getComputedStyle(wF).fontStretch || '125%';
    gsap.set(deliv, { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set(fast, { clipPath: 'inset(0% 0% 0% 100%)' });

    // Exact. arrives with the section
    gsap.from(cE, {
      yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.05,
      scrollTrigger: { trigger: '.promise', start: 'top 55%' }
    });
    gsap.from($$('.pw-cross i', exact), {
      scale: 0, duration: 1.6, ease: 'expo.inOut', stagger: 0.12,
      scrollTrigger: { trigger: '.promise', start: 'top 55%' }
    });

    var tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '.promise', pin: pin, start: 'top top', end: '+=280%', scrub: 0.6,
        onToggle: function (s) {
          if (s.isActive) { nav.setAttribute('data-over-promise', ''); nav.classList.remove('nav--solid'); }
          else { nav.removeAttribute('data-over-promise'); nav.classList.remove('nav--dark'); }
        },
        onUpdate: function (s) {
          var i = s.progress < 0.36 ? 0 : s.progress < 0.7 ? 1 : 2;
          idx.forEach(function (el, k) { el.classList.toggle('on', k <= i); });
          nav.classList.toggle('nav--dark', s.isActive && i >= 1);
        }
      }
    });
    tl.to({}, { duration: 0.6 })
      // exact → delivered
      .to(wE, { scale: 0.82, yPercent: -18, autoAlpha: 0.2, duration: 1 }, 0.6)
      .to($('.pw-cross', exact), { autoAlpha: 0, duration: 0.5 }, 0.6)
      .to(deliv, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'power2.inOut' }, 0.6)
      .from(cD, { xPercent: 220, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: 'power3.out' }, 0.9)
      .to({}, { duration: 0.8 })
      // delivered → fast
      .to(wD, { xPercent: -30, duration: 1.2, ease: 'power1.in' }, 2.7)
      .to(fast, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut' }, 2.9)
      .fromTo(wF, { fontStretch: '62%', skewX: -18, xPercent: 60 }, { fontStretch: fastStretch, skewX: 0, xPercent: 0, duration: 1, ease: 'expo.out' }, 3.05)
      .from(cF, { yPercent: 120, stagger: 0.05, duration: 0.7, ease: 'expo.out' }, 3.05)
      .to(wF, { xPercent: -5, duration: 1 }, 4.05)
      .to(cF, { skewX: -6, stagger: 0.04, duration: 0.8 }, 4.05);
  })();

  /* ---------------- who: rows + floating photo ---------------- */
  (function who() {
    var rows = $$('.who-row');
    rows.forEach(function (r, i) {
      gsap.from($('.who-t', r), {
        yPercent: 100, autoAlpha: 0, duration: 1.2, ease: 'expo.out', delay: i * 0.08,
        scrollTrigger: { trigger: r, start: 'top 90%' }
      });
    });
    if (!fine) return;
    var float = $('.who-float'), inner = $('.who-float-in'), list = $('.who-list');
    rows.forEach(function (r) { var im = new Image(); im.src = r.getAttribute('data-img'); });
    var fx = mouse.x, fy = mouse.y, lastX = fx, rot = 0, on = false;
    rows.forEach(function (r) {
      r.addEventListener('mouseenter', function () {
        inner.style.backgroundImage = 'url(' + r.getAttribute('data-img') + ')';
        float.classList.add('on'); on = true;
        gsap.fromTo(inner, { scale: 1.25 }, { scale: 1, duration: 1, ease: 'expo.out' });
      });
    });
    list.addEventListener('mouseleave', function () { float.classList.remove('on'); on = false; });
    gsap.ticker.add(function () {
      if (!on && !float.classList.contains('on')) { fx = mouse.x; fy = mouse.y; }
      fx += (mouse.x - fx) * 0.12; fy += (mouse.y - fy) * 0.12;
      var vx = fx - lastX; lastX = fx;
      rot += (Math.max(-12, Math.min(12, vx * 0.6)) - rot) * 0.1;
      float.style.transform = 'translate3d(' + fx + 'px,' + fy + 'px,0) rotate(' + rot + 'deg)';
    });
  })();

  /* ---------------- about: words light up with scroll ---------------- */
  var aw = $$('.about-text .aw');
  gsap.fromTo(aw, { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: '.about-text', start: 'top 80%', end: 'bottom 45%', scrub: true }
  });

  /* ---------------- contact ---------------- */
  var cc = $$('.contact-title .ch');
  gsap.from(cc, {
    yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.045,
    scrollTrigger: { trigger: '.contact-title', start: 'top 85%' }
  });
  if (fine) weightField($('.contact'), cc, 900, 200, 0.22);
  gsap.from('.contact-links li', {
    y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.contact-links', start: 'top 90%' }
  });

  window.addEventListener('load', function () { ST.refresh(); });
})();
