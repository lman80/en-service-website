/* Split-flap engine for the E&N "Departures" board.
   Each cell has four halves: a static top (next char), a static bottom (current char),
   a falling top flap (current char) and a dropping bottom flap (next char).
   One rAF loop drives every cell (inline 2D transforms, no per-cell compositing). */
(function () {
  'use strict';

  var DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:'-/()&×·…@#+!?";
  var N = DRUM.length;
  var HALF = 34;                 // ms per half flip
  var GAP_MS = 6;                // pause between steps
  var STEP = HALF * 2 + GAP_MS;  // ms per full character step
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Flaps are driven from one rAF loop with 2D scaleY transforms set inline.
  // (No WAAPI / 3D here on purpose: hundreds of concurrently composited layers cost far more
  //  than repainting a few small rects, and at ~35 ms per half-flip the eye can't tell.)
  function easeIn(t) { return t * t; }
  function easeOut(t) { var u = 1 - t; return 1 - u * u * u; }

  var active = new Set();
  var running = false;
  var api = { DRUM: DRUM, reduced: reduced, onStep: null, STEP: STEP };

  function norm(ch) {
    if (ch == null || ch === '') return ' ';
    var u = ch.toUpperCase();
    if (u === 'X' && ch === '×') return '×';
    return u;
  }

  function Cell() {
    var el = document.createElement('span');
    el.className = 'c';
    el.setAttribute('aria-hidden', 'true');
    var parts = ['h t', 'h b', 'h t f1', 'h b f2'];
    var inner = [];
    for (var i = 0; i < 4; i++) {
      var h = document.createElement('span');
      h.className = parts[i];
      var s = document.createElement('i');
      s.textContent = ' ';
      h.appendChild(s);
      el.appendChild(h);
      inner.push(s);
      if (i === 2) this.f1 = h;
      if (i === 3) this.f2 = h;
    }
    this.el = el;
    el.__cell = this;
    this.tI = inner[0]; this.bI = inner[1]; this.f1I = inner[2]; this.f2I = inner[3];
    this.cur = ' ';
    this.queue = [];
    this.next = 0;
    this.bPending = false;
    this.moving = false;
    this.ts = 0;
  }

  Cell.prototype.instant = function (ch) {
    ch = norm(ch);
    this.queue.length = 0;
    active.delete(this);
    this.moving = false;
    this.f1.style.transform = ''; this.f2.style.transform = '';
    this.f1.style.removeProperty('--sh'); this.f2.style.removeProperty('--sh');
    this.cur = ch;
    this.bPending = false;
    this.tI.textContent = ch; this.bI.textContent = ch; this.f1I.textContent = ch; this.f2I.textContent = ch;
  };

  Cell.prototype.flipTo = function (ch, delay, spin) {
    ch = norm(ch);
    if (reduced) { this.instant(ch); return; }
    if (ch === this.cur && !this.queue.length && (!spin || ch === ' ')) return;
    var ti = DRUM.indexOf(ch);
    var k = (spin || 2) + Math.floor(Math.random() * 5);
    var q = [];
    if (ti < 0) {
      for (var j = 0; j < k; j++) q.push(DRUM.charAt(1 + Math.floor(Math.random() * 26)));
    } else if (ti === 0) {
      // clearing a flap: one or two letters roll past, then blank
      var kk = 1 + Math.floor(Math.random() * 2);
      for (var m = 0; m < kk; m++) q.push(DRUM.charAt(1 + Math.floor(Math.random() * 26)));
    } else {
      for (var i = k; i > 0; i--) q.push(DRUM.charAt(((ti - i) % N + N) % N));
    }
    q.push(ch);
    var now = performance.now();
    this.queue = q;
    if (!active.has(this)) {
      this.next = now + (delay || 0);
      active.add(this);
    } else {
      this.next = Math.max(this.next, now + (delay || 0));
    }
    kick();
  };

  /* Re-spin a landed cell back onto its own character (used for hover ripples). */
  Cell.prototype.nudge = function (delay) {
    if (reduced || this.cur === ' ' || active.has(this)) return;
    this.flipTo(this.cur, delay, 1);
  };

  Cell.prototype.step = function (now) {
    var nxt = this.queue.shift();
    this.tI.textContent = nxt;
    this.f1I.textContent = this.cur;
    this.f2I.textContent = nxt;
    this.f1.style.transform = '';
    this.f2.style.transform = 'scaleY(0)';
    this.cur = nxt;
    this.ts = now;
    this.moving = true;
  };

  Cell.prototype.frame = function (now) {
    var e = (now - this.ts) / HALF;
    if (e < 1) {
      this.f1.style.transform = 'scaleY(' + (1 - easeIn(e)).toFixed(3) + ')';
      this.f1.style.setProperty('--sh', (e * 0.4).toFixed(3));
      return false;
    }
    if (e < 2) {
      this.f1.style.transform = 'scaleY(0)';
      var k = easeOut(e - 1);
      this.f2.style.transform = 'scaleY(' + k.toFixed(3) + ')';
      this.f2.style.setProperty('--sh', ((1 - k) * 0.35).toFixed(3));
      return false;
    }
    // landed
    this.bI.textContent = this.cur;
    this.f1I.textContent = this.cur;
    this.f1.style.transform = ''; this.f2.style.transform = '';
    this.f1.style.removeProperty('--sh'); this.f2.style.removeProperty('--sh');
    this.moving = false;
    return true;
  };

  function loop(now) {
    var landed = 0;
    active.forEach(function (c) {
      if (c.moving) {
        if (!c.frame(now)) return;
        landed++;
        c.next = now + GAP_MS;
      }
      if (now < c.next) return;
      if (c.queue.length) { c.step(now); c.frame(now); }
      else active.delete(c);
    });
    if (landed && api.onStep) api.onStep(landed);
    if (active.size) requestAnimationFrame(loop);
    else running = false;
  }
  function kick() { if (!running) { running = true; requestAnimationFrame(loop); } }

  /* A Line is one row of N cells. */
  function Line(el, cols, opts) {
    opts = opts || {};
    this.el = el;
    this.cols = cols;
    this.cells = [];
    this.text = '';
    this.pages = null;
    this.page = 0;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < cols; i++) {
      var c = new Cell();
      this.cells.push(c);
      frag.appendChild(c.el);
    }
    el.appendChild(frag);
  }

  Line.prototype.set = function (text, o) {
    o = o || {};
    text = String(text || '').toUpperCase();
    if (text.length > this.cols) text = text.slice(0, this.cols);
    if (o.align === 'right') while (text.length < this.cols) text = ' ' + text;
    this.text = text;
    var delay = o.delay || 0, stagger = o.stagger == null ? 26 : o.stagger;
    for (var i = 0; i < this.cols; i++) {
      var ch = text.charAt(i) || ' ';
      if (o.instant || reduced) this.cells[i].instant(ch);
      else this.cells[i].flipTo(ch, delay + i * stagger + Math.random() * 30, o.spin);
    }
  };

  /* Split long text into word-wrapped pages that fit the column. */
  Line.prototype.paginate = function (text) {
    return api.paginate(text, this.cols);
  };

  function greedy(words, cols) {
    var pages = [], cur = '';
    words.forEach(function (w) {
      while (w.length > cols) { if (cur) { pages.push(cur); cur = ''; } pages.push(w.slice(0, cols)); w = w.slice(cols); }
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= cols) cur += ' ' + w;
      else { pages.push(cur); cur = w; }
    });
    if (cur) pages.push(cur);
    return pages;
  }
  // Word-wrap into the fewest pages, then balance them (no one-word orphans like "FT").
  api.paginate = function (text, cols) {
    text = String(text || '').toUpperCase().trim();
    if (text.length <= cols) return [text];
    var words = text.split(/\s+/);
    var best = greedy(words, cols), n = best.length;
    for (var L = Math.ceil(text.length / n); L < cols; L++) {
      var p = greedy(words, L);
      if (p.length === n) return p;
    }
    return best;
  };

  /* Wrap a phrase into rows of at most `cols` characters (for the headline). */
  api.wrap = function (phrases, cols) {
    var rows = [];
    phrases.forEach(function (p) { rows = rows.concat(api.paginate(p, cols)); });
    return rows;
  };


  /* A Block is one or more stacked Lines; text word-wraps across its rows. */
  function Block(el, cols, rows) {
    this.el = el;
    this.text = null;
    this.cols = 0; this.rows = 0;
    this.build(cols, rows || 1);
  }
  Block.prototype.build = function (cols, rows) {
    if (cols === this.cols && rows === this.rows) return false;
    this.cols = cols; this.rows = rows;
    this.el.textContent = '';
    this.el.classList.toggle('fl--multi', rows > 1);
    this.lines = [];
    if (rows === 1) this.lines.push(new Line(this.el, cols));
    else for (var i = 0; i < rows; i++) {
      var r = document.createElement('span');
      r.className = 'fl-row';
      this.el.appendChild(r);
      this.lines.push(new Line(r, cols));
    }
    if (this.text != null) this.set(this.text, { instant: true });
    return true;
  };
  Block.prototype.set = function (text, o) {
    o = o || {};
    this.text = text;
    var parts = this.rows === 1 ? [text] : api.wrap([text], this.cols);
    for (var i = 0; i < this.rows; i++) {
      var oo = {}; for (var k in o) oo[k] = o[k];
      oo.delay = (o.delay || 0) + i * 90;
      this.lines[i].set(parts[i] || '', oo);
    }
  };

  api.Line = Line;
  api.Block = Block;
  api.Cell = Cell;
  api.busy = function () { return active.size; };
  window.Flap = api;
})();
