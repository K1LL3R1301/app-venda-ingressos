$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WebRoot = Join-Path $ProjectRoot "apps\web"
$SuperSupportPath = Join-Path $WebRoot "src\app\admin\super\support\page.tsx"

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
    $BackupPath = "$Path.bak-super-support-agenda-whatsapp-$Stamp"
    Copy-Item -LiteralPath $Path -Destination $BackupPath -Force
    Write-Host "[OK] Backup criado: $BackupPath"
  } else {
    Write-Host "[AVISO] Arquivo ainda nao existe: $Path" -ForegroundColor Yellow
  }
}

Write-Host "[INFO] Projeto: $ProjectRoot"
Write-Host "[INFO] Criando tela Super Admin com agenda por evento + chat"

Backup-File $SuperSupportPath

$SuperSupportPage = @'
"use client";
// @ts-nocheck

import { useEffect, useMemo, useRef, useState } from "react";
import { getStoredAuthUser } from "../../../../lib/auth-client";
import {
  addSupportMessageReal,
  getVisibleSupportTicketsReal,
  resolveSupportTicketReal,
  returnSupportFromSuperAdminReal,
} from "../../../../lib/support-api-workflow";

type StoredUser = { id?: string; name?: string; email?: string; role?: string };
type Ticket = any;

type EventGroup = {
  id: string;
  name: string;
  tickets: Ticket[];
  lastMessageAt: string;
  openCount: number;
  closedCount: number;
};

function fallbackUser(): StoredUser {
  return { id: "super-local", name: "Suporte Site", email: "super@local.test", role: "SUPER_ADMIN" };
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
    CUSTOMER_REPLY: "Cliente respondeu",
    PRODUCER_REPLY: "Produtor respondeu",
    FORWARDED_TO_SUPER_ADMIN: "Com Suporte Site",
    RETURNED_TO_PRODUCER: "Devolvido ao produtor",
    RETURNED_TO_OPERATOR: "Devolvido ao operador",
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

function lastMessage(ticket: Ticket) {
  const list = ticketMessages(ticket);
  return list[list.length - 1]?.text || ticket?.title || "Sem mensagens";
}

function lastMessageAt(ticket: Ticket) {
  const list = ticketMessages(ticket);
  return list[list.length - 1]?.createdAt || ticket?.updatedAt || ticket?.createdAt || "";
}

function ticketStatus(ticket?: Ticket) {
  return String(ticket?.status || "OPEN").toUpperCase();
}

function isResolved(ticket?: Ticket) {
  return ["RESOLVED", "CLOSED"].includes(ticketStatus(ticket));
}

function reopenedStorageKey(ticketId: string) {
  return `astro_reopened_support_${ticketId}`;
}

function isLocallyReopened(ticketId?: string) {
  if (!ticketId || typeof window === "undefined") return false;
  return localStorage.getItem(reopenedStorageKey(ticketId)) === "1";
}

function isClosedTicket(ticket?: Ticket) {
  if (!ticket) return false;
  if (isLocallyReopened(ticket.id)) return false;
  return isResolved(ticket);
}

function optimisticStorageKey(ticketId: string) {
  return `astro_support_messages_${ticketId}`;
}

function readOptimisticMessages(ticketId?: string) {
  if (!ticketId || typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(optimisticStorageKey(ticketId)) || "[]");
  } catch {
    return [];
  }
}

function saveOptimisticMessage(ticketId: string, message: any) {
  if (!ticketId || typeof window === "undefined") return;

  const current = readOptimisticMessages(ticketId);
  localStorage.setItem(optimisticStorageKey(ticketId), JSON.stringify([...current, message].slice(-30)));
}

