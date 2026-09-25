/* E&N — page logic: scroll timeline, step/chip/word states, form, reveals.
   Works without the 3D module; the 3D module reads window.ENStory. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) root.classList.add('reduced');

  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var smooth = function (a, b, v) { var x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

  // Shared timing so chips tick exactly when their item lands in the box.
  var CFG = { dropStart: 0.26, dropGap: 0.125, dropDur: 0.2, items: 5 };

  var story = window.ENStory = {
    t: reduced ? 3.0 : 0,
    locals: [0, 0, 0, 0],
    cfg: CFG,
    reduced: reduced,
    stageOn: true,
    listeners: [],
    emit: function (name, data) { this.listeners.forEach(function (fn) { fn(name, data); }); },
    on: function (fn) { this.listeners.push(fn); }
  };

  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var words = Array.prototype.slice.call(document.querySelectorAll('.word'));
  var how = document.getElementById('how');
  var promise = document.getElementById('promise');
  var header = document.querySelector('.site-header');
  var who = document.getElementById('who');
  var footer = document.querySelector('.site-footer');
  var aboutText = document.getElementById('about-text');

  /* ---- About: split into words for the scroll highlight ---- */
  var aboutWords = [];
  if (aboutText && !reduced) {
    var txt = aboutText.textContent.trim().split(/\s+/);
    aboutText.innerHTML = txt.map(function (w) { return '<span class="w">' + w.replace(/&/g, '&amp;') + '</span>'; }).join(' ');
    aboutText.classList.add('split');
    aboutWords = Array.prototype.slice.call(aboutText.querySelectorAll('.w'));
  }

  function setOn(list, fn) {
    for (var i = 0; i < list.length; i++) {
      var s = fn(i);
      list[i].classList.toggle('on', s === 1);
      list[i].classList.toggle('done', s === 2);
    }
  }

  var ticking = false;
  var lastY = window.scrollY;
  function update() {
    ticking = false;
    var vh = window.innerHeight;
    var t = 0;
    var staticMode = reduced || root.classList.contains('no-story');
    if (staticMode) story.t = 3.0;
    if (!staticMode) {
      for (var i = 0; i < scenes.length; i++) {
        var r = scenes[i].getBoundingClientRect();
        var l = i === 0 ? clamp(-r.top / r.height, 0, 1) : clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
        story.locals[i] = l;
        t += l;
      }
      story.t = t;
    } else {
      t = story.t;
      story.locals = [1, 1, 1, 0];
    }

    var L1 = story.locals[1], L2 = story.locals[2], L3 = story.locals[3];

    // Supplies chips tick as items land
    for (var c = 0; c < chips.length; c++) {
      var landed = staticMode || L1 >= CFG.dropStart + c * CFG.dropGap + CFG.dropDur * 0.8;
      chips[c].classList.toggle('in', landed);
    }

    // Steps
    var active = L2 < 0.34 ? 0 : L2 < 0.67 ? 1 : 2;
    setOn(steps, function (i) { return staticMode ? 1 : i === active ? 1 : i < active ? 2 : 0; });
    if (how) how.style.setProperty('--how', staticMode ? 1 : L2.toFixed(4));

    // Promise words
    if (!staticMode) {
      var wOn = [L3 > 0.02, L3 > 0.34, L3 > 0.64];
      for (var w = 0; w < words.length; w++) words[w].classList.toggle('on', wOn[w]);
      var fast = smooth(0.66, 0.74, L3) * (1 - smooth(0.9, 0.98, L3));
      if (promise) promise.style.setProperty('--fast', fast.toFixed(3));
    }

    // Dark studio for the promise
    var dark = staticMode ? 0 : smooth(2.9, 3.02, t);
    root.style.setProperty('--night', dark.toFixed(3));

    // Stage visibility: off once the story has scrolled away
    var pr = promise ? promise.getBoundingClientRect() : null;
    var stageOn = staticMode || !pr || pr.bottom > 0;
    if (stageOn !== story.stageOn) {
      story.stageOn = stageOn;
      root.classList.toggle('stage-off', !stageOn);
    }

    // Header colour
    var onDark = false;
    if (dark > 0.5 && pr && pr.bottom > 40) onDark = true;
    if (who) { var wr = who.getBoundingClientRect(); if (wr.top < 40 && wr.bottom > 40) onDark = true; }
    if (footer) { var fr = footer.getBoundingClientRect(); if (fr.top < 40) onDark = true; }
    header.classList.toggle('on-dark', onDark);
    var sy = window.scrollY;
    header.classList.toggle('scrolled', sy > 40);
    if (Math.abs(sy - lastY) > 6) {
      header.classList.toggle('hide', sy > lastY && sy > 160);
      lastY = sy;
    }

    // About words
    if (aboutWords.length) {
      var ar = aboutText.getBoundingClientRect();
      var ap = clamp((vh * 0.82 - ar.top) / (ar.height + vh * 0.3), 0, 1);
      var lit = Math.round(ap * aboutWords.length);
      for (var k = 0; k < aboutWords.length; k++) aboutWords[k].classList.toggle('lit', k < lit);
    }
  }
  function requestUpdate() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  update();
  story.update = update;

  // If the 3D module never arrives (blocked CDN, old browser), collapse the scroll story.
  setTimeout(function () {
    if (!root.classList.contains('webgl') && !root.classList.contains('no-story')) {
      root.classList.add('no-story'); update();
    }
  }, 6000);

  /* ---- Mobile/desktop spotlight position ---- */
  function spot() { root.style.setProperty('--spot-x', window.innerWidth <= 860 ? '50%' : '72%'); }
  spot(); window.addEventListener('resize', spot);

  /* ---- Chip hover -> item hops in the box ---- */
  chips.forEach(function (chip) {
    var fire = function () { story.emit('item', +chip.getAttribute('data-item')); };
    chip.addEventListener('mouseenter', fire);
    chip.addEventListener('click', fire);
  });

  /* ---- Send your list: real mailto with the list in the body ---- */
  var form = document.getElementById('listform');
  var input = document.getElementById('list-input');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (input.value || '').trim();
      var href = 'mailto:enservicecompany@gmail.com?subject=' + encodeURIComponent('Quote request');
      if (v) href += '&body=' + encodeURIComponent(v.split(/\s*[,;\n]\s*/).filter(Boolean).join('\n'));
      story.emit('send');
      window.location.href = href;
    });
    var typeTimer = 0;
    input.addEventListener('input', function () {
      clearTimeout(typeTimer);
      typeTimer = setTimeout(function () { story.emit('type'); }, 60);
    });
  }

  /* ---- Reveals ---- */
  var revealEls = document.querySelectorAll('.who .wrap > *, .ticker, .about .eyebrow, .contact__title, .contact__lede, .biglink');
  if (!reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(revealEls, function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = ((i % 3) * 0.08) + 's';
      io.observe(el);
    });
    var wio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { who.classList.add('in'); wio.disconnect(); } });
    }, { threshold: 0.35 });
    if (who) wio.observe(who);
  } else if (who) {
    who.classList.add('in');
  }
})();
