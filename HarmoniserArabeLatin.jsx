/*
 * HarmoniserArabeLatin.jsx — v1.0.0
 * Harmonise la taille visible (et la graisse) de l'arabe / du tifinagh avec le latin
 * Matches the visible size (and weight) of Arabic / Tifinagh text to Latin text
 * Adobe Illustrator CC 2018–2026 (ExtendScript ES3)
 *
 * FR : À corps égal, l'arabe paraît beaucoup plus petit que le latin (et le tifinagh parfois plus
 *      grand). Ce script mesure la vraie forme des lettres dans les polices utilisées (copies
 *      vectorisées temporaires) : hauteur d'x, capitales et hampes du latin ; dents et boucles
 *      (ب س ص ح) et alif de l'arabe ; hauteur du tifinagh. Il calcule ensuite, pour chaque passage
 *      arabe ou tifinagh, l'échelle (ou le corps) qui lui donne la même taille visible que le latin
 *      du même paragraphe, ou du bloc latin le plus proche, et l'applique lettre par lettre sans
 *      toucher au reste de la mise en forme. En option : compare l'épaisseur des traits et propose
 *      (ou applique) la graisse de la même famille qui s'accorde le mieux au latin, et pose une
 *      planche de contrôle sur un calque non imprimable.
 * EN : At the same point size, Arabic looks much smaller than Latin (and Tifinagh sometimes larger).
 *      This script measures the real letter shapes of the fonts in use (temporary outlined copies):
 *      Latin x-height, cap height and ascenders; Arabic teeth/bowls (ب س ص ح) and alef; Tifinagh
 *      height. For every Arabic or Tifinagh passage it computes the scale (or size) that gives it
 *      the same visible size as the Latin text of the same paragraph, or of the nearest Latin block,
 *      and applies it character by character without touching any other formatting. Optionally it
 *      compares stroke thickness, suggests (or applies) the best matching weight from the same
 *      family, and draws a check sheet on a non-printing layer.
 *
 * Copyright (c) 2026 Amirouche Amwanes — MIT License
 * Aucun appel réseau, aucune collecte de données. / No network access, no data collection.
 * Conseil : travaillez sur une copie du fichier. / Tip: work on a copy of your file.
 */

#target illustrator

var HAL = {};
HAL.VERSION = "1.0.0";
HAL.CHECK_LAYER = "Harmonie arabe-latin (controle)";
HAL.TMP_LAYER = "HAL mesures temporaires";
HAL.FR = true;
try { HAL.FR = String(app.locale || "fr").toLowerCase().indexOf("fr") === 0; } catch (eLoc) { HAL.FR = true; }

/* Traduction / translation */
function L(fr, en) { return HAL.FR ? fr : en; }

/* Échantillons mesurés (police à 100 pt) / measured samples (font at 100 pt)
   Arabe : formes médianes sans point au-dessus (le haut = dents / boucles), alif, mot sans points.
   Arabic: medial forms without dots above (top = teeth / bowls), alef, dotless word. */
HAL.SAMPLES = {
    xh: "x", cap: "H", asc: "l", wL: "nnooee",
    body: ["\u0640\u0628\u0640", "\u0640\u0633\u0640", "\u0640\u0635\u0640", "\u0640\u062D\u0640"],
    alif: "\u0627", wA: "\u0645\u062D\u0645\u062F \u0648\u0633\u0644\u0645",
    tif: ["\u2D4E", "\u2D37", "\u2D59", "\u2D4F"], wT: "\u2D4E\u2D4F\u2D59\u2D54"
};

/* ===================================================================== */
/*  1. Moteur pur (testable hors Illustrator) / pure engine (testable)   */
/* ===================================================================== */

/* Écriture d'un caractère : "L" latin (et grec / cyrillique), "A" arabe, "T" tifinagh, "N" neutre
   (espaces, chiffres 0-9, ponctuation, symboles : ils suivent l'écriture voisine).
   Script of a character: L Latin (+ Greek / Cyrillic), A Arabic, T Tifinagh, N neutral. */
function halScriptOf(code) {
    if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) { return "L"; }
    if (code >= 0xC0 && code <= 0x2AF) { return (code === 0xD7 || code === 0xF7) ? "N" : "L"; }
    if (code >= 0x370 && code <= 0x52F) { return (code === 0x37E || code === 0x387) ? "N" : "L"; }
    if ((code >= 0x1E00 && code <= 0x1EFF) || (code >= 0x2C60 && code <= 0x2C7F) || (code >= 0xA720 && code <= 0xA7FF) || (code >= 0xFB00 && code <= 0xFB06)) { return "L"; }
    if (code >= 0x0600 && code <= 0x06FF) {
        /* ponctuation arabe ، ؛ ؟ ٪ ٫ ٬ ۔ : neutre (suit le contexte) / Arabic punctuation: neutral */
        if (code === 0x060C || code === 0x061B || code === 0x061F || code === 0x066A || code === 0x066B || code === 0x066C || code === 0x06D4 || code === 0x061C) { return "N"; }
        return "A";
    }
    if ((code >= 0x0750 && code <= 0x077F) || (code >= 0x0870 && code <= 0x08FF) || (code >= 0xFB50 && code <= 0xFDFF) || (code >= 0xFE70 && code <= 0xFEFC)) { return "A"; }
    if (code >= 0x2D30 && code <= 0x2D7F) { return "T"; }
    return "N";
}

/* Classe de chaque caractère d'un paragraphe ; un neutre prend l'écriture de ses voisins si elle est
   la même des deux côtés (ou s'il n'a qu'un voisin), sinon il reste neutre (non modifié).
   Class of every character; a neutral takes its neighbours' script when both sides agree. */
function halClassify(text, digitsFixed) {
    var s = String(text), n = s.length, cls = [], prev = [], next = [], i, last = "", code;
    for (i = 0; i < n; i++) {
        code = s.charCodeAt(i);
        cls[i] = halScriptOf(code);
        if (digitsFixed && code >= 0x30 && code <= 0x39) { cls[i] = "D"; }
    }
    for (i = 0; i < n; i++) { prev[i] = last; if (cls[i] === "L" || cls[i] === "A" || cls[i] === "T") { last = cls[i]; } }
    last = "";
    for (i = n - 1; i >= 0; i--) { next[i] = last; if (cls[i] === "L" || cls[i] === "A" || cls[i] === "T") { last = cls[i]; } }
    for (i = 0; i < n; i++) {
        if (cls[i] === "D") { cls[i] = "N"; continue; }
        if (cls[i] !== "N") { continue; }
        code = s.charCodeAt(i);
        if (code === 0x0D || code === 0x0A || code === 0x03 || code === 0x2029) { continue; }
        if (prev[i] && next[i]) { cls[i] = (prev[i] === next[i]) ? prev[i] : "N"; }
        else { cls[i] = prev[i] || next[i] || "N"; }
    }
    return cls;
}

/* Compte des caractères forts par écriture / strong characters per script */
function halCountScripts(text) {
    var s = String(text), r = { L: 0, A: 0, T: 0 }, i, k;
    for (i = 0; i < s.length; i++) { k = halScriptOf(s.charCodeAt(i)); if (k !== "N") { r[k]++; } }
    return r;
}

/* Valeurs toutes égales (boîtes .notdef identiques = glyphes absents) / all equal (missing glyph boxes) */
function halAllSame(a) {
    var i;
    if (a.length < 2) { return false; }
    for (i = 1; i < a.length; i++) { if (Math.abs(a[i] - a[0]) > 0.01) { return false; } }
    return true;
}
function halRound(x, step) {
    if (!step || step <= 0) { return Math.round(x * 1000) / 1000; }
    return Math.round(Math.round(x / step) * step * 1000) / 1000;
}
function halClamp(x, a, b) { return x < a ? a : (x > b ? b : x); }
function halMedian(arr) {
    var a = [], i;
    for (i = 0; i < arr.length; i++) { if (typeof arr[i] === "number" && !isNaN(arr[i])) { a.push(arr[i]); } }
    if (!a.length) { return NaN; }
    a.sort(function (x, y) { return x - y; });
    return (a.length % 2) ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}

