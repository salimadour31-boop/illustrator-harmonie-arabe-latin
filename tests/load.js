// Charge le script sans l'exécuter / loads the script without running it
var fs = require("fs"), vm = require("vm"), path = require("path");
module.exports = function (extra) {
  var src = fs.readFileSync(path.join(__dirname, "..", "HarmoniserArabeLatin.jsx"), "utf8").replace(/^#target.*$/m, "");
  var ctx = { HAL_NO_RUN: true, app: { locale: "fr_FR" }, alert: function () {} };
  if (extra) for (var k in extra) ctx[k] = extra[k];
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
};
