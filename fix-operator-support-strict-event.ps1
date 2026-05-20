$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"

$OperatorPanelPath = Join-Path $WebRoot "src\app\operator\_components\OperatorPanel.tsx"
$OperatorSupportPath = Join-Path $WebRoot "src\app\operator\support\page.tsx"
$OperatorSupportNewPath = Join-Path $WebRoot "src\app\operator\support\new\page.tsx"

function Write-Utf8NoBom {
  param(
    [string] $Path,
    [string] $LiteralPath,
    [AllowEmptyString()][string] $Content
  )

  if ([string]::IsNullOrWhiteSpace($Path)) {
    $Path = $LiteralPath
  }

  if ([string]::IsNullOrWhiteSpace($Path)) {
    throw "Caminho nao informado para Write-Utf8NoBom."
  }

  $Dir = [System.IO.Path]::GetDirectoryName($Path)
  if (![string]::IsNullOrWhiteSpace($Dir) -and ![System.IO.Directory]::Exists($Dir)) {
    [System.IO.Directory]::CreateDirectory($Dir) | Out-Null
  }

  $encoding = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Content, $encoding)
}

function Backup-File {
  param([Parameter(Mandatory = $true)][string] $Path)

  if (Test-Path -LiteralPath $Path) {
    $Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $BackupPath = "$Path.bak-operator-support-strict-event-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    Write-Host "[OK] Backup criado: $BackupPath"
  } else {
    Write-Host "[AVISO] Arquivo nao encontrado para backup: $Path" -ForegroundColor Yellow
  }
}

