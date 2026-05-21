"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type User = { id?: string; name?: string; email?: string; role?: string };

type Organizer = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
};

type EventItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  category?: string | null;
  organizerId?: string | null;
  organizer?: Organizer | null;
  startDate?: string | null;
  eventDate?: string | null;
  endDate?: string | null;
  createdAt?: string | null;
  capacity?: number | null;
  location?: {
    venueName?: string | null;
    name?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
  } | null;
};

type OrderItem = {
  id: string;
  status?: string | null;
  totalAmount?: string | number | null;
  amount?: string | number | null;
  grossAmount?: string | number | null;
  createdAt?: string | null;
  eventId?: string | null;
  event?: EventItem | null;
  customerName?: string | null;
  customerEmail?: string | null;
  items?: Array<{ quantity?: number | null; tickets?: Array<unknown> | null }> | null;
};

type SupportTicket = {
  id: string;
  protocol?: string | null;
  title?: string | null;
  subject?: string | null;
  status?: string | null;
  currentOwnerType?: string | null;
  eventId?: string | null;
  eventName?: string | null;
  category?: string | null;
  priority?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  producerName?: string | null;
  producerEmail?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  messages?: Array<{
    id?: string | null;
    text?: string | null;
    message?: string | null;
    authorRole?: string | null;
    senderType?: string | null;
    createdAt?: string | null;
  }> | null;
};

type Assignment = {
  id: string;
  status?: string | null;
  organizerId?: string | null;
  eventId?: string | null;
  event?: EventItem | null;
  eventTitle?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  workDates?: Array<{
    date?: string | null;
    amount?: string | number | null;
    functions?: string | null;
    status?: string | null;
  }> | null;
};

type LoadState = {
  user: User | null;
  loading: boolean;
  error: string;
  events: EventItem[];
  organizers: Organizer[];
  orders: OrderItem[];
  supportTickets: SupportTicket[];
  assignments: Assignment[];
};

type EventTab = "info" | "revenue" | "reports";

const paidStatuses = new Set(["PAID", "CONFIRMED", "COMPLETED", "APPROVED", "AUTHORIZED"]);
const canceledStatuses = new Set(["CANCELED", "CANCELLED", "REFUNDED", "CHARGEBACK", "FAILED", "EXPIRED"]);

function num(value?: string | number | null) {
  if (value == null) return 0;
  const parsed =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num(value));
}

function eventName(event?: EventItem | null) {
  return event?.name || event?.title || event?.slug || event?.id || "Evento";
}

function organizerName(organizer?: Organizer | null) {
  return organizer?.tradeName || organizer?.legalName || organizer?.email || organizer?.id || "Organizador";
}

function organizerIdFromEvent(event?: EventItem | null) {
  return String(event?.organizerId || event?.organizer?.id || "");
}

function orderEventId(order: OrderItem) {
  return String(order.event?.id || order.eventId || "");
}

function isPaid(order: OrderItem) {
  return paidStatuses.has(String(order.status || "").toUpperCase());
}

function isCanceled(order: OrderItem) {
  return canceledStatuses.has(String(order.status || "").toUpperCase());
}

function orderAmount(order: OrderItem) {
  return num(order.totalAmount ?? order.amount ?? order.grossAmount);
}

function orderTickets(order: OrderItem) {
  return (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity || 0) || Number(item.tickets?.length || 0)),
    0,
  );
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function eventStart(event?: EventItem | null) {
  return event?.startDate || event?.eventDate || event?.createdAt || null;
}

