/* E&N Playground: supply items drawn as flat vector art.
   Each item: art size (w,h) in px at scale 1, physics parts in the same
   coordinates, and an SVG drawing. One style: flat fills, a darker lower
   "shade" band, one soft highlight. No outlines. */
(function () {
  var C = {
    ink: "#16171b", ink2: "#2c2e35", ink3: "#44474f",
    white: "#ffffff", off: "#e9ebee", off2: "#d7dbe0",
    s1: "#dfe3e8", s2: "#b3bac4", s3: "#7c8490", s4: "#5a616c",
    red: "#ef4423", red2: "#c42f17",
    kraft: "#d9a468", kraft2: "#bb8546", kraft3: "#8f5f2e",
    sky: "#a9dcff", sky2: "#72bdf0",
    teal: "#1f9e8f", teal2: "#157a6e"
  };

  function svg(w, h, body) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '">' + body + "</svg>";
  }
  // rounded rect with a darker band across its lower part, clipped to the shape
  var uid = 0;
  function block(x, y, w, h, rx, base, dark, frac, hi) {
    var id = "c" + (++uid);
    var sh = h * (frac == null ? 0.32 : frac);
    var out = '<clipPath id="' + id + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + rx + '"/></clipPath>' +
      '<g clip-path="url(#' + id + ')"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + base + '"/>' +
      '<rect x="' + x + '" y="' + (y + h - sh) + '" width="' + w + '" height="' + sh + '" fill="' + dark + '"/>';
    if (hi) out += '<rect x="' + (x + Math.min(10, w * 0.14)) + '" y="' + (y + Math.min(8, h * 0.12)) + '" width="' + Math.max(6, w * 0.26) + '" height="' + Math.max(3, Math.min(6, h * 0.1)) + '" rx="3" fill="#fff" opacity="' + hi + '"/>';
    return out + "</g>";
  }
  function r(x, y, w, h, rx, fill, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + fill + '"' + (extra || "") + "/>";
  }

  var items = [];

  /* 30 A cartridge fuse */
  items.push({
    id: "fuse", name: "30 A fuse", w: 150, h: 46,
    parts: [{ t: "rect", x: 0, y: 2, w: 150, h: 42, ch: 10 }],
    svg: svg(150, 46,
      block(0, 5, 32, 36, 8, C.s2, C.s3, 0.35, 0.5) +
      block(118, 5, 32, 36, 8, C.s2, C.s3, 0.35) +
      block(24, 0, 102, 46, 11, C.white, C.off2, 0.3, 0) +
      block(54, 0, 42, 46, 0, C.red, C.red2, 0.3) +
      r(63, 17, 24, 6, 3, "#fff") + r(38, 8, 10, 4, 2, C.s1))
  });

  /* padlock */
  items.push({
    id: "lock", name: "Padlock", w: 96, h: 124,
    parts: [{ t: "rect", x: 4, y: 50, w: 88, h: 72, ch: 12 }, { t: "rect", x: 14, y: 4, w: 68, h: 54, ch: [30, 30, 0, 0] }],
    svg: svg(96, 124,
      '<path d="M24 60V38a24 24 0 0 1 48 0v22" fill="none" stroke="' + C.s2 + '" stroke-width="14"/>' +
      '<path d="M72 60V38a24 24 0 0 0-12-20.8" fill="none" stroke="' + C.s3 + '" stroke-width="14"/>' +
      block(4, 50, 88, 72, 13, C.red, C.red2, 0.3, 0.55) +
      '<circle cx="48" cy="80" r="9" fill="' + C.ink + '"/><path d="M44 84h8l3 20h-14z" fill="' + C.ink + '"/>')
  });

  /* paper towels, standing roll */
  items.push({
    id: "towel", name: "Paper towels (case)", w: 100, h: 150,
    parts: [{ t: "rect", x: 0, y: 2, w: 100, h: 148, ch: [22, 22, 10, 10] }],
    svg: svg(100, 150,
      block(0, 14, 100, 136, 12, C.white, C.off, 0.0) +
      r(66, 14, 34, 136, 0, C.off, ' clip-path="url(#c' + (uid) + ')"') +
      '<g stroke="' + C.off2 + '" stroke-width="2.5" stroke-dasharray="5 6"><path d="M4 58h92M4 100h92M4 140h92"/></g>' +
      '<ellipse cx="50" cy="16" rx="50" ry="14" fill="' + C.off2 + '"/>' +
      '<ellipse cx="50" cy="16" rx="47" ry="12" fill="' + C.white + '"/>' +
      '<ellipse cx="50" cy="16" rx="19" ry="6.5" fill="' + C.kraft + '"/>' +
      '<ellipse cx="50" cy="16.5" rx="13" ry="4.2" fill="' + C.ink2 + '"/>')
  });

  /* hex bolt, factory for two sizes */
  function bolt(id, s) {
    var W = 64, H = 176;
    var th = "";
    for (var y = 78; y < 168; y += 9) th += '<path d="M17 ' + y + 'L47 ' + (y + 6) + '" stroke="' + C.s3 + '" stroke-width="3" stroke-linecap="round"/>';
    return {
      id: id, name: "Hex bolts", w: W, h: H, scale: s,
      parts: [{ t: "rect", x: 0, y: 0, w: 64, h: 40, ch: 5 }, { t: "rect", x: 16, y: 38, w: 32, h: 138, ch: [0, 0, 8, 8] }],
      svg: svg(W, H,
        block(16, 30, 32, 146, 7, C.s1, C.s2, 0.0) + r(38, 30, 10, 146, 0, C.s2) + th +
        r(3, 32, 58, 8, 2, C.s3) +
        '<path d="M4 0h56a4 4 0 0 1 4 4v28H0V4a4 4 0 0 1 4-4z" fill="' + C.s2 + '"/>' +
        r(0, 0, 16, 32, 0, C.s1, ' opacity=".9"') + r(48, 0, 16, 32, 0, C.s3) +
        r(20, 6, 10, 4, 2, "#fff", ' opacity=".7"'))
    };
  }
  items.push(bolt("boltL", 1));
  items.push(bolt("boltS", 0.74));

  /* hex nut, face view (hexagon matches Matter's polygon orientation) */
  (function () {
    var R = 36, pts = [], inner = [];
    for (var i = 0; i < 6; i++) {
      var a = Math.PI / 6 + i * Math.PI / 3;
      pts.push((32 + R * Math.cos(a)).toFixed(2) + " " + (36 + R * Math.sin(a)).toFixed(2));
      inner.push((32 + (R - 7) * Math.cos(a)).toFixed(2) + " " + (36 + (R - 7) * Math.sin(a)).toFixed(2));
    }
    items.push({
      id: "nut", name: "Hex nuts", w: 64, h: 72,
      parts: [{ t: "poly", sides: 6, r: R, cx: 32, cy: 36 }],
      svg: svg(64, 72,
        '<path fill-rule="evenodd" fill="' + C.s3 + '" d="M' + pts.join("L") + 'Z M32 21a15 15 0 1 0 0.01 0Z"/>' +
        '<path fill-rule="evenodd" fill="' + C.s2 + '" d="M' + inner.join("L") + 'Z M32 21a15 15 0 1 0 0.01 0Z"/>' +
        '<circle cx="32" cy="36" r="15" fill="none" stroke="' + C.s4 + '" stroke-width="3"/>' +
        '<path d="M16 22l8-5" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/>')
    });
  })();

  /* LED shop light 4 ft */
  items.push({
    id: "led", name: "LED shop light 4 ft", w: 320, h: 34,
    parts: [{ t: "rect", x: 0, y: 1, w: 320, h: 32, ch: 12 }],
    svg: svg(320, 34,
      r(0, 11, 8, 4, 1, C.ink) + r(0, 19, 8, 4, 1, C.ink) + r(312, 11, 8, 4, 1, C.ink) + r(312, 19, 8, 4, 1, C.ink) +
      block(5, 3, 22, 28, 6, C.s2, C.s3, 0.35) + block(293, 3, 22, 28, 6, C.s2, C.s3, 0.35) +
      block(20, 1, 280, 32, 16, C.white, C.off2, 0.34) +
      r(42, 9, 236, 5, 2.5, C.sky) + r(42, 9, 60, 5, 2.5, "#fff"))
  });

  /* safety glasses */
  items.push({
    id: "glasses", name: "Safety glasses", w: 172, h: 66,
    parts: [{ t: "rect", x: 0, y: 4, w: 172, h: 60, ch: [8, 8, 26, 26] }],
    svg: svg(172, 66,
      '<path d="M8 14h156l-4 28c-3 16-20 23-38 20-15-2-28-10-36-22-8 12-21 20-36 22-18 3-35-4-38-20z" fill="' + C.sky + '"/>' +
      '<path d="M86 40c8 12 21 20 36 22 18 3 35-4 38-20l1.6-11H86z" fill="' + C.sky2 + '" opacity=".55"/>' +
      '<path d="M28 22l-8 26M40 22l-8 30" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75"/>' +
      '<path d="M112 22l-7 22" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".6"/>' +
      r(0, 6, 172, 13, 6.5, C.ink) + '<path d="M76 19h20l-4 14c-2 5-10 5-12 0z" fill="' + C.ink + '"/>' +
      r(10, 9, 30, 3, 1.5, C.ink3))
  });

  /* work gloves (nitrile dipped) */
  items.push({
    id: "glove", name: "Work gloves", w: 104, h: 146,
    parts: [{ t: "rect", x: 10, y: 44, w: 82, h: 102, ch: [8, 8, 8, 8] }, { t: "rect", x: 20, y: 2, w: 68, h: 46, ch: [10, 10, 0, 0] }],
    svg: svg(104, 146,
      '<g fill="' + C.teal + '">' +
      r(20, 12, 15, 52, 7.5, C.teal) + r(37, 3, 15, 60, 7.5, C.teal) + r(54, 7, 15, 56, 7.5, C.teal) + r(71, 20, 14, 44, 7, C.teal) +
      '<rect x="-2" y="58" width="16" height="44" rx="8" transform="rotate(-28 8 82)" fill="' + C.teal + '"/>' +
      r(18, 46, 68, 64, 12, C.teal) + "</g>" +
      r(18, 84, 68, 26, 0, C.teal2) + r(54, 7, 15, 20, 7.5, C.teal2, ' opacity="0"') +
      r(40, 10, 5, 16, 2.5, "#fff", ' opacity=".5"') +
      block(16, 106, 72, 40, 6, C.white, C.off, 0.3) +
      r(16, 114, 72, 7, 0, C.ink))
  });

  /* printer toner cartridge */
  items.push({
    id: "toner", name: "Printer toner", w: 196, h: 64,
    parts: [{ t: "rect", x: 0, y: 2, w: 196, h: 62, ch: 9 }],
    svg: svg(196, 64,
      block(64, 0, 68, 18, 7, C.ink3, C.ink3, 0) + r(78, 5, 40, 6, 3, C.ink) +
      block(0, 10, 196, 54, 10, C.ink2, C.ink, 0.36) +
      r(0, 26, 196, 8, 0, C.red) +
      block(166, 10, 30, 54, 10, C.ink3, C.ink2, 0.36) +
      r(16, 46, 140, 6, 3, C.s4) + r(14, 16, 44, 4, 2, "#fff", ' opacity=".3"'))
  });

  /* extension cord, coiled */
  items.push({
    id: "cord", name: "Extension cord", w: 112, h: 112,
    parts: [{ t: "circle", r: 52, cx: 56, cy: 56 }],
    svg: svg(112, 112,
      '<g fill="none" stroke-width="11">' +
      '<ellipse cx="46" cy="54" rx="36" ry="44" stroke="' + C.red2 + '"/>' +
      '<ellipse cx="54" cy="56" rx="38" ry="45" stroke="' + C.red + '"/>' +
      '<ellipse cx="62" cy="55" rx="37" ry="44" stroke="' + C.red2 + '"/>' +
      '<ellipse cx="58" cy="56" rx="40" ry="46" stroke="' + C.red + '"/>' +
      "</g>" +
      '<path d="M22 30c6-10 14-15 22-17" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".55"/>' +
      '<path d="M86 88l10 10" stroke="' + C.red + '" stroke-width="11" stroke-linecap="round"/>' +
      block(84, 88, 26, 22, 5, C.ink2, C.ink, 0.35) + r(104, 92, 7, 4, 1, C.s2) + r(104, 101, 7, 4, 1, C.s2))
  });

  /* duct tape roll */
  items.push({
    id: "tape", name: "Duct tape", w: 96, h: 96,
    parts: [{ t: "circle", r: 47, cx: 48, cy: 48 }],
    svg: svg(96, 96,
      '<path fill-rule="evenodd" fill="' + C.s2 + '" d="M48 1a47 47 0 1 0 .01 0Z M48 24a24 24 0 1 0 .01 0Z"/>' +
      '<path fill-rule="evenodd" fill="' + C.s3 + '" d="M48 58a38 38 0 0 0 37-30 47 47 0 0 1-37 67 47 47 0 0 1-44-30 38 38 0 0 0 44 23Z" opacity=".55"/>' +
      '<path fill-rule="evenodd" fill="' + C.kraft + '" d="M48 24a24 24 0 1 0 .01 0Z M48 31a17 17 0 1 0 .01 0Z"/>' +
      '<path d="M22 26a34 34 0 0 1 18-12" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>' +
      '<path d="M85 64l9 22-16-6z" fill="' + C.s2 + '"/>')
  });

  /* HVAC filter */
  (function () {
    var pl = "";
    for (var x = 16; x < 110; x += 10) pl += '<path d="M' + x + ' 12v100" stroke="' + C.off2 + '" stroke-width="3"/>';
    items.push({
      id: "filter", name: "HVAC filter", w: 124, h: 124,
      parts: [{ t: "rect", x: 0, y: 0, w: 124, h: 124, ch: 5 }],
      svg: svg(124, 124,
        block(0, 0, 124, 124, 6, C.kraft, C.kraft2, 0.14) +
        r(11, 11, 102, 102, 2, C.white) + pl + r(11, 82, 102, 31, 0, C.off, ' opacity=".6"') +
        '<path d="M50 44h14V30l22 26-22 26V68H50z" fill="' + C.ink + '"/>')
    });
  })();

  /* faucet cartridge */
  items.push({
    id: "cart", name: "Faucet cartridge", w: 60, h: 124,
    parts: [{ t: "rect", x: 20, y: 0, w: 20, h: 28, ch: 4 }, { t: "rect", x: 6, y: 24, w: 48, h: 100, ch: 8 }],
    svg: svg(60, 124,
      block(21, 0, 18, 30, 3, C.s2, C.s3, 0.3) + r(25, 2, 2, 20, 1, C.s3) + r(31, 2, 2, 20, 1, C.s3) +
      block(8, 24, 44, 68, 9, C.white, C.off2, 0.3, 0) +
      r(6, 40, 48, 7, 3.5, C.ink) + r(6, 68, 48, 7, 3.5, C.ink) +
      block(13, 90, 34, 34, 7, C.s1, C.s2, 0.35) + r(11, 95, 38, 6, 3, C.red))
  });

  /* phone set: fewer bodies */
  var phoneSet = ["fuse", "lock", "towel", "boltL", "glasses", "glove", "tape"];

  window.EN_ITEMS = { list: items, colors: C, phoneSet: phoneSet };
})();
