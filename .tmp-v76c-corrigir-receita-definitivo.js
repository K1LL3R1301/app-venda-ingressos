const fs = require("fs");
const path = require("path");

const root = process.cwd();
const stamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);

const dashboardPath = path.join(root, "apps", "web", "src", "app", "admin", "dashboard", "page.tsx");
const headerPath = path.join(root, "apps", "web", "src", "components", "customer", "CustomerHeader.tsx");
const adminDir = path.join(root, "apps", "web", "src", "app", "admin");
const ordersPath = path.join(root, "apps", "web", "src", "app", "admin", "orders", "page.tsx");
const financePath = path.join(root, "apps", "web", "src", "app", "admin", "finance", "page.tsx");

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function backup(file) {
  const backupPath = `${file}.bak-v76c-${stamp}`;
  fs.copyFileSync(file, backupPath);
  console.log(`Backup criado: ${path.relative(root, backupPath)}`);
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const files = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (entry.isFile() && full.endsWith(".tsx")) {
      files.push(full);
    }
  }

  return files;
}

function patchContent(content) {
  let updated = content;

  // Caso 1: objeto/card com label Receita antes do href errado.
  updated = updated.replace(
    /(label\s*:\s*["']Receita["'][\s\S]{0,5000}?href\s*:\s*)["']\/admin\/orders["']/g,
    '$1"/admin/finance"',
  );

  // Caso 2: objeto/card com href errado antes do label Receita.
  updated = updated.replace(
    /(href\s*:\s*)["']\/admin\/orders["']([\s\S]{0,5000}?label\s*:\s*["']Receita["'])/g,
    '$1"/admin/finance"$2',
  );

  // Caso 3: objeto/card com label Pedidos antes do href errado.
  updated = updated.replace(
    /(label\s*:\s*["']Pedidos["'][\s\S]{0,5000}?href\s*:\s*)["']\/admin\/finance["']/g,
    '$1"/admin/orders"',
  );

  // Caso 4: objeto/card com href errado antes do label Pedidos.
  updated = updated.replace(
    /(href\s*:\s*)["']\/admin\/finance["']([\s\S]{0,5000}?label\s*:\s*["']Pedidos["'])/g,
    '$1"/admin/orders"$2',
  );

  // Objetos diretos.
  updated = updated.replaceAll('{ label: "Receita", href: "/admin/orders" }', '{ label: "Receita", href: "/admin/finance" }');
  updated = updated.replaceAll("{ label: 'Receita', href: '/admin/orders' }", "{ label: 'Receita', href: '/admin/finance' }");
  updated = updated.replaceAll('{ label: "Pedidos", href: "/admin/finance" }', '{ label: "Pedidos", href: "/admin/orders" }');
  updated = updated.replaceAll("{ label: 'Pedidos', href: '/admin/finance' }", "{ label: 'Pedidos', href: '/admin/orders' }");

  // Financeiro vira Receita quando apontar para finance.
  updated = updated.replace(
    /\{\s*label\s*:\s*["']Financeiro["']\s*,\s*href\s*:\s*["']\/admin\/finance["']\s*\}/g,
    '{ label: "Receita", href: "/admin/finance" }',
  );

  // JSX: texto Receita apontando para orders.
  updated = updated.replace(
    /(<(?:Link|a)[^>]*href=)["']\/admin\/orders["']([^>]*>\s*Receita\s*<\/(?:Link|a)>)/g,
    '$1"/admin/finance"$2',
  );

  // JSX: texto Pedidos apontando para finance.
  updated = updated.replace(
    /(<(?:Link|a)[^>]*href=)["']\/admin\/finance["']([^>]*>\s*Pedidos\s*<\/(?:Link|a)>)/g,
    '$1"/admin/orders"$2',
  );

  // JSX: texto Financeiro apontando para finance.
  updated = updated.replace(
    /(<(?:Link|a)[^>]*href=)["']\/admin\/finance["']([^>]*>\s*)Financeiro(\s*<\/(?:Link|a)>)/g,
    '$1"/admin/finance"$2Receita$3',
  );

  return updated;
}

function forceDashboardMetrics(content) {
  let updated = content;

  // CorreÃ§Ã£o cirÃºrgica do array metrics: qualquer card Receita recebe /admin/finance.
  updated = updated.replace(
    /(\{\s*label:\s*"Receita"[\s\S]*?href:\s*)"(?:\/admin\/orders|\/admin\/finance)"(\s*,?\s*\})/g,
    '$1"/admin/finance"$2',
  );

  // CorreÃ§Ã£o cirÃºrgica do card Pedidos.
  updated = updated.replace(
    /(\{\s*label:\s*"Pedidos"[\s\S]*?href:\s*)"(?:\/admin\/orders|\/admin\/finance)"(\s*,?\s*\})/g,
    '$1"/admin/orders"$2',
  );

  // Fallback ultra direto para o trecho conhecido do dashboard.
  updated = updated.replace(
`    {
      label: "Receita",
      value: revenueValue,
      detail: "Total confirmado em pagamentos",
      icon: "ðŸ’°",
      href: "/admin/orders",
    },`,
`    {
      label: "Receita",
      value: revenueValue,
      detail: "Total confirmado em pagamentos",
      icon: "ðŸ’°",
      href: "/admin/finance",
    },`,
  );

  return updated;
}

function patchFile(file, specialDashboard = false) {
  if (!exists(file)) {
    console.log(`Ignorado, nao encontrado: ${path.relative(root, file)}`);
    return false;
  }

  const original = read(file);
  let updated = patchContent(original);

  if (specialDashboard) {
    updated = forceDashboardMetrics(updated);
  }

  if (updated !== original) {
    backup(file);
    write(file, updated);
    console.log(`Atualizado: ${path.relative(root, file)}`);
    return true;
  }

  console.log(`Sem alteracao: ${path.relative(root, file)}`);
  return false;
}

function scanRelevant(file) {
  if (!exists(file)) return [];

  const text = read(file);
  const lines = text.split(/\r?\n/);
  const findings = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (/label\s*:\s*["'](Receita|Pedidos|Financeiro)["']/.test(lines[i])) {
      const block = lines.slice(i, Math.min(i + 8, lines.length)).join("\n");
      const href = block.match(/href\s*:\s*["']([^"']+)["']/);
      const label = lines[i].match(/label\s*:\s*["']([^"']+)["']/)?.[1] || "?";

      findings.push({
        line: i + 1,
        label,
        href: href ? href[1] : "SEM HREF PERTO",
      });
    }
  }

  return findings;
}

console.log("Aplicando v76c - correcao definitiva Receita/Pedidos...");

if (!exists(financePath)) {
  console.log("ATENCAO: /admin/finance nao existe. Rode a v74 primeiro para criar a tela financeira.");
} else {
  console.log("OK: /admin/finance existe.");
}

if (!exists(ordersPath)) {
  console.log("ATENCAO: /admin/orders nao existe.");
} else {
  console.log("OK: /admin/orders existe.");
}

let changed = false;

changed = patchFile(dashboardPath, true) || changed;
changed = patchFile(headerPath, false) || changed;

for (const file of walk(adminDir)) {
  if ([dashboardPath, headerPath, ordersPath, financePath].includes(file)) continue;
  changed = patchFile(file, false) || changed;
}

console.log("");
console.log("Resumo das rotas encontradas no dashboard:");
for (const item of scanRelevant(dashboardPath)) {
  console.log(`- linha ${item.line}: ${item.label} -> ${item.href}`);
}

console.log("");
console.log("Resumo das rotas encontradas no header:");
for (const item of scanRelevant(headerPath)) {
  console.log(`- linha ${item.line}: ${item.label} -> ${item.href}`);
}

const dashboardAfter = exists(dashboardPath) ? read(dashboardPath) : "";
const headerAfter = exists(headerPath) ? read(headerPath) : "";

const dashboardBad = /label\s*:\s*["']Receita["'][\s\S]{0,5000}?href\s*:\s*["']\/admin\/orders["']/.test(dashboardAfter);
const headerBadRevenue = /label\s*:\s*["']Receita["'][\s\S]{0,5000}?href\s*:\s*["']\/admin\/orders["']/.test(headerAfter);
const headerBadPedidos = /label\s*:\s*["']Pedidos["'][\s\S]{0,5000}?href\s*:\s*["']\/admin\/finance["']/.test(headerAfter);

console.log("");
console.log("Verificacao objetiva:");
console.log(`- Dashboard Receita -> /admin/orders: ${dashboardBad ? "AINDA ERRADO" : "OK"}`);
console.log(`- Header Receita -> /admin/orders: ${headerBadRevenue ? "AINDA ERRADO" : "OK"}`);
console.log(`- Header Pedidos -> /admin/finance: ${headerBadPedidos ? "AINDA ERRADO" : "OK"}`);

if (dashboardBad || headerBadRevenue || headerBadPedidos) {
  console.log("");
  console.log("ATENCAO: ainda sobrou rota errada. Envie o resumo acima para ajustar o trecho exato.");
  process.exitCode = 2;
} else {
  console.log("");
  console.log(changed ? "v76c aplicada com sucesso." : "v76c executada. As rotas ja estavam corretas.");
  console.log("Receita -> /admin/finance");
  console.log("Pedidos -> /admin/orders");
}
