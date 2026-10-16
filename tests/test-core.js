// Tests du moteur pur / pure engine tests (node tests/test-core.js)
var C = require("./load.js")();
var n = 0, fail = 0;
function ok(c, msg) { n++; if (!c) { fail++; console.log("ÉCHEC " + msg); } }
function eq(a, b, msg) { var A = JSON.stringify(a), B = JSON.stringify(b); ok(A === B, msg + "\n  obtenu  " + A + "\n  attendu " + B); }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, msg + " (" + a + " vs " + b + ")"); }
function cls(t, d) { return C.halClassify(t, d).join(""); }

// 1. écritures / scripts
eq(C.halScriptOf(0x41), "L", "A latin");
eq(C.halScriptOf(0xE9), "L", "é latin");
eq(C.halScriptOf(0xD7), "N", "× neutre");
eq(C.halScriptOf(0x025B), "L", "ɛ berbère latin");
eq(C.halScriptOf(0x0263), "L", "ɣ berbère latin");
eq(C.halScriptOf(0x1E0D), "L", "ḍ latin étendu");
eq(C.halScriptOf(0x0628), "A", "ب arabe");
eq(C.halScriptOf(0x064E), "A", "fatha arabe");
eq(C.halScriptOf(0x0661), "A", "١ chiffre arabe");
eq(C.halScriptOf(0x060C), "N", "، neutre");
eq(C.halScriptOf(0x061F), "N", "؟ neutre");
eq(C.halScriptOf(0xFEFB), "A", "ligature lam-alif");
eq(C.halScriptOf(0xFEFF), "N", "BOM neutre");
eq(C.halScriptOf(0x06A4), "A", "ڤ (Maghreb)");
eq(C.halScriptOf(0x2D63), "T", "ⵣ tifinagh");
eq(C.halScriptOf(0x2D6F), "T", "ⵯ labialisation");
eq(C.halScriptOf(0x31), "N", "1 neutre");
eq(C.halScriptOf(0x20), "N", "espace");
eq(C.halScriptOf(0x0436), "L", "ж cyrillique");

// 2. classification avec neutres / neutrals
var AR = "\u0627\u0644\u0647\u0627\u062A\u0641"; // الهاتف
eq(cls("Tél / " + AR), "LLLNNN" + "AAAAAA", "neutres entre deux écritures");
eq(cls(AR + " " + AR), "AAAAAAAAAAAAA", "espace entre deux mots arabes");
eq(cls(AR + "!"), "AAAAAAA", "ponctuation finale suit l'arabe");
eq(cls(AR + "\u061F"), "AAAAAAA", "؟ suit l'arabe");
eq(cls("(" + AR + ")"), "AAAAAAAA", "parenthèses autour de l'arabe");
eq(cls(AR + " 2026 " + AR), "AAAAAA" + "AAAAAA" + "AAAAAA", "chiffres entre arabe suivent");
eq(cls(AR + " 2026 " + AR, true), "AAAAAA" + "ANNNNA" + "AAAAAA", "chiffres fixes");
eq(cls("Prix 1200 DA"), "LLLLLLLLLLLL", "latin seul");
eq(cls("123"), "NNN", "chiffres seuls neutres");
eq(cls("ab\u0003cd"), "LLNLL", "retour forcé jamais classé");
eq(cls("\u2D30\u2D63\u2D53\u2D4D Azul"), "TTTTNLLLL", "tifinagh puis latin");
eq(C.halCountScripts("Azul \u2D30\u2D63 " + AR), { L: 4, A: 6, T: 2 }, "comptes par écriture");

