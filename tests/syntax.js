// Vérification de syntaxe ES3 / ES5 avec acorn (npm install acorn) / syntax check
var fs = require("fs"), path = require("path"), acorn;
try { acorn = require("acorn"); } catch (e) { acorn = require(process.env.ACORN || "acorn"); }
var src = fs.readFileSync(path.join(__dirname, "..", "HarmoniserArabeLatin.jsx"), "utf8").replace(/^#target.*$/m, "");
[3, 5].forEach(function (v) { acorn.parse(src, { ecmaVersion: v }); console.log("ES" + v + " OK"); });
