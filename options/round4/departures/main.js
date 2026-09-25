/* E&N "Departures" — page behaviour. Depends on flap.js (window.Flap). */
(function () {
  'use strict';
  var F = window.Flap;
  if (!F) return;
  var reduced = F.reduced;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var GAP = 2;          // px between cells
  var SEG = 0.9;        // gap between board segments, in cell widths

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(d) { return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* Build a flap Line inside an element, keeping its text as the accessible name. */
  function mountLine(el, cols) {
    var text = el.textContent.trim();
    if (!el.hasAttribute('aria-hidden')) {
      el.setAttribute('role', 'text');
      el.setAttribute('aria-label', text);
    }
    el.classList.add('is-live');
    var line = new F.Block(el, cols, 1);
    line.source = text;
    return line;
  }

  function innerW(el) {
    var cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }
  function fitCw(width, cols, max, extraUnits) {
    var cw = (width - GAP * (cols - 1)) / (cols + (extraUnits || 0));
    return Math.max(6, Math.min(max, Math.floor(cw * 10) / 10));
  }

  /* ------------------------------------------------------------------ sound */
  var sound = { on: false, ctx: null, buf: null, last: 0 };
  function initAudio() {
    if (sound.ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ctx = new AC();
    var len = Math.floor(ctx.sampleRate * 0.03);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) {
      var t = i / len;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 6) + Math.sin(i * 0.9) * 0.25 * Math.pow(1 - t, 10);
    }
    sound.ctx = ctx; sound.buf = buf;
  }
  function click(n) {
    if (!sound.on || !sound.ctx) return;
    var now = performance.now();
    if (now - sound.last < 16) return;
    sound.last = now;
    var ctx = sound.ctx;
    var src = ctx.createBufferSource();
    src.buffer = sound.buf;
    src.playbackRate.value = 0.85 + Math.random() * 0.4;
    var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    var g = ctx.createGain(); g.gain.value = Math.min(0.32, 0.05 + n * 0.02);
    src.connect(hp); hp.connect(g); g.connect(ctx.destination);
    src.start();
  }
  F.onStep = click;
  var soundBox = $('#sound');
  if (soundBox) {
    soundBox.addEventListener('change', function () {
      sound.on = soundBox.checked;
      if (sound.on) { initAudio(); if (sound.ctx && sound.ctx.state === 'suspended') sound.ctx.resume(); }
      $('.sound-s').textContent = sound.on ? 'on' : 'off';
      document.documentElement.classList.toggle('sound-on', sound.on);
    });
  }

  /* ------------------------------------------------------------------ headline */
  var head = { el: $('[data-flap="headline"]'), cols: 0, lines: [] };
  head.phrases = head.el.getAttribute('data-lines').split('|');
  head.el.setAttribute('role', 'text');
  head.el.setAttribute('aria-label', head.el.textContent.trim());
  head.shown = false;
  function buildHeadline() {
    var w = head.el.parentElement.clientWidth;
    var cols = w >= 880 ? 22 : w >= 600 ? 17 : 10;
    var rows = F.wrap(head.phrases, cols);
    var cw = fitCw(w, cols, 64);
    head.el.style.setProperty('--cw', cw + 'px');
    if (cols === head.cols) return;
    head.cols = cols;
    head.el.textContent = '';
    head.el.classList.add('is-live');
    head.lines = rows.map(function () {
      var r = document.createElement('span');
      r.className = 'fl-row';
      head.el.appendChild(r);
      return new F.Line(r, cols);
    });
    head.rows = rows;
    if (head.shown) head.lines.forEach(function (l, i) { l.set(rows[i], { instant: true }); });
  }
  function showHeadline() {
    head.shown = true;
    head.lines.forEach(function (l, i) { l.set(head.rows[i], { delay: 260 + i * 150, stagger: 30, spin: 3 }); });
  }

  /* ------------------------------------------------------------------ clock */
  var clockEl = $('[data-flap="clock"]');
  var clock = null, lastClock = '';
  if (clockEl) {
    clockEl.textContent = '';
    clockEl.classList.add('is-live');
    clock = new F.Line(clockEl, 5);
    clockEl.style.setProperty('--cw', '13px');
  }
  function tickClock(first) {
    if (!clock) return;
    var t = hhmm(new Date());
    if (t !== lastClock) { lastClock = t; clock.set(t, { stagger: 40, delay: first ? 900 : 0 }); }
  }

  /* ------------------------------------------------------------------ board */
  var board = $('#board'), rowsEl = $('#rows');
  var MODES = {
    wide: { time: 5, op: 1, item: 20, qty: 4, dock: 2, status: 10 },
    mid: { time: 5, op: 0, item: 16, qty: 4, dock: 0, status: 10 },
    narrow: { time: 0, op: 0, item: 12, qty: 0, dock: 0, status: 10 }
  };
  var SEGS = ['time', 'op', 'item', 'qty', 'dock', 'status'];
  var ST_CLASS = { 'ON TIME': 'go', 'LOADING': 'amber', 'DEPARTED': 'dim', 'FINDING…': 'amber blink', 'QUOTED': 'amber', 'ON ITS WAY': 'go' };
  var SAMPLES = [
    ['30 A FUSE', '×12'], ['PAPER TOWELS (CASE)', '×4'], ['LED SHOP LIGHT 4 FT', '×6'], ['SAFETY GLASSES', '×24'],
    ['FAUCET CARTRIDGE', '×3'], ['HEX BOLTS', '×200'], ['PRINTER TONER', '×8'], ['WORK GLOVES', '×36'],
    ['HVAC FILTER', '×10'], ['EXTENSION CORD', '×5'], ['MOP BUCKET', '×2'], ['PADLOCK', '×15']
  ];
  var B = { mode: null, cw: 0, rows: [], samples: [], you: [], nextSample: 0, clock: 0, inView: true, seq: 0 };

  function newSample(status) {
    var s = SAMPLES[B.nextSample % SAMPLES.length];
    B.nextSample++;
    B.clock += (5 + 5 * Math.floor(Math.random() * 2)) * 60000;
    return { id: 's' + (++B.seq), time: hhmm(new Date(B.clock)), item: s[0], qty: s[1], dock: String(1 + Math.floor(Math.random() * 6)), status: status || 'ON TIME' };
  }
  function seedSamples() {
    var d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() - (d.getMinutes() % 5) - 20);
    B.clock = d.getTime();
    var st = ['DEPARTED', 'DEPARTED', 'LOADING', 'ON TIME', 'ON TIME', 'ON TIME', 'ON TIME', 'ON TIME', 'ON TIME'];
    st.forEach(function (s) { B.samples.push(newSample(s)); });
  }

  function boardMode() {
    var w = board.clientWidth - parseFloat(getComputedStyle(board).paddingLeft) * 2;
    return { w: w, mode: w >= 1000 ? 'wide' : w >= 600 ? 'mid' : 'narrow' };
  }

  function makeRow() {
    var li = document.createElement('li');
    li.className = 'row';
    var r = { el: li, segs: {}, pages: null, page: 0, data: null };
    var m = MODES[B.mode];
    var tag = document.createElement('span');
    tag.className = 'you-tag';
    tag.setAttribute('aria-hidden', 'true');
    li.appendChild(tag);
    SEGS.forEach(function (k) {
      if (!m[k]) return;
      var s = document.createElement('span');
      s.className = 'seg seg--' + k;
      s.setAttribute('aria-hidden', 'true');
      li.appendChild(s);
      if (k === 'op') {
        s.innerHTML = '<svg viewBox="0 0 866 606.34"><use href="#en-mark"/></svg>';
        r.segs.op = { el: s };
      } else {
        s.classList.add('fl');
        r.segs[k] = new F.Line(s, m[k]);
      }
    });
    var rm = document.createElement('a');
    rm.href = '#item';
    rm.className = 'rm';
    rm.innerHTML = '<span aria-hidden="true">×</span><span class="sr">Remove this item</span>';
    rm.tabIndex = -1;
    rm.addEventListener('click', function (e) {
      e.preventDefault();
      if (r.data && r.data.you) removeYou(r.data.id);
    });
    li.appendChild(rm);
    rowsEl.appendChild(li);
    return r;
  }

  function buildBoard() {
    var bm = boardMode();
    var m = MODES[bm.mode];
    var cells = 0, segs = 0;
    SEGS.forEach(function (k) { if (m[k] && k !== 'op') { cells += m[k]; segs++; } });
    var extra = SEG * (segs - 1) + (m.op ? 2 + SEG : 0);
    var cw = Math.min(30, Math.floor(((bm.w - GAP * (cells - segs)) / (cells + extra)) * 10) / 10);
    board.style.setProperty('--cw', cw + 'px');
    board.style.setProperty('--seg', (cw * SEG) + 'px');
    // column header widths
    $$('.bc', board).forEach(function (h) {
      var k = h.className.match(/bc--(\w+)/)[1];
      var n = m[k];
      h.hidden = !n;
      if (!n) return;
      h.style.width = k === 'op' ? (cw * 2) + 'px' : (n * cw + (n - 1) * GAP) + 'px';
    });
    if (bm.mode === B.mode) return;
    var first = !B.mode;
    B.mode = bm.mode;
    rowsEl.textContent = '';
    B.rows = [];
    if (first) { var n = displayList().n; while (B.rows.length < n) B.rows.push(makeRow()); }
    else renderBoard(true);
  }

  function displayList() {
    var base = 6;
    var n = Math.max(base, B.you.length + 3);
    return { n: n, list: B.you.concat(B.samples).slice(0, n) };
  }

  function renderBoard(instantAll, fromIntro) {
    var dl = displayList();
    while (B.rows.length < dl.n) B.rows.push(makeRow());
    while (B.rows.length > dl.n) { var gone = B.rows.pop(); gone.el.remove(); }
    var m = MODES[B.mode];
    B.rows.forEach(function (r, i) {
      var d = dl.list[i] || null;
      r.data = d;
      r.el.classList.toggle('is-you', !!(d && d.you));
      r.el.querySelector('.rm').tabIndex = d && d.you ? 0 : -1;
      var st = d ? d.status : '';
      if (r.segs.status) r.segs.status.el.className = 'seg seg--status fl is-live ' + (ST_CLASS[st] ? 'st-' + ST_CLASS[st].split(' ').join(' st-') : '');
      r.pages = d ? F.paginate(d.item, m.item) : [''];
      if (r.page >= r.pages.length) r.page = 0;
      var o = { delay: fromIntro ? 650 + i * 70 : i * 45, stagger: fromIntro ? 13 : 14, instant: instantAll && !fromIntro };
      if (r.segs.time) r.segs.time.set(d ? (d.you ? 'YOURS' : d.time) : '', o);
      if (r.segs.item) r.segs.item.set(r.pages[r.page] || '', o);
      if (r.segs.qty) r.segs.qty.set(d ? d.qty : '', { delay: o.delay, stagger: o.stagger, instant: o.instant, align: 'right' });
      if (r.segs.dock) r.segs.dock.set(d ? d.dock : '', { delay: o.delay, stagger: o.stagger, instant: o.instant, align: 'right' });
      if (r.segs.status) r.segs.status.set(st, o);
      r.el.setAttribute('aria-label', d ? [d.you ? 'Your item' : d.time, d.item.toLowerCase(), d.qty, d.dock ? 'dock ' + d.dock : '', st.toLowerCase()].filter(Boolean).join(', ') : 'Empty row');
    });
  }

  function pageRows() {
    B.rows.forEach(function (r) {
      if (!r.pages || r.pages.length < 2) return;
      r.page = (r.page + 1) % r.pages.length;
      r.segs.item.set(r.pages[r.page], { stagger: 16 });
    });
  }

  function boardTick() {
    if (!B.inView || document.hidden) return;
    var departed = B.samples.filter(function (s) { return s.status === 'DEPARTED'; }).length;
    if (departed > 1) {
      B.samples.shift();
      B.samples.push(newSample('ON TIME'));
    } else {
      var s = B.samples.find(function (x) { return x.status === 'LOADING'; });
      if (s && Math.random() < 0.6) s.status = 'DEPARTED';
      else {
        s = B.samples.find(function (x) { return x.status === 'ON TIME'; });
        if (s) s.status = 'LOADING';
      }
    }
    renderBoard(false);
  }

  /* visitor rows */
  var countEl = $('#listCount'), noteEl = $('#sendNote');
  function parseItem(raw) {
    var t = raw.replace(/\s+/g, ' ').trim(), qty = '', m;
    // quantities only when written explicitly: "12 x hex bolts", "12× hex bolts", "hex bolts x12", "hex bolts × 12"
    if ((m = t.match(/^(\d{1,5})\s*[x×]\s*(.+)$/i))) { qty = m[1]; t = m[2]; }
    else if ((m = t.match(/^(.+?)\s*[x×]\s*(\d{1,5})$/i))) { qty = m[2]; t = m[1]; }
    return { item: t.trim(), qty: qty ? '×' + qty : '' };
  }
  function addYou(raw, silent) {
    raw = String(raw || '').trim();
    if (!raw) return false;
    var p = parseItem(raw);
    if (!p.item) return false;
    var now = new Date();
    var row = { id: 'y' + (++B.seq), you: true, raw: raw, time: hhmm(now), item: p.item, qty: p.qty, dock: String(1 + Math.floor(Math.random() * 6)), status: 'FINDING…' };
    B.you.push(row);
    renderBoard(false);
    updateCount();
    if (!silent) noteEl.textContent = 'Added: ' + raw + '.';
    var t1 = reduced ? 900 : 1900, t2 = reduced ? 1800 : 4200;
    setTimeout(function () { if (B.you.indexOf(row) > -1) { row.status = 'QUOTED'; renderBoard(false); } }, t1);
    setTimeout(function () { if (B.you.indexOf(row) > -1) { row.status = 'ON ITS WAY'; renderBoard(false); } }, t2);
    return true;
  }
  function removeYou(id) {
    B.you = B.you.filter(function (r) { return r.id !== id; });
    renderBoard(false);
    updateCount();
    noteEl.textContent = 'Removed.';
    $('#item').focus();
  }
  function updateCount() {
    var n = B.you.length;
    countEl.textContent = n;
    document.documentElement.classList.toggle('has-list', n > 0);
    countEl.parentElement.classList.remove('bump');
    void countEl.offsetWidth;
    countEl.parentElement.classList.add('bump');
  }
  $('#entry').addEventListener('submit', function (e) {
    e.preventDefault();
    var inp = $('#item');
    if (addYou(inp.value)) inp.value = '';
  });
  $('#send').addEventListener('click', function () {
    var lines = B.you.map(function (r) { return '- ' + (r.qty ? r.item + ' ' + r.qty : r.item); });
    var body = 'Hi E&N,\n\nPlease quote the following:\n\n' + (lines.length ? lines.join('\n') : '- ') + '\n\nThanks,\n';
    window.location.href = 'mailto:enservicecompany@gmail.com?subject=' + encodeURIComponent('Quote request') + '&body=' + encodeURIComponent(body);
    noteEl.textContent = lines.length ? 'Opening your email with ' + lines.length + (lines.length === 1 ? ' item.' : ' items.') : 'Opening your email.';
  });

  /* example items in Supplies */
  $$('#items a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      addYou(a.getAttribute('data-add'), true);
      a.classList.add('is-added');
      a.setAttribute('aria-label', a.getAttribute('data-add') + ', added to your list');
      noteEl.textContent = 'Added: ' + a.getAttribute('data-add') + '.';
      clearTimeout(a._t);
      a._t = setTimeout(function () { a.classList.remove('is-added'); }, 1800);
    });
  });

  /* ------------------------------------------------------------------ simple view-driven lines */
  var viewLines = [];
  $$('[data-flap="view"], [data-flap="word"], [data-flap="blind"]').forEach(function (el) {
    var cols = +el.getAttribute('data-cols');
    var l = mountLine(el, cols);
    l.kind = el.getAttribute('data-flap');
    l.shown = false;
    viewLines.push(l);
  });
  function sizeViewLines() {
    var dest = $('#dest');
    var destNarrow = dest && $('.dest-rows', dest).clientWidth < 600;
    viewLines.forEach(function (l) {
      var el = l.el, host = el.parentElement, max = 40;
      if (l.kind === 'blind') {
        var nb = innerW(host) < 560;
        l.build(nb ? 13 : 20, nb ? 2 : 1);
      }
      if (el.classList.contains('fl--gate')) {
        var ng = innerW(host) < 480;
        l.build(ng ? 9 : 14, ng ? 2 : 1);
      }
      if (el.classList.contains('fl--dest') && !el.classList.contains('fl--rm')) l.build(destNarrow ? 12 : 19, destNarrow ? 2 : 1);
      if (l.kind === 'word') max = 118;
      if (el.classList.contains('fl--gate')) max = 60;
      if (el.classList.contains('fl--blind')) max = 66;
      if (el.classList.contains('fl--desk')) max = 44;
      if (el.classList.contains('fl--dest')) return;
      el.style.setProperty('--cw', fitCw(innerW(host), l.cols, max) + 'px');
    });
    // destination board: name + operator (+ remarks when wide) share one cell size
    if (dest) {
      var w = $('.dest-rows', dest).clientWidth;
      dest.classList.toggle('is-narrow', destNarrow);
      var nc = destNarrow ? 12 : 19;
      var cells = destNarrow ? 12 : 33, extra = destNarrow ? (2 + SEG) : (2 + SEG * 2);
      var cw = Math.min(32, Math.floor(((w - GAP * (cells - (destNarrow ? 1 : 2))) / (cells + extra)) * 10) / 10);
      dest.style.setProperty('--cw', cw + 'px');
      dest.style.setProperty('--seg', (cw * SEG) + 'px');
      $('.dc--to', dest).style.width = (nc * cw + (nc - 1) * GAP) + 'px';
      $('.dc--op', dest).style.width = (2 * cw) + 'px';
    }
  }
  function showLine(l, delay) {
    if (l.shown) return;
    l.shown = true;
    var text = l.source;
    if (l.kind === 'word') l.set(text, { delay: delay || 0, stagger: 55, spin: 4 });
    else l.set(text, { delay: delay || 0, stagger: 28, spin: 2 });
  }

  /* blind: cycling example items */
  var blind = viewLines.find(function (l) { return l.kind === 'blind'; });
  var blindItems = ['LED SHOP LIGHT 4 FT', 'FAUCET CARTRIDGE', 'PAPER TOWELS (CASE)', '30 A FUSE', 'SAFETY GLASSES', 'HEX BOLTS', 'EXTENSION CORD', 'MOP BUCKET', 'PRINTER TONER', 'WORK GLOVES', 'HVAC FILTER', 'PADLOCK'];
  var blindI = 0, blindInView = false;

  /* remarks paging on destinations */
  var remarks = $$('.drow').map(function (row) {
    var l = viewLines.find(function (x) { return x.el === $('.fl--rm', row); });
    return { line: l, pages: row.getAttribute('data-rm').split('|'), i: 0 };
  });

  /* ------------------------------------------------------------------ observers */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var t = en.target;
      if (t === board) { B.inView = en.isIntersecting; return; }
      if (t.classList.contains('blind')) { blindInView = en.isIntersecting; if (blindInView && blind) showLine(blind, 150); return; }
      if (!en.isIntersecting) return;
      if (t.classList.contains('words')) {
        $$('.fl--word', t).forEach(function (el, i) { showLine(viewLines.find(function (l) { return l.el === el; }), i * 260); });
        io.unobserve(t);
      } else if (t.classList.contains('drow')) {
        var idx = $$('.drow').indexOf(t);
        $$('.fl', t).forEach(function (el, j) { showLine(viewLines.find(function (l) { return l.el === el; }), (idx % 4) * 90 + j * 220); });
        io.unobserve(t);
      } else if (t.classList.contains('desk-link--tel')) {
        showLine(viewLines.find(function (l) { return l.el === $('.fl', t); }), 150);
        io.unobserve(t);
      }
    });
  }, { threshold: 0.35 });

  /* gates: labels flip in as the runner reaches each stop */
  var line = $('#line'), fill = $('#trackFill'), runner = $('#runner');
  var gates = $$('.gate');
  var gateLines = gates.map(function (g) { var el = $('.fl', g); return viewLines.find(function (l) { return l.el === el; }); });
  var lastP = -1;
  function onScroll() {
    if (!line) return;
    var r = line.getBoundingClientRect(), vh = window.innerHeight;
    var p = clamp((vh * 0.62 - r.top - gates[0].offsetTop) / (r.height * 0.62), 0, 1);
    if (reduced) p = 1;
    if (Math.abs(p - lastP) < 0.001) return;
    lastP = p;
    var vertical = getComputedStyle(line).getPropertyValue('--vertical').trim() === '1';
    var track = $('.track', line);
    var len = vertical ? track.clientHeight : track.clientWidth;
    fill.style.transform = vertical ? 'scaleY(' + p + ')' : 'scaleX(' + p + ')';
    runner.style.transform = vertical ? 'translate3d(0,' + (p * len) + 'px,0)' : 'translate3d(' + (p * len) + 'px,0,0)';
    gates.forEach(function (g, i) {
      var reached = p >= i / 2 - 0.001 && p > 0.02 || (i === 0 && p > 0);
      g.classList.toggle('is-reached', reached);
      if (reached) showLine(gateLines[i], 60);
    });
  }

  /* ------------------------------------------------------------------ init */
  function layout() {
    var inp = $('#item');
    inp.placeholder = window.innerWidth < 560 ? 'Type an item' : 'Type an item, press Enter';
    buildHeadline();
    buildBoard();
    sizeViewLines();
    if (line) {
      var tr = $('.track', line);
      var c0 = gates[0].offsetTop + gates[0].offsetHeight / 2, c2 = gates[2].offsetTop + gates[2].offsetHeight / 2;
      tr.style.setProperty('--track-top', c0 + 'px');
      tr.style.setProperty('--track-h', (c2 - c0) + 'px');
    }
    lastP = -1;
    onScroll();
  }

  rowsEl.textContent = '';
  seedSamples();
  layout();
  renderBoard(false, true);
  showHeadline();
  tickClock(true);
  setInterval(tickClock, 1000);

  io.observe(board);
  var bl = $('.blind'); if (bl) io.observe(bl);
  var words = $('.words'); if (words) io.observe(words);
  $$('.drow').forEach(function (d) { io.observe(d); });
  var tel = $('.desk-link--tel'); if (tel) io.observe(tel);

  if (reduced) viewLines.forEach(function (l) { l.shown = true; l.set(l.source, { instant: true }); });

  setInterval(boardTick, 3400);
  setInterval(pageRows, 3000);
  setInterval(function () {
    if (!blind) return;
    if (!blind.shown) { if (blindInView) { showLine(blind, 100); } return; }
    if (!blindInView || document.hidden) return;
    blindI = (blindI + 1) % blindItems.length;
    blind.set(blindItems[blindI], { stagger: 24 });
  }, 2600);
  setInterval(function () {
    if (document.hidden) return;
    remarks.forEach(function (r, i) {
      if (!r.line || !r.line.shown || r.pages.length < 2) return;
      r.i = (r.i + 1) % r.pages.length;
      r.line.set(r.pages[r.i], { delay: i * 120, stagger: 22 });
    });
  }, 4200);

  // touch the board: flaps under the pointer (and their neighbours) give a quick re-spin
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    $$('.headline, .words, .gates, .blind').forEach(function (zone) {
      zone.addEventListener('pointerover', function (e) {
        var c = e.target.closest && e.target.closest('.c');
        if (!c || !c.__cell) return;
        c.__cell.nudge(0);
        var p = c.previousElementSibling, n = c.nextElementSibling;
        if (p && p.__cell) p.__cell.nudge(70);
        if (n && n.__cell) n.__cell.nudge(70);
      });
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  var rt;
  window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);

  // debug hook for screenshots
  window.__board = { add: addYou, B: B };
})();
