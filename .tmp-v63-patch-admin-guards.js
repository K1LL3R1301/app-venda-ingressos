const fs = require('fs');
const path = require('path');

const root = process.cwd();

const dirs = [
  path.join(root, 'apps', 'web', 'src', 'app', 'admin'),
  path.join(root, 'apps', 'web', 'src', 'components', 'admin'),
];

const targetExtensions = new Set(['.ts', '.tsx']);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (targetExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function backup(filePath) {
  const backupPath = `${filePath}.bak-v63-${Date.now()}`;
  fs.copyFileSync(filePath, backupPath);
}

function patchText(text) {
  let next = text;

  // Casos diretos mais comuns.
  const replacements = [
    ['role !== "ADMIN"', 'role !== "ADMIN" && role !== "SUPER_ADMIN"'],
    ["role !== 'ADMIN'", "role !== 'ADMIN' && role !== 'SUPER_ADMIN'"],
    ['userRole !== "ADMIN"', 'userRole !== "ADMIN" && userRole !== "SUPER_ADMIN"'],
    ["userRole !== 'ADMIN'", "userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN'"],
    ['currentRole !== "ADMIN"', 'currentRole !== "ADMIN" && currentRole !== "SUPER_ADMIN"'],
    ["currentRole !== 'ADMIN'", "currentRole !== 'ADMIN' && currentRole !== 'SUPER_ADMIN'"],
    ['normalizedRole !== "ADMIN"', 'normalizedRole !== "ADMIN" && normalizedRole !== "SUPER_ADMIN"'],
    ["normalizedRole !== 'ADMIN'", "normalizedRole !== 'ADMIN' && normalizedRole !== 'SUPER_ADMIN'"],
    ['storedRole !== "ADMIN"', 'storedRole !== "ADMIN" && storedRole !== "SUPER_ADMIN"'],
    ["storedRole !== 'ADMIN'", "storedRole !== 'ADMIN' && storedRole !== 'SUPER_ADMIN'"],

    ['role === "ADMIN"', '(role === "ADMIN" || role === "SUPER_ADMIN")'],
    ["role === 'ADMIN'", "(role === 'ADMIN' || role === 'SUPER_ADMIN')"],
    ['userRole === "ADMIN"', '(userRole === "ADMIN" || userRole === "SUPER_ADMIN")'],
    ["userRole === 'ADMIN'", "(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')"],
    ['currentRole === "ADMIN"', '(currentRole === "ADMIN" || currentRole === "SUPER_ADMIN")'],
    ["currentRole === 'ADMIN'", "(currentRole === 'ADMIN' || currentRole === 'SUPER_ADMIN')"],
    ['normalizedRole === "ADMIN"', '(normalizedRole === "ADMIN" || normalizedRole === "SUPER_ADMIN")'],
    ["normalizedRole === 'ADMIN'", "(normalizedRole === 'ADMIN' || normalizedRole === 'SUPER_ADMIN')"],
    ['storedRole === "ADMIN"', '(storedRole === "ADMIN" || storedRole === "SUPER_ADMIN")'],
    ["storedRole === 'ADMIN'", "(storedRole === 'ADMIN' || storedRole === 'SUPER_ADMIN')"],

    ['["ADMIN"].includes(role)', '["ADMIN", "SUPER_ADMIN"].includes(role)'],
    ["['ADMIN'].includes(role)", "['ADMIN', 'SUPER_ADMIN'].includes(role)"],
    ['["ADMIN"].includes(userRole)', '["ADMIN", "SUPER_ADMIN"].includes(userRole)'],
    ["['ADMIN'].includes(userRole)", "['ADMIN', 'SUPER_ADMIN'].includes(userRole)"],
  ];

  for (const [from, to] of replacements) {
    next = next.split(from).join(to);
  }

  // Limpa duplicacoes se o script for rodado mais de uma vez.
  next = next
    .replaceAll('role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "SUPER_ADMIN"', 'role !== "ADMIN" && role !== "SUPER_ADMIN"')
    .replaceAll("role !== 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'SUPER_ADMIN'", "role !== 'ADMIN' && role !== 'SUPER_ADMIN'")
    .replaceAll('(role === "ADMIN" || role === "SUPER_ADMIN" || role === "SUPER_ADMIN")', '(role === "ADMIN" || role === "SUPER_ADMIN")')
    .replaceAll("(role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'SUPER_ADMIN')", "(role === 'ADMIN' || role === 'SUPER_ADMIN')");

  return next;
}

let patchedCount = 0;

for (const dir of dirs) {
  for (const file of walk(dir)) {
    const before = fs.readFileSync(file, 'utf8');
    const after = patchText(before);

    if (after !== before) {
      backup(file);
      fs.writeFileSync(file, after, 'utf8');
      patchedCount += 1;
      console.log(`Patch aplicado: ${path.relative(root, file)}`);
    }
  }
}

console.log(`Arquivos admin corrigidos: ${patchedCount}`);