/* Clés de métrique selon le mode / metric keys for the chosen mode
   arMode : "body" (dents ↔ hauteur d'x), "alifCap" (alif ↔ capitales), "alifAsc" (alif ↔ hampes l)
   tifMode : "cap" ou "xh" */
function halKeys(script, opts) {
    if (script === "A") {
        if (opts.arMode === "alifCap") { return { latin: "cap", other: "alif" }; }
        if (opts.arMode === "alifAsc") { return { latin: "asc", other: "alif" }; }
        return { latin: "xh", other: "body" };
    }
    return { latin: (opts.tifMode === "xh") ? "xh" : "cap", other: "tif" };
}

/* Facteur de mise à l'échelle de la cible pour que (autre écriture) = k × (latin) en hauteur visible.
   Scale factor for the target so that (other script) = k × (Latin) in visible height.
   refM / tgtM : métriques à 100 pt (pt) ; attrs : {size, h, v} */
function halFactor(refM, refAttrs, tgtM, tgtAttrs, k, targetIsLatin) {
    if (!(refM > 0) || !(tgtM > 0)) { return NaN; }
    var refH = refM * refAttrs.size / 100 * refAttrs.v / 100;
    var tgtH = tgtM * tgtAttrs.size / 100 * tgtAttrs.v / 100;
    if (!(refH > 0) || !(tgtH > 0)) { return NaN; }
    var wanted = targetIsLatin ? refH / k : refH * k;
    return wanted / tgtH;
}

/* Nouveaux attributs ou null si l'écart est sous la tolérance / new attributes or null */
function halNewAttrs(cur, f, opts) {
    if (!(f > 0) || isNaN(f)) { return null; }
    if (Math.abs(f - 1) < opts.tol) { return null; }
    if (opts.method === "size") {
        var s = halClamp(halRound(cur.size * f, opts.sizeStep), 0.1, 1296);
        if (Math.abs(s - cur.size) < 1e-6) { return null; }
        return { size: s };
    }
    var v = halClamp(halRound(cur.v * f, opts.scaleStep), 1, 10000);
    var h = halClamp(halRound(cur.h * f, opts.scaleStep), 1, 10000);
    if (Math.abs(v - cur.v) < 1e-6 && Math.abs(h - cur.h) < 1e-6) { return null; }
    return { h: h, v: v };
}

/* Attributs après modification / attributes after the change */
function halAfter(cur, na) {
    if (!na) { return { size: cur.size, h: cur.h, v: cur.v }; }
    return { size: (na.size !== undefined) ? na.size : cur.size, h: (na.h !== undefined) ? na.h : cur.h, v: (na.v !== undefined) ? na.v : cur.v };
}

/* Épaisseur moyenne des traits (2 × surface / périmètre) à 100 pt, puis épaisseur réelle.
   Mean stroke thickness (2 × area / perimeter) at 100 pt, then real thickness. */
function halStem(area, perim) { return (perim > 0) ? 2 * Math.abs(area) / perim : NaN; }
function halStemAbs(stem100, attrs) { return stem100 * attrs.size / 100 * Math.sqrt(attrs.h * attrs.v) / 100; }

/* Choix de la graisse : parmi les styles de la même famille (chacun avec ses métriques), celui dont
   l'épaisseur, une fois mis à la bonne taille, est la plus proche du latin.
   Weight choice: among same-family styles, the one whose stroke thickness at the matched size is
   closest to the Latin one. cands: [{font, m}] ; renvoie {font, ratio, attrs} */
function halBestWeight(cands, refM, refAttrs, tgtAttrs, keys, script, opts) {
    var best = null, i, c, f, na, after, st, rStem, ratio, score, wKey = (script === "A") ? "wA" : "wT";
    var refStem = halStemAbs(refM.wL, refAttrs);
    if (!(refStem > 0)) { return null; }
    for (i = 0; i < cands.length; i++) {
        c = cands[i];
        if (!c.m || !(c.m[keys.other] > 0) || !(c.m[wKey] > 0)) { continue; }
        f = halFactor(refM[keys.latin], refAttrs, c.m[keys.other], tgtAttrs, opts.k, false);
        na = halNewAttrs(tgtAttrs, f, { tol: 0, method: opts.method, sizeStep: opts.sizeStep, scaleStep: opts.scaleStep });
        after = halAfter(tgtAttrs, na);
        st = halStemAbs(c.m[wKey], after);
        rStem = st / refStem;
        ratio = rStem / opts.weightK;
        score = Math.abs(Math.log(ratio));
        if (!best || score < best.score - 1e-9) { best = { font: c.font, m: c.m, ratio: ratio, attrs: after, score: score }; }
    }
    return best;
}

/* Attributs dominants (par nombre de caractères) d'une écriture dans une liste de passages.
   Dominant attributes (by character count) of a script in a list of runs. */
function halDominant(runs, script, digitsFixed) {
    var tally = {}, order = [], i, j, r, cls, n, key, best = null;
    for (i = 0; i < runs.length; i++) {
        r = runs[i]; cls = r.cls || halClassify(r.text, digitsFixed); n = 0;
        for (j = 0; j < cls.length; j++) { if (cls[j] === script && halScriptOf(r.text.charCodeAt(j)) === script) { n++; } }
        if (!n) { continue; }
        key = r.font.name + "|" + r.size + "|" + r.h + "|" + r.v;
        if (!tally[key]) { tally[key] = { n: 0, run: r }; order.push(key); }
        tally[key].n += n;
    }
    for (i = 0; i < order.length; i++) { if (!best || tally[order[i]].n > best.n) { best = tally[order[i]]; } }
    return best ? { font: best.run.font, size: best.run.size, h: best.run.h, v: best.run.v } : null;
}

/* Bloc de référence le plus proche (centre à centre) qui contient l'écriture de référence.
   Nearest reference frame (centre to centre) containing the reference script. */
function halNearestFrame(frames, idx, refScript) {
    var best = -1, bestD = 0, i, dx, dy, d, a = frames[idx];
    for (i = 0; i < frames.length; i++) {
        if (i === idx || !frames[i].counts || !frames[i].counts[refScript]) { continue; }
        dx = frames[i].center[0] - a.center[0]; dy = frames[i].center[1] - a.center[1];
        d = dx * dx + dy * dy;
        if (best < 0 || d < bestD) { best = i; bestD = d; }
    }
    return best;
}

function halNonEmptyParas(fr) {
    var r = [], p;
    for (p = 0; p < fr.paras.length; p++) { if (/\S/.test(fr.paras[p].text)) { r.push(p); } }
    return r;
}

/* Préparation des modèles : texte et classes de chaque paragraphe / prepare models */
function halPrepare(frames, opts) {
    var i, p, r, fr, pa, cls, pos;
    for (i = 0; i < frames.length; i++) {
        fr = frames[i]; fr.counts = { L: 0, A: 0, T: 0 };
        for (p = 0; p < fr.paras.length; p++) {
            pa = fr.paras[p]; pa.text = "";
            for (r = 0; r < pa.runs.length; r++) { pa.text += pa.runs[r].text; }
            cls = halClassify(pa.text, opts.digitsFixed); pos = 0;
            for (r = 0; r < pa.runs.length; r++) { pa.runs[r].cls = cls.slice(pos, pos + pa.runs[r].text.length); pa.runs[r].offset = pos; pos += pa.runs[r].text.length; }
            pa.counts = halCountScripts(pa.text);
            fr.counts.L += pa.counts.L; fr.counts.A += pa.counts.A; fr.counts.T += pa.counts.T;
        }
    }
}

/* Référence d'un paragraphe : même paragraphe, sinon même bloc, sinon bloc voisin (même rang de
   paragraphe si les deux blocs en ont autant), sinon null.
   Reference of a paragraph: same paragraph, else same frame, else nearest frame (same paragraph rank). */