function dateTime(value?: string | null) {
  const date = safeDate(value);

  if (!date) return value || "-";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateOnly(value?: string | null) {
  const date = safeDate(value);

  if (!date) return value || "-";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function eventLocation(event: EventItem) {
  return [
    event.location?.venueName || event.location?.name,
    event.location?.address,
    event.location?.city,
    event.location?.state,
  ]
    .filter(Boolean)
    .join(" • ") || "Local não informado";
}

function statusLabel(status?: string | null) {
  const key = String(status || "").toUpperCase();

  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    PUBLISHED: "Publicado",
    DRAFT: "Rascunho",
    CANCELED: "Cancelado",
    CANCELLED: "Cancelado",
    PAID: "Pago",
    PENDING: "Pendente",
    OPEN: "Aberto",
    IN_PROGRESS: "Em andamento",
    FORWARDED_TO_SUPER_ADMIN: "Com Super Admin",
    RESOLVED: "Resolvido",
    CLOSED: "Fechado",
    ACCEPTED: "Aceito",
    ASSIGNED: "Atribuído",
  };

  return labels[key] || status || "-";
}

function lastSupportMessage(ticket: SupportTicket) {
  const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
  const last = messages[messages.length - 1];

  return last?.text || last?.message || ticket.title || ticket.subject || "Chamado sem mensagem";
}

function supportParty(ticket: SupportTicket) {
  return (
    ticket.customerName ||
    ticket.customerEmail ||
    ticket.operatorName ||
    ticket.operatorEmail ||
    ticket.producerName ||
    ticket.producerEmail ||
    "Solicitante"
  );
}

function isSuperSupport(ticket: SupportTicket) {
  const owner = String(ticket.currentOwnerType || "").toUpperCase();
  const status = String(ticket.status || "").toUpperCase();

  return owner === "SUPER_ADMIN" || status === "FORWARDED_TO_SUPER_ADMIN";
}

function assignmentEventId(assignment: Assignment) {
  return String(assignment.eventId || assignment.event?.id || "");
}

function assignmentName(assignment: Assignment) {
  return (
    assignment.operatorName ||
    assignment.customerName ||
    assignment.userName ||
    assignment.operatorEmail ||
    assignment.customerEmail ||
    assignment.userEmail ||
    "Operador"
  );
}

function assignmentEmail(assignment: Assignment) {
  return assignment.operatorEmail || assignment.customerEmail || assignment.userEmail || "";
}

function assignmentAmount(assignment: Assignment) {
  return (assignment.workDates || []).reduce((sum, workDate) => sum + num(workDate.amount), 0);
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(name: string, rows: Array<Array<string | number | null | undefined>>) {
  const body = rows.map((row) => row.map(csvValue).join(";")).join("\n");
  const blob = new Blob(["\ufeff", body], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = name;
  anchor.click();

  URL.revokeObjectURL(url);
}

function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
}

function Metric({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <article className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p> : null}
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function ReportCard({
  title,
  description,
  onClick,
  tag,
}: {
  title: string;
  description: string;
  onClick: () => void;
  tag: string;
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">{tag}</p>
      <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 min-h-[52px] text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
      <button
        type="button"
        onClick={onClick}
        className="mt-5 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
      >
        Baixar CSV
      </button>
    </article>
  );
}

export default function SuperEventDetailPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = String(params.eventId || "");
  const [tab, setTab] = useState<EventTab>("info");
  const [state, setState] = useState<LoadState>({
    user: null,
    loading: true,
    error: "",
    events: [],
    organizers: [],
    orders: [],
    supportTickets: [],
    assignments: [],
  });

  useEffect(() => {
    async function load() {
      const token = sessionStorage.getItem("astro_session_token") || "";
      const rawUser = sessionStorage.getItem("astro_session_user") || "";

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      let user: User | null = null;

      try {
        user = rawUser ? JSON.parse(rawUser) : null;
      } catch {
        user = null;
      }

      if (String(user?.role || "").toUpperCase() !== "SUPER_ADMIN") {
        setState((current) => ({
          ...current,
          user,
          loading: false,
          error: "Esta área é exclusiva do SUPER_ADMIN.",
        }));
        return;
      }

      async function get(path: string) {
        const response = await fetch(`${API}${path}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(typeof json?.message === "string" ? json.message : `Erro em ${path}`);
        }

        if (Array.isArray(json)) return json;

        return json?.items || json?.events || json?.orders || json?.organizers || json?.assignments || [];
      }

      async function optionalGet(path: string) {
        try {
          return await get(path);
        } catch {
          return [];
        }
      }

      try {
        const [events, organizers, orders, supportTickets, assignments] = await Promise.all([
          get("/events"),
          get("/organizers"),
          get("/orders"),
          optionalGet("/support/linked/super"),
          optionalGet("/operator-assignments"),
        ]);

        setState({
          user,
          loading: false,
          error: "",
          events,
          organizers,
          orders,
          supportTickets,
          assignments,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          user,
          loading: false,
          error: error instanceof Error ? error.message : "Erro ao carregar evento.",
        }));
      }
    }

    load();
  }, []);

  const selectedEvent = useMemo(
    () => state.events.find((event) => event.id === eventId) || null,
    [state.events, eventId],
  );

  const organizer = useMemo(() => {
    if (!selectedEvent) return null;

    return (
      selectedEvent.organizer ||
      state.organizers.find((item) => item.id === organizerIdFromEvent(selectedEvent)) ||
      null
    );
  }, [selectedEvent, state.organizers]);

  const eventOrders = useMemo(
    () => state.orders.filter((order) => orderEventId(order) === eventId),
    [state.orders, eventId],
  );

  const paidOrders = eventOrders.filter(isPaid);
  const canceledOrders = eventOrders.filter(isCanceled);
  const revenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
  const canceledAmount = canceledOrders.reduce((sum, order) => sum + orderAmount(order), 0);
  const tickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);
  const capacity = Number(selectedEvent?.capacity || 0);
  const occupancy = capacity > 0 ? Math.round((tickets / capacity) * 100) : 0;

  const eventSupportTickets = useMemo(
    () =>
      state.supportTickets.filter((ticket) => {
        const sameEvent = String(ticket.eventId || "") === eventId;

        return sameEvent && isSuperSupport(ticket);
      }),
    [state.supportTickets, eventId],
  );

  const eventAssignments = useMemo(
    () => state.assignments.filter((assignment) => assignmentEventId(assignment) === eventId),
    [state.assignments, eventId],
  );

  const organizerAssignments = useMemo(() => {
    const organizerId = organizerIdFromEvent(selectedEvent);

    if (!organizerId) return state.assignments;

    return state.assignments.filter(
      (assignment) =>
        assignment.organizerId === organizerId ||
        state.events.some(
          (event) =>
            event.id === assignmentEventId(assignment) &&
            organizerIdFromEvent(event) === organizerId,
        ),
    );
  }, [state.assignments, selectedEvent, state.events]);

  function exportEventSummary() {
    downloadCsv(`evento-resumo-${eventId}-${fileStamp()}.csv`, [
      ["Campo", "Valor"],
      ["Evento", eventName(selectedEvent)],
      ["Organizador", organizerName(organizer)],
      ["Status", statusLabel(selectedEvent?.status)],
      ["Data", dateTime(eventStart(selectedEvent))],
      ["Local", selectedEvent ? eventLocation(selectedEvent) : ""],
      ["Receita paga", revenue.toFixed(2).replace(".", ",")],
      ["Pedidos pagos", paidOrders.length],
      ["Pedidos cancelados", canceledOrders.length],
      ["Valor cancelado", canceledAmount.toFixed(2).replace(".", ",")],
      ["Ingressos pagos", tickets],
      ["Capacidade", capacity],
      ["Ocupação %", occupancy],
      ["Suportes com Super Admin", eventSupportTickets.length],
      ["Operadores do evento", eventAssignments.length],
    ]);
  }

  function exportEventOrders() {
    downloadCsv(`evento-pedidos-${eventId}-${fileStamp()}.csv`, [
      ["Pedido", "Cliente", "Status", "Valor", "Ingressos"],
      ...eventOrders.map((order) => [
        order.id,
        order.customerName || order.customerEmail || "",
        statusLabel(order.status),
        orderAmount(order).toFixed(2).replace(".", ","),
        orderTickets(order),
      ]),
    ]);
  }

  function exportEventSupport() {
    downloadCsv(`evento-suporte-super-admin-${eventId}-${fileStamp()}.csv`, [
      ["Chamado", "Protocolo", "Titulo", "Status", "Solicitante", "Categoria", "Prioridade", "Criado em", "Atualizado em", "Ultima mensagem"],
      ...eventSupportTickets.map((ticket) => [
        ticket.id,
        ticket.protocol || "",
        ticket.title || ticket.subject || "",
        statusLabel(ticket.status),
        supportParty(ticket),
        ticket.category || "",
        ticket.priority || "",
        dateTime(ticket.createdAt),
        dateTime(ticket.updatedAt),
        lastSupportMessage(ticket),
      ]),
    ]);
  }

  function exportEventOperators() {
    downloadCsv(`evento-operadores-${eventId}-${fileStamp()}.csv`, [
      ["Ficha", "Operador", "Email", "Status", "Valor combinado", "Datas/funcoes"],
      ...eventAssignments.map((assignment) => [
        assignment.id,
        assignmentName(assignment),
        assignmentEmail(assignment),
        statusLabel(assignment.status),
        assignmentAmount(assignment).toFixed(2).replace(".", ","),
        (assignment.workDates || [])
          .map((workDate) => `${dateOnly(workDate.date)} ${workDate.functions || ""}`)
          .join(" | "),
      ]),
    ]);
  }

  function exportGeneralOperatorReport() {
    downloadCsv(`operadores-geral-${fileStamp()}.csv`, [
      ["Ficha", "Evento", "Operador", "Email", "Status", "Valor combinado", "Datas/funcoes"],
      ...organizerAssignments.map((assignment) => {
        const event =
          assignment.event ||
          state.events.find((item) => item.id === assignmentEventId(assignment)) ||
          null;

        return [
          assignment.id,
          eventName(event),
          assignmentName(assignment),
          assignmentEmail(assignment),
          statusLabel(assignment.status),
          assignmentAmount(assignment).toFixed(2).replace(".", ","),
          (assignment.workDates || [])
            .map((workDate) => `${dateOnly(workDate.date)} ${workDate.functions || ""}`)
            .join(" | "),
        ];
      }),
    ]);
  }

  if (state.loading) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando evento...
        </section>
      </main>
    );
  }

  if (state.error || !selectedEvent) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-600">
            Evento indisponível
          </p>
          <h1 className="mt-3 text-3xl font-black text-rose-950">
            {state.error || "Evento não encontrado."}
          </h1>
          <Link
            href="/admin/super/organizers"
            className="mt-6 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"
          >
            Voltar para organizadores
          </Link>
        </section>
      </main>
    );
  }

  const backOrganizerId = organizerIdFromEvent(selectedEvent);

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="rounded-[34px] bg-[#020617] p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">
          Super admin • evento
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          {eventName(selectedEvent)}
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          {organizerName(organizer)} • {eventLocation(selectedEvent)} •{" "}
          {dateTime(eventStart(selectedEvent))}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Receita do evento
            </p>
            <p className="mt-3 text-3xl font-black">{money(revenue)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Pedidos pagos
            </p>
            <p className="mt-3 text-3xl font-black">{paidOrders.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Suportes Super Admin
            </p>
            <p className="mt-3 text-3xl font-black">{eventSupportTickets.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Ocupação
            </p>
            <p className="mt-3 text-3xl font-black">{occupancy}%</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("info")}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            tab === "info" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Informações
        </button>
        <button
          type="button"
          onClick={() => setTab("revenue")}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            tab === "revenue" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Receita
        </button>
        <Link
          href={`/admin/super/support?eventId=${eventId}`}
          className="rounded-2xl px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
        >
          Suporte
        </Link>
        <button
          type="button"
          onClick={() => setTab("reports")}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            tab === "reports" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Relatórios
        </button>

        <Link
          href={`/admin/super/organizers/${backOrganizerId}?tab=agenda`}
          className="ml-auto rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-600 hover:text-white"
        >
          Voltar
        </Link>
      </section>

      {tab === "info" ? (
        <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
              Informações do evento
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Dados principais
            </h2>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <InfoLine label="Nome" value={eventName(selectedEvent)} />
              <InfoLine label="Status" value={statusLabel(selectedEvent.status)} />
              <InfoLine label="Categoria" value={selectedEvent.category || "-"} />
              <InfoLine label="Organizador" value={organizerName(organizer)} />
              <InfoLine label="Data e horário" value={dateTime(eventStart(selectedEvent))} />
              <InfoLine label="Local" value={eventLocation(selectedEvent)} />
              <InfoLine label="Capacidade" value={capacity || "-"} />
              <InfoLine label="ID do evento" value={selectedEvent.id} />
            </div>
          </section>

          <aside className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Atalhos
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Ações deste evento
            </h2>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => setTab("revenue")}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-left text-sm font-black text-white"
              >
                Ver receita do evento
              </button>
              <Link
                href={`/admin/super/support?eventId=${eventId}`}
                className="rounded-2xl bg-slate-100 px-4 py-3 text-left text-sm font-black text-slate-700"
              >
                Abrir suporte estilo WhatsApp
              </Link>
              <button
                type="button"
                onClick={() => setTab("reports")}
                className="rounded-2xl bg-orange-50 px-4 py-3 text-left text-sm font-black text-orange-700 ring-1 ring-orange-200"
              >
                Abrir relatórios
              </button>
            </div>
          </aside>
        </section>
      ) : null}

      {tab === "revenue" ? (
        <section className="space-y-6">
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Receita paga" value={money(revenue)} />
            <Metric label="Pedidos pagos" value={paidOrders.length} />
            <Metric label="Cancelados" value={money(canceledAmount)} helper={`${canceledOrders.length} pedido(s)`} />
            <Metric label="Ingressos pagos" value={tickets} helper={`${capacity || 0} capacidade`} />
          </section>

          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Pedidos deste evento
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Esta receita é calculada somente com os pedidos vinculados a este evento.
            </p>

            <div className="mt-5 space-y-3">
              {eventOrders.slice(0, 16).map((order) => (
                <article key={order.id} className="rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-950">
                        {order.customerName || order.customerEmail || order.id}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {statusLabel(order.status)} • {orderTickets(order)} ingresso(s)
                      </p>
                    </div>
                    <p className="font-black text-slate-950">{money(orderAmount(order))}</p>
                  </div>
                </article>
              ))}

              {eventOrders.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  Nenhum pedido encontrado para este evento.
                </p>
              ) : null}
            </div>
          </section>
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="space-y-6">
          <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
              Relatórios
            </p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Relatórios gerais e relatórios deste evento
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Os relatórios gerais de operadores aparecem em todos os eventos. Os relatórios de evento usam somente os dados deste evento.
            </p>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <ReportCard
              tag="Evento"
              title="Resumo do evento"
              description="Dados principais, receita, pedidos, ocupação, suporte e operadores do evento."
              onClick={exportEventSummary}
            />
            <ReportCard
              tag="Evento"
              title="Pedidos do evento"
              description="Lista de pedidos vinculados a este evento com cliente, status, valor e ingressos."
              onClick={exportEventOrders}
            />
            <ReportCard
              tag="Evento"
              title="Suporte do evento"
              description="Chamados deste evento que foram encaminhados para o Super Admin."
              onClick={exportEventSupport}
            />
            <ReportCard
              tag="Evento"
              title="Operadores deste evento"
              description="Fichas e operadores vinculados especificamente a este evento."
              onClick={exportEventOperators}
            />
            <ReportCard
              tag="Geral"
              title="Operadores do organizador"
              description="Relatório geral de operadores do organizador, disponível dentro de todos os eventos."
              onClick={exportGeneralOperatorReport}
            />
          </section>
        </section>
      ) : null}
    </main>
  );
}