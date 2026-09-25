/* E&N Playground — main script.
   1) Hero + Supplies share one Matter.js world, rendered on a sticky canvas
      that follows the scroll (the camera). The hero floor is a trapdoor.
   2) How it works: a scroll-scrubbed canvas scene (packed, taped, shipped).
   3) Our promise: three heavy word blocks in their own small world. */
(function () {
  "use strict";
  var M = window.Matter, ITEMS = window.EN_ITEMS, LOGO = window.EN_LOGO;
  if (!M || !ITEMS || !LOGO) return; // static page still reads fine

  var Engine = M.Engine, Bodies = M.Bodies, Body = M.Body, Composite = M.Composite,
      Constraint = M.Constraint, Query = M.Query, Events = M.Events, Sleeping = M.Sleeping;

  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(2, window.devicePixelRatio || 1);
  var C = ITEMS.colors;
  var DEF = {};
  ITEMS.list.forEach(function (d) { DEF[d.id] = d; });
  var LOGO_PATH = new Path2D(LOGO.PEB + LOGO.LET); // fill with "evenodd" = letters knocked out
  var STEP = 1000 / 60;
  var CAT_SOLID = 0x0001, CAT_ITEM = 0x0002, CAT_BOX = 0x0004, CAT_TEXT = 0x0008;
  var G_STEP = 0.001 * STEP * STEP; // px per step^2 at gravity 1

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeBack(t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function bounce(t) {
    var n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  }
  function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
  function interactiveTarget(t) {
    return t && t.closest && t.closest("a, button, input, label, select, textarea, summary, fieldset");
  }

  /* ------------------------------------------------------------------ */
  /* sprites                                                            */
  /* ------------------------------------------------------------------ */
  var spriteCache = {};
  function rasterSVG(svgStr, w, h, key) {
    if (spriteCache[key]) return spriteCache[key];
    spriteCache[key] = new Promise(function (res) {
      var img = new Image();
      img.onload = function () {
        var cw = Math.max(1, Math.round(w * DPR)), chh = Math.max(1, Math.round(h * DPR));
        var c = document.createElement("canvas"); c.width = cw; c.height = chh;
        c.getContext("2d").drawImage(img, 0, 0, cw, chh);
        var sh = document.createElement("canvas"); sh.width = cw; sh.height = chh;
        var sx = sh.getContext("2d");
        sx.drawImage(c, 0, 0);
        sx.globalCompositeOperation = "source-in";
        sx.fillStyle = "#1b1600";
        sx.fillRect(0, 0, cw, chh);
        res({ img: c, shadow: sh, w: w, h: h });
      };
      img.onerror = function () { res(null); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
    });
    return spriteCache[key];
  }
  function itemSprite(def, sc) {
    var k = sc * (def.scale || 1);
    return rasterSVG(def.svg, def.w * k, def.h * k, def.id + "@" + k.toFixed(3));
  }

  /* open cardboard box, stamped with the real logo. local coords 408 x 300,
     front face x 60..348, rim y 130, floor y 300 */
  var logoD = LOGO.PEB + LOGO.LET;
  var BOX_BACK =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 408 300" width="408" height="300">' +
    '<path d="M66 104H342L328 30H80Z" fill="' + C.kraft2 + '"/>' +
    '<path d="M80 30H328L330 40H78Z" fill="#c99356"/>' +
    '<rect x="60" y="100" width="288" height="34" fill="' + C.kraft3 + '"/>' +
    '<rect x="60" y="100" width="288" height="9" fill="#7a4f22"/>' +
    "</svg>";
  var BOX_FRONT =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 408 300" width="408" height="300">' +
    '<path d="M60 132V104L16 18V46Z" fill="' + C.kraft2 + '"/><path d="M16 18L22 16L62 100L60 104Z" fill="#c99356"/>' +
    '<path d="M348 132V104L392 18V46Z" fill="' + C.kraft2 + '"/><path d="M392 18L386 16L346 100L348 104Z" fill="#c99356"/>' +
    '<rect x="60" y="130" width="288" height="170" fill="' + C.kraft + '"/>' +
    '<rect x="60" y="282" width="288" height="18" fill="' + C.kraft2 + '" opacity=".45"/>' +
    '<path d="M60 130H348L354 178H54Z" fill="#e6b77d"/>' +
    '<path d="M54 178H354L352 184H56Z" fill="' + C.kraft2 + '" opacity=".7"/>' +
    '<rect x="56" y="126" width="296" height="7" rx="3.5" fill="#edc58f"/>' +
    '<g transform="translate(204 240) rotate(-4) translate(-68 -47.6) scale(' + (136 / 866).toFixed(5) + ')">' +
    '<path fill="' + C.ink + '" fill-rule="evenodd" d="' + logoD + '"/></g>' +
    '<rect x="80" y="266" width="44" height="5" rx="2.5" fill="' + C.ink + '" opacity=".75"/>' +
    '<rect x="80" y="276" width="28" height="5" rx="2.5" fill="' + C.ink + '" opacity=".75"/>' +
    "</svg>";

  /* ------------------------------------------------------------------ */
  /* letters -> colliders                                               */
  /* ------------------------------------------------------------------ */
  function splitLetters(el) {
    var label = el.textContent.replace(/\s+/g, " ").trim();
    var chars = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/( )/).forEach(function (tok) {
            if (!tok) return;
            if (tok === " ") { frag.appendChild(document.createTextNode(" ")); return; }
            var w = document.createElement("span"); w.className = "w";
            Array.from(tok).forEach(function (c) {
              var s = document.createElement("span"); s.className = "ch"; s.textContent = c;
              w.appendChild(s);
              if (c.trim() && c !== " ") chars.push(s);
            });
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    })(el);
    var wrap = document.createElement("span"); wrap.setAttribute("aria-hidden", "true");
    while (el.firstChild) wrap.appendChild(el.firstChild);
    var sr = document.createElement("span"); sr.className = "sr-only"; sr.textContent = label;
    el.appendChild(sr); el.appendChild(wrap);
    return chars;
  }
  var mctx = document.createElement("canvas").getContext("2d");
  function glyphRects(el, chars, ox, oy) {
    var cs = getComputedStyle(el);
    var fs = parseFloat(cs.fontSize);
    mctx.font = cs.fontWeight + " " + fs + "px " + cs.fontFamily;
    var ref = mctx.measureText("Hg");
    var fa = ref.fontBoundingBoxAscent != null ? ref.fontBoundingBoxAscent : fs * 0.95;
    var fd = ref.fontBoundingBoxDescent != null ? ref.fontBoundingBoxDescent : fs * 0.25;
    return chars.map(function (sp) {
      var r = sp.getBoundingClientRect();
      var m = mctx.measureText(sp.textContent);
      var base = r.top + (r.height - (fa + fd)) / 2 + fa;
      var x0 = r.left - (m.actualBoundingBoxLeft || 0), x1 = r.left + (m.actualBoundingBoxRight || r.width);
      var y0 = base - (m.actualBoundingBoxAscent || fs * 0.7), y1 = base + (m.actualBoundingBoxDescent || 0);
      return { el: sp, x: x0 - ox, y: y0 - oy, w: Math.max(4, x1 - x0), h: Math.max(4, y1 - y0) };
    });
  }

  /* ------------------------------------------------------------------ */
  /* drag manager shared by the two worlds                              */
  /* ------------------------------------------------------------------ */
  var worlds = [];
  var drag = null; // {world, body, con, t0, x0, y0, cx, cy, moved}
  var hover = null;

  function pick(world, p) {
    var list = world.draggables();
    var hit = Query.point(list, p);
    if (hit.length) return hit[hit.length - 1];
    var best = null, bd = 1e9, tol = world.touchTol || 10;
    list.forEach(function (b) {
      var bb = b.bounds;
      if (p.x > bb.min.x - tol && p.x < bb.max.x + tol && p.y > bb.min.y - tol && p.y < bb.max.y + tol) {
        var d = Math.hypot(p.x - b.position.x, p.y - b.position.y);
        if (d < bd) { bd = d; best = b; }
      }
    });
    return best;
  }
  function findHit(cx, cy) {
    for (var i = 0; i < worlds.length; i++) {
      var w = worlds[i];
      if (!w.live) continue;
      var p = w.toWorld(cx, cy);
      if (!p) continue;
      var b = pick(w, p);
      if (b) return { world: w, body: b, p: p };
    }
    return null;
  }
  function startDrag(hit, cx, cy) {
    var b = hit.body, w = hit.world;
    Sleeping.set(b, false);
    // grab point in body-local coordinates; a spring force pulls it to the pointer
    var dx = hit.p.x - b.position.x, dy = hit.p.y - b.position.y, ca = Math.cos(-b.angle), sa = Math.sin(-b.angle);
    var con = { local: { x: dx * ca - dy * sa, y: dx * sa + dy * ca }, target: { x: hit.p.x, y: hit.p.y } };
    b.plugin.airWas = b.frictionAir;
    b.frictionAir = w.dragAir || 0.05;
    b.plugin.dragging = true;
    drag = { world: w, body: b, con: con, t0: performance.now(), x0: cx, y0: cy, cx: cx, cy: cy, moved: 0 };
    document.documentElement.classList.add("dragging");
    if (w.onGrab) w.onGrab(b);
  }
  function moveDrag(cx, cy) {
    if (!drag) return;
    drag.moved = Math.max(drag.moved, Math.hypot(cx - drag.x0, cy - drag.y0));
    drag.cx = cx; drag.cy = cy;
    var p = drag.world.toWorld(cx, cy, true);
    if (p) { drag.con.target.x = p.x; drag.con.target.y = p.y; }
  }
  function endDrag() {
    if (!drag) return;
    var d = drag, b = d.body; drag = null;
    b.frictionAir = b.plugin.airWas != null ? b.plugin.airWas : 0.012;
    b.plugin.dragging = false;
    var v = b.velocity, sp = Math.hypot(v.x, v.y), max = d.world.maxFling || 42;
    if (sp > max) Body.setVelocity(b, { x: v.x / sp * max, y: v.y / sp * max });
    Body.setAngularVelocity(b, clamp(b.angularVelocity, -0.35, 0.35));
    document.documentElement.classList.remove("dragging");
    var tap = performance.now() - d.t0 < 280 && d.moved < 9;
    if (tap && d.world.onTap) d.world.onTap(b);
  }
  // called before every physics step of a world
  function applyDrag(world) {
    if (!drag || drag.world !== world) return;
    var b = drag.body, c = drag.con, k = world.dragK || 0.22, damp = 0.55;
    var ca = Math.cos(b.angle), sa = Math.sin(b.angle);
    var gx = b.position.x + c.local.x * ca - c.local.y * sa, gy = b.position.y + c.local.x * sa + c.local.y * ca;
    var dx = c.target.x - gx, dy = c.target.y - gy;
    var ax = k * dx - damp * b.velocity.x, ay = k * dy - damp * b.velocity.y - 0.28; // cancel gravity
    var sc = b.mass / (STEP * STEP);
    Body.applyForce(b, { x: gx, y: gy }, { x: ax * sc, y: ay * sc });
    Body.setAngularVelocity(b, b.angularVelocity * 0.9);
    Sleeping.set(b, false);
  }
  function capSpeed(b, max) {
    var v = b.velocity, sp = Math.hypot(v.x, v.y);
    if (sp > max) Body.setVelocity(b, { x: v.x / sp * max, y: v.y / sp * max });
  }
  function setCursor(c) { document.documentElement.style.cursor = c || ""; }

  document.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "touch" || e.button !== 0) return;
    if (interactiveTarget(e.target)) return;
    var hit = findHit(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    startDrag(hit, e.clientX, e.clientY);
    setCursor("grabbing");
  }, true);
  document.addEventListener("mousedown", function (e) { if (drag) e.preventDefault(); }, true);
  window.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    if (drag) { moveDrag(e.clientX, e.clientY); return; }
    var hit = interactiveTarget(e.target) ? null : findHit(e.clientX, e.clientY);
    hover = hit ? hit.body : null;
    setCursor(hit ? "grab" : "");
  }, { passive: true });
  window.addEventListener("pointerup", function (e) {
    if (e.pointerType === "touch") return;
    if (drag) { endDrag(); var h = findHit(e.clientX, e.clientY); setCursor(h ? "grab" : ""); }
  });
  window.addEventListener("blur", endDrag);

  var touchId = null;
  document.addEventListener("touchstart", function (e) {
    if (drag || e.touches.length !== 1) return;
    if (interactiveTarget(e.target)) return;
    var t = e.touches[0];
    var hit = findHit(t.clientX, t.clientY);
    if (!hit) return;
    e.preventDefault();
    touchId = t.identifier;
    startDrag(hit, t.clientX, t.clientY);
  }, { passive: false });
  document.addEventListener("touchmove", function (e) {
    if (!drag || touchId == null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === touchId) { e.preventDefault(); moveDrag(t.clientX, t.clientY); }
    }
  }, { passive: false });
  function touchEnd(e) {
    if (touchId == null) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) { touchId = null; endDrag(); }
    }
  }
  document.addEventListener("touchend", touchEnd);
  document.addEventListener("touchcancel", touchEnd);
  window.addEventListener("scroll", function () { if (drag) moveDrag(drag.cx, drag.cy); }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* HERO + SUPPLIES world                                              */
  /* ------------------------------------------------------------------ */
  var H = {
    root: document.getElementById("world"),
    heroEl: document.getElementById("top"),
    supEl: document.getElementById("supplies"),
    canvas: document.getElementById("worldCanvas"),
    items: [], statics: [], letters: [], packed: [], pops: [],
    live: false, visible: true, raf: 0, trap: { a: 0, target: 0 }
  };
  H.ctx = H.canvas.getContext("2d");
  var headChars = splitLetters(document.getElementById("hl"));
  var supChars = splitLetters(document.getElementById("sup-h"));
  var ui = {
    count: document.getElementById("count"), n: document.getElementById("countN"),
    word: document.getElementById("countWord"), send: document.getElementById("send"),
    hint: document.getElementById("hint"), packer: document.getElementById("packer"),
    plist: document.getElementById("packerList")
  };
  var HINT0 = ui.hint.innerHTML;

  function scaleFor(w) { return w < 600 ? 0.58 : w < 900 ? 0.72 : w < 1250 ? 0.8 : w < 1700 ? 0.9 : 1; }

  H.toWorld = function (cx, cy) {
    var r = H.root.getBoundingClientRect();
    var x = cx - r.left, y = cy - r.top;
    if (x < 0 || x > r.width || y < -2000 || y > r.height) return null;
    return { x: x, y: y };
  };
  H.draggables = function () { return RM ? [] : H.items.filter(function (b) { return !b.plugin.pending; }); };
  H.maxFling = 44;

  function sizeCanvas() {
    var vw = H.root.clientWidth, vh = window.innerHeight;
    H.vw = vw; H.vh = vh;
    H.canvas.width = Math.round(vw * DPR); H.canvas.height = Math.round(vh * DPR);
    H.canvas.style.height = vh + "px"; H.canvas.style.marginBottom = -vh + "px";
  }

  function clearStatics() {
    H.statics.forEach(function (b) { Composite.remove(H.engine.world, b); });
    H.statics = []; H.letters = []; H.textBodies = [];
  }
  function addStatic(b) { H.statics.push(b); Composite.add(H.engine.world, b); return b; }

  function layoutStatics() {
    clearStatics();
    var rr = H.root.getBoundingClientRect();
    var W = H.W = H.root.clientWidth;
    var heroH = H.heroH = H.heroEl.offsetHeight;
    var supH = H.supEl.offsetHeight;
    var WH = H.WH = heroH + supH;
    var s = H.s;
    var FT = H.FT = Math.round(12 * Math.max(0.8, s));
    var floorY = H.floorY = heroH - FT;
    var wallOpt = { isStatic: true, friction: 0.2, label: "wall" };
    addStatic(Bodies.rectangle(-60, WH / 2 - 1500, 120, WH + 3000, wallOpt));
    addStatic(Bodies.rectangle(W + 60, WH / 2 - 1500, 120, WH + 3000, wallOpt));
    addStatic(Bodies.rectangle(W / 2, WH + 60, W + 400, 120, { isStatic: true, friction: 0.6, label: "ground" }));

    // box (outer front face = 288s wide, 170s tall) on a ledge at right
    var bs = H.bs = s * (W >= 1000 ? 1.2 : 1);
    var bw = 288 * bs, bh = 170 * bs, T = 14 * bs;
    var margin = W < 600 ? 14 : Math.max(40, W * 0.05);
    var bx = W - margin - bw - (W < 600 ? 0 : 20 * bs);
    H.box = { x: bx, w: bw, h: bh, T: T, rim: floorY - bh, inL: bx + T, inR: bx + bw - T, cx: bx + bw / 2 };
    var bopt = { isStatic: true, friction: 0.4, restitution: 0.1, label: "box", collisionFilter: { category: CAT_BOX } };
    addStatic(Bodies.rectangle(bx + T / 2, floorY - bh / 2, T, bh, bopt));
    addStatic(Bodies.rectangle(bx + bw - T / 2, floorY - bh / 2, T, bh, bopt));
    // side flaps: from (60,117) to (18,33) in local art coords
    var ox = bx - 60 * bs, oy = floorY - 300 * bs;
    var fl = 94 * bs, th = 8 * bs;
    addStatic(Bodies.rectangle(ox + 39 * bs, oy + 75 * bs, th, fl, { isStatic: true, angle: -0.4636, friction: 0.3, label: "box", collisionFilter: { category: CAT_BOX } }));
    addStatic(Bodies.rectangle(ox + 369 * bs, oy + 75 * bs, th, fl, { isStatic: true, angle: 0.4636, friction: 0.3, label: "box", collisionFilter: { category: CAT_BOX } }));
    H.box.ox = ox; H.box.oy = oy;
    // invisible sides that run from each flap tip down to the box's bottom corner,
    // so the pile leans on the box instead of sliding in under the flaps
    [[ox + 18 * bs, oy + 33 * bs, bx, floorY], [ox + 390 * bs, oy + 33 * bs, bx + bw, floorY]].forEach(function (l) {
      var mx = (l[0] + l[2]) / 2, my = (l[1] + l[3]) / 2, len = Math.hypot(l[2] - l[0], l[3] - l[1]);
      var ang = Math.atan2(l[3] - l[1], l[2] - l[0]) - Math.PI / 2;
      addStatic(Bodies.rectangle(mx, my, 6 * bs, len, { isStatic: true, angle: ang, friction: 0.3, label: "box", collisionFilter: { category: CAT_BOX } }));
    });

    // ledge under the box, trapdoor flaps for the rest
    var ledgeX = H.ledgeX = Math.max(W * 0.35, bx - 26 * bs);
    var FB = FT + 50; // physical thickness; only FT is drawn
    addStatic(Bodies.rectangle((ledgeX + W) / 2 + 30, floorY + FB / 2, W - ledgeX + 60, FB, { isStatic: true, friction: 0.6, label: "floor" }));
    var half = ledgeX / 2;
    H.flapL = addStatic(Bodies.rectangle(half / 2, floorY + FB / 2, half, FB, { isStatic: true, friction: 0.6, label: "floor" }));
    H.flapR = addStatic(Bodies.rectangle(half + half / 2, floorY + FB / 2, half, FB, { isStatic: true, friction: 0.6, label: "floor" }));
    H.FB = FB;
    H.flapLen = half;
    setFlaps();

    // headline + heading letters, and the text blocks
    var ox2 = rr.left, oy2 = rr.top;
    function addLetters(el, chars) {
      var minW = parseFloat(getComputedStyle(el).fontSize) * 0.36;
      glyphRects(el, chars, ox2, oy2).forEach(function (g) {
        var ins = 1;
        if (g.w < minW) { g.x -= (minW - g.w) / 2; g.w = minW; } // thin glyphs get a thicker collider
        var b = Bodies.rectangle(g.x + g.w / 2, g.y + g.h / 2, g.w - ins * 2, g.h - ins * 2, {
          isStatic: true, restitution: 0.45, friction: 0.25, label: "letter", collisionFilter: { category: CAT_TEXT },
          chamfer: { radius: Math.min(g.w, g.h) * 0.2 }
        });
        b.plugin = { el: g.el };
        H.letters.push(b); H.textBodies.push(b);
        addStatic(b);
      });
    }
    addLetters(document.getElementById("hl"), headChars);
    H.hlRight = 0;
    H.letters.forEach(function (b) { H.hlRight = Math.max(H.hlRight, b.bounds.max.x); });
    H.copyBottom = document.getElementById("hint").getBoundingClientRect().bottom - oy2;
    H.copyRight = Math.max(document.querySelector(".lede").getBoundingClientRect().right, document.querySelector(".cta").getBoundingClientRect().right) - ox2;
    addLetters(document.getElementById("sup-h"), supChars);
    Array.prototype.forEach.call(document.querySelectorAll("#world [data-collide]"), function (el) {
      var r = el.getBoundingClientRect();
      H.textBodies.push(addStatic(Bodies.rectangle(r.left - ox2 + r.width / 2, r.top - oy2 + r.height / 2, r.width, r.height, {
        isStatic: true, friction: 0.3, restitution: 0.2, chamfer: { radius: 8 }, label: "block", collisionFilter: { category: CAT_TEXT }
      })));
    });
  }

  function setFlaps() { // two floor doors slide apart from the middle
    var a = easeInOut(H.trap.a), L = H.flapLen, y = H.floorY + H.FB / 2;
    Body.setPosition(H.flapL, { x: L / 2 - a * (L + 4), y: y });
    Body.setPosition(H.flapR, { x: L * 1.5 + a * (L + 4), y: y });
  }

  function makeItemBody(def, x, y, s) {
    var sc = s * (def.scale || 1);
    var parts = def.parts.map(function (p) {
      if (p.t === "rect") {
        var ch = Array.isArray(p.ch) ? p.ch.map(function (v) { return v * sc; }) : (p.ch || 0) * sc;
        return Bodies.rectangle(x + (p.x + p.w / 2 - def.w / 2) * sc, y + (p.y + p.h / 2 - def.h / 2) * sc, p.w * sc, p.h * sc, { chamfer: { radius: ch } });
      }
      if (p.t === "circle") return Bodies.circle(x + (p.cx - def.w / 2) * sc, y + (p.cy - def.h / 2) * sc, p.r * sc);
      return Bodies.polygon(x + (p.cx - def.w / 2) * sc, y + (p.cy - def.h / 2) * sc, p.sides, p.r * sc);
    });
    var b = parts.length === 1 ? parts[0] : Body.create({ parts: parts });
    b.restitution = 0.28; b.friction = 0.45; b.frictionStatic = 0.7; b.frictionAir = 0.012;
    Body.setDensity(b, 0.0016);
    b.label = "item";
    b.collisionFilter.category = CAT_ITEM;
    b.plugin = { def: def, sc: sc, off: { x: x - b.position.x, y: y - b.position.y }, inBox: false, boxN: 0 };
    return b;
  }

  function spawnItems() {
    H.items.forEach(function (b) { if (!b.plugin.pending) Composite.remove(H.engine.world, b); });
    H.items = [];
    var s = H.s, W = H.W;
    // fewer bodies where there is less floor
    var drop = W >= 1700 ? [] : window.innerHeight < 820 || W < 1100 ? ["boltS", "cart", "nut", "tape"] : ["boltS", "cart"];
    var ids = W < 600 ? ITEMS.phoneSet : ITEMS.list.map(function (d) { return d.id; }).filter(function (id) { return drop.indexOf(id) < 0; });
    ids.forEach(function (id, i) {
      var b = makeItemBody(DEF[id], 0, 0, s);
      b.plugin.sprite = null;
      itemSprite(DEF[id], s).then(function (sp) { b.plugin.sprite = sp; });
      b.plugin.pending = true;
      H.items.push(b);
    });
    H.pending = [];
    rain(H.items, true);
  }

  // Items enter one by one. Wide screens: the open box pops them out and they
  // arc onto the floor between the copy and the box. Narrow screens: they appear
  // just under the copy and drop to the floor.
  H.pending = [];
  var ORDER = ["filter", "led", "towel", "toner", "glove", "boltL", "glasses", "lock", "cord", "fuse", "tape", "nut", "boltS", "cart"];
  function rain(list, first) {
    var W = H.W, s = H.s, now = performance.now();
    var wide = W >= 900;
    list = list.slice().sort(function (a, b) { return ORDER.indexOf(a.plugin.def.id) - ORDER.indexOf(b.plugin.def.id); });
    var xa = H.copyRight + 24, xb = H.box.ox - 10 * H.bs;
    list.forEach(function (b, i) {
      var bw = b.bounds.max.x - b.bounds.min.x, bh = b.bounds.max.y - b.bounds.min.y;
      if (!b.plugin.pending) Composite.remove(H.engine.world, b);
      b.plugin.pending = true;
      b.plugin.inBox = false; b.plugin.boxN = 0;
      var q = { b: b, t: now + (first ? 500 : 0) + i * (wide ? 150 : 150), a: ((i * 37) % 11 - 5) * 0.09 };
      if (wide) {
        var u = ((i * 0.618) + 0.1) % 1;
        var tx = clamp(xa + bw / 2 + u * (xb - xa - bw), bw / 2 + 4, xb - bw / 2);
        q.x = H.box.cx + ((i % 3) - 1) * 30 * H.bs; q.y = H.box.rim + 40 * H.bs;
        var ty = H.floorY - bh / 2 - 30 * s;
        var dx = tx - q.x, T = 46 + Math.abs(dx) / 11, dy = ty - q.y;
        q.vx = dx / T; q.vy = (dy - 0.5 * G_STEP * T * T) / T; q.T = T; q.burst = true;
      } else {
        var u2 = (i * 0.618) % 1, x1 = H.box.ox - 4;
        q.x = clamp(12 + bw / 2 + u2 * (x1 - 12 - bw), bw / 2 + 4, W - bw / 2 - 4);
        q.y = H.copyBottom + bh / 2 + 10; q.vx = ((i * 13) % 5 - 2) * 0.5; q.vy = 2;
      }
      H.pending.push(q);
    });
    H.pending.sort(function (a, b) { return a.t - b.t; });
  }
  function releasePending(force) {
    var now = performance.now();
    while (H.pending.length && (force || H.pending[0].t <= now)) {
      var q = H.pending.shift(), b = q.b;
      Body.setPosition(b, { x: q.x, y: q.y });
      Body.setAngle(b, q.a);
      Body.setVelocity(b, { x: q.vx, y: q.vy });
      Body.setAngularVelocity(b, q.burst ? -0.06 - Math.random() * 0.1 : q.vx * 0.01);
      if (q.burst) {
        b.frictionAir = 0;
        b.collisionFilter.mask = CAT_SOLID;
        b.plugin.tossT = Math.round(q.T * 0.8);
        H.boxKick = 1;
      }
      b.plugin.pending = false;
      b.plugin.bornT = now;
      Composite.add(H.engine.world, b);
      Sleeping.set(b, false);
    }
  }

  /* ---- packing ---- */
  function checkBox() {
    var bx = H.box, s = H.s, changed = false;
    H.items.forEach(function (b) {
      if (b.plugin.pending) return;
      var p = b.position;
      var inside = !b.plugin.dragging && !(b.plugin.tossT > 0 && b.velocity.x < -0.5) && p.x > bx.inL && p.x < bx.inR && p.y > bx.rim - 26 * s && p.y < H.floorY + 4;
      if (inside) b.plugin.boxN++; else b.plugin.boxN = 0;
      var now = b.plugin.boxN > 8 || (b.plugin.inBox && inside);
      if (now !== b.plugin.inBox) {
        b.plugin.inBox = now; changed = true;
        if (now) { H.packed.push(b); addPop("+1"); }
        else { H.packed.splice(H.packed.indexOf(b), 1); addPop("−1"); }
      }
    });
    if (changed) updateList(true);
  }
  function addPop(txt) {
    if (RM) return;
    H.pops.push({ t: performance.now(), txt: txt, x: H.box.cx + (Math.random() - 0.5) * 40 * H.s });
  }
  function updateList(animate) {
    var n = H.packed.length;
    ui.n.textContent = n;
    ui.word.textContent = n === 1 ? "item on your list" : "items on your list";
    ui.count.classList.toggle("has", n > 0);
    if (animate) { ui.n.classList.remove("pop"); void ui.n.offsetWidth; ui.n.classList.add("pop"); }
    var counts = {}, order = [];
    H.packed.forEach(function (b) {
      var nm = b.plugin.def.name;
      if (!counts[nm]) { counts[nm] = 0; order.push(nm); }
      counts[nm]++;
    });
    var lines = order.map(function (nm) { return counts[nm] > 1 ? nm + " (" + counts[nm] + ")" : nm; });
    ui.hint.innerHTML = n ? "In the box: <b>" + lines.map(esc).join(" · ") + "</b>" : HINT0;
    var href = "mailto:enservicecompany@gmail.com?subject=" + encodeURIComponent("Quote request");
    if (n) href += "&body=" + encodeURIComponent("Hello E&N,\n\nHere's my list:\n\n" + lines.map(function (l) { return "- " + l; }).join("\n") + "\n\n");
    ui.send.href = href;
    Array.prototype.forEach.call(ui.plist.querySelectorAll("input"), function (inp) {
      var b = H.items[+inp.value];
      if (b) inp.checked = b.plugin.inBox;
    });
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  function tossIn(b) {
    var bx = H.box, s = H.s;
    var tx = bx.cx + (Math.random() - 0.5) * (bx.inR - bx.inL) * 0.3, ty = bx.rim - 70 * s;
    var dx = tx - b.position.x, dy = ty - b.position.y;
    var T = clamp(Math.hypot(dx, dy) / 13, 32, 66);
    b.frictionAir = 0;
    b.plugin.tossT = T + 14;
    b.collisionFilter.mask = CAT_SOLID;
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: dx / T, y: dy / T - 0.5 * G_STEP * T });
    Body.setAngularVelocity(b, (dx > 0 ? 1 : -1) * 0.12);
  }
  function tossOut(b) {
    Sleeping.set(b, false);
    b.plugin.boxN = 0;
    b.plugin.tossT = 46;
    b.collisionFilter.mask = CAT_SOLID;
    Body.setVelocity(b, { x: -(8 + Math.random() * 3) * Math.max(0.7, H.s), y: -17 * Math.max(0.75, H.s) });
    Body.setAngularVelocity(b, -0.18);
  }
  function placeIn(b) { // reduced motion + keyboard: drop straight into the box
    var bx = H.box;
    Body.setPosition(b, { x: bx.cx + (Math.random() - 0.5) * (bx.inR - bx.inL) * 0.4, y: bx.rim - 120 * H.s });
    Body.setVelocity(b, { x: 0, y: 2 }); Body.setAngle(b, (Math.random() - 0.5) * 0.4);
    Sleeping.set(b, false);
  }
  function placeOut(b) {
    Body.setPosition(b, { x: H.box.x - 90 * H.s - Math.random() * 80 * H.s, y: H.box.rim - 150 * H.s });
    Body.setVelocity(b, { x: -1, y: 0 });
    Sleeping.set(b, false);
  }
  H.onTap = function (b) {
    if (RM) { if (b.plugin.inBox) placeOut(b); else placeIn(b); settleRM(); return; }
    if (b.plugin.inBox) tossOut(b); else tossIn(b);
  };

  function buildPacker() {
    ui.plist.innerHTML = "";
    H.items.forEach(function (b, i) {
      var lab = document.createElement("label");
      var inp = document.createElement("input"); inp.type = "checkbox"; inp.value = i;
      inp.addEventListener("change", function () {
        if (inp.checked && !b.plugin.inBox) placeIn(b);
        if (!inp.checked && b.plugin.inBox) placeOut(b);
        if (RM) settleRM();
      });
      lab.appendChild(inp); lab.appendChild(document.createTextNode(" " + b.plugin.def.name));
      ui.plist.appendChild(lab);
    });
    ui.packer.hidden = false;
  }

  /* ---- letter reactions ---- */
  function onCollide(ev) {
    ev.pairs.forEach(function (pair) {
      var a = pair.bodyA.parent, b = pair.bodyB.parent;
      var L = a.label === "letter" ? a : b.label === "letter" ? b : null;
      var I = L === a ? b : a;
      if (!L || I.label !== "item") return;
      var sp = I.speed;
      if (sp < 2.2 || !L.plugin.el.animate) return;
      var el = L.plugin.el;
      if (el._busy) return;
      el._busy = true;
      var dy = Math.min(14, sp * 1.3), rot = (Math.random() - 0.5) * Math.min(12, sp * 1.4);
      var an = el.animate([
        { transform: "none" },
        { transform: "translateY(" + dy + "px) rotate(" + rot + "deg)", offset: 0.25 },
        { transform: "translateY(" + (-dy * 0.25) + "px) rotate(" + (-rot * 0.3) + "deg)", offset: 0.6 },
        { transform: "none" }
      ], { duration: 520, easing: "ease-out" });
      an.onfinish = function () { el._busy = false; };
    });
  }

  /* ---- per-step logic ---- */
  var frameN = 0;
  function update() {
    // trapdoor follows the scroll
    var vh = window.innerHeight;
    var hb = H.heroEl.getBoundingClientRect().bottom;
    var tr = H.trap;
    if (tr.target === 0 && hb < vh * 0.74) {
      tr.target = 1; wakeAll();
      H.items.forEach(function (b, i) { // a little shove so the pile spreads out below
        if (b.position.x < H.ledgeX && b.position.y > H.floorY - 400 * H.s) {
          Body.setVelocity(b, { x: b.velocity.x + ((i * 7) % 9 - 4) * 1.1, y: b.velocity.y - 2 });
          Body.setAngularVelocity(b, ((i * 5) % 7 - 3) * 0.02);
        }
      });
    }
    else if (tr.target === 1 && hb > vh + 2) {
      recycle();
      tr.target = 0;
    }
    if (tr.a !== tr.target) {
      tr.a = tr.target > tr.a ? Math.min(1, tr.a + 0.045) : Math.max(0, tr.a - 0.06);
      setFlaps();
    }
    releasePending(false);
    // tossed items get air friction back when they land
    H.items.forEach(function (b) {
      if (b.plugin.pending) return;
      if (b.plugin.tossT > 0 && --b.plugin.tossT === 0) { b.frictionAir = 0.012; b.collisionFilter.mask = 0xffff; }
      capSpeed(b, b.plugin.dragging ? 28 : 34);
      var p = b.position;
      if (p.y > H.WH + 200 || p.x < -300 || p.x > H.W + 300 || p.y < -3000) {
        rain([b]);
      }
    });
    if (++frameN % 3 === 0) checkBox();
    if (frameN % 20 === 0) unstick();
  }
  // if something ever ends up wedged inside the text, let it fall through the
  // text to the floor, then make it solid again
  function unstick() {
    H.items.forEach(function (b) {
      if (b.plugin.pending || b.plugin.dragging || b.plugin.tossT > 0) return;
      var hits = Query.collides(b, H.textBodies);
      if (b.plugin.ghost) {
        if (!hits.length) { b.plugin.ghost = false; b.collisionFilter.mask = 0xffff; }
        return;
      }
      for (var i = 0; i < hits.length; i++) {
        if (hits[i].depth > 5 * H.s) {
          b.plugin.ghost = true;
          b.collisionFilter.mask = CAT_SOLID | CAT_ITEM | CAT_BOX;
          Sleeping.set(b, false);
          break;
        }
      }
    });
  }
  function wakeAll() { H.items.forEach(function (b) { Sleeping.set(b, false); }); }
  function recycle() {
    var below = H.items.filter(function (b) {
      return !b.plugin.pending && !b.plugin.dragging && b.position.y > H.floorY - 30 * H.s && b.position.x < H.ledgeX;
    });
    if (below.length) rain(below);
  }

  /* ---- render ---- */
  function drawItem(ctx, b, shadowOff) {
    var sp = b.plugin.sprite;
    if (!sp) return;
    var o = b.plugin.off;
    ctx.save();
    if (H.W < 900 && b.plugin.bornT) {
      var fa = clamp((performance.now() - b.plugin.bornT) / 260, 0, 1);
      if (fa < 1) ctx.globalAlpha = fa;
    }
    ctx.translate(b.position.x, b.position.y + shadowOff);
    ctx.rotate(b.angle);
    if (shadowOff) {
      ctx.globalAlpha *= 0.17;
      ctx.drawImage(sp.shadow, o.x - sp.w / 2, o.y - sp.h / 2, sp.w, sp.h);
    } else {
      ctx.drawImage(sp.img, o.x - sp.w / 2, o.y - sp.h / 2, sp.w, sp.h);
    }
    ctx.restore();
  }
  function poly(ctx, verts) {
    ctx.beginPath(); ctx.moveTo(verts[0].x, verts[0].y);
    for (var i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
  }
  function render() {
    var ctx = H.ctx, W = H.vw, vh = H.vh, s = H.s;
    var camY = H.canvas.getBoundingClientRect().top - H.root.getBoundingClientRect().top;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, vh);
    ctx.translate(0, -camY);
    var top = camY - 260, bot = camY + vh + 260;
    var bx = H.box;
    var inside = [], outside = [];
    H.items.forEach(function (b) {
      if (b.plugin.pending || b.bounds.max.y < top || b.bounds.min.y > bot) return;
      var p = b.position;
      if (!b.plugin.dragging && p.x > bx.inL - 4 && p.x < bx.inR + 4 && p.y > bx.rim - 60 * s && p.y < H.floorY) inside.push(b);
      else outside.push(b);
    });
    var sh = Math.max(4, 8 * s);
    var bs = H.bs;
    H.boxKick = (H.boxKick || 0) * 0.86;
    var kick = H.boxKick > 0.02 ? -Math.sin((1 - H.boxKick) * Math.PI) * 5 * bs : 0;
    var boxVisible = H.floorY + 10 > top && H.floorY - 320 * bs < bot;
    if (boxVisible && H.boxBack) ctx.drawImage(H.boxBack.img, bx.ox, bx.oy + kick, 408 * bs, 300 * bs - kick);
    inside.forEach(function (b) { drawItem(ctx, b, sh); });
    inside.forEach(function (b) { drawItem(ctx, b, 0); });
    if (boxVisible && H.boxFront) {
      ctx.save(); ctx.globalAlpha = 0.16;
      ctx.drawImage(H.boxFront.shadow, bx.ox, bx.oy + sh, 408 * bs, 300 * bs - sh);
      ctx.restore();
      ctx.drawImage(H.boxFront.img, bx.ox, bx.oy + kick, 408 * bs, 300 * bs - kick);
    }
    outside.sort(function (a, b) { return (a.plugin.dragging ? 1 : 0) - (b.plugin.dragging ? 1 : 0); });
    outside.forEach(function (b) { drawItem(ctx, b, b.plugin.dragging ? sh * 2.2 : sh); });
    outside.forEach(function (b) { drawItem(ctx, b, 0); });

    // floor, trapdoor, hinges
    if (H.floorY - 40 < bot && H.floorY + 400 > top) {
      ctx.fillStyle = C.ink;
      if (H.trap.a === 0) ctx.fillRect(0, H.floorY, W + 2, H.FT);
      else {
        ctx.fillRect(H.ledgeX, H.floorY, W - H.ledgeX + 2, H.FT);
        [H.flapL, H.flapR].forEach(function (f) { ctx.fillRect(f.bounds.min.x, H.floorY, f.bounds.max.x - f.bounds.min.x, H.FT); });
      }
      if (H.trap.a > 0 && H.trap.a < 1) { // hazard stripes on the door edges while they move
        var ex = [H.flapL.bounds.max.x, H.flapR.bounds.min.x];
        ctx.fillStyle = "#ffd23f";
        ex.forEach(function (x, i) { ctx.fillRect(i ? x : x - 6, H.floorY + 3, 6, H.FT - 6); });
      }
    }

    // +1 pops above the box
    var now = performance.now();
    H.pops = H.pops.filter(function (p) { return now - p.t < 900; });
    H.pops.forEach(function (p) {
      var k = (now - p.t) / 900;
      ctx.save();
      ctx.globalAlpha = 1 - k * k;
      ctx.fillStyle = C.ink;
      ctx.font = "900 " + Math.round(34 * Math.max(0.7, s)) + "px 'Red Hat Display', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(p.txt, p.x, bx.oy + 10 * s - easeOut(k) * 70 * s);
      ctx.restore();
    });

    // box tag
    if (boxVisible) {
      var n = H.packed.length;
      var bt = n ? n + (n === 1 ? " ITEM PACKED" : " ITEMS PACKED") : "DROP ITEMS HERE";
      ctx.font = "600 " + (s < 0.7 ? 10 : 12) + "px 'Red Hat Mono', monospace";
      var bw2 = ctx.measureText(bt).width + 22, bh2 = s < 0.7 ? 20 : 26;
      var tx = bx.cx - bw2 / 2, ty = bx.oy - bh2 - 8 * s;
      ctx.fillStyle = n ? C.ink : "rgba(22,23,27,.0)";
      roundRect(ctx, tx, ty, bw2, bh2, bh2 / 2); ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = n ? "#ffd23f" : C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(bt, bx.cx, ty + bh2 / 2 + 0.5);
      if (!n) { // little arrow
        var ay = ty + bh2 + 5 + Math.sin(performance.now() / 260) * 3;
        ctx.beginPath(); ctx.moveTo(bx.cx - 6, ay); ctx.lineTo(bx.cx + 6, ay); ctx.lineTo(bx.cx, ay + 7); ctx.closePath();
        ctx.fillStyle = C.ink; ctx.fill();
      }
      ctx.textBaseline = "alphabetic";
    }

    // name tags: hovered item always; resting items in the Supplies section as a catalog
    var hb = drag ? drag.body : hover;
    var placed = [];
    ctx.font = "600 " + (s < 0.7 ? 10.5 : 12) + "px 'Red Hat Mono', monospace";
    function tag(b, alpha, strong) {
      var label = b.plugin.def.name;
      var th = s < 0.7 ? 20 : 24;
      var tw = ctx.measureText(label).width + (s < 0.7 ? 14 : 20);
      var lx = clamp(b.position.x - tw / 2, 6, W - tw - 6), ly = b.bounds.min.y - th - 10;
      if (!strong) {
        for (var i = 0; i < placed.length; i++) {
          var q = placed[i];
          if (lx < q[0] + q[2] + 4 && lx + tw + 4 > q[0] && ly < q[1] + q[3] + 2 && ly + th + 2 > q[1]) return;
        }
      }
      placed.push([lx, ly, tw, th]);
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = strong ? C.ink : "#fff";
      roundRect(ctx, lx, ly, tw, th, th / 2); ctx.fill();
      if (!strong) { ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(b.position.x, ly + th); ctx.lineTo(b.position.x, b.bounds.min.y - 2);
      ctx.lineWidth = 1.5; ctx.strokeStyle = C.ink; ctx.stroke();
      ctx.fillStyle = strong ? "#fff" : C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, lx + tw / 2, ly + th / 2 + 0.5);
      ctx.restore();
    }
    if (hb && hb.label === "item" && hb.plugin.def) tag(hb, 1, true);
    H.items.forEach(function (b) {
      var pl = b.plugin;
      if (pl.pending) return;
      var resting = b !== hb && b.position.y > H.floorY + H.FT && (b.isSleeping || b.speed < 0.35);
      pl.tagA = clamp((pl.tagA || 0) + (resting ? 0.06 : -0.2), 0, 1);
      if (pl.tagA > 0 && b.bounds.max.y > top && b.bounds.min.y < bot) tag(b, pl.tagA, false);
    });
    ctx.textBaseline = "alphabetic";
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  /* ---- loop ---- */
  var last = 0, acc = 0;
  function frame(now) {
    H.raf = requestAnimationFrame(frame);
    var dt = Math.min(64, now - (last || now)); last = now;
    acc += dt;
    var n = 0;
    while (acc >= STEP && n < 3) { update(); Engine.update(H.engine, STEP); acc -= STEP; n++; }
    if (n === 3) acc = 0;
    render();
  }
  function play() { if (!H.raf && H.live && H.visible && !RM && !document.hidden) { last = 0; H.raf = requestAnimationFrame(frame); } }
  function pause() { if (H.raf) cancelAnimationFrame(H.raf); H.raf = 0; }

  function settleOffline(n) { // reduced motion: run the drop offline, release items one by one
    for (var i = 0; i < n; i++) {
      if (i % 9 === 0 && H.pending.length) { H.pending[0].t = 0; releasePending(false); }
      Engine.update(H.engine, STEP);
    }
  }
  function settleRM() {
    settleOffline(360);
    checkBoxNow();
    render();
  }
  function checkBoxNow() { for (var k = 0; k < 12; k++) checkBox(); H.pops = []; }

  function buildHero() {
    H.engine = Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 });
    H.engine.gravity.y = 1;
    Events.on(H.engine, "collisionStart", onCollide);
    Events.on(H.engine, "beforeUpdate", function () { applyDrag(H); });
    sizeCanvas();
    H.s = scaleFor(H.root.clientWidth);
    layoutStatics();
    spawnItems();
    buildPacker();
    Promise.all([
      rasterSVG(BOX_BACK, 408 * H.bs, 300 * H.bs, "boxB@" + H.bs),
      rasterSVG(BOX_FRONT, 408 * H.bs, 300 * H.bs, "boxF@" + H.bs)
    ].concat(H.items.map(function (b) { return itemSprite(b.plugin.def, H.s); }))).then(function (r) {
      H.boxBack = r[0]; H.boxFront = r[1];
      H.items.forEach(function (b, i) { b.plugin.sprite = r[i + 2]; });
      H.live = true;
      if (RM) {
        // a static, composed pile: settle offline, then just redraw with the camera
        settleOffline(1100);
        checkBoxNow();
        render();
      } else play();
    });
  }

  var lastW = 0;
  function onResize() {
    var w = H.root.clientWidth;
    sizeCanvas();
    if (Math.abs(w - lastW) < 2) { if (RM) render(); return; }
    var oldW = lastW; lastW = w;
    var ns = scaleFor(w);
    if (ns !== H.s || (w >= 1000) !== (oldW >= 1000)) {
      // new size class: rebuild the whole toy (keep what was packed, by index)
      var keep = H.items.map(function (b) { return b.plugin.inBox; });
      pause(); Composite.clear(H.engine.world, false); H.statics = []; H.items = []; H.packed = [];
      H.s = ns;
      layoutStatics(); spawnItems(); buildPacker();
      Promise.all([
        rasterSVG(BOX_BACK, 408 * H.bs, 300 * H.bs, "boxB@" + H.bs),
        rasterSVG(BOX_FRONT, 408 * H.bs, 300 * H.bs, "boxF@" + H.bs)
      ]).then(function (r) { H.boxBack = r[0]; H.boxFront = r[1]; });
      H.items.forEach(function (b, i) { if (keep[i]) placeIn(b); });
      updateList(false);
      if (RM) settleRM(); else play();
      return;
    }
    layoutStatics();
    var k = w / (oldW || w);
    H.items.forEach(function (b) {
      Body.setPosition(b, { x: clamp(b.position.x * k, 20, w - 20), y: b.position.y });
      Sleeping.set(b, false);
    });
    if (RM) settleRM();
  }

  /* ------------------------------------------------------------------ */
  /* HOW IT WORKS stage: packed -> taped -> shipped                     */
  /* ------------------------------------------------------------------ */
  var S = {
    sec: document.getElementById("how"), canvas: document.getElementById("stage"),
    steps: document.querySelectorAll("#steps .step"), bar: document.getElementById("howBar"),
    sprites: {}, p: -1
  };
  S.ctx = S.canvas.getContext("2d");
  var STAGE_ITEMS = [
    { id: "towel", x: 395, y: 318, a: -0.12 },
    { id: "lock", x: 560, y: 330, a: 0.2 },
    { id: "glasses", x: 470, y: 312, a: 0.08 },
    { id: "fuse", x: 520, y: 296, a: -0.35 }
  ];
  STAGE_ITEMS.forEach(function (it) {
    itemSprite(DEF[it.id], 1.15).then(function (sp) { S.sprites[it.id] = sp; S.p = -1; drawStageIfNeeded(); });
  });

  function sizeStage() {
    var r = S.canvas.parentNode.getBoundingClientRect();
    S.cw = r.width; S.ch = r.height;
    S.canvas.width = Math.round(r.width * DPR); S.canvas.height = Math.round(r.height * DPR);
    S.p = -1;
  }
  function stageProgress() {
    if (RM) return 1;
    var r = S.sec.getBoundingClientRect(), vh = window.innerHeight;
    return clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
  }
  function quad(ctx, a, b, c, d, fill) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
  }
  function add(p, v, k) { return [p[0] + v[0] * (k == null ? 1 : k), p[1] + v[1] * (k == null ? 1 : k)]; }
  function drawLogo(ctx, x, y, w, color, rot) {
    ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot);
    var k = w / 866; ctx.scale(k, k); ctx.translate(-433, -303);
    ctx.fillStyle = color; ctx.fill(LOGO_PATH, "evenodd");
    ctx.restore();
  }

  function drawStage(p) {
    var ctx = S.ctx, cw = S.cw, ch = S.ch;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    // fit the 840 x 560 design into the stage (narrow stages crop to the box and door)
    var camPan = easeInOut(seg(seg(p, 0.68, 0.98), 0.12, 0.84));
    var V = cw < 560 ? { x: 90 + camPan * 150, y: 170, w: 620, h: 350, ay: 0.3 } : { x: 0, y: 0, w: 840, h: 560, ay: 0.5 };
    var k = Math.min(cw / V.w, ch / V.h);
    ctx.translate((cw - V.w * k) / 2 - V.x * k, (ch - V.h * k) * V.ay - V.y * k);
    ctx.scale(k, k);

    var pa = seg(p, 0.02, 0.32), pb = seg(p, 0.36, 0.64), pc = seg(p, 0.68, 0.98);
    var GY = 500;

    // arrive: the ground scrolls, the box hops, a door slides in
    var travel = seg(pc, 0.12, 0.84);
    var pan = easeInOut(travel);
    var hop = 0, tilt = 0, sq = 1;
    if (pc > 0) {
      var ant = seg(pc, 0, 0.12), land = seg(pc, 0.84, 1);
      if (travel > 0 && travel < 1) { hop = Math.abs(Math.sin(travel * Math.PI * 3)) * 46; tilt = Math.sin(travel * Math.PI * 6) * 0.05; }
      sq = 1 - Math.sin(ant * Math.PI) * 0.07 - Math.sin(land * Math.PI) * 0.09;
    }
    var boxShift = pan * 90;

    // ground line + moving dashes
    ctx.fillStyle = "rgba(255,255,255,.14)";
    ctx.fillRect(-400, GY, 1800, 3);
    ctx.fillStyle = "rgba(255,255,255,.28)";
    var off = (pan * 1400) % 90;
    for (var gx = -400 - off; gx < 1400; gx += 90) ctx.fillRect(gx, GY + 16, 36, 3);

    // door + mat (slides in from the right)
    var doorX = lerp(1060, 668, pan), DT = GY - 330;
    if (pc > 0.05) {
      ctx.fillStyle = "#fff"; ctx.fillRect(doorX, DT, 150, GY - DT);
      ctx.fillStyle = C.ink; ctx.fillRect(doorX + 14, DT + 14, 122, GY - DT - 14);
      ctx.fillStyle = "#2a2c33"; ctx.fillRect(doorX + 26, DT + 26, 98, 128); ctx.fillRect(doorX + 26, DT + 166, 98, GY - DT - 178);
      ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(doorX + 118, DT + 176, 7, 0, 7); ctx.fill();
    }

    // box geometry (oblique view)
    var X0 = 150 + boxShift, W0 = 300, BH = 230, Y0 = GY - BH;
    var d = [72, -58];
    var A = [X0, Y0], Cc = [X0 + W0, Y0], B = add(A, d), D = add(Cc, d);

    ctx.save();
    var pivotX = X0 + W0 / 2 + 36;
    ctx.translate(pivotX, GY - hop);
    ctx.rotate(tilt);
    ctx.scale(2 - sq, sq);
    ctx.translate(-pivotX, -GY);

    // shadow
    ctx.fillStyle = "rgba(0,0,0,.35)";
    ctx.beginPath(); ctx.ellipse(X0 + W0 / 2 + 36, GY + hop * 0.9 + 2, 200 - hop * 0.8, 14, 0, 0, 7); ctx.fill();

    // flap angles
    var fbF = easeInOut(seg(pb, 0.0, 0.22)), fbS = easeInOut(seg(pb, 0.16, 0.42));
    var L = W0 / 2, h2 = [d[0] / 2, d[1] / 2], up = [0, -60];
    var phi = lerp(3.6, 0, fbF);          // front flap: hanging -> closed
    var psi = lerp(1.9, 0, fbF);          // back flap: standing -> closed
    var th = lerp(2.0, 0, fbS);           // side flaps
    var vF = [Math.cos(phi) * h2[0] + Math.sin(phi) * up[0], Math.cos(phi) * h2[1] + Math.sin(phi) * up[1]];
    var vB = [-Math.cos(psi) * h2[0] + Math.sin(psi) * up[0], -Math.cos(psi) * h2[1] + Math.sin(psi) * up[1]];
    var vL = [L * Math.cos(th), -L * Math.sin(th)], vR = [-L * Math.cos(th), -L * Math.sin(th)];
    var flapIn = "#b98244", flapOut = "#e4b47a";

    var backFirst = psi > 1.0;
    if (backFirst) quad(ctx, B, D, add(D, vB), add(B, vB), psi > 1.57 ? flapIn : flapOut);
    // interior
    quad(ctx, A, Cc, D, B, C.kraft3);
    quad(ctx, A, B, add(B, [0, 40]), add(A, [0, 40]), "#7a4f22");

    // items dropping in
    var itemsAlpha = 1 - seg(pb, 0.12, 0.24);
    if (itemsAlpha > 0) {
      ctx.save(); ctx.globalAlpha = itemsAlpha;
      STAGE_ITEMS.forEach(function (it, i) {
        var sp = S.sprites[it.id]; if (!sp) return;
        var t = seg(pa, i * 0.2, i * 0.2 + 0.36);
        if (t <= 0) return;
        var y = lerp(-160, it.y - 330 + Y0, bounce(t));
        ctx.save(); ctx.translate(it.x - 300 + X0, y); ctx.rotate(it.a * (0.4 + 0.6 * t));
        ctx.drawImage(sp.img, -sp.w / 2, -sp.h / 2, sp.w, sp.h);
        ctx.restore();
      });
      ctx.restore();
    }

    // front + right faces
    quad(ctx, A, Cc, [Cc[0], Cc[1] + BH], [A[0], A[1] + BH], C.kraft);
    quad(ctx, Cc, D, [D[0], D[1] + BH], [Cc[0], Cc[1] + BH], C.kraft2);
    ctx.fillStyle = "rgba(143,95,46,.35)"; ctx.fillRect(A[0], A[1] + BH - 22, W0, 22);
    drawLogo(ctx, X0 + 218, Y0 + 150, 118, C.ink, -0.05);

    if (!backFirst) quad(ctx, B, D, add(D, vB), add(B, vB), flapOut);
    // front flap
    var frontFill = phi > 1.57 ? "#e9bd86" : flapOut;
    quad(ctx, A, Cc, add(Cc, vF), add(A, vF), frontFill);
    // side flaps
    quad(ctx, A, B, add(B, vL), add(A, vL), th > 1.57 ? flapIn : flapOut);
    quad(ctx, Cc, D, add(D, vR), add(Cc, vR), th > 1.57 ? flapIn : flapOut);
    if (th < 0.05) { // seam
      ctx.strokeStyle = "rgba(143,95,46,.7)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X0 + L, Y0); ctx.lineTo(X0 + L + d[0], Y0 + d[1]); ctx.stroke();
    }

    // branded tape: along the seam, then down the front
    var tp = seg(pb, 0.46, 0.7);
    if (tp > 0) {
      var tw = 17;
      var t1 = Math.min(1, tp / 0.55), t2 = seg(tp, 0.55, 1);
      var bk = [X0 + L + d[0], Y0 + d[1]];
      var fr = [X0 + L, Y0];
      var e1 = [lerp(bk[0], fr[0], t1), lerp(bk[1], fr[1], t1)];
      quad(ctx, [bk[0] - tw, bk[1]], [bk[0] + tw, bk[1]], [e1[0] + tw, e1[1]], [e1[0] - tw, e1[1]], C.ink);
      if (t2 > 0) {
        ctx.fillStyle = C.ink; ctx.fillRect(fr[0] - tw, fr[1], tw * 2, 86 * t2);
        if (t2 > 0.6) drawLogo(ctx, fr[0], fr[1] + 48, 26, "#ffd23f", 0);
      }
      if (t1 > 0.7) drawLogo(ctx, lerp(bk[0], fr[0], 0.45), lerp(bk[1], fr[1], 0.45), 22, "#ffd23f", -0.68);
    }

    // quote label slaps on
    var lp = seg(pb, 0.74, 0.9);
    if (lp > 0) {
      var sc = lerp(1.5, 1, easeBack(lp)), al = Math.min(1, lp * 3);
      ctx.save();
      ctx.globalAlpha = al;
      ctx.translate(X0 + 92, Y0 + 150); ctx.rotate(-0.04 * (2 - lp)); ctx.scale(sc, sc);
      ctx.fillStyle = "rgba(0,0,0,.18)"; roundRect(ctx, -62, -40, 124, 90, 8); ctx.fill();
      ctx.fillStyle = "#fff"; roundRect(ctx, -64, -46, 124, 90, 8); ctx.fill();
      drawLogo(ctx, -36, -26, 34, C.ink, 0);
      ctx.fillStyle = C.ink;
      ctx.fillRect(-12, -32, 58, 6); ctx.fillRect(-12, -20, 40, 5);
      ctx.fillStyle = "#c9ccd2"; ctx.fillRect(-52, -2, 98, 5); ctx.fillRect(-52, 8, 76, 5);
      ctx.fillStyle = C.ink;
      var bxs = [0, 3, 5, 9, 11, 12, 16, 19, 21, 25, 27, 30, 33, 34, 38, 41, 43, 47, 50, 52, 56, 58, 61, 64, 66, 70, 73, 75, 79, 82, 84, 88, 90, 93, 96];
      bxs.forEach(function (bx2, i) { ctx.fillRect(-52 + bx2, 20, i % 3 === 0 ? 2.4 : 1.4, 16); });
      ctx.restore();
    }
    ctx.restore(); // box transform

    // speed lines while travelling
    if (travel > 0.02 && travel < 0.98) {
      ctx.fillStyle = "rgba(255,255,255,.5)";
      var sx = X0 - 40;
      [[0, Y0 + 40, 90], [18, Y0 + 100, 130], [6, Y0 + 160, 70]].forEach(function (l, i) {
        var len = l[2] * (0.6 + 0.4 * Math.sin(travel * 20 + i));
        ctx.fillRect(sx - len - l[0], l[1] - hop, len, 4);
      });
    }
    // steps + bar
    var active = p < 0.34 ? 0 : p < 0.66 ? 1 : 2;
    if (RM) active = -1;
    Array.prototype.forEach.call(S.steps, function (el, i) { el.classList.toggle("is-on", RM || i === active); });
    S.bar.style.transform = "scaleX(" + p.toFixed(4) + ")";
  }
  function drawStageIfNeeded() {
    var p = stageProgress();
    if (Math.abs(p - S.p) < 0.0005) return;
    S.p = p;
    drawStage(p);
  }

  /* ------------------------------------------------------------------ */
  /* PROMISE: heavy word blocks                                         */
  /* ------------------------------------------------------------------ */
  var P = {
    sec: document.getElementById("promise"), canvas: document.getElementById("promiseCanvas"),
    blocks: [], live: false, dropped: false, raf: 0, shake: 0, dust: [], visible: false
  };
  P.ctx = P.canvas.getContext("2d");
  P.toWorld = function (cx, cy) {
    var r = P.canvas.getBoundingClientRect();
    var x = cx - r.left, y = cy - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return null;
    return { x: x, y: y };
  };
  P.draggables = function () { return RM ? [] : P.blocks; };
  P.maxFling = 30; P.dragK = 0.12; P.dragAir = 0.02; P.touchTol = 4;
  var WORDS = [
    { t: "Exact.", bg: C.ink, fg: "#fff" },
    { t: "Delivered.", bg: "#fff", fg: C.ink },
    { t: "Fast.", bg: C.red, fg: "#fff" }
  ];

  function buildPromise() {
    P.engine = Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
    Events.on(P.engine, "beforeUpdate", function () { applyDrag(P); P.blocks.forEach(function (b) { capSpeed(b, 30); }); });
    Events.on(P.engine, "collisionStart", function (ev) {
      ev.pairs.forEach(function (pair) {
        var a = pair.bodyA.parent, b = pair.bodyB.parent;
        var blk = a.label === "word" ? a : b.label === "word" ? b : null;
        if (!blk) return;
        var other = blk === a ? b : a;
        var rel = Math.abs(blk.velocity.y - (other.velocity ? other.velocity.y : 0));
        if (rel > 5) {
          P.shake = Math.min(14, Math.max(P.shake, rel * 0.7));
          var sup = pair.collision.supports && pair.collision.supports[0];
          if (sup) for (var i = 0; i < 9; i++) {
            P.dust.push({ x: sup.x + (Math.random() - 0.5) * 60, y: sup.y, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 3.5, r: 3 + Math.random() * 6, t: 0 });
          }
        }
      });
    });
    layoutPromise();
  }
  function layoutPromise() {
    var r = P.canvas.getBoundingClientRect();
    P.W = r.width; P.H = r.height;
    P.canvas.width = Math.round(P.W * DPR); P.canvas.height = Math.round(P.H * DPR);
    Composite.clear(P.engine.world, false);
    var W = P.W, Hh = P.H;
    P.floorPad = W < 600 ? 28 : 56;
    var wall = { isStatic: true, friction: 0.8 };
    Composite.add(P.engine.world, [
      Bodies.rectangle(W / 2, Hh - P.floorPad + 50, W + 400, 100, wall),
      Bodies.rectangle(-50, Hh / 2 - 800, 100, Hh + 1600, wall),
      Bodies.rectangle(W + 50, Hh / 2 - 800, 100, Hh + 1600, wall)
    ]);
    var narrow = W < 700;
    var pad = W < 600 ? 16 : Math.max(40, W * 0.044);
    // measure words
    mctx.font = "900 100px 'Red Hat Display'";
    var ws = WORDS.map(function (w) { return mctx.measureText(w.t).width; });
    var fs, layout = [];
    if (narrow) {
      // a tower of equal slabs: Fast. at the bottom so it reads top-down
      fs = Math.min(64, (W - pad * 2 - 24) / (Math.max.apply(null, ws) / 100 + 0.8));
      var slabW = Math.max.apply(null, ws) / 100 * fs + fs * 0.8, slabH = fs * 1.22;
      [2, 1, 0].forEach(function (wi, k) {
        layout.push({ wi: wi, w: slabW, h: slabH, x: W / 2 + (k - 1) * 5, y: -slabH - k * slabH * 2.4, delay: k * 380, a: (k - 1) * 0.05 });
      });
    } else {
      // Exact. rests on Delivered.; Fast. sits beside it
      var padX = 0.34;
      var wD = ws[1] / 100, wF = ws[2] / 100, wE = ws[0] / 100;
      fs = Math.min(170, (W - pad * 2 - 30) / (wD + wF + padX * 4));
      var hh = fs * 1.16;
      var bwD = (wD + padX * 2) * fs, bwF = (wF + padX * 2) * fs, bwE = (wE + padX * 2) * fs;
      var left = pad + Math.max(0, (W - pad * 2 - (bwD + bwF + 30)) / 2);
      layout.push({ wi: 1, w: bwD, h: hh, x: left + bwD / 2, y: -hh, delay: 0, a: -0.04 });
      layout.push({ wi: 2, w: bwF, h: hh, x: left + bwD + 30 + bwF / 2, y: -hh * 1.4, delay: 420, a: 0.07 });
      layout.push({ wi: 0, w: bwE, h: hh, x: left + bwE / 2 + fs * 0.25, y: -hh * 1.6, delay: 900, a: 0.05 });
    }
    P.fs = fs; P.layout = layout;
    P.blocks = [];
    if (P.dropped) layout.forEach(function (L) { spawnBlock(L, true); });
  }
  function spawnBlock(L, settled) {
    var b = Bodies.rectangle(L.x, L.y, L.w, L.h, {
      chamfer: { radius: Math.min(18, L.h * 0.14) }, friction: 0.9, frictionStatic: 1.2, restitution: 0.04,
      frictionAir: 0.004, density: 0.012, label: "word", angle: L.a
    });
    b.plugin = { word: WORDS[L.wi], w: L.w, h: L.h };
    Body.setVelocity(b, { x: 0, y: 6 });
    P.blocks.push(b);
    Composite.add(P.engine.world, b);
    if (settled) {
      Body.setPosition(b, { x: L.x, y: P.H - 400 }); // re-dropped after a resize
    }
  }
  function dropPromise() {
    if (P.dropped) return;
    P.dropped = true;
    if (RM) {
      P.layout.forEach(function (L) { spawnBlock(L); });
      for (var i = 0; i < 600; i++) Engine.update(P.engine, STEP);
      P.dust = []; P.shake = 0;
      renderPromise();
      return;
    }
    P.layout.forEach(function (L) { setTimeout(function () { spawnBlock(L); }, L.delay); });
  }
  function renderPromise() {
    var ctx = P.ctx, W = P.W, Hh = P.H;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, Hh);
    if (P.shake > 0.3) {
      ctx.translate((Math.random() - 0.5) * P.shake * 0.5, (Math.random() - 0.3) * P.shake);
      P.shake *= 0.86;
    } else P.shake = 0;
    var fs = P.fs;
    ctx.fillStyle = C.ink;
    ctx.fillRect(-20, Hh - P.floorPad, W + 40, P.floorPad + 20);
    P.blocks.forEach(function (b) {
      var pl = b.plugin;
      ctx.save();
      ctx.translate(b.position.x, b.position.y + 10);
      ctx.rotate(b.angle);
      ctx.fillStyle = "rgba(27,22,0,.2)";
      roundRect(ctx, -pl.w / 2, -pl.h / 2, pl.w, pl.h, Math.min(18, pl.h * 0.14)); ctx.fill();
      ctx.restore();
    });
    P.blocks.forEach(function (b) {
      var pl = b.plugin;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = pl.word.bg;
      roundRect(ctx, -pl.w / 2, -pl.h / 2, pl.w, pl.h, Math.min(18, pl.h * 0.14)); ctx.fill();
      ctx.fillStyle = pl.word.fg;
      ctx.font = "900 " + fs + "px 'Red Hat Display', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(pl.word.t, 0, fs * 0.35);
      ctx.restore();
    });
    P.dust = P.dust.filter(function (d) { return d.t < 1; });
    P.dust.forEach(function (d) {
      d.t += 0.035; d.x += d.vx; d.y += d.vy; d.vy += 0.12; d.vx *= 0.96;
      ctx.fillStyle = "rgba(22,23,27," + (0.35 * (1 - d.t)) + ")";
      ctx.beginPath(); ctx.arc(d.x, d.y, d.r * (1 + d.t), 0, 7); ctx.fill();
    });
  }
  var plast = 0, pacc = 0;
  function pframe(now) {
    P.raf = requestAnimationFrame(pframe);
    var dt = Math.min(64, now - (plast || now)); plast = now; pacc += dt;
    var n = 0;
    while (pacc >= STEP && n < 3) { Engine.update(P.engine, STEP); pacc -= STEP; n++; }
    if (n === 3) pacc = 0;
    P.blocks.forEach(function (b) {
      if (b.position.y > P.H + 400 || b.position.x < -400 || b.position.x > P.W + 400) {
        Body.setPosition(b, { x: P.W / 2, y: -200 }); Body.setVelocity(b, { x: 0, y: 0 });
      }
    });
    renderPromise();
  }
  function pplay() { if (!P.raf && P.live && P.visible && !RM && !document.hidden) { plast = 0; P.raf = requestAnimationFrame(pframe); } }
  function ppause() { if (P.raf) cancelAnimationFrame(P.raf); P.raf = 0; }
  P.onTap = function (b) { // a tap gives the block a little hop
    Sleeping.set(b, false);
    Body.setVelocity(b, { x: (Math.random() - 0.5) * 4, y: -12 });
    Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.12);
  };

  /* ------------------------------------------------------------------ */
  /* boot                                                               */
  /* ------------------------------------------------------------------ */
  function boot() {
    lastW = H.root.clientWidth;
    buildHero();
    worlds.push(H);
    sizeStage();
    drawStageIfNeeded();
    buildPromise();
    P.sec.classList.add("live");
    P.live = true;
    worlds.push(P);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        H.visible = es[0].isIntersecting;
        if (H.visible) play(); else pause();
      }).observe(H.root);
      new IntersectionObserver(function (es) {
        var e = es[0];
        P.visible = e.isIntersecting;
        if (e.intersectionRatio > 0.3) dropPromise();
        if (P.visible) pplay(); else ppause();
      }, { threshold: [0, 0.3, 0.6] }).observe(P.sec);
    } else { dropPromise(); pplay(); }

    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        drawStageIfNeeded();
        if (RM && H.live) render();
      });
    }, { passive: true });
    var rt = 0;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        onResize();
        sizeStage(); drawStageIfNeeded();
        layoutPromise(); if (RM && P.dropped) { for (var i = 0; i < 600; i++) Engine.update(P.engine, STEP); renderPromise(); }
      }, 160);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { pause(); ppause(); } else { play(); pplay(); }
    });
    // test hook for scripted checks
    window.__playground = { H: H, P: P, S: S, tossIn: tossIn, updateList: updateList };
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
    requestAnimationFrame(boot);
  });
})();