function mergedMessages(ticket?: Ticket) {
  const server = ticketMessages(ticket);
  const optimistic = readOptimisticMessages(ticket?.id).filter((localMessage: any) => {
    const localTime = new Date(localMessage.createdAt).getTime();

    return !server.some((serverMessage: any) => {
      const serverTime = new Date(serverMessage.createdAt).getTime();
      return (
        String(serverMessage.text || "") === String(localMessage.text || "") &&
        String(serverMessage.authorRole || "").toUpperCase() === String(localMessage.authorRole || "").toUpperCase() &&
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
    status: isLocallyReopened(ticket.id) ? "IN_PROGRESS" : ticket.status,
  };
}

function isMine(message: any) {
  return String(message?.authorRole || message?.senderType || "").toUpperCase() === "SUPER_ADMIN";
}

function Bubble({ message }: { message: any }) {
  const mine = isMine(message);
  const kind = String(message?.kind || "MESSAGE").toUpperCase();

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-3 shadow-sm ${
          mine
            ? "rounded-br-md bg-emerald-600 text-white"
            : kind === "FORWARD"
              ? "rounded-bl-md border border-amber-200 bg-amber-50 text-amber-950"
              : kind === "SYSTEM"
                ? "rounded-bl-md border border-slate-200 bg-slate-100 text-slate-700"
                : "rounded-bl-md bg-white text-slate-900"
        }`}
      >
        <p className={`mb-1 text-[10px] font-black uppercase tracking-[0.16em] ${mine ? "text-emerald-100" : "text-slate-400"}`}>
          Tipo de conta: {label(message.authorRole || message.senderType)}
        </p>
        <p className="whitespace-pre-wrap text-sm font-bold leading-relaxed">{message.text}</p>
        <p className={`mt-2 text-right text-[10px] font-bold ${mine ? "text-emerald-100" : "text-slate-400"}`}>{when(message.createdAt)}</p>
      </div>
    </div>
  );
}

function groupTicketsByEvent(tickets: Ticket[]): EventGroup[] {
  const map = new Map<string, EventGroup>();

  tickets.forEach((ticket) => {
    const eventId = String(ticket.eventId || "sem-evento");
    const eventName = ticket.eventName || ticket.event?.name || "Chamados sem evento";

    if (!map.has(eventId)) {
      map.set(eventId, {
        id: eventId,
        name: eventName,
        tickets: [],
        lastMessageAt: "",
        openCount: 0,
        closedCount: 0,
      });
    }

    const group = map.get(eventId)!;
    group.tickets.push(ticket);

    const latest = lastMessageAt(ticket);
    if (!group.lastMessageAt || new Date(latest || 0).getTime() > new Date(group.lastMessageAt || 0).getTime()) {
      group.lastMessageAt = latest;
    }

    if (isClosedTicket(ticket)) {
      group.closedCount += 1;
    } else {
      group.openCount += 1;
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount;
    return new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime();
  });
}

function AgendaView({
  groups,
  onOpenGroup,
}: {
  groups: EventGroup[];
  onOpenGroup: (group: EventGroup) => void;
}) {
  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-600">Agenda do Suporte Site</p>
          <h2 className="mt-2 text-2xl font-black">Eventos com chamados técnicos</h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            Aqui aparecem todos os eventos que encaminharam chamados para o Suporte Site.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => onOpenGroup(group)}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-slate-950">{group.name}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Última movimentação: {when(group.lastMessageAt) || "sem data"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase text-emerald-700">
                  {group.tickets.length} chamado(s)
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                  {group.openCount} aberto(s)
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                  {group.closedCount} resolvido(s)
                </span>
              </div>
            </button>
          ))}

          {!groups.length ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center md:col-span-2">
              <p className="text-lg font-black text-slate-700">Nenhum chamado encaminhado ao Suporte Site.</p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Quando produtor ou operador encaminhar um chamado técnico, o evento aparecerá aqui.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Resumo</p>
        <h3 className="mt-2 text-xl font-black">Fila técnica</h3>
        <div className="mt-5 grid gap-3">
          <div className="rounded-3xl bg-slate-950 p-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Eventos</p>
            <p className="mt-2 text-3xl font-black">{groups.length}</p>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/60">Chamados abertos</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {groups.reduce((sum, group) => sum + group.openCount, 0)}
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold leading-6 text-slate-600">
              A mesma tela do produtor, mas aqui aparecem somente os chamados que chegaram ao Suporte Site, de todos os eventos.
            </p>
          </div>
        </div>
      </aside>
    </section>
  );
}

function CardList({ tickets, selectedId, onSelect }: { tickets: Ticket[]; selectedId?: string; onSelect: (id: string) => void }) {
  if (!tickets.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-black text-slate-600">Nenhum chamado neste evento.</p>
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
                ? "border-emerald-400 bg-emerald-50 shadow-sm"
                : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{ticket.title || "Chamado técnico"}</p>
                <p className="mt-1 truncate text-xs font-bold text-slate-500">
                  {ticket.customerName || ticket.operatorName || ticket.producerName || "Atendimento"}
                </p>
              </div>
              <span className={`rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase ${closed ? "text-slate-500" : "text-emerald-700"}`}>
                {closed ? "Bloqueado" : label(ticket.status)}
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-xs font-bold leading-relaxed text-slate-500">{lastMessage(ticket)}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function SuperSupportPage() {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  const decoratedTickets = useMemo(() => tickets.map(decorateTicket), [tickets]);
  const groups = useMemo(() => groupTicketsByEvent(decoratedTickets), [decoratedTickets]);

  const selectedGroup = useMemo(
    () => groups.find((group) => String(group.id) === String(selectedEventId)) || null,
    [groups, selectedEventId],
  );

  const eventTickets = useMemo(() => {
    if (!selectedGroup) return [];
    return selectedGroup.tickets;
  }, [selectedGroup]);

  const selectedTicket = useMemo(
    () => eventTickets.find((ticket) => ticket.id === selectedId) || eventTickets[0] || null,
    [eventTickets, selectedId],
  );

  const selectedClosed = isClosedTicket(selectedTicket);

  function actor() {
    const current = user || fallbackUser();
    return { role: "SUPER_ADMIN" as const, name: current.name || "Suporte Site", email: current.email };
  }

  function setUrl(next: { eventId?: string; ticketId?: string }) {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);

    if (next.eventId !== undefined) {
      if (next.eventId) url.searchParams.set("eventId", next.eventId);
      else url.searchParams.delete("eventId");
    }

    if (next.ticketId !== undefined) {
      if (next.ticketId) url.searchParams.set("ticket", next.ticketId);
      else url.searchParams.delete("ticket");
    }

    window.history.replaceState(null, "", url.toString());
  }

  function openGroup(group: EventGroup) {
    setSelectedEventId(group.id);
    setSelectedId("");
    setUrl({ eventId: group.id, ticketId: "" });
  }

  function backToAgenda() {
    setSelectedEventId("");
    setSelectedId("");
    setUrl({ eventId: "", ticketId: "" });
  }

  function selectTicket(id: string) {
    setSelectedId(id);
    setUrl({ ticketId: id });
  }

  async function reload() {
    setLoading(true);

    const storedUser = getStoredAuthUser<StoredUser>() || fallbackUser();
    setUser(storedUser);

    const data = await getVisibleSupportTicketsReal({ role: "SUPER_ADMIN", userEmail: storedUser.email });
    setTickets(Array.isArray(data) ? data : []);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const eventFromUrl = params.get("eventId") || "";
      const ticketFromUrl = params.get("ticket") || "";

      if (eventFromUrl) setSelectedEventId(eventFromUrl);
      if (ticketFromUrl) setSelectedId(ticketFromUrl);
    }

    setLoading(false);
  }

  useEffect(() => {
    void reload();

    const onUpdate = () => void reload();
    window.addEventListener("support-workflow:update", onUpdate);

    return () => window.removeEventListener("support-workflow:update", onUpdate);
  }, []);

  useEffect(() => {
    if (!selectedId && eventTickets[0]?.id) {
      setSelectedId(eventTickets[0].id);
    }
  }, [eventTickets, selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [selectedTicket?.id, selectedTicket?.messages?.length]);

  async function sendReply() {
    const text = reply.trim();

    if (!selectedTicket || !text || selectedClosed) return;

    const optimistic = {
      id: `local-super-${Date.now()}`,
      authorRole: "SUPER_ADMIN",
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
          ? { ...ticket, messages: [...ticketMessages(ticket), optimistic], status: "IN_PROGRESS" }
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

  async function returnTo(target: "CUSTOMER" | "PRODUCER" | "OPERATOR") {
    if (!selectedTicket || selectedClosed) return;

    const baseText = reply.trim();
    const text = baseText || `Chamado devolvido para ${label(target)} pelo Suporte Site.`;

    saveOptimisticMessage(selectedTicket.id, {
      id: `local-return-${Date.now()}`,
      authorRole: "SUPER_ADMIN",
      authorName: actor().name,
      targetType: "ALL",
      text,
      kind: "SYSTEM",
      createdAt: new Date().toISOString(),
    });

    await returnSupportFromSuperAdminReal(selectedTicket.id, target, actor(), text);
    setReply("");
    await reload();
  }

  async function closeTicket() {
    if (!selectedTicket || selectedClosed) return;

    const name = actor().name;
    const text = reply.trim() || `Chamado técnico encerrado por ${name}.`;

    if (typeof window !== "undefined") {
      localStorage.removeItem(reopenedStorageKey(selectedTicket.id));
    }

    saveOptimisticMessage(selectedTicket.id, {
      id: `local-close-${Date.now()}`,
      authorRole: "SUPER_ADMIN",
      authorName: name,
      targetType: "ALL",
      text,
      kind: "SYSTEM",
      createdAt: new Date().toISOString(),
    });

    await resolveSupportTicketReal(selectedTicket.id, actor(), text, { targetType: "ALL" as any });
    setReply("");
    await reload();
  }

  async function reopenTicket() {
    if (!selectedTicket) return;

    const name = actor().name;
    const text = `Chamado técnico reaberto por ${name}. O atendimento precisa continuar.`;

    if (typeof window !== "undefined") {
      localStorage.setItem(reopenedStorageKey(selectedTicket.id), "1");
    }

    saveOptimisticMessage(selectedTicket.id, {
      id: `local-reopen-${Date.now()}`,
      authorRole: "SUPER_ADMIN",
      authorName: name,
      targetType: "ALL",
      text,
      kind: "SYSTEM",
      createdAt: new Date().toISOString(),
    });

    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === selectedTicket.id
          ? { ...ticket, status: "IN_PROGRESS" }
          : ticket,
      ),
    );

    try {
      await addSupportMessageReal(selectedTicket.id, actor(), text, { targetType: "ALL" as any });
      await reload();
    } catch {
      await reload();
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Suporte Site</p>
              <h1 className="mt-2 text-3xl font-black">Suporte técnico por evento</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold text-slate-300">
                Mesma central do produtor, mas com todos os chamados encaminhados ao Suporte Site em todos os eventos.
              </p>
            </div>
          </div>
        </header>

        {!selectedEventId ? (
          loading ? (
            <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-8 text-sm font-bold text-slate-500">
              Carregando chamados técnicos...
            </div>
          ) : (
            <AgendaView groups={groups} onOpenGroup={openGroup} />
          )
        ) : (
          <section className="mt-6 grid h-[calc(100vh-230px)] min-h-[660px] gap-5 lg:grid-cols-[360px_1fr]">
            <aside className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
              <button type="button" onClick={backToAgenda} className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">
                ← Voltar para eventos
              </button>

              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Evento selecionado</p>
                <h2 className="mt-1 text-xl font-black">{selectedGroup?.name || "Evento"}</h2>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {selectedGroup?.openCount || 0} aberto(s) • {selectedGroup?.closedCount || 0} resolvido(s)
                </p>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Fichas</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">{eventTickets.length}</span>
              </div>

              <div className="h-[calc(100%-154px)] overflow-y-auto pr-1">
                <CardList tickets={eventTickets} selectedId={selectedTicket?.id} onSelect={selectTicket} />
              </div>
            </aside>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-[#e9f3ee] shadow-sm">
              {selectedTicket ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
                    <div>
                      <h2 className="text-lg font-black">{selectedTicket.title || "Chamado técnico"}</h2>
                      <p className="text-xs font-bold text-slate-500">
                        {selectedTicket.protocol || selectedTicket.id} • {selectedGroup?.name || selectedTicket.eventName || "Evento"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedClosed ? (
                        <button type="button" onClick={reopenTicket} className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-black text-white">
                          Reabrir chamado
                        </button>
                      ) : (
                        <>
                          <button type="button" onClick={() => returnTo("CUSTOMER")} className="rounded-2xl bg-violet-600 px-4 py-2 text-xs font-black text-white">
                            Devolver cliente
                          </button>
                          <button type="button" onClick={() => returnTo("PRODUCER")} className="rounded-2xl bg-orange-600 px-4 py-2 text-xs font-black text-white">
                            Devolver produtor
                          </button>
                          <button type="button" onClick={() => returnTo("OPERATOR")} className="rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black text-white">
                            Devolver operador
                          </button>
                          <button type="button" onClick={closeTicket} className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white">
                            Resolver técnico
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {selectedClosed ? (
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-600">
                      Chamado bloqueado para todos. Reabra caso o cliente ainda tenha dúvida.
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
                        className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        placeholder={selectedClosed ? "Chamado resolvido. Reabra para enviar novas mensagens." : "Digite uma resposta técnica..."}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void sendReply();
                          }
                        }}
                      />
                      <button type="button" disabled={selectedClosed || !reply.trim()} onClick={sendReply} className="rounded-2xl bg-emerald-600 px-6 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
                        Enviar
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-bold text-slate-400">
                      Todas as mensagens ficam visíveis para todos os envolvidos no chamado.
                    </p>
                  </div>
                </>
              ) : (
                <div className="grid flex-1 place-items-center p-10 text-center">
                  <div>
                    <p className="text-2xl font-black text-slate-700">Selecione uma ficha</p>
                    <p className="mt-2 text-sm font-bold text-slate-500">Ao clicar em uma ficha, o chat técnico abre aqui.</p>
                  </div>
                </div>
              )}
            </section>
          </section>
        )}
      </div>
    </main>
  );
}
'@

Write-Utf8NoBom -Path $SuperSupportPath -Content $SuperSupportPage
Write-Host "[OK] /admin/super/support atualizado com agenda + chat de todos os eventos."

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
Write-Host "[OK] Super Admin agora usa a mesma central por evento."
Write-Host ""
Write-Host "Agora rode:"
Write-Host "cd `"$WebRoot`""
Write-Host "npm run build *> log-web-super-support-agenda-whatsapp-build.txt"
Write-Host "Select-String -Path .\log-web-super-support-agenda-whatsapp-build.txt -Pattern `"error|Error:|Failed|Cannot find|Type error|Module not found|admin/super/support|returnSupportFromSuperAdminReal|resolveSupportTicketReal|addSupportMessageReal|eventId`" -Context 2,3"