// 3. outils
eq(C.halRound(12.345, 0.1), 12.3, "arrondi 0,1");
eq(C.halRound(12.38, 0.25), 12.5, "arrondi 0,25");
eq(C.halRound(141.6, 1), 142, "arrondi 1");
eq(C.halMedian([3, 1, 2]), 2, "médiane impaire");
eq(C.halMedian([4, 1, 2, 3]), 2.5, "médiane paire");
ok(isNaN(C.halMedian([])), "médiane vide");
ok(C.halAllSame([5, 5, 5.005]), "valeurs égales (.notdef)");
ok(!C.halAllSame([5, 6]), "valeurs différentes");
eq(C.halKeys("A", { arMode: "body" }), { latin: "xh", other: "body" }, "clés corps");
eq(C.halKeys("A", { arMode: "alifCap" }), { latin: "cap", other: "alif" }, "clés alif/cap");
eq(C.halKeys("A", { arMode: "alifAsc" }), { latin: "asc", other: "alif" }, "clés alif/hampes");
eq(C.halKeys("T", { tifMode: "cap" }), { latin: "cap", other: "tif" }, "clés tifinagh");
eq(C.halKeys("T", { tifMode: "xh" }), { latin: "xh", other: "tif" }, "clés tifinagh x");

// 4. facteur / factor
var refA = { size: 12, h: 100, v: 100 }, tgtA = { size: 12, h: 100, v: 100 };
near(C.halFactor(52, refA, 37, tgtA, 1, false), 52 / 37, 1e-9, "facteur simple");
near(C.halFactor(52, refA, 37, tgtA, 1.1, false), 1.1 * 52 / 37, 1e-9, "coefficient 110 %");
near(C.halFactor(52, { size: 10, h: 100, v: 100 }, 37, { size: 20, h: 100, v: 100 }, 1, false), 52 * 10 / (37 * 20), 1e-9, "corps différents");
near(C.halFactor(52, { size: 12, h: 100, v: 80 }, 37, tgtA, 1, false), 52 * 0.8 / 37, 1e-9, "échelle verticale de la référence");
near(C.halFactor(37, refA, 52, tgtA, 1.1, true), 37 / 1.1 / 52, 1e-9, "latin cible : divisé par k");
ok(isNaN(C.halFactor(0, refA, 37, tgtA, 1, false)), "métrique nulle");
var O = { tol: 0.02, method: "scale", sizeStep: 0.1, scaleStep: 1 };
eq(C.halNewAttrs({ size: 12, h: 100, v: 100 }, 1.4054, O), { h: 141, v: 141 }, "échelle");
eq(C.halNewAttrs({ size: 12, h: 90, v: 100 }, 1.4, O), { h: 126, v: 140 }, "garde le rapport H/V");
eq(C.halNewAttrs({ size: 12, h: 100, v: 100 }, 1.01, O), null, "sous la tolérance");
eq(C.halNewAttrs({ size: 12, h: 100, v: 100 }, 1.4, { tol: 0.02, method: "size", sizeStep: 0.5, scaleStep: 1 }), { size: 17 }, "corps arrondi 0,5");
eq(C.halNewAttrs({ size: 12, h: 100, v: 100 }, 0.001, O), { h: 1, v: 1 }, "borne mini échelle");
eq(C.halNewAttrs({ size: 1000, h: 100, v: 100 }, 2, { tol: 0, method: "size", sizeStep: 0.1 }), { size: 1296 }, "borne maxi corps");
eq(C.halAfter({ size: 12, h: 100, v: 100 }, { h: 141, v: 141 }), { size: 12, h: 141, v: 141 }, "attributs après");

// 5. graisse / weight
near(C.halStem(1000, 200), 10, 1e-9, "épaisseur 2A/P (rectangle fin)");
near(C.halStemAbs(10, { size: 12, h: 100, v: 100 }), 1.2, 1e-9, "épaisseur réelle");
near(C.halStemAbs(10, { size: 12, h: 150, v: 150 }), 1.8, 1e-9, "épaisseur après échelle");
var refM = { xh: 50, cap: 70, asc: 74, wL: 10 };
var cands = [
  { font: { name: "Ar-Light" }, m: { body: 35, alif: 70, wA: 5 } },
  { font: { name: "Ar-Regular" }, m: { body: 35, alif: 70, wA: 7 } },
  { font: { name: "Ar-Bold" }, m: { body: 36, alif: 70, wA: 10 } },
  { font: { name: "Ar-Black" }, m: { body: 37, alif: 70, wA: 13 } }];
