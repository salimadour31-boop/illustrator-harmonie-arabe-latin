// DOM Illustrator simulé (minimal) / minimal simulated Illustrator DOM
var AR_TATWEEL = 0x0640;
function makeFonts() {
  var defs = {};
  function latin(name, xh, cap, asc, stem) { return { kind: "L", xh: xh, cap: cap, asc: asc, stem: stem }; }
  defs["Lat-Regular"] = { family: "Lat", style: "Regular", L: latin(0, 52, 70, 74, 9) };
  defs["Lat-Bold"] = { family: "Lat", style: "Bold", L: latin(0, 53, 70, 74, 15) };
  defs["Ar-Light"] = { family: "Ar", style: "Light", A: { teeth: [36, 35, 37, 36], alif: 72, stem: 4 }, L: latin(0, 50, 68, 72, 5) };
  defs["Ar-Regular"] = { family: "Ar", style: "Regular", A: { teeth: [37, 36, 38, 37], alif: 72, stem: 6.5 }, L: latin(0, 50, 68, 72, 7) };
  defs["Ar-Bold"] = { family: "Ar", style: "Bold", A: { teeth: [38, 37, 39, 38], alif: 73, stem: 10 }, L: latin(0, 51, 68, 72, 11) };
  defs["Mix-Regular"] = { family: "Mix", style: "Regular", A: { teeth: [30, 29, 31, 30], alif: 66, stem: 6 }, L: latin(0, 48, 68, 72, 8) };
  defs["Tif-Regular"] = { family: "Tif", style: "Regular", T: { h: 66, stem: 8 }, L: latin(0, 50, 70, 72, 8) };
  defs["Sub-Regular"] = { family: "Sub", style: "Regular", L: latin(0, 50, 70, 72, 8), substituteArabic: true };
  var list = [];
  Object.keys(defs).forEach(function (n) { var d = defs[n]; d.name = n; list.push(d); });
  list.getByName = function (n) { for (var i = 0; i < list.length; i++) if (list[i].name === n) return list[i]; throw new Error("No such font " + n); };
  return list;
}
// métrique d'un glyphe à 100 pt / glyph metric at 100 pt; null = absent
function glyph(font, ch) {
  var c = ch.charCodeAt(0), A = font.A, T = font.T, Lm = font.L, w = 50;
  if (c === AR_TATWEEL) return A ? { top: 8, bottom: 0, w: 30, stem: A.stem } : null;
  if (c >= 0x0600 && c <= 0x06FF) {
    if (!A) return null;
    var map = { 0x0628: A.teeth[0], 0x0633: A.teeth[1], 0x0635: A.teeth[2], 0x062D: A.teeth[3], 0x0627: A.alif };
    return { top: map[c] !== undefined ? map[c] : A.teeth[0], bottom: -10, w: 40, stem: A.stem };
  }
  if (c >= 0x2D30 && c <= 0x2D7F) {
    if (!T) return null;
    var tw = (c === 0x2D4F) ? 10 : 50;
    return { top: T.h, bottom: 0, w: tw, stem: T.stem };
  }
  if (c === 32) return { top: 0, bottom: 0, w: 25, stem: 0, space: true };
  if (!Lm) return null;
  var top = /[A-Z]/.test(ch) ? Lm.cap : (/[bdfhklt]/.test(ch) ? Lm.asc : Lm.xh);
  return { top: top, bottom: 0, w: w, stem: Lm.stem };
}