function Patch-OperatorPanelLink {
  if (!(Test-Path -LiteralPath $OperatorPanelPath)) {
    Write-Host "[AVISO] OperatorPanel nao encontrado. Pulando link do botao Suporte." -ForegroundColor Yellow
    return
  }

  Backup-File $OperatorPanelPath

  $Text = [System.IO.File]::ReadAllText($OperatorPanelPath)

  if ($Text -notmatch 'function operatorEventAccessUrl') {
    Write-Host "[AVISO] Nao encontrei operatorEventAccessUrl. Pulando." -ForegroundColor Yellow
    return
  }

  if ($Text -notmatch 'params\.set\("eventName"') {
    $Text = $Text.Replace(
      'const eventId = String(assignment.eventId || assignment.event?.id || "");',
      'const eventId = String(assignment.eventId || assignment.event?.id || "");' + "`r`n" + '  const eventName = getEventName(assignment);'
    )

    $Text = $Text.Replace(
      '  if (eventId) {' + "`r`n" + '    params.set("eventId", eventId);' + "`r`n" + '  }',
      '  if (eventId) {' + "`r`n" + '    params.set("eventId", eventId);' + "`r`n" + '  }' + "`r`n`r`n" + '  if (eventName) {' + "`r`n" + '    params.set("eventName", eventName);' + "`r`n" + '  }'
    )

    Write-Utf8NoBom -Path $OperatorPanelPath -Content $Text
    Write-Host "[OK] Botao Suporte do evento agora envia eventName junto com eventId."
  } else {
    Write-Host "[OK] Botao Suporte ja envia eventName."
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Amarrando suporte do operador ao evento selecionado"

Patch-OperatorPanelLink
Backup-File $OperatorSupportPath
Backup-File $OperatorSupportNewPath

$OperatorSupportPage = @'
"use client";
// @ts-nocheck

import { useEffect, useMemo, useRef, useState } from "react";
import { getStoredAuthUser } from "../../../lib/auth-client";
import {
  addSupportMessageReal,
  forwardSupportToSuperAdminReal,
  getVisibleSupportTicketsReal,
  resolveSupportTicketReal,
} from "../../../lib/support-api-workflow";

type Ticket = any;
type StoredUser = { id?: string; name?: string; email?: string; role?: string };
type EventContext = { eventId: string; eventName: string; assignmentId: string };

function fallbackUser(): StoredUser {
  return { id: "operator-local", name: "Operador", email: "operador@local.test", role: "OPERATOR" };
}

function readEventContext(): EventContext {
  if (typeof window === "undefined") {
    return { eventId: "", eventName: "", assignmentId: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId") || "";
  const eventName =
    params.get("eventName") ||
    localStorage.getItem(`operator-event-name-${eventId}`) ||
    localStorage.getItem("operator-selected-event-name") ||
    "";
  const assignmentId = params.get("assignmentId") || "";

  if (eventId && eventName) {
    localStorage.setItem(`operator-event-name-${eventId}`, eventName);
    localStorage.setItem("operator-selected-event-id", eventId);
    localStorage.setItem("operator-selected-event-name", eventName);
  }

  return { eventId, eventName, assignmentId };
}

function label(value?: string) {
  const labels: Record<string, string> = {
    CUSTOMER: "Cliente",
    PRODUCER: "Produtor/Admin",
    ADMIN: "Produtor/Admin",
    OPERATOR: "Operador",
    SUPER_ADMIN: "Suporte Site",
    ALL: "Todos",
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    FORWARDED_TO_SUPER_ADMIN: "Com Suporte Site",
    RETURNED_TO_OPERATOR: "Devolvido ao operador",
    RETURNED_TO_PRODUCER: "Devolvido ao produtor",
    CUSTOMER_REPLY: "Cliente respondeu",
    RESOLVED: "Resolvido",
    CLOSED: "Fechado",
  };

  return labels[String(value || "").toUpperCase()] || String(value || "Sistema");
}

function when(value?: string) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function ticketMessages(ticket?: Ticket) {
  return Array.isArray(ticket?.messages) ? ticket.messages : [];
}

function ticketEventId(ticket?: Ticket) {
  return String(ticket?.eventId || ticket?.event?.id || "");
}

function ticketBelongsToEvent(ticket: Ticket, eventId: string) {
  return String(ticketEventId(ticket)) === String(eventId);
}

function ticketStatus(ticket?: Ticket) {
  return String(ticket?.status || "OPEN").toUpperCase();
}

function isClosedTicket(ticket?: Ticket) {
  return ["RESOLVED", "CLOSED"].includes(ticketStatus(ticket));
}

function optimisticMessagesKey(ticketId: string) {
  return `astro_support_messages_${ticketId}`;
}

function readOptimisticMessages(ticketId?: string) {
  if (!ticketId || typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(optimisticMessagesKey(ticketId)) || "[]");
  } catch {
    return [];
  }
}

function saveOptimisticMessage(ticketId: string, message: any) {
  if (!ticketId || typeof window === "undefined") return;

  const current = readOptimisticMessages(ticketId);
  localStorage.setItem(optimisticMessagesKey(ticketId), JSON.stringify([...current, message].slice(-60)));
}

function mergedMessages(ticket?: Ticket) {
  const server = ticketMessages(ticket);
  const optimistic = readOptimisticMessages(ticket?.id).filter((localMessage: any) => {
    const localTime = new Date(localMessage.createdAt || 0).getTime();

    return !server.some((serverMessage: any) => {
      const serverTime = new Date(serverMessage.createdAt || 0).getTime();

      return (
        String(serverMessage.text || "") === String(localMessage.text || "") &&
        String(serverMessage.authorRole || serverMessage.senderType || "").toUpperCase() ===
          String(localMessage.authorRole || localMessage.senderType || "").toUpperCase() &&
        Math.abs(serverTime - localTime) < 120000
      );
    });
  });

  return [...server, ...optimistic].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
}

function decorateTicket(ticket: Ticket) {
  if (!ticket) return ticket;

  return {
    ...ticket,
    messages: mergedMessages(ticket),
  };
}

function isMine(message: any) {
  return String(message?.authorRole || message?.senderType || "").toUpperCase() === "OPERATOR";
}

function lastMessage(ticket: Ticket) {
  const list = mergedMessages(ticket);
  return list[list.length - 1]?.text || ticket?.title || "Sem mensagens";
}

function Bubble({ message }: { message: any }) {
  const mine = isMine(message);
  const kind = String(message?.kind || "MESSAGE").toUpperCase();

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
          mine
            ? "rounded-br-md bg-blue-600 text-white"
            : kind === "FORWARD"
              ? "rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950"
              : kind === "SYSTEM"
                ? "rounded-bl-md border border-slate-200 bg-slate-100 text-slate-700"
                : "rounded-bl-md bg-white text-slate-900"
        }`}
      >
        <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.16em] ${mine ? "text-blue-100" : "text-slate-400"}`}>
          Tipo de conta: {label(message.authorRole || message.senderType)}
        </p>
        <p className="whitespace-pre-wrap text-sm font-bold leading-relaxed">{message.text}</p>
        <p className={`mt-2 text-right text-[10px] font-bold ${mine ? "text-blue-100" : "text-slate-400"}`}>{when(message.createdAt)}</p>
      </div>
    </div>
  );
}

