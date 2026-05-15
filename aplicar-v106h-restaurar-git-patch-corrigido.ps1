param(
  [switch]$Build
)

$ErrorActionPreference = "Stop"

$Root = Get-Location
$ApiDir = Join-Path $Root "apps\api"
$WebDir = Join-Path $Root "apps\web"
$TicketsService = Join-Path $ApiDir "src\tickets\tickets.service.ts"
$OrderDetailPage = Join-Path $WebDir "src\app\(customer)\orders\[id]\page.tsx"

$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $Root ".backup-v106h-$Stamp"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

function Write-Utf8Literal($LiteralPath, $Content) {
  $FullPath = [System.IO.Path]::GetFullPath([string]$LiteralPath)
  $Dir = [System.IO.Path]::GetDirectoryName($FullPath)

  if (-not [System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($FullPath, $Content, $Utf8NoBom)
}

function Backup-File($Path, $Name) {
  if (Test-Path -LiteralPath $Path) {
    Copy-Item -LiteralPath $Path -Destination (Join-Path $BackupDir $Name) -Force
    Write-Host "[OK] Backup atual: $Name" -ForegroundColor Green
  }
}

Write-Host "Aplicando v106h - restaurar TicketsService do Git e aplicar patch corrigido..." -ForegroundColor Cyan

if (-not (Test-Path -LiteralPath $ApiDir)) {
  throw "Nao encontrei apps\api. Rode este script na raiz plataforma-ingressos."
}

if (-not (Test-Path -LiteralPath $TicketsService)) {
  throw "Nao encontrei apps\api\src\tickets\tickets.service.ts"
}

Backup-File $TicketsService "tickets.service.ts.antes-v106h.bak"
Backup-File $OrderDetailPage "orders-id-page.tsx.antes-v106h.bak"

$PatchJs = @'
const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = process.argv[2];

function read(file) {
  return fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function write(file, content) {
  fs.writeFileSync(file, content.replace(/\r\n/g, "\n"), "utf8");
}

function fail(message) {
  throw new Error(message);
}

function hasRequiredMethods(text) {
  return (
    text.includes("export class TicketsService") &&
    text.includes("async createTransferRequest") &&
    text.includes("async acceptTransferRequest") &&
    text.includes("async rejectTransferRequest") &&
    text.includes("async cancelTransferRequest") &&
    text.includes("private async restoreTicketFromTransfer")
  );
}

function restoreFromGit(file) {
  let content = "";

  try {
    content = childProcess.execFileSync(
      "git",
      ["show", "HEAD:apps/api/src/tickets/tickets.service.ts"],
      {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    fail("Nao consegui ler tickets.service.ts do Git HEAD. Confirme se o projeto tem .git e se este arquivo existe no commit atual.");
  }

  content = content.replace(/\r\n/g, "\n");

  if (!hasRequiredMethods(content)) {
    fail("O tickets.service.ts do Git HEAD nao contem todos os metodos esperados. Nao vou sobrescrever.");
  }

  write(file, content);
  console.log("[OK] tickets.service.ts restaurado do Git HEAD local");
}

function replaceRequired(source, needle, replacement, label) {
  if (!source.includes(needle)) {
    fail(`Nao encontrei trecho obrigatorio para ${label}`);
  }

  return source.replace(needle, replacement);
}

function patchApi(file) {
  restoreFromGit(file);

  let source = read(file);

  const restoreNeedle = `  private async restoreTicketFromTransfer(
    tx: Prisma.TransactionClient,
    transferRequest: Awaited<ReturnType<TicketsService['getTransferRequestWithRelations']>>,
  ) {
    await tx.ticket.update({
      where: { id: transferRequest.ticketId },
      data: {
        currentOwnerUserId: transferRequest.fromUserId,
        holderName:
          transferRequest.fromName ||
          transferRequest.fromUser?.name ||
          transferRequest.ticket.holderName ||
          null,
        holderEmail:
          transferRequest.fromEmail ||
          transferRequest.fromUser?.email ||
          transferRequest.ticket.holderEmail ||
          null,
        holderCpf:
          transferRequest.fromCpf ||
          transferRequest.fromUser?.cpfNormalized ||
          transferRequest.ticket.holderCpf ||
          null,
        status: 'AVAILABLE',
        receivedViaTransferRequestId: null,
        receivedViaTransferLocked: false,
      },
    });
  }`;

  const restoreReplacement = `  private async restoreTicketFromTransfer(
    tx: Prisma.TransactionClient,
    transferRequest: Awaited<ReturnType<TicketsService['getTransferRequestWithRelations']>>,
  ) {
    // REGRA_V106H_CANCEL_RETURN:
    // Se uma devolucao pendente for cancelada, recusada ou expirar, o ingresso continua
    // travado com quem recebeu, permitindo apenas devolucao ao remetente original.
    const isReturnTransfer = transferRequest.mode === 'RETURN';

    await tx.ticket.update({
      where: { id: transferRequest.ticketId },
      data: {
        currentOwnerUserId: transferRequest.fromUserId,
        holderName:
          transferRequest.fromName ||
          transferRequest.fromUser?.name ||
          transferRequest.ticket.holderName ||
          null,
        holderEmail:
          transferRequest.fromEmail ||
          transferRequest.fromUser?.email ||
          transferRequest.ticket.holderEmail ||
          null,
        holderCpf:
          transferRequest.fromCpf ||
          transferRequest.fromUser?.cpfNormalized ||
          transferRequest.ticket.holderCpf ||
          null,
        status: 'AVAILABLE',
        receivedViaTransferRequestId: isReturnTransfer
          ? transferRequest.returnOfTransferRequestId ||
            transferRequest.ticket.receivedViaTransferRequestId ||
            null
          : null,
        receivedViaTransferLocked: isReturnTransfer ? true : false,
      },
    });
  }`;

  source = replaceRequired(source, restoreNeedle, restoreReplacement, "restoreTicketFromTransfer");

  const transferRuleNeedle = `    if (!currentOwner) {
      throw new NotFoundException('Usuario remetente nao encontrado');
    }

    if (!normalizedCpf && !normalizedEmail) {
      throw new BadRequestException('Informe o CPF do destinatario');
    }`;

  const transferRuleReplacement = `    if (!currentOwner) {
      throw new NotFoundException('Usuario remetente nao encontrado');
    }

    // REGRA_V106H_TRANSFERENCIA_UNICA:
    // Quem recebeu ingresso por transferencia nao pode enviar para terceiros.
    // So pode devolver para quem enviou originalmente.
    if (ticket.receivedViaTransferLocked && ticket.receivedViaTransferRequestId) {
      const originTransfer = await this.prisma.ticketTransferRequest.findUnique({
        where: { id: ticket.receivedViaTransferRequestId },
        include: {
          fromUser: true,
          toUser: true,
          requestedByUser: true,
        },
      });

      if (!originTransfer || !originTransfer.fromUserId) {
        throw new BadRequestException(
          'Nao foi possivel identificar quem enviou originalmente este ingresso',
        );
      }

      const originalSender =
        originTransfer.fromUser ||
        (await this.prisma.user.findUnique({
          where: { id: originTransfer.fromUserId },
        }));

      if (!originalSender) {
        throw new BadRequestException(
          'Nao foi possivel encontrar a conta de origem da transferencia',
        );
      }

      const originalCpf =
        originalSender.cpfNormalized || this.normalizeCpf(originTransfer.fromCpf);
      const originalEmail =
        this.normalizeEmail(originalSender.email) ||
        this.normalizeEmail(originTransfer.fromEmail);

      if (normalizedCpf && originalCpf && normalizedCpf !== originalCpf) {
        throw new BadRequestException(
          'Este ingresso ja foi transferido uma vez e agora so pode ser devolvido para quem enviou originalmente',
        );
      }

      if (normalizedEmail && originalEmail && normalizedEmail !== originalEmail) {
        throw new BadRequestException(
          'Este ingresso ja foi transferido uma vez e agora so pode ser devolvido para quem enviou originalmente',
        );
      }

      if (originTransfer.fromUserId === currentOwner.id) {
        throw new BadRequestException(
          'Este ingresso ja esta com o comprador/remetente original',
        );
      }

      const transferExpiresAt = this.getTransferAcceptanceExpiresAt();

      const returnTransfer = await this.prisma.$transaction(async (tx) => {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            status: 'TRANSFER_PENDING',
          },
        });

        return tx.ticketTransferRequest.create({
          data: {
            ticketId: ticket.id,
            orderId: ticket.orderItem.order.id,
            requestedByUserId: currentOwner.id,
            fromUserId: currentOwner.id,
            toUserId: originTransfer.fromUserId,
            mode: 'RETURN',
            returnOfTransferRequestId: originTransfer.id,
            requestedByName: currentOwner.name || null,
            requestedByEmail: currentOwner.email || null,
            requestedByCpf: currentOwner.cpfNormalized || null,
            fromName: currentOwner.name || null,
            fromEmail: currentOwner.email || null,
            fromCpf: currentOwner.cpfNormalized || null,
            toName: originalSender.name || originTransfer.fromName || null,
            toEmail: originalSender.email || originTransfer.fromEmail || null,
            toCpf:
              originalSender.cpfNormalized ||
              this.normalizeCpf(originTransfer.fromCpf) ||
              null,
            status: 'PENDING_ACCEPTANCE',
            expiresAt: transferExpiresAt,
          },
        });
      });

      return this.findTransferRequestById(returnTransfer.id, userId);
    }

    if (!normalizedCpf && !normalizedEmail) {
      throw new BadRequestException('Informe o CPF do destinatario');
    }`;

  source = replaceRequired(source, transferRuleNeedle, transferRuleReplacement, "regra de transferencia unica");

  const acceptNeedle = `    await this.ensureNoActiveTransfer(transferRequest.ticketId, transferRequest.id);

    const eventId = transferRequest.ticket.orderItem.ticketType.eventId;`;

  const acceptReplacement = `    await this.ensureNoActiveTransfer(transferRequest.ticketId, transferRequest.id);

    // REGRA_V106H_ACCEPT_RETURN:
    // Quando o remetente original aceita uma devolucao, o ingresso volta destravado.
    const isReturnTransfer = transferRequest.mode === 'RETURN';

    const eventId = transferRequest.ticket.orderItem.ticketType.eventId;`;

  source = replaceRequired(source, acceptNeedle, acceptReplacement, "isReturnTransfer no aceite");

  source = replaceRequired(
    source,
    `receivedViaTransferRequestId: transferRequest.id,
          receivedViaTransferLocked: true,`,
    `receivedViaTransferRequestId: isReturnTransfer ? null : transferRequest.id,
          receivedViaTransferLocked: isReturnTransfer ? false : true,`,
    "destravar retorno no aceite",
  );

  if (!hasRequiredMethods(source)) {
    fail("Depois do patch, TicketsService perdeu algum metodo essencial. Parei antes de salvar.");
  }

  if (!source.includes("REGRA_V106H_TRANSFERENCIA_UNICA")) {
    fail("REGRA_V106H_TRANSFERENCIA_UNICA nao foi confirmada.");
  }

  write(file, source);
  console.log("[OK] API tickets.service.ts restaurado e atualizado com v106h");
}

function patchWeb(file) {
  if (!fs.existsSync(file)) {
    console.log("[AVISO] Nao encontrei detalhe do pedido para patch WEB");
    return;
  }

  let source = read(file);

  if (!source.includes("const [transferCancelingId, setTransferCancelingId]")) {
    source = source.replace(
      "const [transferSubmitting, setTransferSubmitting] = useState(false);",
      "const [transferSubmitting, setTransferSubmitting] = useState(false);\n  const [transferCancelingId, setTransferCancelingId] = useState<string | null>(null);",
    );
  }

  if (!source.includes("function getPendingTransferForTicket")) {
    const helper = `  function getPendingTransferForTicket(ticket?: TicketItem | null) {
    if (!ticket || !currentUserId) return null;

    return (
      ticket.transferRequests?.find((request) => {
        const status = String(request.status || "").toUpperCase();
        const canControl =
          request.fromUserId === currentUserId ||
          request.requestedByUserId === currentUserId;

        return (
          canControl &&
          ["PENDING_PAYMENT", "PENDING_ACCEPTANCE"].includes(status)
        );
      }) || null
    );
  }

  function canCancelTicketTransfer(ticket?: TicketItem | null) {
    return !!getPendingTransferForTicket(ticket);
  }

  function getTransferButtonLabel(ticket?: TicketItem | null) {
    if (ticket?.receivedViaTransferLocked) {
      return "Devolver ao comprador";
    }

    return "Transferir";
  }

`;

    const anchors = [
      "  async function handleCancelTicketTransfer",
      "  function canTransferTicket",
      "  async function handleOpenTicket",
    ];

    let inserted = false;
    for (const anchor of anchors) {
      const index = source.indexOf(anchor);
      if (index >= 0) {
        source = source.slice(0, index) + helper + source.slice(index);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      fail("Nao encontrei ponto para inserir getPendingTransferForTicket no detalhe do pedido.");
    }
  }

  write(file, source);
  console.log("[OK] WEB detalhe do pedido conferido");
}

const apiFile = path.join(root, "apps", "api", "src", "tickets", "tickets.service.ts");
const webFile = path.join(root, "apps", "web", "src", "app", "(customer)", "orders", "[id]", "page.tsx");

patchApi(apiFile);
patchWeb(webFile);
'@

$PatchPath = Join-Path $env:TEMP "v106h-restaurar-git-transferencia.js"
Write-Utf8Literal $PatchPath $PatchJs

node $PatchPath $Root
if ($LASTEXITCODE -ne 0) {
  throw "Patch JS v106h falhou. Backup: $BackupDir"
}

Remove-Item -LiteralPath $PatchPath -Force -ErrorAction SilentlyContinue

Write-Host "[OK] Patch v106h aplicado." -ForegroundColor Green
Write-Host "Backups em: $BackupDir" -ForegroundColor Yellow

if ($Build) {
  Write-Host ""
  Write-Host "Rodando build da API..." -ForegroundColor Cyan
  Push-Location $ApiDir
  npm run build
  $ApiCode = $LASTEXITCODE
  Pop-Location

  if ($ApiCode -ne 0) {
    throw "API build falhou. Envie o erro completo."
  }

  Write-Host ""
  Write-Host "Rodando build da WEB..." -ForegroundColor Cyan
  Push-Location $WebDir
  npm run build
  $WebCode = $LASTEXITCODE
  Pop-Location

  if ($WebCode -ne 0) {
    throw "WEB build falhou. Envie o erro completo."
  }

  Write-Host "[OK] API e WEB build passaram." -ForegroundColor Green
} else {
  Write-Host "[AVISO] Build nao rodado. Para validar com build, rode com -Build." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "OK FINAL v106h" -ForegroundColor Green
Write-Host "- Corrigido erro da v106g que rejeitava Git HEAD bom por engano." -ForegroundColor Green
Write-Host "- Restaurado tickets.service.ts pelo Git HEAD local." -ForegroundColor Green
Write-Host "- Aplicada transferencia unica com devolucao ao remetente original." -ForegroundColor Green
Write-Host "- Aceite de RETURN destrava o ingresso quando volta ao remetente original." -ForegroundColor Green
Write-Host "- Cancelar/recusar/expirar RETURN preserva a trava." -ForegroundColor Green
Write-Host "- WEB: helper getPendingTransferForTicket garantido." -ForegroundColor Green
