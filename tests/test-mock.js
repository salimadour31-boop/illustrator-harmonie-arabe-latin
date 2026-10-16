// Tests sur DOM Illustrator simulé / tests on a simulated Illustrator DOM (node tests/test-mock.js)
var Env = require("./mockai.js"), load = require("./load.js");
var n = 0, fail = 0;
function ok(c, msg) { n++; if (!c) { fail++; console.log("ÉCHEC " + msg); } }
function eq(a, b, msg) { var A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, msg + "\n  obtenu  " + A + "\n  attendu " + B); }
var AR = "\u0627\u0644\u0647\u0627\u062A\u0641";
function setup() {
  var env = new Env();
  var C = load({ app: env.app, ComposerEngineType: env.ComposerEngineType, ParagraphDirectionType: env.ParagraphDirectionType, DocumentColorSpace: env.DocumentColorSpace, RGBColor: env.RGBColor, CMYKColor: env.CMYKColor });
  var lay = env.doc.layers.add(); lay.name = "Calque 1";
  return { env: env, C: C, lay: lay, doc: env.doc };
}
function opts(o) {
  var b = { scope: "doc", doA: true, doT: true, direction: "other", arMode: "body", tifMode: "cap", k: 1, method: "scale", tol: 0.02, sizeStep: 0.1, scaleStep: 1, useNearest: true, digitsFixed: false, weight: false, applyWeight: false, weightTol: 0.12, weightK: 1, check: false, report: false }, k;
  for (k in o || {}) b[k] = o[k]; return b;
}
function attrsOf(f, from, to) { return f.chars.slice(from, to).map(function (c) { return [c.font.name, c.size, c.h, c.v]; }); }
function uniq(a) { var s = {}; a.forEach(function (x) { s[JSON.stringify(x)] = x; }); return Object.keys(s).map(function (k) { return s[k]; }); }

// 1. mesures / measuring
var S = setup(), C = S.C;
var mL = C.halGetMetrics(S.doc, { name: "Lat-Regular" }, "L");
eq([mL.xh, mL.cap, mL.asc], [52, 70, 74], "latin : x, H, l mesurés sur les contours");
ok(Math.abs(mL.wL - 9) < 1e-9, "latin : épaisseur 2A/P = 9");
var mA = C.halGetMetrics(S.doc, { name: "Ar-Regular" }, "A");
eq([mA.body, mA.alif], [37, 72], "arabe : corps = médiane des dents, alif");
ok(Math.abs(mA.wA - 6.5) < 1e-9, "arabe : épaisseur");
var mT = C.halGetMetrics(S.doc, { name: "Tif-Regular" }, "T");
eq(mT.tif, 66, "tifinagh : hauteur");
eq(C.halGetMetrics(S.doc, { name: "Lat-Regular" }, "A"), null, "police sans arabe : boîtes .notdef identiques → null");
eq(C.halGetMetrics(S.doc, { name: "Lat-Regular" }, "T"), null, "police sans tifinagh → null");
eq(C.halGetMetrics(S.doc, { name: "Sub-Regular" }, "A"), null, "police remplacée (protection des glyphes) → null");
eq(C.halGetMetrics(S.doc, { name: "Inconnue" }, "L"), null, "police absente → null");
var nOut = S.env.outlines; C.halGetMetrics(S.doc, { name: "Ar-Regular" }, "A");
eq(S.env.outlines, nOut, "mesures en cache");
eq(S.env.fonts.length > 0 && S.doc.layers.some(function (l) { return l.name === C.HAL.TMP_LAYER; }), true, "calque temporaire créé");
eq(S.doc.layers.filter(function (l) { return l.name === C.HAL.TMP_LAYER; })[0].items.length, 0, "aucun objet temporaire laissé");
C.halRemoveTmp();
ok(!S.doc.layers.some(function (l) { return l.name === C.HAL.TMP_LAYER; }), "calque temporaire supprimé");
ok(S.env.doc.layers.length === 1, "document inchangé après mesure");

