# aplicar-v63-corrigir-acesso-paginas-admin.ps1
# Corrige o problema de clicar nos itens admin e nao acessar as paginas.
#
# Faz duas coisas:
# 1. Substitui o CustomerHeader por uma versao com links <a href>, ou seja, navegacao real.
# 2. Corrige guards/checks do front em /admin para aceitar SUPER_ADMIN onde antes aceitava so ADMIN.
#
# Nao mexe na dashboard.

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Write-TextBase64File($RelativePath, $Base64Content) {
  $Target = Join-Path $Root $RelativePath
  $TargetDir = Split-Path $Target -Parent

  if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  }

  if (Test-Path $Target) {
    $Backup = "$Target.bak-v63-$Stamp"
    Copy-Item $Target $Backup -Force
    Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
  }

  $Content = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64Content))
  Set-Content -Path $Target -Value $Content -Encoding UTF8
  Write-Host "Atualizado: $RelativePath" -ForegroundColor Green
}

function Patch-AdminFrontGuards() {
  $PatchScriptPath = Join-Path $Root ".tmp-v63-patch-admin-guards.js"

  $NodeScript = @'
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
'@

  Set-Content -Path $PatchScriptPath -Value $NodeScript -Encoding UTF8

  Write-Host "Corrigindo guards/checks do front admin para SUPER_ADMIN..." -ForegroundColor Cyan
  node $PatchScriptPath

  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao rodar patch dos guards admin."
  }
}

Write-Host "Aplicando v63 - corrigir acesso das paginas admin..." -ForegroundColor Cyan

