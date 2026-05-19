$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$DetailPath = Join-Path $WebRoot "src\app\admin\operators\[id]\page.tsx"

function Write-Utf8NoBom {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][string] $Content
  )

  $Dir = Split-Path -Parent $Path
  [System.IO.Directory]::CreateDirectory($Dir) | Out-Null

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string] $Path)

  if (![System.IO.File]::Exists($Path)) {
    throw "Arquivo nao encontrado: $Path"
  }

  $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $BackupPath = "$Path.bak-event-time-window-$Stamp"
  Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
  Write-Host "[OK] Backup criado: $BackupPath"
}

function Replace-Exact {
  param(
    [Parameter(Mandatory = $true)][string] $Path,
    [Parameter(Mandatory = $true)][string] $Old,
    [Parameter(Mandatory = $true)][string] $New,
    [Parameter(Mandatory = $true)][string] $Label
  )

  $Text = [System.IO.File]::ReadAllText($Path)

  if (!$Text.Contains($Old)) {
    Write-Host "[AVISO] Trecho nao encontrado: $Label" -ForegroundColor Yellow
    return $false
  }

  $Text = $Text.Replace($Old, $New)
  Write-Utf8NoBom -Path $Path -Content $Text
  Write-Host "[OK] Patch aplicado: $Label"
  return $true
}

Write-Host "[INFO] Projeto: $ProjectRoot"

Backup-File $DetailPath

# 1) Adiciona campos opcionais de hora no tipo EventItem.
Replace-Exact `
  -Path $DetailPath `
  -Label "Campos startTime/endTime no EventItem" `
  -Old @'
  eventDate?: string | null;
  startDate?: string | null;
  date?: string | null;
'@ `
  -New @'
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
'@

# 2) Adiciona helpers para janela de horario do evento.
$TimeHelpers = @'

function normalizeTime(value?: string | null) {
  if (!value) return "";

  const clean = String(value).trim();

  const direct = clean.match(/^(\d{2}):(\d{2})/);
  if (direct) return `${direct[1]}:${direct[2]}`;

  if (!clean.includes("T") && !clean.match(/\d{2}:\d{2}/)) return "";

  const date = new Date(clean);

  if (!Number.isNaN(date.getTime())) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  const embedded = clean.match(/(\d{2}):(\d{2})/);
  if (embedded) return `${embedded[1]}:${embedded[2]}`;

  return "";
}