function Env() {
  var env = this;
  env.fonts = makeFonts();
  env.log = [];
  env.ComposerEngineType = { optycaComposer: "optyca", latinCJKComposer: "latin", adornmentComposer: "adorn" };
  env.ParagraphDirectionType = { RIGHT_TO_LEFT_DIRECTION: "rtl", LEFT_TO_RIGHT_DIRECTION: "ltr" };
  env.DocumentColorSpace = { RGB: "rgb", CMYK: "cmyk" };
  env.RGBColor = function () {}; env.CMYKColor = function () {};
  var doc = { typename: "Document", layers: [], selection: [], documentColorSpace: "rgb", name: "test.ai" };
  env.doc = doc;
  doc.artboards = [{ artboardRect: [0, 800, 600, 0] }]; doc.artboards.getActiveArtboardIndex = function () { return 0; };
  function collection(arr) { return arr; }
  function Layer(name) {
    var lay = this; lay.typename = "Layer"; lay.name = name; lay.locked = false; lay.visible = true; lay.printable = true; lay.parent = doc;
    lay.items = [];
    lay.textFrames = { add: function () { return new Frame(lay, true); }, pointText: function (p) { var f = new Frame(lay, true); f.anchor = [p[0], p[1]]; return f; } };
    Object.defineProperty(lay.textFrames, "length", { get: function () { return lay.items.filter(function (i) { return i.typename === "TextFrame"; }).length; } });
    lay.pathItems = { add: function () { var p = { typename: "PathItem", setEntirePath: function (pts) { p.pts = pts; }, remove: function () { lay.items.splice(lay.items.indexOf(p), 1); } }; lay.items.push(p); return p; } };
    lay.remove = function () { doc.layers.splice(doc.layers.indexOf(lay), 1); };
  }
  doc.layers.add = function () { var l = new Layer("Calque " + (doc.layers.length + 1)); doc.layers.unshift(l); return l; };
  doc.layers.getByName = function (n) { for (var i = 0; i < doc.layers.length; i++) if (doc.layers[i].name === n) return doc.layers[i]; throw new Error("no layer"); };
  Object.defineProperty(doc, "textFrames", { get: function () {
    var all = []; doc.layers.forEach(function (l) { l.items.forEach(function (i) { if (i.typename === "TextFrame") all.push(i); }); });
    all.getByName = null; return all; } });

  function Ch(c, font) { return { c: c, font: font, size: 12, h: 100, v: 100 }; }
  function TR(frame, s, e) { this.frame = frame; this.s = s; this.e = e; }
  Object.defineProperty(TR.prototype, "contents", { get: function () { return this.frame.chars.slice(this.s, this.e).map(function (x) { return x.c; }).join(""); } });
  Object.defineProperty(TR.prototype, "length", { get: function () { return this.e - this.s; } });
  Object.defineProperty(TR.prototype, "story", { get: function () { return { textFrames: [this.frame] }; } });
  Object.defineProperty(TR.prototype, "characterAttributes", { get: function () {
    var tr = this, chars = tr.frame.chars.slice(tr.s, tr.e), first = chars[0] || {};
    function setAll(k, v) { chars.forEach(function (c) {
      if (k === "font") {
        // protection des glyphes : la police est remplacée si le glyphe manque / missing glyph protection
        if (v.substituteArabic && /[\u0600-\u06FF]/.test(c.c)) { c.font = env.fonts.getByName("Ar-Regular"); return; }
      }
      c[k] = v; }); env.log.push(k); }
    var o = {};
    Object.defineProperty(o, "textFont", { get: function () { return first.font; }, set: function (v) { setAll("font", v); } });
    Object.defineProperty(o, "size", { get: function () { return first.size; }, set: function (v) { setAll("size", v); } });
    Object.defineProperty(o, "horizontalScale", { get: function () { return first.h; }, set: function (v) { setAll("h", v); } });
    Object.defineProperty(o, "verticalScale", { get: function () { return first.v; }, set: function (v) { setAll("v", v); } });
    Object.defineProperty(o, "baselineShift", { get: function () { return 0; }, set: function () {} });
    Object.defineProperty(o, "tracking", { get: function () { return 0; }, set: function () {} });
    return o; } });
  Object.defineProperty(TR.prototype, "paragraphAttributes", { get: function () { var f = this.frame; return { set composerEngine(v) { f.composer = v; }, get composerEngine() { return f.composer; }, set paragraphDirection(v) { f.dir = v; } }; } });
  Object.defineProperty(TR.prototype, "characters", { get: function () { var a = [], i; for (i = this.s; i < this.e; i++) a.push(new TR(this.frame, i, i + 1)); return a; } });
  Object.defineProperty(TR.prototype, "paragraphs", { get: function () {
    var a = [], st = this.s, i, ch = this.frame.chars;
    for (i = this.s; i <= this.e; i++) { if (i === this.e || ch[i].c === "\r") { a.push(new TR(this.frame, st, i)); st = i + 1; } }
    return a; } });
  Object.defineProperty(TR.prototype, "textRanges", { get: function () {
    var a = [], st = this.s, i, ch = this.frame.chars;
    function same(x, y) { return x.font === y.font && x.size === y.size && x.h === y.h && x.v === y.v; }
    for (i = this.s + 1; i <= this.e; i++) { if (i === this.e || !same(ch[i], ch[i - 1])) { a.push(new TR(this.frame, st, i)); st = i; } }
    return a; } });

  function Frame(layer, add) {
    var f = this; f.typename = "TextFrame"; f.parent = layer; f.layer = layer; f.locked = false; f.hidden = false; f.chars = []; f.anchor = [0, 0];
    f.left = 0; f.top = 0;
    if (add) layer.items.push(f);
  }
  Object.defineProperty(Frame.prototype, "contents", { get: function () { return this.chars.map(function (c) { return c.c; }).join(""); },
    set: function (t) { var font = env.fonts.getByName("Lat-Regular"); this.chars = String(t).split("").map(function (c) { return Ch(c, font); }); } });
  Object.defineProperty(Frame.prototype, "textRange", { get: function () { return new TR(this, 0, this.chars.length); } });
  Object.defineProperty(Frame.prototype, "width", { get: function () { var w = 0; this.chars.forEach(function (c) { var g = glyph(c.font, c.c) || { w: 50 }; w += g.w * c.size / 100 * c.h / 100; }); return w; } });
  Object.defineProperty(Frame.prototype, "geometricBounds", { get: function () { var x = this.anchor[0], y = this.anchor[1]; return [x, y + 20, x + this.width, y - 5]; } });
  Frame.prototype.remove = function () { var i = this.layer.items.indexOf(this); if (i >= 0) this.layer.items.splice(i, 1); };
  Frame.prototype.createOutline = function () {
    var f = this, top = -1e9, bot = 1e9, x = 0, paths = [], y0 = f.anchor[1];
    f.chars.forEach(function (c) {
      var g = glyph(c.font, c.c), k = c.size / 100;
      if (!g) g = { top: 70, bottom: 0, w: 50, stem: 3 }; // boîte .notdef / notdef box
      if (!g.space) {
        top = Math.max(top, y0 + g.top * k * c.v / 100); bot = Math.min(bot, y0 + g.bottom * k * c.v / 100);
        var per = 200 * k, area = g.stem * k * per / 2;
        paths.push({ typename: "PathItem", area: -area, length: per });
      }
      x += g.w * k;
    });
    f.remove();
    env.outlines = (env.outlines || 0) + 1;
    var grp = { typename: "GroupItem", geometricBounds: [f.anchor[0], top, f.anchor[0] + x, bot], pageItems: paths, remove: function () { env.removed = (env.removed || 0) + 1; } };
    return grp;
  };
  env.Layer = Layer;
  env.addFrame = function (layer, x, y, parts) {
    var f = new Frame(layer, true); f.anchor = [x, y];
    parts.forEach(function (p) { var font = env.fonts.getByName(p[1]); p[0].split("").forEach(function (c) { var ch = Ch(c, font); ch.size = p[2]; ch.h = p[3] || 100; ch.v = p[4] || p[3] || 100; f.chars.push(ch); }); });
    return f;
  };
  env.app = { locale: "fr_FR", textFonts: env.fonts, documents: [doc], activeDocument: doc };
  return env;
}
module.exports = Env;