function halFindRef(frames, fi, p, refScript, opts) {
    var fr = frames[fi], pa = fr.paras[p], ref, all = [], q, j, near, ne, nf, rank;
    ref = halDominant(pa.runs, refScript, opts.digitsFixed);
    if (ref) { return { attrs: ref, where: "para" }; }
    for (q = 0; q < fr.paras.length; q++) { all = all.concat(fr.paras[q].runs); }
    ref = halDominant(all, refScript, opts.digitsFixed);
    if (ref) { return { attrs: ref, where: "frame" }; }
    if (!opts.useNearest) { return null; }
    near = halNearestFrame(frames, fi, refScript);
    if (near < 0) { return null; }
    ne = halNonEmptyParas(fr); nf = halNonEmptyParas(frames[near]);
    rank = -1;
    for (j = 0; j < ne.length; j++) { if (ne[j] === p) { rank = j; } }
    if (rank >= 0 && ne.length === nf.length) {
        ref = halDominant(frames[near].paras[nf[rank]].runs, refScript, opts.digitsFixed);
        if (ref) { return { attrs: ref, where: "near", frame: near }; }
    }
    all = [];
    for (q = 0; q < frames[near].paras.length; q++) { all = all.concat(frames[near].paras[q].runs); }
    ref = halDominant(all, refScript, opts.digitsFixed);
    return ref ? { attrs: ref, where: "near", frame: near } : null;
}

/* Plan complet (aucune modification) / full plan (no change)
   frames : [{center:[x,y], paras:[{runs:[{text, font:{name,family,style}, size, h, v}], charsOk}]}]
   getM(font, role) -> métriques ou null ; getSiblings(font) -> [font] (graisse)
   opts : {doA, doT, direction:"other"|"latin", arMode, tifMode, k, method, tol, sizeStep, scaleStep,
           useNearest, digitsFixed, weight, applyWeight, weightTol, weightK} */
function halPlan(frames, opts, getM, getSiblings) {
    var plan = { actions: [], pairs: [], pairIndex: {}, noRef: 0, noMetric: 0, skippedChars: 0, unchanged: 0, chars: 0, frames: 0 }, touched = {};
    halPrepare(frames, opts);
    var fi, p, r, fr, pa, run, targets = [], t, refScript, tgtScript, ref, keys, refM, tgtM, f, na, segs, s, e, j, pk, pair, tgtAttrs, font, wbest, sib, cands, ci, mWeight;
    if (opts.direction === "latin") { targets = ["L"]; } else { if (opts.doA) { targets.push("A"); } if (opts.doT) { targets.push("T"); } }
    for (fi = 0; fi < frames.length; fi++) {
        fr = frames[fi];
        for (p = 0; p < fr.paras.length; p++) {
            pa = fr.paras[p];
            for (t = 0; t < targets.length; t++) {
                tgtScript = targets[t];
                if (!pa.counts[tgtScript]) { continue; }
                if (tgtScript === "L") {
                    refScript = (opts.doA && (pa.counts.A || fr.counts.A)) ? "A" : ((opts.doT && (pa.counts.T || fr.counts.T)) ? "T" : (opts.doA ? "A" : "T"));
                } else { refScript = "L"; }
                ref = halFindRef(frames, fi, p, refScript, opts);
                if (!ref) { plan.noRef += pa.counts[tgtScript]; continue; }
                keys = halKeys(tgtScript === "L" ? refScript : tgtScript, opts);
                refM = getM(ref.attrs.font, refScript);
                for (r = 0; r < pa.runs.length; r++) {
                    run = pa.runs[r];
                    /* segments contigus de l'écriture cible dans ce passage / contiguous target segments */
                    segs = []; s = -1;
                    for (j = 0; j <= run.cls.length; j++) {
                        if (j < run.cls.length && run.cls[j] === tgtScript) { if (s < 0) { s = j; } }
                        else if (s >= 0) { segs.push([s, j]); s = -1; }
                    }
                    if (!segs.length) { continue; }
                    font = run.font;
                    tgtAttrs = { size: run.size, h: run.h, v: run.v };
                    tgtM = getM(font, tgtScript);
                    var nChars = 0;
                    for (j = 0; j < segs.length; j++) { nChars += segs[j][1] - segs[j][0]; }
                    if (!refM || !tgtM) { plan.noMetric += nChars; continue; }
                    var refKey = (tgtScript === "L") ? keys.other : keys.latin, tgtKey = (tgtScript === "L") ? keys.latin : keys.other;
                    f = halFactor(refM[refKey], ref.attrs, tgtM[tgtKey], tgtAttrs, opts.k, tgtScript === "L");
                    if (isNaN(f)) { plan.noMetric += nChars; continue; }
                    na = halNewAttrs(tgtAttrs, f, opts);
                    wbest = null;
                    pk = ref.attrs.font.name + "|" + ref.attrs.size + "|" + ref.attrs.v + "|" + font.name + "|" + run.size + "|" + run.v;
                    pair = plan.pairIndex[pk];
                    if (!pair) {
                        pair = { ref: ref.attrs, refScript: refScript, tgtScript: tgtScript, font: font, attrs: tgtAttrs, f: f, after: halAfter(tgtAttrs, na), na: na, chars: 0, refM: refM, tgtM: tgtM, keys: keys, ratio: NaN, suggest: null, where: ref.where };
                        if (opts.weight && tgtScript !== "L") {
                            mWeight = (tgtScript === "A") ? "wA" : "wT";
                            if (refM.wL > 0 && tgtM[mWeight] > 0) {
                                pair.ratio = halStemAbs(tgtM[mWeight], pair.after) / halStemAbs(refM.wL, ref.attrs) / opts.weightK;
                                if (Math.abs(Math.log(pair.ratio)) > Math.log(1 + opts.weightTol) && getSiblings) {
                                    sib = getSiblings(font) || []; cands = [];
                                    for (ci = 0; ci < sib.length; ci++) { cands.push({ font: sib[ci], m: getM(sib[ci], tgtScript) }); }
                                    wbest = halBestWeight(cands, refM, ref.attrs, tgtAttrs, keys, tgtScript, opts);
                                    if (wbest && wbest.font.name !== font.name && Math.abs(Math.log(wbest.ratio)) < Math.abs(Math.log(pair.ratio)) - 0.02) { pair.suggest = wbest; }
                                }
                            }
                        }
                        plan.pairIndex[pk] = pair; plan.pairs.push(pair);
                    }
                    pair.chars += nChars;
                    if (opts.applyWeight && pair.suggest) {
                        na = halNewAttrs(tgtAttrs, halFactor(refM[refKey], ref.attrs, getM(pair.suggest.font, tgtScript)[tgtKey], tgtAttrs, opts.k, false), { tol: 0, method: opts.method, sizeStep: opts.sizeStep, scaleStep: opts.scaleStep }) || {};
                        na.font = pair.suggest.font;
                    }
                    if (!na) { plan.unchanged += nChars; continue; }
                    for (j = 0; j < segs.length; j++) {
                        var whole = (segs[j][0] === 0 && segs[j][1] === run.text.length);
                        if (!whole && pa.charsOk === false) { plan.skippedChars += segs[j][1] - segs[j][0]; continue; }
                        plan.actions.push({ frame: fi, para: p, run: r, start: segs[j][0], end: segs[j][1], offset: run.offset, whole: whole, set: na });
                        plan.chars += segs[j][1] - segs[j][0];
                        touched[fi] = true;
                    }
                }
            }
        }
    }
    for (fi in touched) { if (touched.hasOwnProperty(fi)) { plan.frames++; } }
    return plan;
}