// 2. document complet / full document
S = setup(); C = S.C;
var f1 = S.env.addFrame(S.lay, 0, 700, [["T\u00E9l / ", "Lat-Regular", 12], [AR, "Ar-Regular", 12]]);
var f2 = S.env.addFrame(S.lay, 0, 600, [["Nom " + AR + " 2026", "Mix-Regular", 10]]);
var f3 = S.env.addFrame(S.lay, 0, 500, [["Entreprise\rAdresse", "Lat-Regular", 18]]);
f3.chars.slice(11).forEach(function (c) { c.size = 9; });
var f4 = S.env.addFrame(S.lay, 300, 500, [[AR + "\r" + AR, "Ar-Regular", 18]]);
f4.chars.slice(7).forEach(function (c) { c.size = 9; });
var f5 = S.env.addFrame(S.lay, 0, 400, [["Lock ", "Lat-Regular", 12], [AR, "Ar-Regular", 12]]); f5.locked = true;
var f6 = S.env.addFrame(S.lay, 0, 300, [["Azul ", "Lat-Regular", 20], ["\u2D30\u2D63\u2D53\u2D4D", "Tif-Regular", 20]]);
var lay2 = S.doc.layers.add(); lay2.name = "Masqué"; lay2.visible = false;
var f7 = S.env.addFrame(lay2, 0, 200, [["Cach\u00E9 ", "Lat-Regular", 12], [AR, "Ar-Regular", 12]]);

var r = C.halRun(S.doc, opts({ check: true }), false); C.halRemoveTmp();
eq(uniq(attrsOf(f1, 0, 6)), [["Lat-Regular", 12, 100, 100]], "latin intact");
eq(uniq(attrsOf(f1, 6, 12)), [["Ar-Regular", 12, 141, 141]], "arabe 52/37 → 141 %");
eq(uniq(attrsOf(f2, 0, 4)), [["Mix-Regular", 10, 100, 100]], "même police : latin intact");
eq(uniq(attrsOf(f2, 4, 15)), [["Mix-Regular", 10, 160, 160]], "même police : arabe + espace + chiffres 160 %");
eq(uniq(attrsOf(f4, 0, 6)), [["Ar-Regular", 18, 141, 141]], "bloc arabe → bloc latin voisin, paragraphe 1");
eq(uniq(attrsOf(f4, 7, 13)), [["Ar-Regular", 9, 141, 141]], "paragraphe 2 (9 pt ↔ 9 pt)");
eq(uniq(attrsOf(f5, 5, 11)), [["Ar-Regular", 12, 100, 100]], "bloc verrouillé ignoré");
eq(uniq(attrsOf(f7, 6, 12)), [["Ar-Regular", 12, 100, 100]], "calque masqué ignoré");
eq(uniq(attrsOf(f6, 5, 9)), [["Tif-Regular", 20, 106, 106]], "tifinagh 66 → 70");
eq(f3.chars.every(function (c) { return c.h === 100 && c.v === 100; }), true, "bloc latin intact");
ok(/Caract\u00E8res modifi\u00E9s : 33/.test(r.text), "33 caractères modifiés (6 + 11 + 12 + 4) : " + r.text.split("\n")[0]);
ok(/tout est dans la tol\u00E9rance/.test(r.text), "recontrôle après application");
var chk = S.doc.layers.filter(function (l) { return l.name === C.HAL.CHECK_LAYER; });
eq(chk.length, 1, "planche de contrôle créée");
eq(chk[0].printable, false, "planche non imprimable");
ok(chk[0].items.filter(function (i) { return i.typename === "TextFrame"; }).length >= 9, "planche : échantillons et étiquettes");
ok(chk[0].items.filter(function (i) { return i.typename === "PathItem"; }).length === 3 * r.plan.pairs.length, "planche : 3 lignes par couple");
// 2e passage : rien à faire, planche ignorée / second pass: nothing to do, check sheet ignored
var before = JSON.stringify(S.doc.layers.map(function (l) { return l.items.filter(function (i) { return i.chars; }).map(function (i) { return i.chars.map(function (c) { return [c.font.name, c.size, c.h, c.v]; }); }); }));
var r2 = C.halRun(S.doc, opts(), false); C.halRemoveTmp();
eq(r2.plan.actions.length, 0, "2e passage : aucune action (pas d'accumulation)");
var after = JSON.stringify(S.doc.layers.map(function (l) { return l.items.filter(function (i) { return i.chars; }).map(function (i) { return i.chars.map(function (c) { return [c.font.name, c.size, c.h, c.v]; }); }); }));
eq(after === before, true, "2e passage : document identique (planche non modifiée)");
// analyse seule / dry run
S.env.log = [];
var r3 = C.halRun(S.doc, opts({ tol: 0 }), true); C.halRemoveTmp();
ok(S.env.log.every(function (k) { return true; }) && /Analyse \(aucune modification\)/.test(r3.text), "analyse : rapport");
eq(after, JSON.stringify(S.doc.layers.map(function (l) { return l.items.filter(function (i) { return i.chars; }).map(function (i) { return i.chars.map(function (c) { return [c.font.name, c.size, c.h, c.v]; }); }); })), "analyse : document inchangé");
// remise à 100 % / reset
var nr = C.halResetScale(S.doc.textFrames.filter(function (f) { return C.halEditable(f); }).map(C.halReadFrame), opts());
eq(uniq(attrsOf(f1, 6, 12)), [["Ar-Regular", 12, 100, 100]], "remise à 100 % (arabe)");
eq(uniq(attrsOf(f2, 0, 4)), [["Mix-Regular", 10, 100, 100]], "remise : latin non touché");
eq(uniq(attrsOf(f2, 4, 15)), [["Mix-Regular", 10, 100, 100]], "remise : passage mixte caractère par caractère");
eq(nr, 6 + 11 + 12 + 4, "remise : nombre de caractères");
// effacer la planche
eq(C.halClearCheck(S.doc), true, "planche effacée");
eq(C.halClearCheck(S.doc), false, "rien à effacer");