$HeaderBase64 = "InVzZSBjbGllbnQiOwoKaW1wb3J0IHsgRm9ybUV2ZW50LCB1c2VFZmZlY3QsIHVzZU1lbW8sIHVzZVN0YXRlIH0gZnJvbSAicmVhY3QiOwoKZXhwb3J0IHR5cGUgQ3VzdG9tZXJIZWFkZXJVc2VyID0gewogIGlkPzogc3RyaW5nOwogIG5hbWU/OiBzdHJpbmc7CiAgZW1haWw/OiBzdHJpbmc7CiAgY3BmPzogc3RyaW5nOwogIHJvbGU/OiBzdHJpbmc7Cn07Cgp0eXBlIEN1c3RvbWVySGVhZGVyUHJvcHMgPSB7CiAgdXNlcjogQ3VzdG9tZXJIZWFkZXJVc2VyIHwgbnVsbDsKICBhY3RpdmVOYXY/OiAiZGFzaGJvYXJkIiB8ICJvcmRlcnMiIHwgIndhbGxldCIgfCAic3VwcG9ydCI7CiAgc2hvd1NlYXJjaD86IGJvb2xlYW47CiAgc2VhcmNoUGxhY2Vob2xkZXI/OiBzdHJpbmc7CiAgc2VhcmNoQXBwZWFyc09uU2Nyb2xsPzogYm9vbGVhbjsKICBzaG93TG9jYXRpb25CdXR0b24/OiBib29sZWFuOwp9OwoKdHlwZSBIZWFkZXJMaW5rID0gewogIGxhYmVsOiBzdHJpbmc7CiAgaHJlZjogc3RyaW5nOwp9OwoKZnVuY3Rpb24gZ2V0SW5pdGlhbHMobmFtZT86IHN0cmluZyB8IG51bGwsIGVtYWlsPzogc3RyaW5nIHwgbnVsbCkgewogIGNvbnN0IHNvdXJjZSA9IFN0cmluZyhuYW1lIHx8IGVtYWlsIHx8ICJBIikudHJpbSgpOwoKICBpZiAoIXNvdXJjZSkgcmV0dXJuICJBIjsKCiAgY29uc3QgcGllY2VzID0gc291cmNlLnNwbGl0KC9ccysvKS5maWx0ZXIoQm9vbGVhbik7CgogIGlmIChwaWVjZXMubGVuZ3RoID09PSAxKSByZXR1cm4gcGllY2VzWzBdLnNsaWNlKDAsIDEpLnRvVXBwZXJDYXNlKCk7CgogIHJldHVybiBgJHtwaWVjZXNbMF0uc2xpY2UoMCwgMSl9JHtwaWVjZXNbcGllY2VzLmxlbmd0aCAtIDFdLnNsaWNlKDAsIDEpfWAudG9VcHBlckNhc2UoKTsKfQoKZnVuY3Rpb24gbm9ybWFsaXplUm9sZShyb2xlPzogc3RyaW5nIHwgbnVsbCkgewogIHJldHVybiBTdHJpbmcocm9sZSB8fCAiIikudHJpbSgpLnRvVXBwZXJDYXNlKCk7Cn0KCmZ1bmN0aW9uIGdldFN0b3JlZFVzZXIoKTogQ3VzdG9tZXJIZWFkZXJVc2VyIHwgbnVsbCB7CiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICJ1bmRlZmluZWQiKSByZXR1cm4gbnVsbDsKCiAgdHJ5IHsKICAgIGNvbnN0IHJhd1VzZXIgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbSgidXNlciIpOwoKICAgIHJldHVybiByYXdVc2VyID8gKEpTT04ucGFyc2UocmF3VXNlcikgYXMgQ3VzdG9tZXJIZWFkZXJVc2VyKSA6IG51bGw7CiAgfSBjYXRjaCB7CiAgICByZXR1cm4gbnVsbDsKICB9Cn0KCmZ1bmN0aW9uIGdldENyZWF0ZUV2ZW50UGF0aChyb2xlOiBzdHJpbmcpIHsKICBpZiAocm9sZSA9PT0gIkFETUlOIiB8fCByb2xlID09PSAiU1VQRVJfQURNSU4iKSByZXR1cm4gIi9hZG1pbi9ldmVudHMvbmV3IjsKCiAgcmV0dXJuICIvc3VwcG9ydC9hZG1pbi1yZXF1ZXN0IjsKfQoKZnVuY3Rpb24gTWVudUxpbmsoewogIGhyZWYsCiAgYWN0aXZlLAogIGNoaWxkcmVuLAp9OiB7CiAgaHJlZjogc3RyaW5nOwogIGFjdGl2ZT86IGJvb2xlYW47CiAgY2hpbGRyZW46IFJlYWN0LlJlYWN0Tm9kZTsKfSkgewogIHJldHVybiAoCiAgICA8YQogICAgICBocmVmPXtocmVmfQogICAgICBjbGFzc05hbWU9e2BmbGV4IHctZnVsbCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIHJvdW5kZWQteGwgcHgtMyBweS0zIHRleHQtbGVmdCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdHJhbnNpdGlvbiAkewogICAgICAgIGFjdGl2ZQogICAgICAgICAgPyAiYmctbmV1dHJhbC05NTAgdGV4dC13aGl0ZSIKICAgICAgICAgIDogInRleHQtbmV1dHJhbC03MDAgaG92ZXI6YmctbmV1dHJhbC01MCBob3Zlcjp0ZXh0LW5ldXRyYWwtOTUwIgogICAgICB9YH0KICAgID4KICAgICAgPHNwYW4+e2NoaWxkcmVufTwvc3Bhbj4KICAgIDwvYT4KICApOwp9CgpleHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDdXN0b21lckhlYWRlcih7CiAgdXNlciwKICBhY3RpdmVOYXYgPSAiZGFzaGJvYXJkIiwKICBzaG93U2VhcmNoID0gZmFsc2UsCiAgc2VhcmNoUGxhY2Vob2xkZXIgPSAiQnVzY2FyIGV4cGVyacOqbmNpYXMiLAogIHNlYXJjaEFwcGVhcnNPblNjcm9sbCA9IGZhbHNlLAogIHNob3dMb2NhdGlvbkJ1dHRvbiA9IGZhbHNlLAp9OiBDdXN0b21lckhlYWRlclByb3BzKSB7CiAgY29uc3QgW21lbnVPcGVuLCBzZXRNZW51T3Blbl0gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc3QgW2xvY2FsU2VhcmNoLCBzZXRMb2NhbFNlYXJjaF0gPSB1c2VTdGF0ZSgiIik7CiAgY29uc3QgW3Njcm9sbGVkLCBzZXRTY3JvbGxlZF0gPSB1c2VTdGF0ZShmYWxzZSk7CiAgY29uc3QgW3N0b3JlZFVzZXIsIHNldFN0b3JlZFVzZXJdID0gdXNlU3RhdGU8Q3VzdG9tZXJIZWFkZXJVc2VyIHwgbnVsbD4obnVsbCk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBzZXRTdG9yZWRVc2VyKGdldFN0b3JlZFVzZXIoKSk7CgogICAgZnVuY3Rpb24gaGFuZGxlU3RvcmFnZUNoYW5nZSgpIHsKICAgICAgc2V0U3RvcmVkVXNlcihnZXRTdG9yZWRVc2VyKCkpOwogICAgfQoKICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJzdG9yYWdlIiwgaGFuZGxlU3RvcmFnZUNoYW5nZSk7CiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigiYXN0cm8tdXNlci11cGRhdGVkIiwgaGFuZGxlU3RvcmFnZUNoYW5nZSBhcyBFdmVudExpc3RlbmVyKTsKCiAgICByZXR1cm4gKCkgPT4gewogICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigic3RvcmFnZSIsIGhhbmRsZVN0b3JhZ2VDaGFuZ2UpOwogICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiYXN0cm8tdXNlci11cGRhdGVkIiwgaGFuZGxlU3RvcmFnZUNoYW5nZSBhcyBFdmVudExpc3RlbmVyKTsKICAgIH07CiAgfSwgW10pOwoKICB1c2VFZmZlY3QoKCkgPT4gewogICAgZnVuY3Rpb24gaGFuZGxlRXh0ZXJuYWxTZWFyY2hTeW5jKGV2ZW50OiBFdmVudCkgewogICAgICBjb25zdCBjdXN0b21FdmVudCA9IGV2ZW50IGFzIEN1c3RvbUV2ZW50PHN0cmluZz47CiAgICAgIHNldExvY2FsU2VhcmNoKGN1c3RvbUV2ZW50LmRldGFpbCB8fCAiIik7CiAgICB9CgogICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoImN1c3RvbWVyLWhlYWRlci1zZWFyY2gtc3luYyIsIGhhbmRsZUV4dGVybmFsU2VhcmNoU3luYyBhcyBFdmVudExpc3RlbmVyKTsKCiAgICByZXR1cm4gKCkgPT4gewogICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigiY3VzdG9tZXItaGVhZGVyLXNlYXJjaC1zeW5jIiwgaGFuZGxlRXh0ZXJuYWxTZWFyY2hTeW5jIGFzIEV2ZW50TGlzdGVuZXIpOwogICAgfTsKICB9LCBbXSk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBpZiAoIXNlYXJjaEFwcGVhcnNPblNjcm9sbCkgewogICAgICBzZXRTY3JvbGxlZChmYWxzZSk7CiAgICAgIHJldHVybjsKICAgIH0KCiAgICBmdW5jdGlvbiBoYW5kbGVTY3JvbGwoKSB7CiAgICAgIHNldFNjcm9sbGVkKHdpbmRvdy5zY3JvbGxZID4gODApOwogICAgfQoKICAgIGhhbmRsZVNjcm9sbCgpOwoKICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCJzY3JvbGwiLCBoYW5kbGVTY3JvbGwsIHsgcGFzc2l2ZTogdHJ1ZSB9KTsKCiAgICByZXR1cm4gKCkgPT4gewogICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigic2Nyb2xsIiwgaGFuZGxlU2Nyb2xsKTsKICAgIH07CiAgfSwgW3NlYXJjaEFwcGVhcnNPblNjcm9sbF0pOwoKICBjb25zdCBjdXJyZW50VXNlciA9IHVzZXIgfHwgc3RvcmVkVXNlcjsKICBjb25zdCByb2xlID0gbm9ybWFsaXplUm9sZShjdXJyZW50VXNlcj8ucm9sZSk7CiAgY29uc3QgaXNTdXBlckFkbWluID0gcm9sZSA9PT0gIlNVUEVSX0FETUlOIjsKICBjb25zdCBpc0FkbWluID0gcm9sZSA9PT0gIkFETUlOIiB8fCBpc1N1cGVyQWRtaW47CiAgY29uc3QgaXNPcGVyYXRvciA9IHJvbGUgPT09ICJPUEVSQVRPUiI7CgogIGNvbnN0IHNob3VsZFNob3dTZWFyY2ggPSBzaG93U2VhcmNoICYmICghc2VhcmNoQXBwZWFyc09uU2Nyb2xsIHx8IHNjcm9sbGVkKTsKICBjb25zdCBjcmVhdGVFdmVudFBhdGggPSBnZXRDcmVhdGVFdmVudFBhdGgocm9sZSk7CgogIGNvbnN0IHRvcExpbmtzOiBIZWFkZXJMaW5rW10gPSB1c2VNZW1vKCgpID0+IHsKICAgIHJldHVybiBbCiAgICAgIHsgbGFiZWw6ICJDcmlhciBldmVudG8iLCBocmVmOiBjcmVhdGVFdmVudFBhdGggfSwKICAgICAgeyBsYWJlbDogIk1ldXMgaW5ncmVzc29zIiwgaHJlZjogIi9vcmRlcnMiIH0sCiAgICBdOwogIH0sIFtjcmVhdGVFdmVudFBhdGhdKTsKCiAgY29uc3Qgc3VwZXJBZG1pbkxpbmtzOiBIZWFkZXJMaW5rW10gPSBbCiAgICB7IGxhYmVsOiAiUGFpbmVsIGFkbWluaXN0cmF0aXZvIiwgaHJlZjogIi9hZG1pbi9kYXNoYm9hcmQiIH0sCiAgICB7IGxhYmVsOiAiU29saWNpdGHDp8O1ZXMgZGUgY3JpYWRvciIsIGhyZWY6ICIvYWRtaW4vc3VwcG9ydC9hZG1pbi1yZXF1ZXN0cyIgfSwKICAgIHsgbGFiZWw6ICJPcmdhbml6YWRvcmVzIiwgaHJlZjogIi9hZG1pbi9vcmdhbml6ZXJzIiB9LAogICAgeyBsYWJlbDogIkV2ZW50b3MiLCBocmVmOiAiL2FkbWluL2V2ZW50cyIgfSwKICAgIHsgbGFiZWw6ICJDcmlhciBldmVudG8iLCBocmVmOiAiL2FkbWluL2V2ZW50cy9uZXciIH0sCiAgICB7IGxhYmVsOiAiUGVkaWRvcyIsIGhyZWY6ICIvYWRtaW4vb3JkZXJzIiB9LAogICAgeyBsYWJlbDogIkF0ZW5kaW1lbnRvcyIsIGhyZWY6ICIvYWRtaW4vc3VwcG9ydCIgfSwKICAgIHsgbGFiZWw6ICJWYWxpZGHDp8OjbyAvIENoZWNrLWluIiwgaHJlZjogIi9hZG1pbi92YWxpZGF0aW9uIiB9LAogICAgeyBsYWJlbDogIlRlbGEgcHJpbmNpcGFsIiwgaHJlZjogIi9kYXNoYm9hcmQiIH0sCiAgXTsKCiAgY29uc3QgYWRtaW5MaW5rczogSGVhZGVyTGlua1tdID0gWwogICAgeyBsYWJlbDogIlBhaW5lbCBhZG1pbmlzdHJhdGl2byIsIGhyZWY6ICIvYWRtaW4vZGFzaGJvYXJkIiB9LAogICAgeyBsYWJlbDogIkNyaWFyIGV2ZW50byIsIGhyZWY6ICIvYWRtaW4vZXZlbnRzL25ldyIgfSwKICAgIHsgbGFiZWw6ICJFdmVudG9zIiwgaHJlZjogIi9hZG1pbi9ldmVudHMiIH0sCiAgICB7IGxhYmVsOiAiUGVkaWRvcyIsIGhyZWY6ICIvYWRtaW4vb3JkZXJzIiB9LAogICAgeyBsYWJlbDogIkF0ZW5kaW1lbnRvcyIsIGhyZWY6ICIvYWRtaW4vc3VwcG9ydCIgfSwKICAgIHsgbGFiZWw6ICJWYWxpZGHDp8OjbyAvIENoZWNrLWluIiwgaHJlZjogIi9hZG1pbi92YWxpZGF0aW9uIiB9LAogICAgeyBsYWJlbDogIlRlbGEgcHJpbmNpcGFsIiwgaHJlZjogIi9kYXNoYm9hcmQiIH0sCiAgXTsKCiAgY29uc3Qgb3BlcmF0b3JMaW5rczogSGVhZGVyTGlua1tdID0gWwogICAgeyBsYWJlbDogIlBhaW5lbCBvcGVyYWRvciIsIGhyZWY6ICIvb3BlcmF0b3IvZGFzaGJvYXJkIiB9LAogICAgeyBsYWJlbDogIlZhbGlkYcOnw6NvIC8gQ2hlY2staW4iLCBocmVmOiAiL29wZXJhdG9yL3ZhbGlkYXRpb24iIH0sCiAgICB7IGxhYmVsOiAiVGVsYSBwcmluY2lwYWwiLCBocmVmOiAiL2Rhc2hib2FyZCIgfSwKICBdOwoKICBmdW5jdGlvbiBpc0FjdGl2ZVBhdGgoaHJlZjogc3RyaW5nKSB7CiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gInVuZGVmaW5lZCIpIHJldHVybiBmYWxzZTsKCiAgICByZXR1cm4gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lID09PSBocmVmIHx8IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zdGFydHNXaXRoKGAke2hyZWZ9L2ApOwogIH0KCiAgZnVuY3Rpb24gaGFuZGxlU2VhcmNoU3VibWl0KGV2ZW50OiBGb3JtRXZlbnQ8SFRNTEZvcm1FbGVtZW50PikgewogICAgZXZlbnQucHJldmVudERlZmF1bHQoKTsKCiAgICBjb25zdCB0ZXJtID0gbG9jYWxTZWFyY2gudHJpbSgpOwoKICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KAogICAgICBuZXcgQ3VzdG9tRXZlbnQoImN1c3RvbWVyLWhlYWRlci1zZWFyY2giLCB7CiAgICAgICAgZGV0YWlsOiB0ZXJtLAogICAgICB9KSwKICAgICk7CgogICAgaWYgKHRlcm0pIHsKICAgICAgd2luZG93LmxvY2F0aW9uLmFzc2lnbihgL2V2ZW50cz9xPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHRlcm0pfWApOwogICAgICByZXR1cm47CiAgICB9CgogICAgaWYgKCF3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3RhcnRzV2l0aCgiL2Rhc2hib2FyZCIpKSB7CiAgICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24oIi9kYXNoYm9hcmQiKTsKICAgIH0KICB9CgogIGZ1bmN0aW9uIGhhbmRsZUxvZ291dCgpIHsKICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKCJ0b2tlbiIpOwogICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oInJlZnJlc2hUb2tlbiIpOwogICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oInVzZXIiKTsKICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24oIi9sb2dpbiIpOwogIH0KCiAgZnVuY3Rpb24gcmVuZGVyU2VhcmNoKCkgewogICAgaWYgKCFzaG91bGRTaG93U2VhcmNoKSByZXR1cm4gbnVsbDsKCiAgICByZXR1cm4gKAogICAgICA8Zm9ybQogICAgICAgIG9uU3VibWl0PXtoYW5kbGVTZWFyY2hTdWJtaXR9CiAgICAgICAgY2xhc3NOYW1lPSJoaWRkZW4gaC0xMSBtaW4tdy1bMjYwcHhdIGZsZXgtMSBtYXgtdy1bNTIwcHhdIGl0ZW1zLWNlbnRlciByb3VuZGVkLXhsIGJnLXdoaXRlIHB4LTQgc2hhZG93LXNtIHJpbmctMSByaW5nLWJsYWNrLzEwIG1kOmZsZXgiCiAgICAgID4KICAgICAgICA8c3BhbiBjbGFzc05hbWU9Im1yLTMgdGV4dC1zbSB0ZXh0LW5ldXRyYWwtNDAwIj7ijJU8L3NwYW4+CiAgICAgICAgPGlucHV0CiAgICAgICAgICB0eXBlPSJ0ZXh0IgogICAgICAgICAgdmFsdWU9e2xvY2FsU2VhcmNofQogICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0TG9jYWxTZWFyY2goZXZlbnQudGFyZ2V0LnZhbHVlKX0KICAgICAgICAgIHBsYWNlaG9sZGVyPXtzZWFyY2hQbGFjZWhvbGRlcn0KICAgICAgICAgIGNsYXNzTmFtZT0idy1mdWxsIGJnLXRyYW5zcGFyZW50IHRleHQtc20gZm9udC1zZW1pYm9sZCB0ZXh0LW5ldXRyYWwtNzAwIG91dGxpbmUtbm9uZSBwbGFjZWhvbGRlcjp0ZXh0LW5ldXRyYWwtNDAwIgogICAgICAgIC8+CiAgICAgIDwvZm9ybT4KICAgICk7CiAgfQoKICBmdW5jdGlvbiByZW5kZXJSb2xlTWVudSgpIHsKICAgIGlmIChpc1N1cGVyQWRtaW4pIHsKICAgICAgcmV0dXJuICgKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0icHgtMiBwYi0yIHB0LTEiPgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJweC0yIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLVswLjIyZW1dIHRleHQtbmV1dHJhbC00MDAiPgogICAgICAgICAgICBTdXBlciBhZG1pbmlzdHJhw6fDo28KICAgICAgICAgIDwvcD4KCiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibXQtMiBzcGFjZS15LTEiPgogICAgICAgICAgICB7c3VwZXJBZG1pbkxpbmtzLm1hcCgoaXRlbSkgPT4gKAogICAgICAgICAgICAgIDxNZW51TGluayBrZXk9e2l0ZW0uaHJlZn0gaHJlZj17aXRlbS5ocmVmfSBhY3RpdmU9e2lzQWN0aXZlUGF0aChpdGVtLmhyZWYpfT4KICAgICAgICAgICAgICAgIHtpdGVtLmxhYmVsfQogICAgICAgICAgICAgIDwvTWVudUxpbms+CiAgICAgICAgICAgICkpfQogICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICAgICk7CiAgICB9CgogICAgaWYgKGlzQWRtaW4pIHsKICAgICAgcmV0dXJuICgKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0icHgtMiBwYi0yIHB0LTEiPgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJweC0yIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLVswLjIyZW1dIHRleHQtbmV1dHJhbC00MDAiPgogICAgICAgICAgICBBZG1pbmlzdHJhw6fDo28KICAgICAgICAgIDwvcD4KCiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibXQtMiBzcGFjZS15LTEiPgogICAgICAgICAgICB7YWRtaW5MaW5rcy5tYXAoKGl0ZW0pID0+ICgKICAgICAgICAgICAgICA8TWVudUxpbmsga2V5PXtpdGVtLmhyZWZ9IGhyZWY9e2l0ZW0uaHJlZn0gYWN0aXZlPXtpc0FjdGl2ZVBhdGgoaXRlbS5ocmVmKX0+CiAgICAgICAgICAgICAgICB7aXRlbS5sYWJlbH0KICAgICAgICAgICAgICA8L01lbnVMaW5rPgogICAgICAgICAgICApKX0KICAgICAgICAgIDwvZGl2PgogICAgICAgIDwvZGl2PgogICAgICApOwogICAgfQoKICAgIGlmIChpc09wZXJhdG9yKSB7CiAgICAgIHJldHVybiAoCiAgICAgICAgPGRpdiBjbGFzc05hbWU9InB4LTIgcGItMiBwdC0xIj4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0icHgtMiB0ZXh0LVsxMHB4XSBmb250LWJsYWNrIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yMmVtXSB0ZXh0LW5ldXRyYWwtNDAwIj4KICAgICAgICAgICAgT3BlcmHDp8OjbwogICAgICAgICAgPC9wPgoKICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJtdC0yIHNwYWNlLXktMSI+CiAgICAgICAgICAgIHtvcGVyYXRvckxpbmtzLm1hcCgoaXRlbSkgPT4gKAogICAgICAgICAgICAgIDxNZW51TGluayBrZXk9e2l0ZW0uaHJlZn0gaHJlZj17aXRlbS5ocmVmfSBhY3RpdmU9e2lzQWN0aXZlUGF0aChpdGVtLmhyZWYpfT4KICAgICAgICAgICAgICAgIHtpdGVtLmxhYmVsfQogICAgICAgICAgICAgIDwvTWVudUxpbms+CiAgICAgICAgICAgICkpfQogICAgICAgICAgPC9kaXY+CiAgICAgICAgPC9kaXY+CiAgICAgICk7CiAgICB9CgogICAgcmV0dXJuIG51bGw7CiAgfQoKICByZXR1cm4gKAogICAgPGhlYWRlciBjbGFzc05hbWU9InN0aWNreSB0b3AtMCB6LVs5OTk5XSBib3JkZXItYiBib3JkZXItWyNlYTVmMDBdIGJnLVsjZmY2OTAwXSBzaGFkb3ctc20iPgogICAgICA8ZGl2IGNsYXNzTmFtZT0ibXgtYXV0byBmbGV4IGgtWzgycHhdIG1heC13LVsxMTgwcHhdIGl0ZW1zLWNlbnRlciBnYXAtNSBweC00Ij4KICAgICAgICA8YSBocmVmPSIvZGFzaGJvYXJkIiBjbGFzc05hbWU9ImZsZXggc2hyaW5rLTAgaXRlbXMtY2VudGVyIj4KICAgICAgICAgIDxpbWcKICAgICAgICAgICAgc3JjPSIvYXN0cm8taW5ncmVzc29zLWxvZ28ucG5nIgogICAgICAgICAgICBhbHQ9IkFzdHJvIEluZ3Jlc3NvcyIKICAgICAgICAgICAgY2xhc3NOYW1lPSJoLVs1NnB4XSB3LWF1dG8gb2JqZWN0LWNvbnRhaW4iCiAgICAgICAgICAvPgogICAgICAgIDwvYT4KCiAgICAgICAge3JlbmRlclNlYXJjaCgpfQoKICAgICAgICB7c2hvdWxkU2hvd1NlYXJjaCAmJiBzaG93TG9jYXRpb25CdXR0b24gPyAoCiAgICAgICAgICA8YQogICAgICAgICAgICBocmVmPSIvZXZlbnRzIgogICAgICAgICAgICBjbGFzc05hbWU9ImhpZGRlbiBoLTExIHNocmluay0wIGl0ZW1zLWNlbnRlciByb3VuZGVkLXhsIGJnLVsjMTkwMDJmXSBweC00IHRleHQtc20gZm9udC1ibGFjayB0ZXh0LXdoaXRlIHNoYWRvdy1zbSBob3ZlcjpiZy1bIzJhMDY0OF0gbGc6ZmxleCIKICAgICAgICAgID4KICAgICAgICAgICAg4pymIFF1YWxxdWVyIGx1Z2FyCiAgICAgICAgICA8L2E+CiAgICAgICAgKSA6IG51bGx9CgogICAgICAgIDxuYXYgY2xhc3NOYW1lPSJtbC1hdXRvIGhpZGRlbiBpdGVtcy1jZW50ZXIgZ2FwLTggbWQ6ZmxleCI+CiAgICAgICAgICB7dG9wTGlua3MubWFwKChpdGVtKSA9PiAoCiAgICAgICAgICAgIDxhCiAgICAgICAgICAgICAga2V5PXtpdGVtLmhyZWZ9CiAgICAgICAgICAgICAgaHJlZj17aXRlbS5ocmVmfQogICAgICAgICAgICAgIGNsYXNzTmFtZT0id2hpdGVzcGFjZS1ub3dyYXAgdGV4dC1zbSBmb250LWJsYWNrIHRleHQtWyMxOTAwMmZdLzg1IHRyYW5zaXRpb24gaG92ZXI6dGV4dC1bIzE5MDAyZl0iCiAgICAgICAgICAgID4KICAgICAgICAgICAgICB7aXRlbS5sYWJlbH0KICAgICAgICAgICAgPC9hPgogICAgICAgICAgKSl9CiAgICAgICAgPC9uYXY+CgogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJyZWxhdGl2ZSBzaHJpbmstMCI+CiAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0TWVudU9wZW4oKHZhbHVlKSA9PiAhdmFsdWUpfQogICAgICAgICAgICBjbGFzc05hbWU9ImZsZXggaC0xMSBpdGVtcy1jZW50ZXIgZ2FwLTIgcm91bmRlZC1mdWxsIGJnLXdoaXRlIHB4LTMgdGV4dC1bIzE5MDAyZl0gc2hhZG93LXNtIHJpbmctMSByaW5nLWJsYWNrLzEwIgogICAgICAgICAgICBhcmlhLWxhYmVsPSJBYnJpciBtZW51IgogICAgICAgICAgPgogICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQteGwgbGVhZGluZy1ub25lIj7imLA8L3NwYW4+CiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0iZmxleCBoLTggdy04IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciByb3VuZGVkLWZ1bGwgYmctWyMxOTAwMmZdIHRleHQtc20gZm9udC1ibGFjayB0ZXh0LXdoaXRlIj4KICAgICAgICAgICAgICB7Z2V0SW5pdGlhbHMoY3VycmVudFVzZXI/Lm5hbWUsIGN1cnJlbnRVc2VyPy5lbWFpbCl9CiAgICAgICAgICAgIDwvc3Bhbj4KICAgICAgICAgIDwvYnV0dG9uPgoKICAgICAgICAgIHttZW51T3BlbiA/ICgKICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9ImFic29sdXRlIHJpZ2h0LTAgei1bMTAwMDBdIG10LTMgdy04MCBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC0yeGwgYm9yZGVyIGJvcmRlci1uZXV0cmFsLTIwMCBiZy13aGl0ZSBzaGFkb3cteGwiPgogICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJib3JkZXItYiBib3JkZXItbmV1dHJhbC0xMDAgcHgtNCBweS00Ij4KICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLXN0YXJ0IGp1c3RpZnktYmV0d2VlbiBnYXAtMyI+CiAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJtaW4tdy0wIj4KICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9InRydW5jYXRlIHRleHQtc20gZm9udC1ibGFjayB0ZXh0LW5ldXRyYWwtOTUwIj4KICAgICAgICAgICAgICAgICAgICAgIHtjdXJyZW50VXNlcj8ubmFtZSB8fCAiVXN1w6FyaW8ifQogICAgICAgICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9Im10LTEgYnJlYWstYWxsIHRleHQteHMgZm9udC1zZW1pYm9sZCB0ZXh0LW5ldXRyYWwtNTAwIj4KICAgICAgICAgICAgICAgICAgICAgIHtjdXJyZW50VXNlcj8uZW1haWwgfHwgInNlbSBlLW1haWwifQogICAgICAgICAgICAgICAgICAgIDwvcD4KICAgICAgICAgICAgICAgICAgICA8cCBjbGFzc05hbWU9Im10LTEgdGV4dC14cyB0ZXh0LW5ldXRyYWwtNDAwIj4KICAgICAgICAgICAgICAgICAgICAgIENQRjoge2N1cnJlbnRVc2VyPy5jcGYgfHwgIm7Do28gaW5mb3JtYWRvIn0KICAgICAgICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJyb3VuZGVkLWZ1bGwgYmctbmV1dHJhbC0xMDAgcHgtMiBweS0xIHRleHQtWzEwcHhdIGZvbnQtYmxhY2sgdXBwZXJjYXNlIHRyYWNraW5nLVswLjEyZW1dIHRleHQtbmV1dHJhbC01MDAiPgogICAgICAgICAgICAgICAgICAgIHtyb2xlIHx8ICJVU0VSIn0KICAgICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgIHtyZW5kZXJSb2xlTWVudSgpfQoKICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iYm9yZGVyLXQgYm9yZGVyLW5ldXRyYWwtMTAwIHAtMiI+CiAgICAgICAgICAgICAgICA8TWVudUxpbmsgaHJlZj0iL2Rhc2hib2FyZCIgYWN0aXZlPXthY3RpdmVOYXYgPT09ICJkYXNoYm9hcmQifT4KICAgICAgICAgICAgICAgICAgSW7DrWNpbwogICAgICAgICAgICAgICAgPC9NZW51TGluaz4KCiAgICAgICAgICAgICAgICA8TWVudUxpbmsgaHJlZj17Y3JlYXRlRXZlbnRQYXRofT5DcmlhciBldmVudG88L01lbnVMaW5rPgoKICAgICAgICAgICAgICAgIDxNZW51TGluayBocmVmPSIvb3JkZXJzIiBhY3RpdmU9e2FjdGl2ZU5hdiA9PT0gIm9yZGVycyJ9PgogICAgICAgICAgICAgICAgICBNZXVzIGluZ3Jlc3NvcwogICAgICAgICAgICAgICAgPC9NZW51TGluaz4KCiAgICAgICAgICAgICAgICA8TWVudUxpbmsgaHJlZj0iL3N1cHBvcnQiIGFjdGl2ZT17YWN0aXZlTmF2ID09PSAic3VwcG9ydCJ9PgogICAgICAgICAgICAgICAgICBTdXBvcnRlCiAgICAgICAgICAgICAgICA8L01lbnVMaW5rPgoKICAgICAgICAgICAgICAgIDxNZW51TGluayBocmVmPSIvd2FsbGV0IiBhY3RpdmU9e2FjdGl2ZU5hdiA9PT0gIndhbGxldCJ9PgogICAgICAgICAgICAgICAgICBXYWxsZXQKICAgICAgICAgICAgICAgIDwvTWVudUxpbms+CiAgICAgICAgICAgICAgPC9kaXY+CgogICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJib3JkZXItdCBib3JkZXItbmV1dHJhbC0xMDAgcC0yIj4KICAgICAgICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgICAgICAgdHlwZT0iYnV0dG9uIgogICAgICAgICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVMb2dvdXR9CiAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0iZmxleCB3LWZ1bGwgaXRlbXMtY2VudGVyIHJvdW5kZWQteGwgcHgtMyBweS0zIHRleHQtbGVmdCB0ZXh0LXNtIGZvbnQtc2VtaWJvbGQgdGV4dC1yZWQtNjAwIGhvdmVyOmJnLXJlZC01MCIKICAgICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgICAgU2FpcgogICAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICAgIDwvZGl2PgogICAgICAgICAgKSA6IG51bGx9CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgogICAgPC9oZWFkZXI+CiAgKTsKfQo="

Write-TextBase64File "apps\web\src\components\customer\CustomerHeader.tsx" $HeaderBase64
Patch-AdminFrontGuards

Write-Host ""
Write-Host "v63 aplicada com sucesso." -ForegroundColor Green
Write-Host "O menu agora usa links reais e o SUPER_ADMIN pode entrar nas paginas admin." -ForegroundColor Cyan
Write-Host ""
Write-Host "Agora reinicie o WEB:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se alguma rota admin ainda voltar para a dashboard, reinicie tambem a API e faca logout/login." -ForegroundColor Yellow
