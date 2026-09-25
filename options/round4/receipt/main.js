/* E&N Service Company — "Receipt"
   Scroll feeds the paper out of the printer; lines print as they clear the head. */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var EMAIL = 'enservicecompany@gmail.com';
  var STORE = 'en-receipt-list';

  var printer = $('#printer'), feedEl = $('#receipt'), sheet = $('#sheet'), paper = $('#paper');
  var track = $('#track'), lcdEl = $('#lcd'), live = $('#live'), mine = $('#mine');
  var form = $('#add'), input = $('#item'), countEl = $('#count'), sendBtn = $('#send');
  var tearEl = $('#tear'), odo = $('#odo'), led = $('#led');
  var navLinks = $$('.pr-nav a');

  /* ---------- receipt date / time ---------- */
  (function stamp() {
    var d = new Date();
    var M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    $('#rDate').textContent = p(d.getDate()) + ' ' + M[d.getMonth()] + ' ' + d.getFullYear();
    $('#rTime').textContent = p(d.getHours()) + ':' + p(d.getMinutes());
  })();

  /* ---------- LCD ---------- */
  var lcdShown = '', lcdHoldUntil = 0;
  function lcdSet(msg, busy) {
    if (msg === lcdShown) return;
    lcdShown = msg;
    lcdEl.textContent = msg;
    lcdEl.classList.toggle('busy', !!busy);
  }
  function lcdFlash(msg, ms) {
    lcdSet(msg, false);
    lcdHoldUntil = performance.now() + (ms || 1400);
  }

  /* ---------- the visitor's list ---------- */
  var items = [];
  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || '[]');
    if (Array.isArray(saved)) items = saved.filter(function (s) { return typeof s === 'string' && s.trim(); }).slice(0, 40);
  } catch (e) { items = []; }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(items)); } catch (e) { /* private mode */ } }

  function countText() { return items.length + (items.length === 1 ? ' item' : ' items'); }
  function renderCount() { countEl.textContent = countText(); }

  function makeLine(text) {
    var li = document.createElement('li');
    li.className = 'ln li li-mine';
    var q = document.createElement('span'); q.className = 'q'; q.textContent = '1';
    var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = text;
    var dots = document.createElement('i'); dots.className = 'dots';
    var v = document.createElement('button'); v.type = 'button'; v.className = 'void';
    v.textContent = 'void'; v.setAttribute('aria-label', 'Remove ' + text + ' from your list');
    li.appendChild(q); li.appendChild(nm); li.appendChild(dots); li.appendChild(v);
    return li;
  }

  // Engine hooks (filled in by the feed engine when motion is on)
  var engine = {
    grow: function (fn) { fn(); },
    print: function (el) { el.classList.add('on', 'done'); },
    active: false
  };

  function addItem(raw, silent) {
    var text = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!text) return false;
    var li = makeLine(text);
    engine.grow(function () { mine.appendChild(li); });
    if (!silent) {
      items.push(text); save();
      engine.print(li);
      live.textContent = 'Added ' + text + '. ' + countText() + ' on your list.';
      lcdFlash('+ ' + text.toUpperCase().slice(0, 18), 1500);
    }
    renderCount();
    return true;
  }
  function removeItem(li) {
    var idx = Array.prototype.indexOf.call(mine.children, li);
    if (idx < 0 || li.classList.contains('voided')) return;
    var text = items[idx];
    items.splice(idx, 1); save();
    li.classList.add('voided');
    lcdFlash('VOID ' + String(text || '').toUpperCase().slice(0, 14), 1300);
    live.textContent = 'Removed ' + text + '. ' + countText() + ' on your list.';
    renderCount();
    setTimeout(function () {
      var wasFocus = li.contains(document.activeElement);
      engine.grow(function () { li.remove(); });
      if (wasFocus) input.focus({ preventScroll: true });
    }, 430);
  }

  items.slice().forEach(function (t) { addItem(t, true); });
  items = items.slice(0, mine.children.length);
  renderCount();

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (addItem(input.value)) input.value = '';
  });
  mine.addEventListener('click', function (e) {
    var b = e.target.closest('.void');
    if (b) removeItem(b.closest('li'));
  });
  // example lines: tap one to put it on your list
  $$('#examples .li').forEach(function (li) {
    var name = li.querySelector('.nm').textContent;
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', 'Add ' + name + ' to your list');
    li.addEventListener('click', function () { addItem(name); });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addItem(name); }
    });
  });

  /* ---------- the one button ---------- */
  function press(btn) {
    btn.classList.add('is-down');
    setTimeout(function () { btn.classList.remove('is-down'); }, 170);
  }
  sendBtn.addEventListener('click', function () {
    press(sendBtn);
    var list = items.slice();
    var pending = input.value.replace(/\s+/g, ' ').trim();
    if (pending) list.push(pending);
    var body = 'My list:\n' + (list.length
      ? list.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n')
      : '1. ') + '\n';
    lcdFlash(list.length ? 'SENDING ' + list.length + (list.length === 1 ? ' ITEM' : ' ITEMS') : 'OPENING MAIL', 2400);
    if (led) { led.classList.add('on'); setTimeout(function () { led.classList.remove('on'); }, 700); }
    setTimeout(function () {
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Quote request') +
        '&body=' + encodeURIComponent(body);
    }, 140);
  });

  /* =========================================================
     FEED ENGINE
     ========================================================= */
  var motionOK = root.classList.contains('feed-on');
  if (!motionOK) { staticMode(); window.__receiptReady = true; return; }

  try { feedMode(); window.__receiptReady = true; }
  catch (err) {
    if (window.console) console.error(err);
    root.classList.remove('feed-on');
    staticMode();
  }

  /* reduced motion / fallback: the finished receipt, simple tear */
  function staticMode() {
    lcdSet(items.length ? countText().toUpperCase() : 'READY');
    tearEl.addEventListener('click', simpleTear);
    tearEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); simpleTear(); }
    });
    function simpleTear() {
      lcdFlash('THANK YOU', 2000);
      sheet.style.transition = 'opacity .3s';
      sheet.style.opacity = '0';
      setTimeout(function () { window.scrollTo(0, 0); sheet.style.opacity = '1'; }, 400);
    }
    setInterval(function () {
      if (performance.now() > lcdHoldUntil) lcdSet(items.length ? countText().toUpperCase() + ' LISTED' : 'READY');
    }, 400);
  }

  function feedMode() {
    var coarse = window.matchMedia('(pointer: coarse)').matches;
    var H = 0, vh = window.innerHeight, slotY = 150, D = 300;
    var stopEls = $$('[data-stop]', paper);
    var stops = [], keys = [], lines = [], secs = [];
    var fed = 0, prevFed = 0, target = 0;
    var intro = true, started = false, torn = false, lock = null, lockScroll = 0;
    var ang = 0, angV = 0;
    var queue = [], nextAt = 0, printingUntil = 0, printingState = false, lcdBusyUntil = 0;
    var lastT = performance.now();
    var currentNav = -1;

    function offTop(el) {
      var y = 0;
      while (el && el !== paper) { y += el.offsetTop; el = el.offsetParent; }
      return y;
    }

    function measure() {
      vh = window.innerHeight;
      var r = printer.getBoundingClientRect();
      slotY = Math.round(r.bottom - 6);
      root.style.setProperty('--slot', slotY + 'px');
      H = paper.offsetHeight;
      stops = stopEls.map(function (el) { return el === tearEl ? H : H - offTop(el); });
      D = Math.round(vh * 0.34);
      keys = [{ s: 0, F: stops[0] }];
      var s = 0;
      for (var i = 1; i < stops.length; i++) {
        s += Math.max(0, stops[i] - stops[i - 1]);
        keys.push({ s: s, F: stops[i] });
        if (i < stops.length - 1) { s += D; keys.push({ s: s, F: stops[i] }); }
      }
      track.style.height = (s + vh) + 'px';
      lines = $$('.ln', paper).map(function (el) {
        var top = offTop(el);
        return { el: el, need: H - top - el.offsetHeight * 0.3 };
      }).sort(function (a, b) { return a.need - b.need; });
      secs = $$('.r-sec', paper).map(function (el) { return { el: el, F: H - offTop(el), age: -1 }; });
    }

    function map(s) {
      if (s <= 0) return keys[0].F;
      for (var i = 1; i < keys.length; i++) {
        var a = keys[i - 1], b = keys[i];
        if (s <= b.s) {
          var t = b.s === a.s ? 1 : (s - a.s) / (b.s - a.s);
          return a.F + (b.F - a.F) * t;
        }
      }
      return keys[keys.length - 1].F;
    }
    function scrollFor(idx) {
      if (idx <= 0) return 0;
      var k = keys[2 * idx - 1];
      return Math.round(k.s + (idx < stops.length - 1 ? D * 0.2 : 0));
    }
    function stopIndexFor(el) {
      for (var i = 0; i < stopEls.length; i++) {
        var s = stopEls[i];
        if (s === el || s.contains(el) || (el.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)) return i;
      }
      return stopEls.length - 1;
    }

    /* list growth feeds the paper instead of pulling it back in */
    engine.grow = function (fn) {
      var h0 = paper.offsetHeight;
      fn();
      var dh = paper.offsetHeight - h0;
      measure();
      if (dh) {
        fed += dh; prevFed += dh;
        if (lock !== null) { lock += dh; lockScroll += dh; }
        else window.scrollBy(0, dh);
        target = fed;
        printingUntil = performance.now() + 220;
      }
    };
    engine.print = function (el) {
      var L = lines.filter(function (x) { return x.el === el; })[0];
      if (L) L.done = true;
      printLine(el);
    };
    engine.active = true;

    function printLine(el) {
      if (el.classList.contains('on')) return;
      var big = el.classList.contains('ln-big');
      var n = clamp((el.textContent || '').replace(/\s+/g, ' ').trim().length, 4, 44);
      var dur = big ? 440 : Math.round(clamp(110 + n * 10, 140, 480));
      el.style.setProperty('--n', big ? 10 : n);
      el.style.setProperty('--d', dur + 'ms');
      el.classList.add('on');
      if (big) angV += (Math.random() < 0.5 ? -1 : 1) * (el.closest('.r-total') ? 1.6 : 0.7); // heavy lines jolt the paper
      printingUntil = Math.max(printingUntil, performance.now() + dur);
      setTimeout(function () { el.classList.add('done'); }, dur + 420);
    }

    function setNav(idx) {
      // map stop index to nav link: supplies=1, how=2, who=3, contact=end
      var n = idx === 1 ? 0 : idx === 2 ? 1 : idx === 3 ? 2 : idx >= stopEls.length - 1 ? 3 : -1;
      if (n === currentNav) return;
      currentNav = n;
      navLinks.forEach(function (a, i) {
        if (i === n) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }

    /* ---------- the loop ---------- */
    function frame(now) {
      try { step(now); } catch (err) {
        if (window.console) console.error(err);
        root.classList.remove('feed-on');
        return;
      }
      requestAnimationFrame(frame);
    }

    function step(now) {
      var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
      if (!started || torn) return;

      target = lock !== null ? lock : map(window.scrollY);
      var d = target - fed;
      var k = intro ? 0.075 : 0.2;
      var maxV = intro ? (target > 900 ? 70 : 11) : 110;
      if (Math.abs(d) < 0.25) fed = target;
      else fed += clamp(d * k, -maxV, maxV);
      if (intro && Math.abs(target - fed) < 1.5) intro = false;

      var v = fed - prevFed; prevFed = fed;
      if (Math.abs(v) > 0.4) printingUntil = Math.max(printingUntil, now + 90);

      // hanging paper: a damped spring with a little idle sway
      angV += (-ang * 30 - angV * 5.2) * dt;
      angV += (Math.random() - 0.5) * Math.min(Math.abs(v), 30) * 0.02;
      ang = clamp(ang + angV * dt, -1.6, 1.6);
      var sway = Math.sin(now / 1900) * 0.07;

      var printing = now < printingUntil;
      var jit = printing ? (Math.random() - 0.5) * 0.7 : 0;
      sheet.style.transformOrigin = '50% ' + (H - fed).toFixed(1) + 'px';
      sheet.style.transform = 'translate3d(-50%,' + (fed - H + jit).toFixed(2) + 'px,0) rotate(' + (ang + sway).toFixed(3) + 'deg)';

      // lines print as they clear the head
      for (var i = 0; i < lines.length; i++) {
        var L = lines[i];
        if (L.need > fed + 1) break;
        if (!L.done) { L.done = true; if (!L.el.classList.contains('on')) queue.push(L.el); }
      }
      if (queue.length && now >= nextAt) {
        var burst = queue.length > 6 ? 3 : 1;
        for (var b = 0; b < burst && queue.length; b++) printLine(queue.shift());
        nextAt = now + (queue.length > 6 ? 12 : 64);
      }

      if (printing !== printingState) {
        printingState = printing;
        root.classList.toggle('printing', printing);
      }
      if (printing) lcdBusyUntil = now + 380;

      // thermal fade: the further from the head, the greyer
      for (var j = 0; j < secs.length; j++) {
        var S = secs[j];
        var dist = fed - S.F;
        var age = Math.round(clamp((dist - vh * 0.55) / (vh * 1.1), 0, 1) * 25) / 25;
        if (age !== S.age) { S.age = age; S.el.style.setProperty('--age', age); }
      }

      // which stop are we at
      var at = 0;
      for (var s = 0; s < stops.length; s++) if (fed >= stops[s] - 60) at = s;
      setNav(at);

      if (odo) {
        var m = (fed * 0.0002646).toFixed(2);
        if (odo.textContent !== m) odo.textContent = m;
      }

      // LCD
      if (now > lcdHoldUntil) {
        var atEnd = fed >= H - 40;
        if (now < lcdBusyUntil) lcdSet('PRINTING', true);
        else if (atEnd) lcdSet('DRAG TO TEAR');
        else if (items.length) lcdSet(countText().toUpperCase() + ' LISTED');
        else if (window.scrollY < 30) lcdSet('SCROLL TO PRINT');
        else lcdSet('READY');
      }
    }

    /* ---------- navigation ---------- */
    navLinks.concat($$('.pr-logo')).forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href').slice(1);
        var el = document.getElementById(id);
        if (!el || !paper.contains(el)) return;
        e.preventDefault();
        window.scrollTo({ top: scrollFor(stopIndexFor(el)), behavior: 'smooth' });
      });
    });

    // keyboard focus inside the receipt: feed that part out first
    paper.addEventListener('focusin', function (e) {
      feedEl.scrollTop = 0;
      if (torn) return;
      if (coarse && e.target === input) {
        // keep the paper still while the on-screen keyboard is up
        lockScroll = window.scrollY;
        var below = fed - H + offTop(form); // px from the slot to the input
        lock = below > vh * 0.3 ? fed - (below - vh * 0.22) : fed;
        return;
      }
      var L = lines.filter(function (x) { return x.el.contains(e.target) || x.el === e.target; })[0];
      if (L && L.need > fed) {
        window.scrollTo({ top: scrollFor(stopIndexFor(e.target)), behavior: 'smooth' });
      }
    });
    input.addEventListener('blur', function () {
      if (lock === null) return;
      lock = null;
      window.scrollTo(0, lockScroll);
    });

    // move the mouse across the paper and it swings a little
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || torn || drag) return;
      if (e.clientY < slotY) return;
      var cx = window.innerWidth / 2, half = paper.offsetWidth / 2 + 90;
      if (Math.abs(e.clientX - cx) > half) return;
      var lever = clamp((e.clientY - slotY) / vh, 0.1, 1);
      angV -= clamp(e.movementX || 0, -40, 40) * 0.09 * lever;
    }, { passive: true });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (lock !== null || torn) return;
        measure();
      }, 120);
    });
    if ('ResizeObserver' in window) {
      var lastH = 0;
      new ResizeObserver(function () {
        var h = paper.offsetHeight;
        if (h !== lastH && started && !torn) { lastH = h; measure(); }
        else lastH = h;
      }).observe(paper);
    }

    /* ---------- tear it off ---------- */
    var drag = null, stub = null, fallRaf = 0;

    function tearLineY() { return offTop(tearEl) + tearEl.offsetHeight / 2; }

    function jagged(y, w) { // a torn edge across the paper at local y
      var pts = [], n = 26;
      for (var i = 0; i <= n; i++) {
        var x = (i / n) * 100;
        var j = (i % 2 ? 1 : -1) * (2 + Math.random() * 4) + (Math.random() - 0.5) * 3;
        pts.push(x.toFixed(2) + '% ' + (y + j).toFixed(1) + 'px');
      }
      return pts;
    }

    function beginSplit() {
      var yT = tearLineY();
      var edge = jagged(yT);
      // main piece: everything below the tear
      paper.style.clipPath = 'polygon(' + edge.join(',') + ',100% 100%,0 100%)';
      sheet.querySelector('.p-shadow').style.opacity = '0';
      // stub: what stays in the printer
      var visible = fed - H + yT;
      stub = document.createElement('div');
      stub.className = 'stub';
      stub.style.height = Math.max(0, visible + 8) + 'px';
      var stubEdge = edge.map(function (p) {
        var parts = p.split(' ');
        return parts[0] + ' ' + (parseFloat(parts[1]) - (H - fed)).toFixed(1) + 'px';
      });
      stub.style.clipPath = 'polygon(0 0,100% 0,' + stubEdge.slice().reverse().join(',') + ')';
      feedEl.appendChild(stub);
      return { yT: yT };
    }
    function endSplit() {
      paper.style.clipPath = '';
      sheet.querySelector('.p-shadow').style.opacity = '';
      if (stub) { stub.remove(); stub = null; }
    }

    function pullTransform(dx, dy) {
      var p = clamp(Math.hypot(dx, Math.max(0, dy)) / 150, 0, 1);
      var dir = dx >= 0 ? 1 : -1;
      var yT = drag.yT;
      var ox = dir > 0 ? 0 : 100;
      sheet.style.transformOrigin = ox + '% ' + yT + 'px';
      var rot = dir * p * 5 + ang;
      drag.tx = dx * 0.18;
      drag.ty = fed - H + Math.max(0, dy) * 0.25 + p * 6;
      drag.rot = rot;
      sheet.style.transform = 'translate3d(calc(-50% + ' + drag.tx.toFixed(1) + 'px),' +
        drag.ty.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
      return p;
    }

    tearEl.addEventListener('pointerdown', function (e) {
      if (torn || drag || !started) return;
      if (fed < H - 80) return;
      e.preventDefault();
      try { tearEl.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
      torn = true; // freeze the feed loop while we hold it
      var s = beginSplit();
      drag = { x0: e.clientX, y0: e.clientY, yT: s.yT, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0, p: 0 };
      lcdSet('TEARING');
    });
    tearEl.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var t = performance.now(), dtm = Math.max(1, t - drag.lt);
      drag.vx = (e.clientX - drag.lx) / dtm * 1000; drag.vy = (e.clientY - drag.ly) / dtm * 1000;
      drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = t;
      drag.p = pullTransform(e.clientX - drag.x0, e.clientY - drag.y0);
      if (drag.p >= 1) release(true);
    });
    function onUp() { if (drag) release(drag.p > 0.55); }
    tearEl.addEventListener('pointerup', onUp);
    tearEl.addEventListener('pointercancel', function () { if (drag) release(false); });
    tearEl.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && !torn && started) {
        e.preventDefault();
        if (fed < H - 80) { window.scrollTo({ top: scrollFor(stopEls.length - 1), behavior: 'smooth' }); return; }
        torn = true;
        var s = beginSplit();
        drag = { x0: 0, y0: 0, yT: s.yT, vx: 420, vy: 320, p: 1 };
        pullTransform(60, 40);
        release(true);
      }
    });

    function release(rip) {
      var dr = drag; drag = null;
      if (!rip) {
        // spring back into place
        sheet.style.transition = 'transform .35s cubic-bezier(.2,1.6,.4,1)';
        sheet.style.transformOrigin = '50% ' + (H - fed) + 'px';
        sheet.style.transform = 'translate3d(-50%,' + (fed - H) + 'px,0) rotate(0deg)';
        setTimeout(function () { sheet.style.transition = ''; endSplit(); torn = false; }, 360);
        return;
      }
      fall(dr);
    }

    function fall(dr) {
      lcdSet('THANK YOU');
      lcdHoldUntil = performance.now() + 3200;
      root.classList.remove('printing'); printingState = false;
      var dir = (dr.vx || 1) >= 0 ? 1 : -1;
      var x = dr.tx || 0, y = 0;
      var baseY = dr.ty != null ? dr.ty : fed - H;
      var rot = dr.rot || 0;
      var vx = clamp(dr.vx * 0.35, -700, 700) || dir * 160;
      var vy = clamp(dr.vy * 0.4, -200, 900) + 120;
      var vr = dir * (26 + Math.random() * 20);
      var t0 = performance.now(), last = t0;
      var ox = dir > 0 ? 0 : 100;
      sheet.style.transformOrigin = ox + '% ' + dr.yT + 'px';
      // the stub gets pulled back in
      if (stub) {
        stub.style.transition = 'transform .5s cubic-bezier(.5,0,.8,.4) .35s';
        stub.style.transform = 'translate(-50%, -100%)';
      }
      function tick(now) {
        var dt = Math.min(0.04, (now - last) / 1000); last = now;
        var t = (now - t0) / 1000;
        vy += 2600 * dt;
        vx *= 0.985;
        vx += Math.sin(t * 7) * 220 * dt;   // flutter
        vr += dir * 18 * dt;
        x += vx * dt; y += vy * dt; rot += vr * dt;
        sheet.style.transform = 'translate3d(calc(-50% + ' + x.toFixed(1) + 'px),' + (baseY + y).toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
        if (baseY + dr.yT + y < vh - slotY + 300 || t < 0.5) {
          if (t < 3) { fallRaf = requestAnimationFrame(tick); return; }
        }
        reprint();
      }
      fallRaf = requestAnimationFrame(tick);
    }

    function reprint() {
      endSplit();
      sheet.style.transition = '';
      // a fresh roll: blank paper, back to the top
      lines.forEach(function (L) { L.done = false; L.el.classList.remove('on', 'done'); });
      queue.length = 0;
      window.scrollTo(0, 0);
      fed = 0; prevFed = 0; ang = 0; angV = 0;
      sheet.style.transformOrigin = '50% ' + H + 'px';
      sheet.style.transform = 'translate3d(-50%,' + (-H) + 'px,0)';
      intro = true;
      torn = false;
      lcdHoldUntil = performance.now() + 1600;
    }

    /* ---------- start: fonts first, then feed the header out ---------- */
    function start() {
      if (started) return;
      measure();
      // honour a deep link like #contact
      var hash = (location.hash || '').slice(1);
      var el = hash && document.getElementById(hash);
      if (el && paper.contains(el)) {
        var st = scrollFor(stopIndexFor(el));
        window.scrollTo(0, st);
        setTimeout(function () { window.scrollTo(0, st); }, 60);
      } else if (window.scrollY > 0 && 'scrollRestoration' in history) {
        // keep restored position; the paper feeds straight to it
      }
      started = true;
      lcdSet('PRINTING', true);
      lcdHoldUntil = 0;
    }
    lcdSet('HELLO');
    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 1600); })]).then(function () {
      setTimeout(start, 250);
    });
    requestAnimationFrame(frame);
  }
})();