function timeToMinutes(value?: string | null) {
  const time = normalizeTime(value);

  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

function getEventTimeWindow(event?: EventItem | null) {
  if (!event) {
    return {
      startTime: "",
      endTime: "",
      hasCompleteWindow: false,
      crossesMidnight: false,
    };
  }

  const startTime =
    normalizeTime(event.startTime) ||
    normalizeTime(event.startDate) ||
    normalizeTime(event.eventDate) ||
    normalizeTime(event.date);

  const endTime =
    normalizeTime(event.endTime) ||
    normalizeTime(event.endDate);

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return {
    startTime,
    endTime,
    hasCompleteWindow: startMinutes !== null && endMinutes !== null,
    crossesMidnight:
      startMinutes !== null &&
      endMinutes !== null &&
      endMinutes <= startMinutes,
  };
}

function formatEventTimeWindow(event?: EventItem | null) {
  const window = getEventTimeWindow(event);

  if (!window.startTime && !window.endTime) return "Horário do evento não cadastrado.";
  if (window.startTime && !window.endTime) return `Início do evento: ${window.startTime}. Cadastre também o horário final.`;
  if (!window.startTime && window.endTime) return `Fim do evento: ${window.endTime}. Cadastre também o horário inicial.`;

  return `Horário do evento: ${window.startTime} às ${window.endTime}.`;
}

function isWorkTimeInsideEvent(startTime: string, endTime: string, event?: EventItem | null) {
  const window = getEventTimeWindow(event);

  if (!window.hasCompleteWindow) return false;

  const eventStart = timeToMinutes(window.startTime);
  let eventEnd = timeToMinutes(window.endTime);
  let workStart = timeToMinutes(startTime);
  let workEnd = timeToMinutes(endTime);

  if (eventStart === null || eventEnd === null || workStart === null || workEnd === null) {
    return false;
  }

  if (window.crossesMidnight) {
    eventEnd += 24 * 60;

    if (workStart < eventStart) workStart += 24 * 60;
    if (workEnd <= workStart) workEnd += 24 * 60;

    return workStart >= eventStart && workEnd <= eventEnd && workEnd > workStart;
  }

  return workStart >= eventStart && workEnd <= eventEnd && workEnd > workStart;
}

function canUseHtmlTimeLimit(event?: EventItem | null) {
  const window = getEventTimeWindow(event);

  return window.hasCompleteWindow && !window.crossesMidnight;
}
'@

$Content = [System.IO.File]::ReadAllText($DetailPath)
if (!$Content.Contains("function getEventTimeWindow")) {
  $Content = $Content.Replace("function eventName(event: EventItem) {", $TimeHelpers + "`r`nfunction eventName(event: EventItem) {")
  Write-Utf8NoBom -Path $DetailPath -Content $Content
  Write-Host "[OK] Helpers de horario do evento adicionados."
} else {
  Write-Host "[OK] Helpers de horario do evento ja existem."
}

# 3) Ao selecionar o evento, preencher automaticamente com o horario do evento.
Replace-Exact `
  -Path $DetailPath `
  -Label "Defaults das datas usam horario do evento" `
  -Old @'
  return dates.map((date) => ({
    date,
    amount: "",
    functions: "",
    startTime: "",
    endTime: "",
  }));
}
'@ `
  -New @'
  const window = getEventTimeWindow(event);

  return dates.map((date) => ({
    date,
    amount: "",
    functions: "",
    startTime: window.startTime || "",
    endTime: window.endTime || "",
  }));
}
'@

# 4) Cria constantes da janela de horario do evento selecionado.
Replace-Exact `
  -Path $DetailPath `
  -Label "Constantes selectedEventTimeWindow" `
  -Old @'
  const selectedEvent = getEventById(events, form.eventId);
  const selectedEventDates = extractEventDates(selectedEvent);
'@ `
  -New @'
  const selectedEvent = getEventById(events, form.eventId);
  const selectedEventDates = extractEventDates(selectedEvent);
  const selectedEventTimeWindow = getEventTimeWindow(selectedEvent);
  const canLimitTimeInput = canUseHtmlTimeLimit(selectedEvent);
'@

# 5) Ao adicionar uma data extra, preencher os horarios do evento.
Replace-Exact `
  -Path $DetailPath `
  -Label "Nova data usa horario do evento" `
  -Old @'
        {
          date: nextDate,
          amount: "",
          functions: "",
          startTime: "",
          endTime: "",
        },
'@ `
  -New @'
        {
          date: nextDate,
          amount: "",
          functions: "",
          startTime: selectedEventTimeWindow.startTime || "",
          endTime: selectedEventTimeWindow.endTime || "",
        },
'@

# 6) Validacao exige horario inicial/final do evento e horario dentro da janela.
Replace-Exact `
  -Path $DetailPath `
  -Label "Validacao de horario dentro do evento" `
  -Old @'
    if (selectedEventDates.length === 0) {
      alert("Este evento não possui datas cadastradas. Cadastre as datas no evento antes de enviar proposta.");
      return;
    }

    if (form.workDates.some((item) => !item.date || !selectedEventDates.includes(item.date) || !item.amount || !item.functions.trim())) {
      alert("Preencha data, valor e funções em todos os dias.");
      return;
    }
'@ `
  -New @'
    if (selectedEventDates.length === 0) {
      alert("Este evento não possui datas cadastradas. Cadastre as datas no evento antes de enviar proposta.");
      return;
    }

    if (!selectedEventTimeWindow.hasCompleteWindow) {
      alert("Este evento precisa ter horário inicial e horário final cadastrados para enviar proposta.");
      return;
    }

    if (form.workDates.some((item) => !item.date || !selectedEventDates.includes(item.date) || !item.amount || !item.functions.trim())) {
      alert("Preencha data, valor e funções em todos os dias.");
      return;
    }

    if (form.workDates.some((item) => !item.startTime || !item.endTime)) {
      alert("Preencha horário inicial e final em todos os dias.");
      return;
    }

    if (form.workDates.some((item) => !isWorkTimeInsideEvent(item.startTime, item.endTime, selectedEvent))) {
      alert(`Os horários precisam ficar dentro do horário do evento: ${selectedEventTimeWindow.startTime} às ${selectedEventTimeWindow.endTime}.`);
      return;
    }