/* Format des nombres / number formatting */
function halFmt(x, d) {
    if (typeof x !== "number" || isNaN(x)) { return "?"; }
    var m = Math.pow(10, d === undefined ? 1 : d), s = String(Math.round(x * m) / m);
    return HAL.FR ? s.replace(".", ",") : s;
}
function halFontLabel(font) { return font ? (font.family && font.style ? font.family + " " + font.style : font.name) : "?"; }
function halMetricLabel(key) {
    var t = { xh: L("hauteur d'x", "x-height"), cap: L("capitales", "cap height"), asc: L("hampes (l)", "ascenders (l)"),
        body: L("corps arabe (dents \u0628 \u0633 \u0635)", "Arabic body (teeth \u0628 \u0633 \u0635)"), alif: L("alif", "alef"), tif: L("hauteur tifinagh", "Tifinagh height") };
    return t[key] || key;
}

/* Rapport texte / text report */
function halReport(plan, opts, applied) {
    var out = [], i, pr, refKey, tgtKey, line, nm, hdr;
    hdr = applied ? L("Harmonisation appliqu\u00E9e", "Harmonisation applied") : L("Analyse (aucune modification)", "Analysis (no change)");
    out.push(hdr + " \u2014 HarmoniserArabeLatin v" + HAL.VERSION);
    out.push(L("Caract\u00E8res \u00E0 ajuster : ", "Characters to adjust: ") + plan.chars + L(" dans ", " in ") + plan.frames + L(" bloc(s) de texte", " text frame(s)"));
    if (plan.unchanged) { out.push(L("D\u00E9j\u00E0 harmonis\u00E9s (\u00E9cart sous la tol\u00E9rance) : ", "Already matched (below tolerance): ") + plan.unchanged); }
    if (plan.noRef) { out.push(L("Sans r\u00E9f\u00E9rence (aucun texte de l'autre \u00E9criture dans le paragraphe, le bloc ou un bloc voisin) : ", "Without reference (no text of the other script in the paragraph, frame or a nearby frame): ") + plan.noRef); }
    if (plan.noMetric) { out.push(L("Non mesurables (glyphes absents de la police ?) : ", "Not measurable (glyphs missing from the font?): ") + plan.noMetric); }
    if (plan.skippedChars) { out.push(L("Ignor\u00E9s (caract\u00E8res hors BMP dans le paragraphe, passage mixte) : ", "Skipped (non-BMP characters in the paragraph, mixed run): ") + plan.skippedChars); }
    out.push("");
    for (i = 0; i < plan.pairs.length; i++) {
        pr = plan.pairs[i];
        refKey = (pr.tgtScript === "L") ? pr.keys.other : pr.keys.latin; tgtKey = (pr.tgtScript === "L") ? pr.keys.latin : pr.keys.other;
        nm = { L: L("Latin", "Latin"), A: L("Arabe", "Arabic"), T: L("Tifinagh", "Tifinagh") };
        out.push((i + 1) + ". " + nm[pr.refScript] + L(" (r\u00E9f\u00E9rence) : ", " (reference): ") + halFontLabel(pr.ref.font) + " " + halFmt(pr.ref.size) + " pt" + (pr.ref.v !== 100 ? " / V " + halFmt(pr.ref.v, 0) + " %" : "") +
            " \u2014 " + halMetricLabel(refKey) + " " + halFmt(pr.refM[refKey] / 100, 3) + " em");
        out.push("   " + nm[pr.tgtScript] + " : " + halFontLabel(pr.font) + " " + halFmt(pr.attrs.size) + " pt" + (pr.attrs.v !== 100 ? " / V " + halFmt(pr.attrs.v, 0) + " %" : "") +
            " \u2014 " + halMetricLabel(tgtKey) + " " + halFmt(pr.tgtM[tgtKey] / 100, 3) + " em");
        line = "   \u2192 \u00D7 " + halFmt(pr.f, 3);
        if (pr.na) {
            if (pr.na.size !== undefined) { line += L(" : corps ", ": size ") + halFmt(pr.attrs.size, 2) + " \u2192 " + halFmt(pr.after.size, 2) + " pt"; }
            else { line += L(" : \u00E9chelle H/V ", ": H/V scale ") + halFmt(pr.attrs.h, 0) + "/" + halFmt(pr.attrs.v, 0) + " \u2192 " + halFmt(pr.after.h, 0) + "/" + halFmt(pr.after.v, 0) + " %"; }
        } else { line += L(" : d\u00E9j\u00E0 harmonis\u00E9", ": already matched"); }
        line += " (" + pr.chars + L(" car.", " chars") + (pr.where === "near" ? L(", r\u00E9f\u00E9rence prise dans le bloc voisin", ", reference taken from the nearby frame") : "") + ")";
        out.push(line);
        if (!isNaN(pr.ratio)) {
            line = L("   Graisse apr\u00E8s r\u00E9glage : ", "   Weight after matching: ") + halFmt(pr.ratio * 100, 0) + L(" % de l'\u00E9paisseur latine vis\u00E9e", " % of the target Latin thickness");
            if (Math.abs(Math.log(pr.ratio)) <= Math.log(1 + opts.weightTol)) { line += L(" \u2014 accord\u00E9e", " \u2014 matched"); }
            else if (pr.suggest) { line += L(" \u2014 conseill\u00E9 : ", " \u2014 suggested: ") + halFontLabel(pr.suggest.font) + " (" + halFmt(pr.suggest.ratio * 100, 0) + " %)" + (opts.applyWeight ? L(" appliqu\u00E9", " applied") : ""); }
            else { line += (pr.ratio > 1) ? L(" \u2014 plus gras que le latin (aucun style plus proche dans la famille)", " \u2014 bolder than Latin (no closer style in the family)") : L(" \u2014 plus maigre que le latin (aucun style plus proche dans la famille)", " \u2014 lighter than Latin (no closer style in the family)"); }
            out.push(line);
        }
    }
    if (!plan.pairs.length) { out.push(L("Aucun passage \u00E0 harmoniser trouv\u00E9 (il faut du latin et de l'arabe / tifinagh dans la port\u00E9e).", "No passage to match found (the scope needs Latin and Arabic / Tifinagh text).")); }
    return out.join("\n");
}

/* ===================================================================== */
/*  2. Mesure des polices dans Illustrator / measuring fonts             */
/* ===================================================================== */

HAL.cache = {};
HAL.tmpLayer = null;
HAL.familyIndex = null;

function halTmpLayer(doc) {
    if (HAL.tmpLayer) { return HAL.tmpLayer; }
    var lay = doc.layers.add();
    lay.name = HAL.TMP_LAYER;
    try { lay.printable = false; } catch (e1) {}
    HAL.tmpLayer = lay;
    return lay;
}
function halRemoveTmp() {
    if (HAL.tmpLayer) { try { HAL.tmpLayer.locked = false; HAL.tmpLayer.remove(); } catch (e) {} }
    HAL.tmpLayer = null;
}

/* Surface signée et longueur d'un objet vectorisé (tracés transparents compris).
   Signed area and length of an outlined object. */
function halAreaPerim(item) {
    var r = { a: 0, p: 0 }, i, sub, s;
    if (!item) { return r; }
    if (item.typename === "PathItem") { r.a = Math.abs(item.area); r.p = item.length; return r; }
    if (item.typename === "CompoundPathItem") {
        s = 0;
        for (i = 0; i < item.pathItems.length; i++) { s += item.pathItems[i].area; r.p += item.pathItems[i].length; }
        r.a = Math.abs(s); return r;
    }
    if (item.typename === "GroupItem") {
        for (i = 0; i < item.pageItems.length; i++) { sub = halAreaPerim(item.pageItems[i]); r.a += sub.a; r.p += sub.p; }
    }
    return r;
}

/* Vectorise un échantillon à 100 pt sur une ligne de base y = 0 et renvoie le haut au-dessus de la
   ligne de base, la surface et le périmètre. Renvoie null si Illustrator a remplacé la police
   (glyphe absent). / Outlines a sample at 100 pt; null when the font was substituted. */
