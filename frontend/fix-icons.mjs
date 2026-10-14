import fs from "node:fs";

const edits = {
  "src/app/page.tsx": [
    ['              📁\n', '              <FolderOpen />\n'],
    ['                        ↓\n', '                        <ArrowDown className="w-3 h-3" />\n'],
    ['                                ⭐ Set Prod\n', '                                Set Prod\n'],
    ['                <span className="text-xl">✅</span>\n', '                <CheckCircle2 className="w-5 h-5 text-emerald-500" />\n'],
    ['                    📦 Download All as ZIP\n', '                    <Archive size={18} /> Download All as ZIP\n'],
    ['                          ⬇️\n', '                          <Download className="w-3 h-3" />\n'],
    ['                        <div className="text-xs text-gray-300 mt-1 flex items-center gap-1">\n                          <span>⭐</span>\n                          <span>Score: {res.score}</span>\n                        </div>\n', '                        <div className="text-xs text-gray-300 mt-1 flex items-center gap-1">\n                          <Star className="w-3 h-3" />\n                          <span>Score: {res.score}</span>\n                        </div>\n'],
    ['                          <span className="text-white font-bold text-sm">❌</span>\n', '                          <X className="w-4 h-4 text-white" />\n'],
    ['                          <span className="text-white font-bold text-sm">✓</span>\n', '                          <Check className="w-4 h-4 text-white" />\n'],
    ['shadow-lg shadow-indigo-500/25 ', ''],
    ['shadow-lg shadow-emerald-500/25 ', ''],
  ],
  "src/app/login/page.tsx": [
    ['            ⚡\n', '            <Zap className="w-8 h-8" />\n'],
    ['            ⚠️ {error}\n', '            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}\n'],
    ['shadow-lg shadow-indigo-500/30', ''],
    ['shadow-lg shadow-indigo-500/25', ''],
  ],
  "src/app/register/page.tsx": [
    ['            ⚡\n', '            <Zap className="w-8 h-8" />\n'],
    ['            ⚠️ {error}\n', '            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}\n'],
    ['shadow-lg shadow-indigo-500/30', ''],
    ['shadow-lg shadow-indigo-500/25', ''],
  ],
  "src/app/NavBar.tsx": [
    ['bg-indigo-600 text-white hover:bg-indigo-500', 'bg-primary text-primary-foreground hover:opacity-90'],
  ],
};

for (const [file, pairs] of Object.entries(edits)) {
  let src = fs.readFileSync(file, "utf8");
  let changed = 0;
  for (const [from, to] of pairs) {
    if (src.includes(from)) {
      src = src.split(from).join(to);
      changed++;
    } else {
      console.log(`MISS in ${file}: ${JSON.stringify(from.slice(0, 60))}`);
    }
  }
  fs.writeFileSync(file, src);
  console.log(`${file}: ${changed}/${pairs.length} applied`);
}