// 3. sélection, corps, sens inverse / selection, size, reverse
S = setup(); C = S.C;
f1 = S.env.addFrame(S.lay, 0, 700, [["T\u00E9l / ", "Lat-Regular", 12], [AR, "Ar-Regular", 12]]);
f2 = S.env.addFrame(S.lay, 0, 600, [["Fax / ", "Lat-Regular", 12], [AR, "Ar-Regular", 12]]);
S.doc.selection = [f1];
C.halRun(S.doc, opts({ scope: "sel", method: "size", sizeStep: 0.5 }), false); C.halRemoveTmp();
eq(uniq(attrsOf(f1, 6, 12)), [["Ar-Regular", 17, 100, 100]], "corps 12 → 17 pt (arrondi 0,5)");
eq(uniq(attrsOf(f2, 6, 12)), [["Ar-Regular", 12, 100, 100]], "hors sélection : intact");
var grp = { typename: "GroupItem", pageItems: [f2], parent: S.lay, locked: false, hidden: false };
S.doc.selection = [grp];
C.halRun(S.doc, opts({ scope: "sel", direction: "latin" }), false); C.halRemoveTmp();
eq(uniq(attrsOf(f2, 0, 3)), [["Lat-Regular", 12, 71, 71]], "sens inverse dans un groupe : latin 71 %");
S.doc.selection = { typename: "TextRange", story: { textFrames: [f1] } };
eq(C.halCollectFrames(S.doc, "sel").length, 1, "sélection à l'outil Texte → bloc parent");
S.doc.selection = [];
eq(C.halRun(S.doc, opts({ scope: "sel" }), false).plan, null, "sélection vide : message, rien fait");

// 4. graisse / weight
S = setup(); C = S.C;
f1 = S.env.addFrame(S.lay, 0, 700, [["Bold ", "Lat-Bold", 12], [AR, "Ar-Regular", 12]]);
r = C.halRun(S.doc, opts({ weight: true }), true); C.halRemoveTmp();
eq(r.plan.pairs[0].suggest.font.name, "Ar-Bold", "latin gras : Ar Bold conseillé (famille lue dans app.textFonts)");
ok(/conseill\u00E9 : Ar Bold/.test(r.text), "suggestion dans le rapport");
C.halRun(S.doc, opts({ weight: true, applyWeight: true, check: true }), false); C.halRemoveTmp();
eq(uniq(attrsOf(f1, 5, 11)), [["Ar-Bold", 12, 139, 139]], "style appliqué et échelle recalculée");
eq(uniq(attrsOf(f1, 0, 5)), [["Lat-Bold", 12, 100, 100]], "latin intact");

