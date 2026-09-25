/* E&N Service Company — "Live list" concept */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* =========================================================
     1. THE LIVE LIST (plain JS + CSS, works without GSAP)
     ========================================================= */
  var rowsEl = $('#rows');
  var form = $('#entry');
  var input = $('#item');
  var ghostText = $('#ghostText');
  var send = $('#send');
  var countEl = $('#count');
  var titleEl = $('#sheetTitle');
  var dateEl = $('#sheetDate');
  var userMode = false;
  var demoToken = 0;

  var EXAMPLES = ['LED shop light 4 ft', 'Faucet cartridge', 'Paper towels (case)', '30 A fuse'];
  var CHECK = '<svg viewBox="0 0 24 24"><path d="M5.5 12.5l4 4L18.5 7.5"/></svg>';
  var XICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  try {
    dateEl.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch (e) { /* keep fallback */ }

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function makeRow(text, example) {
    var li = document.createElement('li');
    li.className = 'row';
    li.dataset.item = text;
    if (example) li.setAttribute('data-example', '');
    li.innerHTML =
      '<div class="row-in"><span class="r-num"></span>' +
      '<span class="r-box" aria-hidden="true">' + CHECK + '</span>' +
      '<span class="r-item">' + esc(text) + '</span>' +
      '<span class="r-status"><span class="s-search">Searching</span><span class="s-found">Found</span></span>' +
      '<button class="r-x" type="button" aria-label="Remove ' + esc(text) + '">' + XICON + '</button></div>';
    return li;
  }

  function liveRows() { return $$('.row:not(.out)', rowsEl); }

  function refresh() {
    var rows = liveRows();
    rows.forEach(function (r, i) { var n = $('.r-num', r); if (n) n.textContent = String(i + 1).padStart(2, '0'); });
    var n = rows.length;
    countEl.textContent = n + (n === 1 ? ' item' : ' items');
    countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump');
    updateMail();
  }

  function userItems() {
    return liveRows().filter(function (r) { return !r.hasAttribute('data-example'); })
      .map(function (r) { return r.dataset.item; });
  }

  function updateMail() {
    var items = userItems();
    var body = "Hi E&N,\n\nHere's my list:\n\n" +
      (items.length ? items.map(function (t, i) { return (i + 1) + '. ' + t; }).join('\n') : '1. ') +
      '\n\n';
    send.href = 'mailto:enservicecompany@gmail.com?subject=' + encodeURIComponent('Quote request') +
      '&body=' + encodeURIComponent(body);
  }

  function search(li, fast) {
    if (reduce) { li.classList.add('found', 'static'); return; }
    li.classList.add('searching');
    setTimeout(function () {
      li.classList.remove('searching');
      li.classList.add('found');
    }, fast ? 450 : 850 + Math.random() * 450);
  }

  function addRow(text, example) {
    var li = makeRow(text, example);
    rowsEl.appendChild(li);
    if (reduce) li.classList.add('in');
    else { void li.offsetWidth; requestAnimationFrame(function () { li.classList.add('in'); }); }
    refresh();
    rowsEl.scrollTo({ top: rowsEl.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
    search(li);
    return li;
  }

  function removeRow(li, silent) {
    if (li.classList.contains('out')) return;
    li.classList.remove('in');
    li.classList.add('out');
    var done = function () { if (li.parentNode) li.parentNode.removeChild(li); };
    if (reduce) done(); else setTimeout(done, 650);
    if (!silent) refresh();
  }

  function enterUserMode() {
    if (userMode) return;
    userMode = true;
    stopDemo();
    $$('.row[data-example]', rowsEl).forEach(function (r, i) {
      r.style.transitionDelay = reduce ? '0s' : (i * 0.05) + 's';
      removeRow(r, true);
    });
    titleEl.textContent = 'Your list';
  }

  function submitItem() {
    var v = input.value.replace(/\s+/g, ' ').trim();
    if (!v) return false;
    if (liveRows().length >= 60) return false;
    enterUserMode();
    input.value = '';
    addRow(v, false);
    send.classList.remove('ready'); void send.offsetWidth; send.classList.add('ready');
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    submitItem();
    input.focus();
  });

  rowsEl.addEventListener('click', function (e) {
    var x = e.target.closest('.r-x');
    if (!x) return;
    var li = x.closest('.row');
    var next = li.nextElementSibling && li.nextElementSibling.querySelector('.r-x');
    removeRow(li);
    (next || input).focus();
  });

  // Include anything still sitting in the input when they hit send
  send.addEventListener('click', function () {
    if (input.value.trim()) submitItem();
    updateMail();
  });

  /* ---- demo typing ---- */
  function stopDemo() {
    demoToken++;
    form.classList.remove('demo', 'typing');
    ghostText.textContent = '';
  }

  function runDemo() {
    var token = ++demoToken;
    var alive = function () { return token === demoToken && !userMode; };
    // clear the static (no-JS) example rows
    $$('.row', rowsEl).forEach(function (r) { r.parentNode.removeChild(r); });
    refresh();
    form.classList.add('demo');
    (async function () {
      await wait(900);
      for (var i = 0; i < EXAMPLES.length; i++) {
        if (!alive()) return;
        var word = EXAMPLES[i];
        form.classList.add('typing');
        for (var c = 1; c <= word.length; c++) {
          if (!alive()) return;
          ghostText.textContent = word.slice(0, c);
          await wait(38 + Math.random() * 55 + (word[c - 1] === ' ' ? 60 : 0));
        }
        form.classList.remove('typing');
        await wait(260);
        if (!alive()) return;
        var k = $('.key', form); k.classList.add('press'); setTimeout(function () { k.classList.remove('press'); }, 140);
        ghostText.textContent = '';
        addRow(word, true);
        await wait(i === EXAMPLES.length - 1 ? 400 : 1150);
      }
      if (alive()) form.classList.remove('demo');
    })();
  }

  // Any intent to use the input ends the demo immediately and fills in the rest
  function interrupt() {
    if (!form.classList.contains('demo')) return;
    stopDemo();
    var have = $$('.row', rowsEl).map(function (r) { return r.dataset.item; });
    EXAMPLES.forEach(function (w) { if (have.indexOf(w) < 0) { var li = addRow(w, true); } });
  }
  input.addEventListener('focus', interrupt);
  input.addEventListener('pointerdown', interrupt);

  if (reduce) {
    $$('.row', rowsEl).forEach(function (r) { r.classList.add('static'); });
    refresh();
  } else {
    // mark static rows so they don't pop before the demo replaces them
    $$('.row', rowsEl).forEach(function (r) { r.classList.add('static'); });
  }
  updateMail();

  // shorter placeholder on narrow screens
  function fitPlaceholder() { input.placeholder = window.innerWidth < 480 ? 'Type an item' : 'Type an item, press Enter'; }
  fitPlaceholder();
  window.addEventListener('resize', fitPlaceholder);

  /* ---- sheet tilt ---- */
  var sheet = $('#sheet');
  var hero = $('.hero');
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var raf = 0;
    hero.addEventListener('pointermove', function (e) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var r = sheet.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        sheet.style.setProperty('--ry', (dx * 5).toFixed(2) + 'deg');
        sheet.style.setProperty('--rx', (-dy * 4).toFixed(2) + 'deg');
      });
    });
    hero.addEventListener('pointerleave', function () {
      sheet.style.setProperty('--ry', '0deg'); sheet.style.setProperty('--rx', '0deg');
    });
  }

  /* =========================================================
     2. MOTION (GSAP + ScrollTrigger + Lenis)
     ========================================================= */
  var hasGsap = !!(window.gsap && window.ScrollTrigger);

  // stage scaler (needed with or without GSAP)
  var stage = $('#stage'), stageIn = $('#stageIn');
  function fitStage() { stageIn.style.setProperty('--s', (stage.clientWidth / 480).toFixed(4)); }
  fitStage();
  window.addEventListener('resize', fitStage);

  // header shadow
  var top = $('.top');
  var lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    top.classList.toggle('scrolled', y > 8);
    if (Math.abs(y - lastY) > 6) {
      top.classList.toggle('hide', y > lastY && y > 500 && !top.contains(document.activeElement));
      lastY = y;
    }
  }, { passive: true });

  if (!hasGsap || reduce) {
    root.classList.remove('preload');
    if (reduce) showFinalStates();
    else setTimeout(runDemo, 200);
    return;
  }

  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });
  root.classList.add('anim');

  // Lenis smooth scroll (desktop wheel; touch stays native)
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var el = id.length > 1 && document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(id === '#main' ? 0 : el, { duration: 1.4 });
        if (el.focus) { el.setAttribute('tabindex', '-1'); el.focus({ preventScroll: true }); }
      });
    });
    // keep native scroll inside the list sheet
    rowsEl.setAttribute('data-lenis-prevent', '');
  }

  /* ---- hero entrance ---- */
  root.classList.remove('preload');
  var intro = gsap.timeline({ defaults: { ease: 'expo.out' } });
  intro
    .from('h1 .ln-i', { yPercent: 105, duration: 1.2, stagger: 0.12 })
    .from('.lede', { y: 24, opacity: 0, duration: 1 }, 0.35)
    .from('.sheet-wrap', { y: 90, rotation: 5, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.15)
    .from('.hero-grid', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0.2);
  setTimeout(runDemo, 250);

  /* ---- generic reveals ---- */
  $$('.reveal').forEach(function (el) {
    gsap.from(el, {
      y: 36, opacity: 0, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 88%' }
    });
  });

  /* ---- supplies belt ---- */
  $$('.belt-row').forEach(function (row) {
    var dir = +row.dataset.dir;
    gsap.fromTo(row, { xPercent: dir < 0 ? 0 : -30 }, {
      xPercent: dir < 0 ? -30 : 0, ease: 'none',
      scrollTrigger: { trigger: '.belt', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    });
  });
  gsap.from('.belt .tag', {
    y: 30, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: { each: 0.03, from: 'random' },
    scrollTrigger: { trigger: '.belt', start: 'top 85%' }
  });

  /* ---- how it works: sheet -> envelope -> quote -> box ---- */
  var steps = $$('#steps .step');
  function setStep(i) {
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); });
  }
  setStep(0);

  var how = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
    scrollTrigger: {
      trigger: '.how', start: 'top top', end: '+=320%', pin: '.how-pin', scrub: 0.8, anticipatePin: 1,
      onUpdate: function (self) {
        var t = self.progress * how.duration();
        setStep(t < 3.3 ? 0 : t < 6.5 ? 1 : 2);
        gsap.set('#howBar', { scaleX: self.progress });
      }
    }
  });
  gsap.set('.env-back, .env-front, .env-flap', { y: 90, opacity: 0 });
  gsap.set('#envFlap', { rotationX: 180, zIndex: 0 });
  gsap.set('#oQuote', { y: 50, opacity: 0, rotationY: -35, scale: 0.9 });
  gsap.set('.q-row i, .q-total i', { scaleX: 0 });
  gsap.set('.q-stamp', { scale: 2.2, opacity: 0, rotation: -40 });
  gsap.set('#oBox', { opacity: 1 });
  gsap.set('.bx-body, .bx-flap', { y: 170, opacity: 0 });
  gsap.set('.bx-label', { scale: 1.5, opacity: 0, rotation: -12 });
  gsap.set('.bx-badge', { scale: 0, opacity: 0 });
  gsap.set('.trail path', { opacity: 0 });

  how
    // envelope rises
    .to('.env-back, .env-front, .env-flap', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 0)
    // sheet folds + drops in
    .to('#mSheet', { scaleY: 0.46, scaleX: 0.9, y: 115, duration: 1.0 }, 0.3)
    .to('.ms-crease', { opacity: 1, duration: 0.4 }, 0.35)
    // flap closes
    .to('#envFlap', { rotationX: 0, duration: 0.7, ease: 'power2.inOut' }, 1.4)
    .set('#envFlap', { zIndex: 5 }, 1.75)
    // send it
    .to('.trail path', { opacity: 0.9, duration: 0.2 }, 2.2)
    .fromTo('.trail', { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power2.out' }, 2.2)
    .to('#oSend', { x: 330, y: -250, rotation: -16, scale: 0.55, opacity: 0, duration: 1.0, ease: 'power3.in' }, 2.2)
    .to('.trail path', { opacity: 0, duration: 0.4 }, 3.0)
    // quote arrives
    .to('#oQuote', { y: 0, opacity: 1, rotationY: 0, scale: 1, duration: 0.9, ease: 'power3.out' }, 3.4)
    .to('.q-row i', { scaleX: 1, duration: 0.35, stagger: 0.18, ease: 'power2.out' }, 4.0)
    .to('.q-total i', { scaleX: 1, duration: 0.45, ease: 'power2.out' }, 5.1)
    .to('.q-stamp', { scale: 1, opacity: 1, rotation: -14, duration: 0.45, ease: 'back.out(2.2)' }, 5.6)
    // into the box
    .to('.bx-body, .bx-flap', { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }, 6.5)
    .to('#oQuote', { scale: 0.5, y: 40, duration: 0.8 }, 6.6)
    .to('#oQuote', { scale: 0.45, y: 125, duration: 0.6, ease: 'power2.in' }, 7.4)
    .to('.q-stamp', { opacity: 0, duration: 0.3 }, 7.4)
    .set('.bx-flap', { zIndex: 4 }, 7.95)
    .to('.bx-l', { rotation: 0, scaleY: 0.14, duration: 0.5, ease: 'power2.inOut' }, 8.0)
    .to('.bx-r', { rotation: 0, scaleY: 0.14, duration: 0.5, ease: 'power2.inOut' }, 8.12)
    .to('.bx-tape', { scaleY: 1, duration: 0.45, ease: 'power2.out' }, 8.6)
    .to('.bx-label', { scale: 1, opacity: 1, rotation: -2, duration: 0.4, ease: 'back.out(2)' }, 9.0)
    .to('.o-box', { y: -14, duration: 0.2, ease: 'power2.out' }, 9.35)
    .to('.o-box', { y: 0, duration: 0.3, ease: 'bounce.out' }, 9.55)
    .to('.bx-badge', { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.6)' }, 9.6)
    .to({}, { duration: 0.8 }, 10.05);

  /* ---- promise: Exact. Delivered. Fast. ---- */
  var ex = $('#wExact');
  ex.innerHTML = ex.textContent.split('').map(function (c) { return '<span class="ch">' + c + '</span>'; }).join('');
  ex.setAttribute('aria-label', 'Exact.');
  var chars = $$('.ch', ex);
  var rnd = function (a) { return (Math.random() * 2 - 1) * a; };

  gsap.set(chars, { x: function () { return rnd(70); }, y: function () { return rnd(90); }, rotation: function () { return rnd(28); }, opacity: 0.15 });
  gsap.set('.c-tl', { x: -60, y: -60, opacity: 0 });
  gsap.set('.c-tr', { x: 60, y: -60, opacity: 0 });
  gsap.set('.c-bl', { x: -60, y: 60, opacity: 0 });
  gsap.set('.c-br', { x: 60, y: 60, opacity: 0 });
  gsap.set('.dim', { scaleX: 0 });
  gsap.set('.w2 .w-t', { xPercent: -130, opacity: 0 });
  gsap.set('.w-check path', { strokeDashoffset: 80 });
  gsap.set('.w3 .w-t', { xPercent: 160, skewX: -28, opacity: 0 });
  gsap.set('.speed i', { scaleX: 0 });
  gsap.set('.promise .eyebrow', { opacity: 0, y: 20 });

  var pr = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: '.promise', start: 'top top', end: '+=240%', pin: '.promise-pin', scrub: 0.7, anticipatePin: 1 }
  });
  pr
    .to('.promise .eyebrow', { opacity: 1, y: 0, duration: 0.4 }, 0)
    .to(chars, { x: 0, y: 0, rotation: 0, opacity: 1, duration: 1.1, stagger: 0.05, ease: 'expo.out' }, 0.1)
    .to('.crop', { x: 0, y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, 0.7)
    .to('.dim', { scaleX: 1, duration: 0.6, ease: 'expo.out' }, 1.1)
    .to('.w2 .w-t', { xPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out' }, 1.6)
    .to('.w-check path', { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out' }, 2.35)
    .to('.w3 .w-t', { xPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out' }, 3.0)
    .to('.speed i', { scaleX: 1, duration: 0.35, stagger: 0.04, ease: 'power2.out' }, 3.0)
    .to('.w3 .w-t', { skewX: 0, duration: 0.6, ease: 'back.out(3)' }, 3.55)
    .to('.speed i', { scaleX: 0.28, duration: 0.6, stagger: 0.04, ease: 'power3.out' }, 3.55)
    .to({}, { duration: 0.8 }, 4.2);

  /* ---- who ---- */
  $$('.role').forEach(function (role) {
    var p = $('.role-ic path', role);
    var len = p.getTotalLength ? p.getTotalLength() : 200;
    gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
    var t = gsap.timeline({ scrollTrigger: { trigger: role, start: 'top 85%' } });
    t.from($('.role-name', role), { yPercent: 60, opacity: 0, duration: 1, ease: 'expo.out' }, 0)
      .from($('.role-items', role), { opacity: 0, x: 20, duration: 1, ease: 'expo.out' }, 0.15)
      .to(p, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0.05);
  });

  /* ---- about: words ink in as you read ---- */
  var ab = $('#aboutText');
  var abText = ab.textContent;
  ab.setAttribute('aria-label', abText);
  ab.innerHTML = abText.split(' ').map(function (w) { return '<span class="wd" aria-hidden="true">' + esc(w) + '</span>'; }).join(' ');
  gsap.fromTo($$('.wd', ab), { opacity: 0.14 }, {
    opacity: 1, ease: 'none', stagger: 0.1,
    scrollTrigger: { trigger: ab, start: 'top 80%', end: 'bottom 45%', scrub: 0.5 }
  });

  /* ---- contact ---- */
  gsap.from('.ct-h .ln-i', { yPercent: 105, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.contact', start: 'top 75%' } });

  window.addEventListener('load', function () { fitStage(); ST.refresh(); });

  /* ---------- reduced motion: final states ---------- */
  function showFinalStates() {
    // How it works: show the delivered box
    var q = $('#oSend'); if (q) q.style.display = 'none';
    $('#oQuote').style.display = 'none';
    $('#oBox').style.opacity = '1';
    $('.bx-tape').style.transform = 'none';
    $$('.bx-flap').forEach(function (f) { f.style.transform = 'scaleY(.14)'; f.style.zIndex = 4; });
  }
})();