function halMeasureSample(doc, textFont, text, rtl) {
    var lay = halTmpLayer(doc), tf, tr, ca, i, base, g, b, ap, subst = false, res = null;
    tf = lay.textFrames.add();
    try {
        tf.contents = text;
        tr = tf.textRange; ca = tr.characterAttributes;
        ca.textFont = textFont; ca.size = 100; ca.horizontalScale = 100; ca.verticalScale = 100;
        ca.baselineShift = 0; ca.tracking = 0;
        if (rtl) {
            try { tr.paragraphAttributes.composerEngine = ComposerEngineType.optycaComposer; } catch (e2) {}
            try { tr.paragraphAttributes.paragraphDirection = ParagraphDirectionType.RIGHT_TO_LEFT_DIRECTION; } catch (e3) {}
        }
        try { for (i = 0; i < tr.characters.length; i++) { if (tr.characters[i].characterAttributes.textFont.name !== textFont.name) { subst = true; } } } catch (e4) {}
        base = tf.anchor ? tf.anchor[1] : 0;
        g = tf.createOutline(); tf = null;
        b = g.geometricBounds;
        ap = halAreaPerim(g);
        if (!subst && b[1] > b[3]) { res = { top: b[1] - base, bottom: b[3] - base, width: b[2] - b[0], area: ap.a, perim: ap.p }; }
        g.remove();
    } catch (e) { try { if (tf) { tf.remove(); } } catch (e5) {} }
    return res;
}

/* Métriques d'une police pour une écriture (en pt à 100 pt), en cache.
   Metrics of a font for a script (pt at 100 pt), cached. role: "L" | "A" | "T" */
function halGetMetrics(doc, fontRef, role) {
    var key = fontRef.name + "#" + role, m, tf, s, tops = [], i, w;
    if (HAL.cache.hasOwnProperty(key)) { return HAL.cache[key]; }
    m = null;
    try { tf = app.textFonts.getByName(fontRef.name); } catch (e) { tf = null; }
    if (tf) {
        if (role === "L") {
            var x = halMeasureSample(doc, tf, HAL.SAMPLES.xh, false), H = halMeasureSample(doc, tf, HAL.SAMPLES.cap, false), l = halMeasureSample(doc, tf, HAL.SAMPLES.asc, false);
            w = halMeasureSample(doc, tf, HAL.SAMPLES.wL, false);
            if (x && H && !(Math.abs(x.top - H.top) < 0.01 && Math.abs(x.width - H.width) < 0.01)) { m = { xh: x.top, cap: H.top, asc: l ? l.top : H.top, wL: w ? halStem(w.area, w.perim) : NaN }; }
        } else if (role === "A") {
            for (i = 0; i < HAL.SAMPLES.body.length; i++) { s = halMeasureSample(doc, tf, HAL.SAMPLES.body[i], true); if (s) { tops.push(s.top); } }
            var al = halMeasureSample(doc, tf, HAL.SAMPLES.alif, true);
            w = halMeasureSample(doc, tf, HAL.SAMPLES.wA, true);
            if (tops.length >= 2 && al && !halAllSame(tops.concat([al.top]))) { m = { body: halMedian(tops), alif: al.top, wA: w ? halStem(w.area, w.perim) : NaN }; }
        } else {
            var wids = [];
            for (i = 0; i < HAL.SAMPLES.tif.length; i++) { s = halMeasureSample(doc, tf, HAL.SAMPLES.tif[i], false); if (s) { tops.push(s.top); wids.push(s.width); } }
            w = halMeasureSample(doc, tf, HAL.SAMPLES.wT, false);
            if (tops.length >= 2 && !(tops.length >= 3 && halAllSame(tops) && halAllSame(wids))) { m = { tif: halMedian(tops), wT: w ? halStem(w.area, w.perim) : NaN }; }
        }
    }
    HAL.cache[key] = m;
    return m;
}

/* Styles de la même famille (index construit une fois) / same-family styles (index built once) */
function halSiblings(fontRef) {
    var i, f, fam;
    if (!HAL.familyIndex) {
        HAL.familyIndex = {};
        for (i = 0; i < app.textFonts.length; i++) {
            try { f = app.textFonts[i]; fam = f.family; } catch (e) { continue; }
            if (!HAL.familyIndex[fam]) { HAL.familyIndex[fam] = []; }
            HAL.familyIndex[fam].push({ name: f.name, family: f.family, style: f.style });
        }
    }
    return HAL.familyIndex[fontRef.family] || [fontRef];
}

/* ===================================================================== */
/*  3. Lecture et modification du document / reading & editing           */
/* ===================================================================== */

function halEditable(item) {
    var p = item;
    try {
        while (p && p.typename !== "Document") {
            if (p.typename === "Layer") { if (p.locked || !p.visible || p.name === HAL.CHECK_LAYER || p.name === HAL.TMP_LAYER) { return false; } }
            else { if (p.locked || p.hidden) { return false; } }
            p = p.parent;
        }
    } catch (e) { return false; }
    return true;
}

function halCollectFromItem(item, out) {
    var i;
    if (!item) { return; }
    if (item.typename === "TextFrame") { out.push(item); return; }
    if (item.typename === "GroupItem") { for (i = 0; i < item.pageItems.length; i++) { halCollectFromItem(item.pageItems[i], out); } }
}

/* Blocs de texte de la portée / text frames in scope */
function halCollectFrames(doc, scope) {
    var raw = [], out = [], i, sel, seen = [];
    if (scope === "doc") { for (i = 0; i < doc.textFrames.length; i++) { raw.push(doc.textFrames[i]); } }
    else {
        sel = doc.selection;
        if (sel && sel.typename === "TextRange") {
            try { for (i = 0; i < sel.story.textFrames.length; i++) { raw.push(sel.story.textFrames[i]); } } catch (e) {}
        } else if (sel && sel.length) { for (i = 0; i < sel.length; i++) { halCollectFromItem(sel[i], raw); } }
    }
    for (i = 0; i < raw.length; i++) {
        if (!halEditable(raw[i])) { continue; }
        var dup = false, j;
        for (j = 0; j < seen.length; j++) { if (seen[j] === raw[i]) { dup = true; break; } }
        if (!dup) { seen.push(raw[i]); out.push(raw[i]); }
    }
    return out;
}

/* Modèle d'un bloc : paragraphes > passages de même mise en forme / frame model: paragraphs > runs */
function halReadFrame(tf) {
    var fr = { live: tf, paras: [], center: [0, 0] }, paras, p, para, runs, r, run, ca, font, pm, len, txt, b;
    try { b = tf.geometricBounds; fr.center = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; } catch (e0) {}
    try { paras = tf.textRange.paragraphs; } catch (e1) { return fr; }
    for (p = 0; p < paras.length; p++) {
        para = paras[p]; pm = { live: para, runs: [], charsOk: true };
        try { runs = para.textRanges; } catch (e2) { runs = []; }
        len = 0;
        for (r = 0; r < runs.length; r++) {
            run = runs[r];
            try {
                txt = run.contents; ca = run.characterAttributes; font = ca.textFont;
                pm.runs.push({ live: run, text: txt, font: { name: font.name, family: font.family, style: font.style }, size: ca.size, h: ca.horizontalScale, v: ca.verticalScale });
                len += txt.length;
            } catch (e3) { pm.charsOk = false; }
        }
        try { if (para.characters.length !== len) { pm.charsOk = false; } } catch (e4) { pm.charsOk = false; }
        fr.paras.push(pm);
    }
    return fr;
}

function halSetAttrs(ca, set) {
    if (set.font) { ca.textFont = app.textFonts.getByName(set.font.name); }
    if (set.size !== undefined) { ca.size = set.size; }
    if (set.h !== undefined) { ca.horizontalScale = set.h; }
    if (set.v !== undefined) { ca.verticalScale = set.v; }
}

/* Application du plan : passages entiers d'un coup, sinon caractère par caractère (indices stables :
   le contenu n'est jamais modifié). / Apply: whole runs at once, otherwise per character. */