var OW = { k: 1, method: "scale", sizeStep: 0.1, scaleStep: 1, weightK: 1 };
var bw = C.halBestWeight(cands, refM, { size: 12, h: 100, v: 100 }, { size: 12, h: 100, v: 100 }, { latin: "xh", other: "body" }, "A", OW);
eq(bw.font.name, "Ar-Regular", "graisse la plus proche après mise à l'échelle (7 × 50/35 = 10)");
bw = C.halBestWeight(cands, { xh: 50, cap: 70, asc: 74, wL: 14 }, { size: 12, h: 100, v: 100 }, { size: 12, h: 100, v: 100 }, { latin: "xh", other: "body" }, "A", OW);
eq(bw.font.name, "Ar-Bold", "latin gras → arabe Bold");
eq(C.halBestWeight([], refM, refA, tgtA, { latin: "xh", other: "body" }, "A", OW), null, "aucun candidat");

// 6. modèles de blocs / frame models
function F(name) { var p = name.split("-"); return { name: name, family: p[0], style: p[1] || "Regular" }; }
function run(text, font, size, h, v) { return { text: text, font: F(font), size: size, h: h || 100, v: v || 100 }; }
function frame(cx, cy, paras) { return { center: [cx, cy], paras: paras.map(function (r) { return { runs: r, charsOk: true }; }) }; }
var M = {
  "Lat-Regular#L": { xh: 52, cap: 70, asc: 74, wL: 9 },
  "Lat-Bold#L": { xh: 53, cap: 70, asc: 74, wL: 15 },
  "Ar-Regular#A": { body: 37, alif: 72, wA: 6.5 },
  "Ar-Bold#A": { body: 38, alif: 72, wA: 10 },
  "Ar-Light#A": { body: 36, alif: 72, wA: 4 },
  "Tif-Regular#T": { tif: 66, wT: 8 },
  "Mix-Regular#L": { xh: 48, cap: 68, asc: 72, wL: 8 },
  "Mix-Regular#A": { body: 30, alif: 66, wA: 6 }
};
function getM(font, role) { return M[font.name + "#" + role] || null; }
function sibs(font) { return ["Regular", "Bold", "Light"].map(function (s) { return F(font.family + "-" + s); }).filter(function (f) { return M[f.name + "#A"] || M[f.name + "#L"] || M[f.name + "#T"]; }); }
var base = { doA: true, doT: true, direction: "other", arMode: "body", tifMode: "cap", k: 1, method: "scale", tol: 0.02, sizeStep: 0.1, scaleStep: 1, useNearest: true, digitsFixed: false, weight: false, applyWeight: false, weightTol: 0.12, weightK: 1 };
function opt(o) { var r = {}, k; for (k in base) r[k] = base[k]; for (k in o || {}) r[k] = o[k]; return r; }

// paragraphe mixte, une police par écriture
var fr1 = [frame(0, 0, [[run("T\u00E9l / ", "Lat-Regular", 12), run(AR, "Ar-Regular", 12)]])];
var pl = C.halPlan(fr1, opt(), getM, null);
eq(pl.actions.length, 1, "une action");
eq(pl.actions[0].whole, true, "passage entier");
eq(pl.actions[0].set, { h: 141, v: 141 }, "échelle 52/37 = 140,5 % → 141 %");
eq(pl.chars, 6, "6 caractères");
eq(pl.pairs[0].where, "para", "référence dans le paragraphe");