'@

# 7) Mostra horario permitido no aviso do evento.
Replace-Exact `
  -Path $DetailPath `
  -Label "Aviso exibe horario permitido" `
  -Old @'
                {selectedEventDates.length > 0
                  ? `Datas disponíveis deste evento: ${selectedEventDates.map((date) => formatDateOnly(date)).join(", ")}`
                  : "Este evento não possui datas cadastradas."}
'@ `
  -New @'
                {selectedEventDates.length > 0
                  ? `Datas disponíveis deste evento: ${selectedEventDates.map((date) => formatDateOnly(date)).join(", ")} • ${formatEventTimeWindow(selectedEvent)}`
                  : "Este evento não possui datas cadastradas."}
'@

# 8) Coloca min/max nos inputs de hora quando o evento nao cruza meia-noite.
Replace-Exact `
  -Path $DetailPath `
  -Label "Limite no horario inicial" `
  -Old @'
                    <input
                      type="time"
                      value={workDate.startTime}
                      onChange={(event) => patchWorkDate(index, { startTime: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
'@ `
  -New @'
                    <input
                      type="time"
                      value={workDate.startTime}
                      min={canLimitTimeInput ? selectedEventTimeWindow.startTime : undefined}
                      max={canLimitTimeInput ? selectedEventTimeWindow.endTime : undefined}
                      onChange={(event) => patchWorkDate(index, { startTime: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
'@

Replace-Exact `
  -Path $DetailPath `
  -Label "Limite no horario final" `
  -Old @'
                    <input
                      type="time"
                      value={workDate.endTime}
                      onChange={(event) => patchWorkDate(index, { endTime: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
'@ `
  -New @'
                    <input
                      type="time"
                      value={workDate.endTime}
                      min={canLimitTimeInput ? selectedEventTimeWindow.startTime : undefined}
                      max={canLimitTimeInput ? selectedEventTimeWindow.endTime : undefined}
                      onChange={(event) => patchWorkDate(index, { endTime: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
'@

# 9) Mostra dica dentro de cada card de data.
Replace-Exact `
  -Path $DetailPath `
  -Label "Dica de horario no card da data" `
  -Old @'
                  <textarea
                    value={workDate.functions}
'@ `
  -New @'
                  <p className="mt-2 text-[11px] font-bold text-slate-500">
                    Permitido somente entre {selectedEventTimeWindow.startTime || "--:--"} e {selectedEventTimeWindow.endTime || "--:--"}.
                  </p>

                  <textarea
                    value={workDate.functions}
'@

# Limpa cache.
$NextDir = Join-Path $WebRoot ".next"
if (Test-Path $NextDir) {
  try {
    Remove-Item -Path $NextDir -Recurse -Force -ErrorAction Stop
    Write-Host "[OK] Cache .next apagado."
  } catch {
    Write-Host "[AVISO] Nao consegui apagar .next. Pare a WEB com Ctrl+C e rode de novo ou apague manualmente." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[OK] Patch aplicado: horario da proposta agora fica limitado ao horario do evento."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-event-time-window-build.txt"
Write-Host "Select-String -Path .\log-web-event-time-window-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found`" -Context 2,3"