function halApply(frames, plan) {
    var i, a, fr, pa, run, k, done = 0, errors = 0, chars;
    for (i = 0; i < plan.actions.length; i++) {
        a = plan.actions[i]; fr = frames[a.frame]; pa = fr.paras[a.para]; run = pa.runs[a.run];
        try {
            if (a.whole) { halSetAttrs(run.live.characterAttributes, a.set); done += a.end - a.start; }
            else {
                chars = pa.live.characters;
                for (k = a.start; k < a.end; k++) { halSetAttrs(chars[a.offset + k].characterAttributes, a.set); done++; }
            }
        } catch (e) { errors++; }
    }
    return { done: done, errors: errors };
}

/* Remet à 100 % l'échelle H/V des caractères de l'écriture visée / reset H/V scale to 100 % */
function halResetScale(frames, opts) {
    var targets = {}, n = 0, fi, p, r, j, pa, run, chars, allT;
    if (opts.direction === "latin") { targets.L = true; } else { if (opts.doA) { targets.A = true; } if (opts.doT) { targets.T = true; } }
    halPrepare(frames, opts);
    for (fi = 0; fi < frames.length; fi++) {
        for (p = 0; p < frames[fi].paras.length; p++) {
            pa = frames[fi].paras[p];
            for (r = 0; r < pa.runs.length; r++) {
                run = pa.runs[r];
                if (run.h === 100 && run.v === 100) { continue; }
                allT = true;
                for (j = 0; j < run.cls.length; j++) { if (!targets[run.cls[j]]) { allT = false; } }
                try {
                    if (allT && run.cls.length) { halSetAttrs(run.live.characterAttributes, { h: 100, v: 100 }); n += run.cls.length; }
                    else if (pa.charsOk) {
                        chars = pa.live.characters;
                        for (j = 0; j < run.cls.length; j++) { if (targets[run.cls[j]]) { halSetAttrs(chars[run.offset + j].characterAttributes, { h: 100, v: 100 }); n++; } }
                    }
                } catch (e) {}
            }
        }
    }
    return n;
}

/* ===================================================================== */
/*  4. Planche de contrôle / check sheet (non-printing layer)            */
/* ===================================================================== */

function halRGB(r, g, b) { var c = new RGBColor(); c.red = r; c.green = g; c.blue = b; return c; }
function halColor(doc, r, g, b) {
    if (doc.documentColorSpace === DocumentColorSpace.CMYK) {
        var c = new CMYKColor(), k = 1 - Math.max(r, g, b) / 255;
        c.black = k * 100;
        c.cyan = k < 1 ? (1 - r / 255 - k) / (1 - k) * 100 : 0; c.magenta = k < 1 ? (1 - g / 255 - k) / (1 - k) * 100 : 0; c.yellow = k < 1 ? (1 - b / 255 - k) / (1 - k) * 100 : 0;
        return c;
    }
    return halRGB(r, g, b);
}
function halLine(lay, x1, y, x2, col, w) {
    var p = lay.pathItems.add();
    p.setEntirePath([[x1, y], [x2, y]]); p.filled = false; p.stroked = true; p.strokeColor = col; p.strokeWidth = w;
    return p;
}
function halLabel(lay, x, y, txt, size, font) {
    var t = lay.textFrames.add();
    t.contents = txt; t.left = x; t.top = y;
    try { t.textRange.characterAttributes.size = size; if (font) { t.textRange.characterAttributes.textFont = font; } } catch (e) {}
    return t;
}

function halClearCheck(doc) {
    var lay;
    try { lay = doc.layers.getByName(HAL.CHECK_LAYER); } catch (e) { return false; }
    lay.locked = false; lay.visible = true;
    lay.remove();
    return true;
}

/* Pour chaque couple de polices : latin et arabe / tifinagh côte à côte, après réglage, à 36 pt,
   avec ligne de base, hauteur latine et hauteur arabe visées. / One row per font pair. */
function halDrawCheck(doc, plan) {
    halClearCheck(doc);
    var lay = doc.layers.add(), ab, rect, x0, y, i, pr, D = 36, refKey, tgtKey, latinPr, tgtShown, t1, t2, wd, col1, col2, gray, labFont = null, n = 0;
    lay.name = HAL.CHECK_LAYER;
    try { lay.printable = false; } catch (e0) {}
    ab = doc.artboards[doc.artboards.getActiveArtboardIndex()]; rect = ab.artboardRect;
    x0 = rect[2] + 40; y = rect[1] - 20;
    col1 = halColor(doc, 230, 0, 126); col2 = halColor(doc, 0, 160, 220); gray = halColor(doc, 150, 150, 150);
    try { labFont = app.textFonts.getByName("ArialMT"); } catch (e1) { labFont = null; }
    halLabel(lay, x0, y, L("Contr\u00F4le harmonie arabe / latin (calque non imprimable) \u2014 magenta : hauteur latine, cyan : hauteur de l'autre \u00E9criture", "Arabic / Latin harmony check (non-printing layer) \u2014 magenta: Latin height, cyan: other script height"), 8, labFont);
    y -= 30;
    for (i = 0; i < plan.pairs.length && n < 12; i++) {
        pr = plan.pairs[i]; n++;
        latinPr = (pr.tgtScript === "L");
        refKey = latinPr ? pr.keys.other : pr.keys.latin; tgtKey = latinPr ? pr.keys.latin : pr.keys.other;
        var refFont = app.textFonts.getByName(pr.ref.font.name), tgtFont = app.textFonts.getByName((pr.suggest && HAL.lastOpts && HAL.lastOpts.applyWeight) ? pr.suggest.font.name : pr.font.name);
        var useSug = !!(pr.suggest && HAL.lastOpts && HAL.lastOpts.applyWeight), tAfter = useSug ? pr.suggest.attrs : pr.after, tM = useSug ? pr.suggest.m : pr.tgtM;
        tgtShown = D * (tAfter.size * tAfter.v) / (pr.ref.size * pr.ref.v);
        var base = y - D * 1.1;
        t1 = lay.textFrames.pointText([x0, base]);
        t1.contents = (pr.refScript === "L") ? "Hxn Latin" : ((pr.refScript === "A") ? "\u0628\u0633\u0645 \u0645\u062D\u0645\u062F" : "\u2D30\u2D63\u2D53\u2D4D");
        t1.textRange.characterAttributes.textFont = refFont; t1.textRange.characterAttributes.size = D;
        t1.textRange.characterAttributes.verticalScale = 100; t1.textRange.characterAttributes.horizontalScale = pr.ref.h / pr.ref.v * 100;
        wd = t1.width;
        t2 = lay.textFrames.pointText([x0 + wd + 16, base]);
        t2.contents = (pr.tgtScript === "L") ? "Hxn Latin" : ((pr.tgtScript === "A") ? "\u0628\u0633\u0645 \u0645\u062D\u0645\u062F" : "\u2D30\u2D63\u2D53\u2D4D");
        if (pr.tgtScript !== "L") { try { t2.textRange.paragraphAttributes.composerEngine = ComposerEngineType.optycaComposer; } catch (e2) {} }
        if (pr.refScript !== "L") { try { t1.textRange.paragraphAttributes.composerEngine = ComposerEngineType.optycaComposer; } catch (e3) {} }
        t2.textRange.characterAttributes.textFont = tgtFont; t2.textRange.characterAttributes.size = tgtShown;
        t2.textRange.characterAttributes.verticalScale = 100; t2.textRange.characterAttributes.horizontalScale = tAfter.h / tAfter.v * 100;
        var right = x0 + wd + 16 + t2.width + 10;
        halLine(lay, x0 - 6, base, right, gray, 0.5);
        halLine(lay, x0 - 6, base + pr.refM[refKey] * D / 100, right, (pr.refScript === "L") ? col1 : col2, 0.5);
        halLine(lay, x0 - 6, base + tM[tgtKey] * tgtShown / 100, right, (pr.tgtScript === "L") ? col1 : col2, 0.5);
        halLabel(lay, x0, base - 12, (i + 1) + ". " + halFontLabel(pr.ref.font) + " \u2194 " + halFontLabel(pr.font) + "  \u00D7 " + halFmt(pr.f, 3), 7, labFont);
        y = base - 34;
    }
    return n;
}