// même police pour les deux écritures (passage mixte)
var fr2 = [frame(0, 0, [[run("T\u00E9l / " + AR + " 0555", "Mix-Regular", 10)]])];
pl = C.halPlan(fr2, opt(), getM, null);
eq(pl.actions.length, 1, "un segment");
eq([pl.actions[0].start, pl.actions[0].end, pl.actions[0].whole], [6, 17, false], "segment arabe + espace + chiffres finaux");
eq(pl.actions[0].set, { h: 160, v: 160 }, "48/30 = 160 %");

// chiffres fixes
pl = C.halPlan(fr2, opt({ digitsFixed: true }), getM, null);
eq([pl.actions[0].start, pl.actions[0].end], [6, 13], "chiffres laissés (espace finale suit l'arabe)");

// bloc arabe seul → bloc latin voisin, même rang de paragraphe
var fr3 = [
  frame(0, 0, [[run("Entreprise", "Lat-Regular", 18)], [run("Adresse", "Lat-Regular", 9)]]),
  frame(300, 0, [[run(AR, "Ar-Regular", 18)], [run(AR, "Ar-Regular", 9)]]),
  frame(5000, 0, [[run("Loin", "Lat-Bold", 40)]])];
pl = C.halPlan(fr3, opt(), getM, null);
eq(pl.actions.length, 2, "deux paragraphes arabes");
eq(pl.pairs[0].ref.size, 18, "rang 1 ↔ 18 pt");
eq(pl.pairs[1].ref.size, 9, "rang 2 ↔ 9 pt");
eq(pl.pairs[0].where, "near", "référence voisine");
pl = C.halPlan(fr3, opt({ useNearest: false }), getM, null);
eq([pl.actions.length, pl.noRef], [0, 12], "sans voisin : non traité");

// rangs différents → dominant du bloc voisin
var fr4 = [
  frame(0, 0, [[run("Titre", "Lat-Regular", 30)], [run("Un texte plus long ici", "Lat-Regular", 10)]]),
  frame(10, 0, [[run(AR, "Ar-Regular", 10)]])];
pl = C.halPlan(fr4, opt(), getM, null);
eq(pl.pairs[0].ref.size, 10, "dominant par nombre de caractères");

// sens inverse : latin sur l'arabe
pl = C.halPlan(fr1, opt({ direction: "latin" }), getM, null);
eq(pl.actions.length, 1, "latin ajusté");
eq([pl.actions[0].start, pl.actions[0].end], [0, 3], "seulement « Tél » (neutres entre écritures laissés)");
eq(pl.actions[0].set, { h: 71, v: 71 }, "37/52 = 71 %");

// tifinagh
var fr5 = [frame(0, 0, [[run("Azul ", "Lat-Regular", 20), run("\u2D30\u2D63\u2D53\u2D4D", "Tif-Regular", 20)]])];
pl = C.halPlan(fr5, opt(), getM, null);
eq(pl.actions[0].set, { h: 106, v: 106 }, "tifinagh 66 → capitales 70");
pl = C.halPlan(fr5, opt({ doT: false }), getM, null);
eq(pl.actions.length, 0, "tifinagh décoché");
pl = C.halPlan(fr5, opt({ tifMode: "xh" }), getM, null);
eq(pl.actions[0].set, { h: 79, v: 79 }, "tifinagh sur hauteur d'x");

// alif / capitales
pl = C.halPlan(fr1, opt({ arMode: "alifCap" }), getM, null);
eq(pl.actions[0].set, { h: 97, v: 97 }, "alif 72 → capitales 70 = 97 %");
pl = C.halPlan(fr1, opt({ arMode: "alifCap", tol: 0.05 }), getM, null);
eq([pl.actions.length, pl.unchanged], [0, 6], "alif dans la tolérance 5 %");
pl = C.halPlan(fr1, opt({ arMode: "alifAsc" }), getM, null);
eq(pl.actions[0].set, { h: 103, v: 103 }, "alif → hampes 74/72");

