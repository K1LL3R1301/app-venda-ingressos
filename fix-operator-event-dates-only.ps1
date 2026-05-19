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
  $BackupPath = "$Path.bak-event-dates-only-$Stamp"
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

# 1) Se o evento nao tiver datas cadastradas, nao cria campo manual solto.
Replace-Exact `
  -Path $DetailPath `
  -Label "Evento sem datas nao gera data manual" `
  -Old @'
function getDefaultWorkDatesForEvent(event: EventItem | null): AssignForm["workDates"] {
  const dates = extractEventDates(event);

  if (dates.length === 0) {
    return emptyForm().workDates;
  }

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
function getDefaultWorkDatesForEvent(event: EventItem | null): AssignForm["workDates"] {
  const dates = extractEventDates(event);

  return dates.map((date) => ({
    date,
    amount: "",
    functions: "",
    startTime: "",
    endTime: "",
  }));
}
'@

# 2) Adiciona helper para pegar somente datas do evento selecionado.
Replace-Exact `
  -Path $DetailPath `
  -Label "Adicionar helper de datas selecionadas" `
  -Old @'
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aDate = new Date(a.eventDate || a.startDate || 0).getTime();
      const bDate = new Date(b.eventDate || b.startDate || 0).getTime();
      return bDate - aDate;
    });
  }, [events]);
'@ `
  -New @'
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aDate = new Date(a.eventDate || a.startDate || 0).getTime();
      const bDate = new Date(b.eventDate || b.startDate || 0).getTime();
      return bDate - aDate;
    });
  }, [events]);

  const selectedEvent = getEventById(events, form.eventId);
  const selectedEventDates = extractEventDates(selectedEvent);
'@

# 3) Botao + Data nao cria campo vazio se nao houver data disponivel do evento.
Replace-Exact `
  -Path $DetailPath `
  -Label "Botao Data limitado as datas do evento" `
  -Old @'
  function addWorkDate() {
    const selectedEvent = getEventById(events, form.eventId);
    const eventDates = extractEventDates(selectedEvent);
    const usedDates = form.workDates.map((item) => item.date);
    const nextDate = eventDates.find((date) => !usedDates.includes(date));

    patchForm({
      workDates: [
        ...form.workDates,
        {
          date: nextDate || "",
          amount: "",
          functions: "",
          startTime: "",
          endTime: "",
        },
      ],
    });
  }
'@ `
  -New @'
  function addWorkDate() {
    if (!form.eventId) {
      alert("Selecione um evento antes de adicionar datas.");
      return;
    }

    if (selectedEventDates.length === 0) {
      alert("Este evento não possui datas cadastradas. Cadastre as datas no evento antes de enviar proposta.");
      return;
    }

    const usedDates = form.workDates.map((item) => item.date);
    const nextDate = selectedEventDates.find((date) => !usedDates.includes(date));

    if (!nextDate) {
      alert("Todas as datas cadastradas deste evento já foram adicionadas.");
      return;
    }

    patchForm({
      workDates: [
        ...form.workDates,
        {
          date: nextDate,
          amount: "",
          functions: "",
          startTime: "",
          endTime: "",
        },
      ],
    });
  }
'@

# 4) Validacao avisa se evento nao tem datas.
Replace-Exact `
  -Path $DetailPath `
  -Label "Validacao exige datas cadastradas no evento" `
  -Old @'
    if (!form.eventId) {
      alert("Selecione o evento.");
      return;
    }

    if (form.workDates.some((item) => !item.date || !item.amount || !item.functions.trim())) {
'@ `
  -New @'
    if (!form.eventId) {
      alert("Selecione o evento.");
      return;
    }

    if (selectedEventDates.length === 0) {
      alert("Este evento não possui datas cadastradas. Cadastre as datas no evento antes de enviar proposta.");
      return;
    }

    if (form.workDates.some((item) => !item.date || !selectedEventDates.includes(item.date) || !item.amount || !item.functions.trim())) {
'@

# 5) Troca input type=date por select travado nas datas do evento.
Replace-Exact `
  -Path $DetailPath `
  -Label "Campo de data vira select de datas do evento" `
  -Old @'
                    <input
                      type="date"
                      value={workDate.date}
                      onChange={(event) => patchWorkDate(index, { date: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    />
'@ `
  -New @'
                    <select
                      value={workDate.date}
                      onChange={(event) => patchWorkDate(index, { date: event.target.value })}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold"
                    >
                      {selectedEventDates.length === 0 ? (
                        <option value="">Evento sem datas cadastradas</option>
                      ) : (
                        selectedEventDates.map((date) => (
                          <option
                            key={date}
                            value={date}
                            disabled={
                              form.workDates.some((item, itemIndex) => itemIndex !== index && item.date === date)
                            }
                          >
                            {formatDateOnly(date)}
                          </option>
                        ))
                      )}
                    </select>
'@

# 6) Mostra aviso logo abaixo do select de evento.
Replace-Exact `
  -Path $DetailPath `
  -Label "Aviso de datas do evento selecionado" `
  -Old @'
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-black">Datas, valores e funções</p>
'@ `
  -New @'
            {form.eventId ? (
              <div className="mt-3 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
                {selectedEventDates.length > 0
                  ? `Datas disponíveis deste evento: ${selectedEventDates.map((date) => formatDateOnly(date)).join(", ")}`
                  : "Este evento não possui datas cadastradas."}
              </div>
            ) : null}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm font-black">Datas, valores e funções</p>
'@

# 7) Se por algum motivo a lista de workDates ficar vazia, mostra mensagem em vez de campo branco.
Replace-Exact `
  -Path $DetailPath `
  -Label "Mensagem quando evento nao tem datas" `
  -Old @'
            <div className="mt-3 space-y-3">
              {form.workDates.map((workDate, index) => (
'@ `
  -New @'
            <div className="mt-3 space-y-3">
              {form.workDates.length === 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-700">
                  Selecione um evento com datas cadastradas para montar a proposta.
                </div>
              ) : null}

              {form.workDates.map((workDate, index) => (
'@

# Limpa cache para recarregar a tela nova.
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
Write-Host "[OK] Patch aplicado: datas da proposta agora ficam presas as datas cadastradas do evento."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-event-dates-only-build.txt"
Write-Host "Select-String -Path .\log-web-event-dates-only-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found`" -Context 2,3"