// 5. dialogue ScriptUI simulé / simulated ScriptUI dialog
function makeWindowMock(script) {
  var made = [];
  function Ctl(type, text, props) { this.type = type; this.text = text; this.props = props || {}; this.value = false; this.enabled = true; this.children = []; made.push(this); }
  Ctl.prototype.add = function (type, b, text, props) {
    var c = new Ctl(type, text, props);
    if (type === "dropdownlist") { c.items = text; c.selection = null; Object.defineProperty(c, "selection", { get: function () { return this._sel; }, set: function (v) { this._sel = (typeof v === "number") ? { index: v } : v; } }); }
    this.children.push(c); return c;
  };
  function Window(type, title) { Ctl.call(this, type, title); this.closed = null; }
  Window.prototype = Object.create(Ctl.prototype);
  Window.prototype.show = function () { script(made, this); return 1; };
  Window.prototype.close = function (v) { this.closed = v; };
  return Window;
}
function findB(made, txt) { for (var i = 0; i < made.length; i++) if (made[i].type === "button" && made[i].text === txt) return made[i]; throw new Error("no button " + txt); }
function find(made, txt) { for (var i = 0; i < made.length; i++) if (made[i].type !== "edittext" && made[i].text && String(made[i].text).indexOf(txt) === 0) return made[i]; throw new Error("no control " + txt); }
S = setup();
var analysed = "";
var Win = makeWindowMock(function (made, w) {
  if (w.text.indexOf("Harmoniser") !== 0) return;
  findB(made, "Analyser").onClick();
  analysed = made.filter(function (c) { return c.props.multiline; })[0].text;
  find(made, "Corps (taille").value = true; find(made, "Corps (taille").onClick && find(made, "Corps (taille").onClick();
  findB(made, "Harmoniser").onClick();
});
C = load({ app: S.env.app, Window: Win, ComposerEngineType: S.env.ComposerEngineType, ParagraphDirectionType: S.env.ParagraphDirectionType, DocumentColorSpace: S.env.DocumentColorSpace });
var lay = S.doc.layers[0];
f1 = S.env.addFrame(lay, 0, 700, [["T\u00E9l / ", "Lat-Regular", 12], [AR, "Ar-Regular", 12]]);
S.doc.selection = [f1];
var res = C.halDialog(S.doc);
ok(/Analyse \(aucune modification\)/.test(analysed) && /\u00D7 1,405/.test(analysed), "dialogue : Analyser affiche le rapport (× 1,405)");
eq(res.action, "run", "dialogue : Harmoniser");
eq([res.opts.scope, res.opts.method, res.opts.arMode, res.opts.k, res.opts.tol, res.opts.weight], ["sel", "size", "body", 1, 0.02, true], "dialogue : options lues");
eq(uniq(attrsOf(f1, 6, 12)), [["Ar-Regular", 12, 100, 100]], "dialogue : Analyser ne modifie rien");
ok(!S.doc.layers.some(function (l) { return l.name === C.HAL.TMP_LAYER; }), "dialogue : calque temporaire retiré après Analyser");
// main sans document / main without document
var alerts = [];
var C2 = load({ app: { locale: "en_US", documents: [] }, alert: function (m) { alerts.push(m); } });
C2.halMain();
ok(/No document open/.test(alerts[0]), "sans document : message (EN)");
var C3 = load({ app: { locale: "fr_FR", documents: [{}], activeDocument: { textFrames: [] } }, alert: function (m) { alerts.push(m); } });
C3.halMain();
ok(/aucun texte vivant/.test(alerts[1]), "document sans texte : message (FR)");

console.log((n - fail) + " / " + n + " tests réussis");
process.exit(fail ? 1 : 0);
