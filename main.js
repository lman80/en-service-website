/* E&N Service Company — small, dependency-free behaviour:
   the hero ticket walks its four steps once, sections fade in, the nav
   gains a hairline once the page scrolls. Everything is readable without it. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- year in the footer */
  var year = document.querySelector('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---- nav hairline */
  var nav = document.querySelector('.nav');
  function onScroll() { if (nav) nav.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- the hero ticket: read -> matched -> carted -> quoted */
  var ticket = document.querySelector('.ticket');
  if (ticket) {
    var steps = ticket.querySelectorAll('.ticket-steps li');
    var status = ticket.querySelector('[data-status]');
    var price = ticket.querySelector('[data-price]');
    var words = ['Reading requisition', 'Matching the part', 'Checking the cart', 'Pricing delivered', 'Quoted'];
    var target = price ? parseFloat(price.textContent) : 0;

    function finish() {
      steps.forEach(function (li) { li.classList.add('is-on'); });
      if (status) status.textContent = words[words.length - 1];
      if (price) price.textContent = target.toFixed(2);
      ticket.classList.add('is-done');
    }
    function countUp() {
      if (!price) return;
      var start = null, dur = 900;
      function frame(t) {
        if (start === null) start = t;
        var k = Math.min(1, (t - start) / dur);
        var eased = 1 - Math.pow(1 - k, 3);
        price.textContent = (target * eased).toFixed(2);
        if (k < 1) window.requestAnimationFrame(frame);
      }
      window.requestAnimationFrame(frame);
    }
    function play() {
      if (reduce) { finish(); return; }
      if (price) price.textContent = '0.00';
      var i = 0;
      (function next() {
        if (i < steps.length) {
          steps[i].classList.add('is-on');
          if (status) status.textContent = words[i + 1] || words[i];
          if (i === steps.length - 1) countUp();
          i += 1;
          window.setTimeout(next, 700);
        } else {
          if (status) status.textContent = words[words.length - 1];
          ticket.classList.add('is-done');
        }
      })();
    }

    if ('IntersectionObserver' in window) {
      var seen = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !seen) { seen = true; window.setTimeout(play, 350); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(ticket);
    } else {
      finish();
    }
  }

  /* ---- gentle reveal for sections (never hides content without JS) */
  if (!reduce && 'IntersectionObserver' in window) {
    var blocks = document.querySelectorAll('.sec-head, .supply, .steps, .rule-list li, .where, .spec, .contact-inner');
    blocks.forEach(function (el) { el.classList.add('reveal'); });
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    blocks.forEach(function (el) { ro.observe(el); });
  }
})();
