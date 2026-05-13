const fs = require('fs');
const path = require('path');

const root = process.cwd();
const adminDir = path.join(root, 'apps', 'web', 'src', 'app', 'admin');
const extensions = new Set(['.tsx', '.ts']);

const standard = 'rounded-[28px] bg-gradient-to-r from-orange-500 via-orange-700 to-[#19002f] p-8 text-white shadow-sm';

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function backup(file) {
  fs.copyFileSync(file, `${file}.bak-v64-${Date.now()}`);
}

let patched = 0;

for (const file of walk(adminDir)) {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-orange-500 to-[#19002f] p-8 text-white',
    standard,
  );

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-orange-500 via-orange-700 to-[#19002f] p-8 text-white',
    standard,
  );

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-[#19002f] to-orange-500 p-8 text-white',
    standard,
  );

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-[#19002f] via-neutral-950 to-orange-500 p-8 text-white',
    standard,
  );

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-[#19002f] via-[#0b1020] to-[#0b3b5a] p-8 text-white',
    standard,
  );

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-[#19002f] via-[#0b1020] to-[#0b3b5a] p-8 text-white shadow-sm',
    standard,
  );

  content = content.replaceAll(
    'rounded-[28px] bg-gradient-to-r from-orange-500 via-orange-700 to-[#19002f] p-8 text-white shadow-sm shadow-sm',
    standard,
  );

  if (content !== original) {
    backup(file);
    fs.writeFileSync(file, content, 'utf8');
    patched += 1;
    console.log(`Hero padronizado: ${path.relative(root, file)}`);
  }
}

console.log(`Arquivos admin com hero padronizado: ${patched}`);