/* ===================================================================== */
/*  5. Rapport .txt / .txt report                                        */
/* ===================================================================== */

function halSaveReport(doc, text) {
    var base = "harmonie-arabe-latin", f, dir = null;
    try { base = String(doc.name).replace(/\.[^.]+$/, "") + "_harmonie-arabe-latin"; } catch (e0) {}
    try { if (doc.saved || doc.fullName) { dir = doc.path; } } catch (e1) { dir = null; }
    f = new File((dir && dir.exists ? dir.fsName : Folder.desktop.fsName) + "/" + base + ".txt");
    f.encoding = "UTF-8"; f.lineFeed = "Unix";
    if (!f.open("w")) { f = new File(Folder.desktop.fsName + "/" + base + ".txt"); f.encoding = "UTF-8"; if (!f.open("w")) { return null; } }
    f.write("\uFEFF" + text); f.close();
    return f;
}

/* ===================================================================== */
/*  6. Dialogue / dialog                                                 */
/* ===================================================================== */

function halNum(txt, def) { var v = parseFloat(String(txt).replace(",", ".")); return isNaN(v) ? def : v; }

function halDialog(doc) {
    var w = new Window("dialog", L("Harmoniser arabe / tifinagh et latin", "Match Arabic / Tifinagh to Latin") + " v" + HAL.VERSION);
    w.orientation = "column"; w.alignChildren = "fill";

    var pS = w.add("panel", undefined, L("Port\u00E9e", "Scope")); pS.orientation = "row"; pS.alignChildren = "left";
    var rSel = pS.add("radiobutton", undefined, L("Textes s\u00E9lectionn\u00E9s", "Selected text"));
    var rDoc = pS.add("radiobutton", undefined, L("Tout le document", "Whole document"));
    var hasSel = false;
    try { hasSel = !!(doc.selection && (doc.selection.length || doc.selection.typename === "TextRange")); } catch (e0) { hasSel = false; }
    rSel.value = hasSel; rDoc.value = !hasSel;

    var pD = w.add("panel", undefined, L("Que faut-il ajuster ?", "What should be adjusted?")); pD.alignChildren = "left";
    var rOther = pD.add("radiobutton", undefined, L("L'arabe / le tifinagh, sur la taille du latin (r\u00E9f\u00E9rence)", "Arabic / Tifinagh, to the Latin size (reference)"));
    var rLatin = pD.add("radiobutton", undefined, L("Le latin, sur la taille de l'arabe (r\u00E9f\u00E9rence)", "Latin, to the Arabic size (reference)"));
    rOther.value = true;
    var gScr = pD.add("group");
    var cA = gScr.add("checkbox", undefined, L("Arabe (et persan, ourdou\u2026)", "Arabic (and Persian, Urdu\u2026)"));
    var cT = gScr.add("checkbox", undefined, L("Tifinagh", "Tifinagh"));
    cA.value = true; cT.value = true;

    var pM = w.add("panel", undefined, L("Mesure de la taille visible", "Visible size measure")); pM.alignChildren = "left";
    var g1 = pM.add("group"); g1.add("statictext", undefined, L("Arabe :", "Arabic:"));
    var dAr = g1.add("dropdownlist", undefined, [
        L("corps des lettres (dents \u0628 \u0633 \u0635 \u062D) = hauteur d'x latine", "letter body (teeth \u0628 \u0633 \u0635 \u062D) = Latin x-height"),
        L("hauteur de l'alif = hauteur des capitales", "alef height = cap height"),
        L("hauteur de l'alif = hampes latines (l, d)", "alef height = Latin ascenders (l, d)")]);
    dAr.selection = 0;
    var g2 = pM.add("group"); g2.add("statictext", undefined, L("Tifinagh :", "Tifinagh:"));
    var dTf = g2.add("dropdownlist", undefined, [L("hauteur des lettres = capitales latines", "letter height = Latin caps"), L("hauteur des lettres = hauteur d'x latine", "letter height = Latin x-height")]);
    dTf.selection = 0;
    var g3 = pM.add("group"); g3.add("statictext", undefined, L("Taille de l'arabe / tifinagh par rapport au latin :", "Arabic / Tifinagh size relative to Latin:"));
    var eK = g3.add("edittext", undefined, "100"); eK.characters = 5; g3.add("statictext", undefined, "%");
    var cNear = pM.add("checkbox", undefined, L("Sans latin dans le bloc : prendre le bloc latin le plus proche (m\u00EAme rang de paragraphe)", "No Latin in the frame: use the nearest Latin frame (same paragraph rank)"));
    cNear.value = true;
    var cDig = pM.add("checkbox", undefined, L("Ne jamais modifier les chiffres 0-9 (sinon ils suivent l'\u00E9criture voisine)", "Never change digits 0-9 (otherwise they follow the neighbouring script)"));
    cDig.value = false;

    var pA = w.add("panel", undefined, L("M\u00E9thode", "Method")); pA.alignChildren = "left";
    var rScale = pA.add("radiobutton", undefined, L("\u00C9chelle horizontale et verticale (garde le corps et l'interlignage) \u2014 conseill\u00E9", "Horizontal and vertical scale (keeps size and leading) \u2014 recommended"));
    var rSize = pA.add("radiobutton", undefined, L("Corps (taille en pt ; l'interlignage auto changera)", "Font size (pt; auto leading will change)"));
    rScale.value = true;
    var g4 = pA.add("group");
    g4.add("statictext", undefined, L("Arrondi du corps :", "Size rounding:"));
    var dStep = g4.add("dropdownlist", undefined, ["0,1 pt", "0,25 pt", "0,5 pt", "1 pt"]); dStep.selection = 0;
    g4.add("statictext", undefined, L("  Ignorer les \u00E9carts sous", "  Ignore differences below"));
    var eTol = g4.add("edittext", undefined, "2"); eTol.characters = 3; g4.add("statictext", undefined, "%");

    var pW = w.add("panel", undefined, L("Graisse", "Weight")); pW.alignChildren = "left";
    var cW = pW.add("checkbox", undefined, L("Comparer l'\u00E9paisseur des traits et conseiller un style de la m\u00EAme famille", "Compare stroke thickness and suggest a style from the same family"));
    var gW = pW.add("group");
    var cWA = gW.add("checkbox", undefined, L("Appliquer le style conseill\u00E9", "Apply the suggested style"));
    gW.add("statictext", undefined, L("  tol\u00E9rance \u00B1", "  tolerance \u00B1"));
    var eWT = gW.add("edittext", undefined, "12"); eWT.characters = 3; gW.add("statictext", undefined, "%");
    cW.value = true; cWA.value = false;

    var pO = w.add("panel", undefined, L("Sortie", "Output")); pO.alignChildren = "left";
    var cChk = pO.add("checkbox", undefined, L("Planche de contr\u00F4le \u00E0 droite du plan de travail actif (calque non imprimable)", "Check sheet right of the active artboard (non-printing layer)"));
    var cRep = pO.add("checkbox", undefined, L("Enregistrer un rapport .txt", "Save a .txt report"));
    cChk.value = true; cRep.value = false;

    var eOut = w.add("edittext", undefined, L("Analyser mesure les polices et montre les r\u00E9glages sans rien modifier.\nConseil : travaillez sur une copie du fichier ; Harmoniser est annulable (\u00C9dition > Annuler).", "Analyse measures the fonts and shows the settings without changing anything.\nTip: work on a copy of the file; Match can be undone (Edit > Undo)."), { multiline: true, readonly: true, scrollable: true });
    eOut.preferredSize = [600, 170];

    var gB = w.add("group"); gB.alignment = "right";
    var bClr = gB.add("button", undefined, L("Effacer la planche", "Clear check sheet"));
    var bRst = gB.add("button", undefined, L("Remettre \u00E0 100 %", "Reset to 100 %"));
    var bAn = gB.add("button", undefined, L("Analyser", "Analyse"));
    var bCancel = gB.add("button", undefined, L("Fermer", "Close"), { name: "cancel" });
    var bOk = gB.add("button", undefined, L("Harmoniser", "Match"), { name: "ok" });

    function refresh() {
        var other = rOther.value;
        cWA.enabled = cW.value && other; eWT.enabled = cW.value; cW.enabled = other;
        dStep.enabled = rSize.value; bRst.enabled = true;
        cA.enabled = cT.enabled = true;
    }
    rOther.onClick = rLatin.onClick = rScale.onClick = rSize.onClick = cW.onClick = refresh; refresh();

    function readOpts() {
        var steps = [0.1, 0.25, 0.5, 1];
        return {
            scope: rSel.value ? "sel" : "doc", doA: cA.value, doT: cT.value, direction: rLatin.value ? "latin" : "other",
            arMode: ["body", "alifCap", "alifAsc"][dAr.selection ? dAr.selection.index : 0], tifMode: (dTf.selection && dTf.selection.index === 1) ? "xh" : "cap",
            k: halClamp(halNum(eK.text, 100), 10, 1000) / 100, method: rSize.value ? "size" : "scale",
            sizeStep: steps[dStep.selection ? dStep.selection.index : 0], scaleStep: 1, tol: halClamp(halNum(eTol.text, 2), 0, 50) / 100,
            useNearest: cNear.value, digitsFixed: cDig.value,
            weight: cW.value && !rLatin.value, applyWeight: cW.value && cWA.value && !rLatin.value, weightTol: halClamp(halNum(eWT.text, 12), 1, 100) / 100, weightK: 1,
            check: cChk.value, report: cRep.value
        };
    }
    function valid(o) {
        if (!o.doA && !o.doT) { alert(L("Cochez au moins une \u00E9criture (arabe ou tifinagh).", "Tick at least one script (Arabic or Tifinagh).")); return false; }
        if (o.scope === "sel" && !hasSel) { alert(L("Rien n'est s\u00E9lectionn\u00E9 : s\u00E9lectionnez des textes ou choisissez \u00AB Tout le document \u00BB.", "Nothing is selected: select text or choose \u201CWhole document\u201D.")); return false; }
        return true;
    }
    var result = { action: "cancel", opts: null };
    bAn.onClick = function () {
        var o = readOpts(); if (!valid(o)) { return; }
        try { var r = halRun(doc, o, true); eOut.text = r.text; } catch (e) { eOut.text = L("Erreur : ", "Error: ") + e.message; }
        finally { halRemoveTmp(); }
    };
    bRst.onClick = function () { var o = readOpts(); if (!valid(o)) { return; } result.action = "reset"; result.opts = o; w.close(1); };
    bClr.onClick = function () { result.action = "clear"; w.close(1); };
    bOk.onClick = function () { var o = readOpts(); if (!valid(o)) { return; } result.action = "run"; result.opts = o; w.close(1); };
    w.show();
    return result;
}