// méthode corps / size method
pl = C.halPlan(fr1, opt({ method: "size", sizeStep: 0.5 }), getM, null);
eq(pl.actions[0].set, { size: 17 }, "corps 12 × 1,405 = 16,86 → 17");
// coefficient
pl = C.halPlan(fr1, opt({ k: 1.1 }), getM, null);
eq(pl.actions[0].set, { h: 155, v: 155 }, "coefficient 110 %");

// police sans métrique (glyphes absents)
var fr6 = [frame(0, 0, [[run("Nom ", "Lat-Regular", 12), run(AR, "Lat-Regular", 12)]])];
pl = C.halPlan(fr6, opt(), getM, null);
eq([pl.actions.length, pl.noMetric], [0, 6], "police latine sans arabe : non mesurable");

// paragraphe avec caractères hors BMP : passage mixte ignoré, passage entier traité
var fr7 = [{ center: [0, 0], paras: [{ charsOk: false, runs: [run("Tel " + AR, "Mix-Regular", 10)] }, { charsOk: false, runs: [run("Nom ", "Lat-Regular", 12), run(AR, "Ar-Regular", 12)] }] }];
pl = C.halPlan(fr7, opt(), getM, null);
eq([pl.actions.length, pl.skippedChars], [1, 6], "hors BMP : partiel ignoré, entier gardé");

// graisse
pl = C.halPlan(fr1, opt({ weight: true }), getM, sibs);
near(pl.pairs[0].ratio, 6.5 * 1.41 / 9, 1e-6, "rapport de graisse après réglage");
ok(pl.pairs[0].suggest === null, "Regular accordé (1,02) : aucune suggestion");
var fr8 = [frame(0, 0, [[run("Bold ", "Lat-Bold", 12), run(AR, "Ar-Regular", 12)]])];
pl = C.halPlan(fr8, opt({ weight: true }), getM, sibs);
eq(pl.pairs[0].suggest.font.name, "Ar-Bold", "latin gras → Ar-Bold conseillé");
eq(pl.actions[0].set.font, undefined, "suggestion non appliquée par défaut");
pl = C.halPlan(fr8, opt({ weight: true, applyWeight: true }), getM, sibs);
eq(pl.actions[0].set.font.name, "Ar-Bold", "suggestion appliquée");
eq([pl.actions[0].set.h, pl.actions[0].set.v], [139, 139], "échelle recalculée pour Ar-Bold (53/38)");
var fr9 = [frame(0, 0, [[run("light ", "Lat-Regular", 12), run(AR, "Ar-Bold", 12)]])];
pl = C.halPlan(fr9, opt({ weight: true }), getM, sibs);
eq(pl.pairs[0].suggest.font.name, "Ar-Regular", "arabe trop gras → Regular");

// rapport / report
var rep = C.halReport(C.halPlan(fr8, opt({ weight: true }), getM, sibs), opt({ weight: true }), false);
ok(rep.indexOf("Analyse (aucune modification)") === 0, "titre du rapport");
ok(rep.indexOf("Ar Bold") > 0, "suggestion dans le rapport");
ok(rep.indexOf("\u00E9chelle H/V 100/100 \u2192 139/139 %") > 0 || rep.indexOf("100/100") > 0, "échelle dans le rapport");
rep = C.halReport(C.halPlan([frame(0, 0, [[run("Rien", "Lat-Regular", 12)]])], opt(), getM, null), opt(), false);
ok(rep.indexOf("Aucun passage") > 0, "rapport vide");