function CardList({ tickets, selectedId, onSelect }: { tickets: Ticket[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (!tickets.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-black text-slate-600">Nenhum chamado neste evento.</p>
        <p className="mt-1 text-xs font-bold text-slate-400">Este suporte só mostra chamados do evento aberto.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => {
        const closed = isClosedTicket(ticket);

        return (
          <button
            key={ticket.id}
            type="button"
            onClick={() => onSelect(ticket.id)}
            className={`w-full rounded-3xl border p-4 text-left transition ${
              selectedId === ticket.id
                ? "border-blue-400 bg-blue-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{ticket.title || "Chamado"}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">
                  {ticket.customerName || ticket.producerName || ticket.eventName || "Atendimento"}
                </p>
              </div>
              <span className={`rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase ${closed ? "text-slate-500" : "text-blue-700"}`}>
                {closed ? "Histórico" : label(ticket.status)}
              </span>
            </div>

            <p className="mt-3 line-clamp-2 text-xs font-bold leading-relaxed text-slate-500">{lastMessage(ticket)}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function OperatorSupportPage() {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [context, setContext] = useState<EventContext>({ eventId: "", eventName: "", assignmentId: "" });
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [forwardReason, setForwardReason] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const scopedTickets = useMemo(() => {
    if (!context.eventId) return [];
    return tickets.filter((ticket) => ticketBelongsToEvent(ticket, context.eventId)).map(decorateTicket);
  }, [tickets, context.eventId, selectedId]);

  const selectedTicket = useMemo(
    () => scopedTickets.find((ticket) => ticket.id === selectedId) || scopedTickets[0] || null,
    [scopedTickets, selectedId],
  );

  const selectedClosed = isClosedTicket(selectedTicket);

  function actor() {
    const current = user || fallbackUser();

    return {
      role: "OPERATOR" as const,
      name: current.name || "Operador",
      email: current.email,
    };
  }

  function selectTicket(id: string) {
    setSelectedId(id);

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("ticket", id);
      window.history.replaceState(null, "", url.toString());
    }
  }

  async function reload(nextContext = context) {
    const current = getStoredAuthUser<StoredUser>() || fallbackUser();
    setUser(current);

    if (!nextContext.eventId) {
      setTickets([]);
      setLoaded(true);
      return;
    }

    const data = await getVisibleSupportTicketsReal({
      role: "OPERATOR",
      userEmail: current.email,
      eventId: nextContext.eventId,
    });

    const scoped = Array.isArray(data)
      ? data.filter((ticket) => ticketBelongsToEvent(ticket, nextContext.eventId))
      : [];

    setTickets(scoped);

    const ticketFromUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("ticket") : "";
    const nextId = ticketFromUrl || selectedId || scoped?.[0]?.id || "";
    if (nextId) setSelectedId(nextId);

    setLoaded(true);
  }

  useEffect(() => {
    const nextContext = readEventContext();
    setContext(nextContext);
    void reload(nextContext);

    const onUpdate = () => void reload(nextContext);
    window.addEventListener("support-workflow:update", onUpdate);

    return () => window.removeEventListener("support-workflow:update", onUpdate);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedTicket?.id, selectedTicket?.messages?.length]);

  async function sendReply() {
    const text = reply.trim();

    if (!selectedTicket || !text) return;

    if (selectedClosed) {
      alert("Este chamado está resolvido e fica somente como histórico. O cliente precisa reabrir para continuar.");
      return;
    }

    const optimistic = {
      id: `local-operator-${Date.now()}`,
      authorRole: "OPERATOR",
      authorName: actor().name,
      targetType: "ALL",
      text,
      kind: "MESSAGE",
      createdAt: new Date().toISOString(),
    };

    saveOptimisticMessage(selectedTicket.id, optimistic);

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? { ...ticket, status: "IN_PROGRESS", messages: [...ticketMessages(ticket), optimistic] }
          : ticket,
      ),
    );

    setReply("");

    try {
      await addSupportMessageReal(selectedTicket.id, actor(), text, { targetType: "ALL" as any });
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    }
  }

  async function forwardToSupportSite() {
    if (!selectedTicket) return;

    if (selectedClosed) {
      alert("Este chamado está resolvido. O cliente precisa reabrir antes de encaminhar.");
      return;
    }

    const reason = forwardReason.trim();

    if (!reason) {
      alert("Informe a justificativa do encaminhamento.");
      return;
    }

    const text = `Encaminhado ao Suporte Site por ${actor().name}.\n\nJustificativa: ${reason}`;

    const optimistic = {
      id: `local-forward-${Date.now()}`,
      authorRole: "OPERATOR",
      authorName: actor().name,
      targetType: "ALL",
      text,
      kind: "FORWARD",
      createdAt: new Date().toISOString(),
    };

    saveOptimisticMessage(selectedTicket.id, optimistic);

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? {
              ...ticket,
              status: "FORWARDED_TO_SUPER_ADMIN",
              currentOwnerType: "SUPER_ADMIN",
              messages: [...ticketMessages(ticket), optimistic],
            }
          : ticket,
      ),
    );

    try {
      await forwardSupportToSuperAdminReal(selectedTicket.id, actor(), reason);
      setForwardReason("");
      setForwardOpen(false);
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível encaminhar para o Suporte Site.");
    }
  }

  async function closeTicket() {
    if (!selectedTicket || selectedClosed) return;

    const name = actor().name;
    const text = `Chamado encerrado por ${name}.`;

    const optimistic = {
      id: `local-close-${Date.now()}`,
      authorRole: "OPERATOR",
      authorName: name,
      targetType: "ALL",
      text,
      kind: "SYSTEM",
      createdAt: new Date().toISOString(),
    };

    saveOptimisticMessage(selectedTicket.id, optimistic);

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? { ...ticket, status: "RESOLVED", messages: [...ticketMessages(ticket), optimistic] }
          : ticket,
      ),
    );

    try {
      await resolveSupportTicketReal(selectedTicket.id, actor(), text, { targetType: "ALL" as any });
      await reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível resolver o chamado.");
    }
  }

  if (loaded && !context.eventId) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Selecione um evento</p>
          <h1 className="mt-2 text-3xl font-black text-amber-950">Entre pelo botão Suporte do evento</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
            O suporte do operador é sempre limitado ao evento aberto. Volte para sua agenda, entre no evento desejado e clique em Suporte.
          </p>
          <a href="/operator/dashboard" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Voltar para agenda do operador
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-300">Suporte operacional</p>
              <h1 className="mt-2 text-3xl font-black">Chat de suporte do operador</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300">
                Evento: {context.eventName || context.eventId || "carregando evento..."}
              </p>
            </div>
            <a
              href={`/operator/support/new?eventId=${encodeURIComponent(context.eventId || "")}&eventName=${encodeURIComponent(context.eventName || "")}${context.assignmentId ? `&assignmentId=${encodeURIComponent(context.assignmentId)}` : ""}`}
              className={`rounded-2xl px-5 py-3 text-sm font-black text-white ${context.eventId ? "bg-blue-600" : "pointer-events-none bg-slate-500 opacity-50"}`}
            >
              Abrir técnico
            </a>
          </div>
        </header>

        <section className="mt-6 grid h-[calc(100vh-230px)] min-h-[660px] gap-5 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Fichas do evento</p>
                <h2 className="text-xl font-black">Chamados</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{scopedTickets.length}</span>
            </div>

            <div className="h-[calc(100%-62px)] overflow-y-auto pr-1">
              <CardList tickets={scopedTickets} selectedId={selectedTicket?.id} onSelect={selectTicket} />
            </div>
          </aside>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#e9f3ee] shadow-sm">
            {selectedTicket ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                  <div>
                    <h2 className="text-lg font-black">{selectedTicket.title || "Chamado"}</h2>
                    <p className="text-xs font-bold text-slate-500">
                      {selectedTicket.protocol || selectedTicket.id} • {context.eventName || context.eventId}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedClosed ? (
                      <span className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">Histórico resolvido</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => setForwardOpen((current) => !current)} className="rounded-2xl bg-amber-500 px-4 py-2 text-xs font-black text-white">
                          Encaminhar Suporte Site
                        </button>
                        <button type="button" onClick={closeTicket} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                          Resolver chamado
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {selectedClosed ? (
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-600">
                    Chamado resolvido. Esta conversa fica somente como histórico até o cliente reabrir.
                  </div>
                ) : null}

                {forwardOpen && !selectedClosed ? (
                  <div className="border-b border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Justificativa para o Suporte Site</p>
                    <div className="mt-2 flex gap-2">
                      <textarea
                        value={forwardReason}
                        onChange={(event) => setForwardReason(event.target.value)}
                        className="min-h-20 flex-1 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                        placeholder="Explique brevemente por que este chamado precisa do Suporte Site..."
                      />
                      <button type="button" onClick={forwardToSupportSite} className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-black text-white">
                        Enviar
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {mergedMessages(selectedTicket).map((message: any) => (
                    <Bubble key={message.id} message={message} />
                  ))}
                  <div ref={bottomRef} />
                </div>

                <div className="border-t border-slate-200 bg-white p-4">
                  <div className="flex gap-2">
                    <textarea
                      value={reply}
                      disabled={selectedClosed}
                      onChange={(event) => setReply(event.target.value)}
                      className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      placeholder={selectedClosed ? "Chamado resolvido. Somente histórico até o cliente reabrir." : "Digite uma mensagem..."}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void sendReply();
                        }
                      }}
                    />
                    <button type="button" disabled={selectedClosed || !reply.trim()} onClick={sendReply} className="rounded-2xl bg-blue-600 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                      Enviar
                    </button>
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-400">
                    Todas as mensagens ficam visíveis para todos os envolvidos no chamado deste evento.
                  </p>
                </div>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-10 text-center">
                <div>
                  <p className="text-2xl font-black text-slate-700">Nenhum chamado selecionado</p>
                  <p className="mt-2 text-sm font-bold text-slate-500">Esta tela mostra apenas chamados do evento aberto.</p>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
'@

$OperatorSupportNewPage = @'
"use client";
// @ts-nocheck

import { useEffect, useState } from "react";
import { getStoredAuthUser } from "../../../../lib/auth-client";
import { createSupportTicketReal } from "../../../../lib/support-api-workflow";

type StoredUser = { id?: string; name?: string; email?: string; role?: string };
type EventContext = { eventId: string; eventName: string; assignmentId: string };

function fallbackUser(): StoredUser {
  return { id: "operator-local", name: "Operador", email: "operador@local.test", role: "OPERATOR" };
}

function readEventContext(): EventContext {
  if (typeof window === "undefined") {
    return { eventId: "", eventName: "", assignmentId: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("eventId") || "";
  const eventName =
    params.get("eventName") ||
    localStorage.getItem(`operator-event-name-${eventId}`) ||
    localStorage.getItem("operator-selected-event-name") ||
    "";
  const assignmentId = params.get("assignmentId") || "";

  if (eventId && eventName) {
    localStorage.setItem(`operator-event-name-${eventId}`, eventName);
    localStorage.setItem("operator-selected-event-id", eventId);
    localStorage.setItem("operator-selected-event-name", eventName);
  }

  return { eventId, eventName, assignmentId };
}

export default function NewOperatorSupportPage() {
  const [context, setContext] = useState<EventContext>({ eventId: "", eventName: "", assignmentId: "" });
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const canSubmit = Boolean(context.eventId && title.trim() && message.trim() && !saving);

  useEffect(() => {
    const nextContext = readEventContext();
    setContext(nextContext);
    setLoaded(true);
  }, []);

  async function submit() {
    if (!context.eventId) {
      alert("Entre pelo botão Suporte do evento.");
      return;
    }

    if (!title.trim()) {
      alert("Informe o título do problema.");
      return;
    }

    if (!message.trim()) {
      alert("Descreva o problema técnico.");
      return;
    }

    setSaving(true);

    try {
      const user = getStoredAuthUser<StoredUser>() || fallbackUser();
      const eventName = context.eventName || context.eventId;

      const ticket = await createSupportTicketReal({
        title: title.trim(),
        category: "Suporte técnico",
        message: message.trim(),
        priority: "NORMAL" as any,
        sourceType: "OPERATOR",
        targetType: "ALL" as any,
        currentOwnerType: "SUPER_ADMIN",
        eventId: context.eventId,
        eventName,
        operatorName: user.name || "Operador",
        operatorEmail: user.email,
        createdByRole: "OPERATOR",
        createdByName: user.name || "Operador",
        createdByEmail: user.email,
      } as any);

      const params = new URLSearchParams();
      params.set("eventId", context.eventId);
      params.set("eventName", eventName);

      if (context.assignmentId) {
        params.set("assignmentId", context.assignmentId);
      }

      if (ticket?.id) {
        params.set("ticket", ticket.id);
      }

      window.location.href = `/operator/support?${params.toString()}`;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível abrir chamado técnico.");
      setSaving(false);
    }
  }

  if (loaded && !context.eventId) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Evento obrigatório</p>
          <h1 className="mt-2 text-3xl font-black text-amber-950">Entre pelo suporte do evento</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-amber-900">
            Para criar chamado técnico, abra primeiro o evento na agenda do operador e clique em Suporte. Assim o chamado fica ligado ao evento correto.
          </p>
          <a href="/operator/dashboard" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Voltar para agenda do operador
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <a
          href={`/operator/support?eventId=${encodeURIComponent(context.eventId || "")}&eventName=${encodeURIComponent(context.eventName || "")}${context.assignmentId ? `&assignmentId=${encodeURIComponent(context.assignmentId)}` : ""}`}
          className="text-sm font-black text-blue-600"
        >
          ← Voltar para suporte do evento
        </a>

        <section className="mt-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Chamado técnico</p>
          <h1 className="mt-2 text-3xl font-black">Abrir chamado com Suporte Site</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Este chamado será criado somente para o evento que o operador está atendendo agora.
          </p>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700/70">Evento atual</p>
            <p className="mt-2 break-all text-sm font-black text-slate-950">ID: {context.eventId || "carregando..."}</p>
            <p className="mt-1 text-sm font-bold text-slate-600">Nome: {context.eventName || "Evento selecionado"}</p>
          </div>

          <div className="mt-5 grid gap-3">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Título do problema *"
            />

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-500"
              placeholder="Descrição do problema técnico *"
            />

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-2xl bg-blue-600 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Abrindo..." : "Abrir chamado técnico"}
            </button>

            <p className="text-xs font-bold text-slate-400">
              Para criar chamado em outro evento, volte para a agenda e entre no suporte daquele outro evento.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
'@

Write-Utf8NoBom -Path $OperatorSupportPath -Content $OperatorSupportPage
Write-Host "[OK] /operator/support agora e estritamente por evento."

Write-Utf8NoBom -Path $OperatorSupportNewPath -Content $OperatorSupportNewPage
Write-Host "[OK] /operator/support/new agora usa somente o evento aberto."

$NextDir = Join-Path $WebRoot ".next"
if (Test-Path -LiteralPath $NextDir) {
  try {
    Remove-Item -LiteralPath $NextDir -Recurse -Force -ErrorAction Stop
    Write-Host "[OK] Cache .next apagado."
  } catch {
    Write-Host "[AVISO] Nao consegui apagar .next. Pare a WEB com Ctrl+C antes de subir novamente." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "[OK] Suporte do operador amarrado ao evento."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-operator-support-strict-event-build.txt"
Write-Host "Select-String -Path .\log-web-operator-support-strict-event-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found|operator/support|operator/support/new|OperatorPanel|eventId|eventName|assignmentId|Hydration`" -Context 2,3"