function halShowText(title, txt) {
    var w = new Window("dialog", title);
    var e = w.add("edittext", undefined, txt, { multiline: true, readonly: true, scrollable: true });
    e.preferredSize = [640, 380];
    w.add("button", undefined, "OK", { name: "ok" });
    w.show();
}

/* ===================================================================== */
/*  7. Exécution / run                                                   */
/* ===================================================================== */

/* Lit la portée, mesure, planifie ; applique si dryRun est faux, puis recontrôle.
   Reads scope, measures, plans; applies unless dryRun, then re-checks. */
function halRun(doc, o, dryRun) {
    var tfs = halCollectFrames(doc, o.scope), frames = [], i, plan, res = null, plan2, text, nChk = 0;
    HAL.lastOpts = o;
    if (!tfs.length) { return { plan: null, text: L("Aucun bloc de texte modifiable dans la port\u00E9e (les textes verrouill\u00E9s ou masqu\u00E9s sont ignor\u00E9s).", "No editable text frame in scope (locked or hidden text is skipped).") }; }
    for (i = 0; i < tfs.length; i++) { frames.push(halReadFrame(tfs[i])); }
    var getM = function (font, role) { return halGetMetrics(doc, font, role); };
    plan = halPlan(frames, o, getM, o.weight ? halSiblings : null);
    text = halReport(plan, o, !dryRun);
    if (!dryRun && plan.actions.length) {
        res = halApply(frames, plan);
        frames = [];
        for (i = 0; i < tfs.length; i++) { frames.push(halReadFrame(tfs[i])); }
        var o2 = {}, k; for (k in o) { if (o.hasOwnProperty(k)) { o2[k] = o[k]; } }
        o2.applyWeight = false; o2.weight = false;
        plan2 = halPlan(frames, o2, getM, null);
        text = L("Caract\u00E8res modifi\u00E9s : ", "Characters changed: ") + res.done + (res.errors ? L(" \u2014 erreurs : ", " \u2014 errors: ") + res.errors : "") + "\n" +
            L("Contr\u00F4le apr\u00E8s application : ", "Check after applying: ") + (plan2.chars ? plan2.chars + L(" caract\u00E8res encore hors tol\u00E9rance", " characters still outside tolerance") : L("tout est dans la tol\u00E9rance", "everything within tolerance")) + "\n\n" + text;
    }
    if (!dryRun && o.check && plan.pairs.length) { nChk = halDrawCheck(doc, plan); if (nChk) { text += "\n\n" + L("Planche de contr\u00F4le : calque \u00AB ", "Check sheet: layer \u201C") + HAL.CHECK_LAYER + L(" \u00BB (non imprimable)", "\u201D (non-printing)"); } }
    return { plan: plan, text: text, res: res };
}

function halMain() {
    if (app.documents.length === 0) { alert(L("Aucun document ouvert. Ouvrez un fichier puis relancez le script.", "No document open. Open a file and run the script again.")); return; }
    var doc = app.activeDocument;
    if (doc.textFrames.length === 0) { alert(L("Ce document ne contient aucun texte vivant (les textes vectoris\u00E9s ne peuvent pas \u00EAtre r\u00E9gl\u00E9s).", "This document has no live text (outlined text cannot be adjusted).")); return; }
    var r = halDialog(doc), out, f, frames, i, tfs, n;
    try {
        if (r.action === "clear") { alert(halClearCheck(doc) ? L("Planche de contr\u00F4le effac\u00E9e.", "Check sheet cleared.") : L("Aucune planche de contr\u00F4le \u00E0 effacer.", "No check sheet to clear.")); return; }
        if (r.action === "reset") {
            tfs = halCollectFrames(doc, r.opts.scope); frames = [];
            for (i = 0; i < tfs.length; i++) { frames.push(halReadFrame(tfs[i])); }
            n = halResetScale(frames, r.opts);
            alert(L("\u00C9chelle H/V remise \u00E0 100 % sur ", "H/V scale reset to 100 % on ") + n + L(" caract\u00E8re(s).", " character(s)."));
            return;
        }
        if (r.action !== "run") { return; }
        out = halRun(doc, r.opts, false);
        if (r.opts.report) { f = halSaveReport(doc, out.text); if (f) { out.text += "\n\n" + L("Rapport : ", "Report: ") + f.fsName; } }
        halShowText(L("Harmoniser arabe / latin", "Match Arabic / Latin"), out.text);
    } finally { halRemoveTmp(); }
}

if (typeof HAL_NO_RUN === "undefined") {
    try { halMain(); } catch (err) { halRemoveTmp(); alert(L("Erreur : ", "Error: ") + err.message + (err.line ? " (ligne " + err.line + ")" : "")); }
}