// 7. aléatoire : après application, hauteurs visibles égales et 2e passage sans action
function rnd(a, b) { return a + Math.random() * (b - a); }
function applyModel(frames, plan) {
  plan.actions.forEach(function (a) {
    var pa = frames[a.frame].paras[a.para], r = pa.runs[a.run];
    if (a.whole) { if (a.set.size !== undefined) r.size = a.set.size; if (a.set.h !== undefined) { r.h = a.set.h; r.v = a.set.v; } }
    else {
      // découpe du passage / split the run
      var parts = [], t = r.text;
      if (a.start > 0) parts.push({ text: t.slice(0, a.start), font: r.font, size: r.size, h: r.h, v: r.v });
      parts.push({ text: t.slice(a.start, a.end), font: r.font, size: a.set.size !== undefined ? a.set.size : r.size, h: a.set.h !== undefined ? a.set.h : r.h, v: a.set.v !== undefined ? a.set.v : r.v });
      if (a.end < t.length) parts.push({ text: t.slice(a.end), font: r.font, size: r.size, h: r.h, v: r.v });
      r.__parts = parts;
    }
  });
  frames.forEach(function (f) { f.paras.forEach(function (p) { var nr = []; p.runs.forEach(function (r) { if (r.__parts) nr = nr.concat(r.__parts); else nr.push({ text: r.text, font: r.font, size: r.size, h: r.h, v: r.v }); }); p.runs = nr; }); });
}
var badH = 0, badIdem = 0, maxErr = 0, N = 2000;
for (var it = 0; it < N; it++) {
  var lx = rnd(40, 58), ab = rnd(25, 45), method = Math.random() < 0.5 ? "scale" : "size";
  M["RL-Regular#L"] = { xh: lx, cap: lx * 1.4, asc: lx * 1.45, wL: 9 };
  M["RA-Regular#A"] = { body: ab, alif: ab * 2, wA: 6 };
  var ls = Math.round(rnd(6, 60)), as = Math.round(rnd(6, 60)), hv = Math.round(rnd(70, 130));
  var mixed = Math.random() < 0.5;
  var fr = mixed ? [frame(0, 0, [[run("Nom : ", "RL-Regular", ls), run(AR + " " + AR, "RA-Regular", as, hv, hv)]])]
                 : [frame(0, 0, [[run("Nom : " + AR, "RL-Regular", ls)], [run(AR, "RA-Regular", as, hv, hv)]])];
  if (!mixed) { M["RL-Regular#A"] = { body: ab * 0.9, alif: ab * 1.8, wA: 6 }; }
  var o = opt({ method: method, sizeStep: 0.1, tol: 0.02 });
  var p1 = C.halPlan(fr, o, getM, null);
  applyModel(fr, p1);
  // contrôle : chaque passage arabe a une hauteur = hauteur d'x latine (± tolérance + arrondi)
  fr[0].paras.forEach(function (pa) {
    var lat = pa.runs.filter(function (r) { return /[A-Za-z]/.test(r.text); })[0] || fr[0].paras[0].runs[0];
    var latH = M[lat.font.name + "#L"].xh * lat.size * lat.v / 1e4;
    pa.runs.forEach(function (r) {
      if (!/[\u0600-\u06FF]/.test(r.text) || /[A-Za-z]/.test(r.text)) return;
      var aH = M[r.font.name + "#A"].body * r.size * r.v / 1e4, err = Math.abs(aH / latH - 1);
      if (err > maxErr) maxErr = err;
      var bound = 0.02 * 1.0001 + (method === "size" ? 0.05 / r.size : 0.5 / r.v) * 1.02 + 1e-9; if (err > bound) badH++;
    });
  });
  var p2 = C.halPlan(fr, o, getM, null);
  if (p2.actions.length) badIdem++;
}
ok(badH === 0, "aléatoire : hauteurs égales à la tolérance + arrondi près (" + N + " cas, écart max " + (maxErr * 100).toFixed(2) + " %)");
ok(badIdem === 0, "aléatoire : 2e passage sans action (" + badIdem + " échecs / " + N + ")");
console.log("écart max après application : " + (maxErr * 100).toFixed(2) + " %");

console.log((n - fail) + " / " + n + " tests réussis");
process.exit(fail ? 1 : 0);
