"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SuperAdminNav from "../_components/SuperAdminNav";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Organizer = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
};

type EventLocation = {
  venueName?: string | null;
  city?: string | null;
  state?: string | null;
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
  location?: EventLocation | null;
};

type OrderItem = {
  id: string;
  status?: string | null;
  totalAmount?: string | number | null;
  amount?: string | number | null;
  grossAmount?: string | number | null;
  eventId?: string | null;
  event?: EventItem | null;
  items?: Array<{
    quantity?: number | null;
    tickets?: Array<unknown> | null;
  }> | null;
};

type LoadState = {
  user: User | null;
  loading: boolean;
  error: string;
  events: EventItem[];
  organizers: Organizer[];
  orders: OrderItem[];
};

type Period = "ALL" | "TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM";
type ViewMode = "cards" | "list";

const paidStatuses = new Set(["PAID", "CONFIRMED", "COMPLETED", "APPROVED", "AUTHORIZED"]);

function norm(value?: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
}

function dateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventDate(event?: EventItem | null) {
  return event?.startDate || event?.eventDate || event?.createdAt || null;
}

function eventName(event?: EventItem | null) {
  return event?.name || event?.title || event?.slug || event?.id || "Evento sem nome";
}

function organizerName(organizer?: Organizer | null) {
  return organizer?.tradeName || organizer?.legalName || organizer?.email || organizer?.id || "Organizador não informado";
}

function organizerIdFromEvent(event?: EventItem | null) {
  return String(event?.organizerId || event?.organizer?.id || "");
}

function eventLocation(event: EventItem) {
  return [event.location?.venueName, event.location?.city, event.location?.state]
    .filter(Boolean)
    .join(" • ") || "Local não informado";
}

function statusLabel(status?: string | null) {
  const key = String(status || "").toUpperCase();

  const labels: Record<string, string> = {
    PUBLISHED: "Publicado",
    DRAFT: "Rascunho",
    ACTIVE: "Ativo",
    INACTIVE: "Inativo",
    CANCELED: "Cancelado",
    CANCELLED: "Cancelado",
    PAUSED: "Pausado",
  };

  return labels[key] || status || "-";
}

function statusClass(status?: string | null) {
  const key = String(status || "").toUpperCase();

  if (key === "PUBLISHED" || key === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (key === "DRAFT") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  if (key === "CANCELED" || key === "CANCELLED") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }

  return "bg-orange-50 text-orange-700 ring-orange-200";
}

function isPaid(order: OrderItem) {
  return paidStatuses.has(String(order.status || "").toUpperCase());
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

function orderEventId(order: OrderItem) {
  return String(order.event?.id || order.eventId || "");
}

function inPeriod(value: string | null | undefined, period: Period, start: string, end: string) {
  if (period === "ALL") return true;
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const from = new Date(now);

  from.setHours(0, 0, 0, 0);

  if (period === "TODAY") {
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    return date >= from && date < to;
  }

  if (period === "WEEK") {
    from.setDate(now.getDate() - 7);
    return date >= from;
  }

  if (period === "MONTH") {
    from.setDate(now.getDate() - 30);
    return date >= from;
  }

  if (period === "YEAR") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
    return date >= from;
  }

  const customFrom = start ? new Date(`${start}T00:00:00`) : null;
  const customTo = end ? new Date(`${end}T23:59:59`) : null;

  return (!customFrom || date >= customFrom) && (!customTo || date <= customTo);
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
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

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
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

function Empty() {
  return (
    <section className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">Nenhum evento encontrado</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">
        Ajuste os filtros ou limpe a busca para ver todos os eventos.
      </p>
    </section>
  );
}

export default function SuperEventsPage() {
  const [state, setState] = useState<LoadState>({
    user: null,
    loading: true,
    error: "",
    events: [],
    organizers: [],
    orders: [],
  });

  const [query, setQuery] = useState("");
  const [organizerId, setOrganizerId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [period, setPeriod] = useState<Period>("ALL");
  const [customFrom, setCustomFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [customTo, setCustomTo] = useState(dateInput(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

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

        return json?.items || json?.events || json?.orders || json?.organizers || [];
      }

      try {
        const [events, organizers, orders] = await Promise.all([
          get("/events"),
          get("/organizers"),
          get("/orders"),
        ]);

        setState({
          user,
          loading: false,
          error: "",
          events,
          organizers,
          orders,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          user,
          loading: false,
          error: error instanceof Error ? error.message : "Erro ao carregar eventos.",
        }));
      }
    }

    load();
  }, []);

  const statusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          state.events
            .map((event) => String(event.status || "").toUpperCase())
            .filter(Boolean),
        ),
      ).sort(),
    [state.events],
  );

  const organizerById = useMemo(() => {
    const map = new Map<string, Organizer>();

    for (const organizer of state.organizers) {
      map.set(organizer.id, organizer);
    }

    return map;
  }, [state.organizers]);

  const ordersByEvent = useMemo(() => {
    const map = new Map<string, OrderItem[]>();

    for (const order of state.orders) {
      const id = orderEventId(order);

      if (!id) continue;

      if (!map.has(id)) {
        map.set(id, []);
      }

      map.get(id)?.push(order);
    }

    return map;
  }, [state.orders]);

  const filteredEvents = useMemo(() => {
    return state.events
      .filter((event) => {
        const eventOrganizerId = organizerIdFromEvent(event);

        if (organizerId !== "ALL" && eventOrganizerId !== organizerId) {
          return false;
        }

        if (status !== "ALL" && String(event.status || "").toUpperCase() !== status) {
          return false;
        }

        if (!inPeriod(eventDate(event), period, customFrom, customTo)) {
          return false;
        }

        const organizer = event.organizer || organizerById.get(eventOrganizerId);

        const haystack = [
          event.id,
          event.name,
          event.title,
          event.slug,
          event.category,
          event.status,
          organizerName(organizer),
          event.location?.venueName,
          event.location?.city,
          event.location?.state,
        ]
          .map(norm)
          .join(" ");

        return !query || haystack.includes(norm(query));
      })
      .sort((first, second) => {
        const firstDate = new Date(eventDate(first) || 0).getTime();
        const secondDate = new Date(eventDate(second) || 0).getTime();

        return secondDate - firstDate;
      });
  }, [
    state.events,
    organizerId,
    status,
    period,
    customFrom,
    customTo,
    organizerById,
    query,
  ]);

  const filteredStats = useMemo(() => {
    const filteredEventIds = new Set(filteredEvents.map((event) => event.id));
    const filteredOrders = state.orders.filter((order) => filteredEventIds.has(orderEventId(order)));
    const paidOrders = filteredOrders.filter(isPaid);
    const totalRevenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
    const totalTickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);
    const published = filteredEvents.filter((event) =>
      ["PUBLISHED", "ACTIVE"].includes(String(event.status || "").toUpperCase()),
    ).length;
    const draft = filteredEvents.filter(
      (event) => String(event.status || "").toUpperCase() === "DRAFT",
    ).length;
    const capacity = filteredEvents.reduce((sum, event) => sum + Number(event.capacity || 0), 0);

    return {
      filteredOrders,
      paidOrders,
      totalRevenue,
      totalTickets,
      published,
      draft,
      capacity,
    };
  }, [filteredEvents, state.orders]);

  function resetFilters() {
    setQuery("");
    setOrganizerId("ALL");
    setStatus("ALL");
    setPeriod("ALL");
    setCustomFrom(`${new Date().getFullYear()}-01-01`);
    setCustomTo(dateInput(new Date()));
  }

  function exportEvents() {
    downloadCsv(`super-eventos-${fileStamp()}.csv`, [
      [
        "ID",
        "Evento",
        "Organizador",
        "Status",
        "Categoria",
        "Data",
        "Local",
        "Capacidade",
        "Pedidos pagos",
        "Ingressos pagos",
        "Receita paga",
      ],
      ...filteredEvents.map((event) => {
        const organizer = event.organizer || organizerById.get(organizerIdFromEvent(event));
        const orders = ordersByEvent.get(event.id) || [];
        const paidOrders = orders.filter(isPaid);
        const revenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
        const tickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);

        return [
          event.id,
          eventName(event),
          organizerName(organizer),
          statusLabel(event.status),
          event.category || "",
          dateTime(eventDate(event)),
          eventLocation(event),
          event.capacity || 0,
          paidOrders.length,
          tickets,
          revenue.toFixed(2).replace(".", ","),
        ];
      }),
    ]);
  }

  if (state.loading) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando eventos do Super Admin...
        </section>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-600">
            Acesso ou carregamento bloqueado
          </p>
          <h1 className="mt-3 text-3xl font-black text-rose-950">{state.error}</h1>
          <Link
            href="/admin/dashboard"
            className="mt-6 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"
          >
            Voltar ao painel
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="rounded-[34px] bg-[#020617] p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">
          Super admin • eventos
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Eventos com busca, filtros e visão financeira.
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          Acompanhe todos os eventos da plataforma, filtre por produtor, status ou período
          e veja pedidos, ingressos e receita em uma única tela.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Eventos no filtro
            </p>
            <p className="mt-3 text-3xl font-black">{filteredEvents.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Receita paga
            </p>
            <p className="mt-3 text-3xl font-black">
              {money(filteredStats.totalRevenue)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Ingressos pagos
            </p>
            <p className="mt-3 text-3xl font-black">{filteredStats.totalTickets}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Capacidade
            </p>
            <p className="mt-3 text-3xl font-black">{filteredStats.capacity}</p>
          </div>
        </div>
      </section>

      <SuperAdminNav />

      <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por evento, organizador, cidade, status ou categoria..."
            className="h-12 min-w-[260px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
          />

          <select
            value={organizerId}
            onChange={(event) => setOrganizerId(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
          >
            <option value="ALL">Todos os organizadores</option>
            {state.organizers.map((organizer) => (
              <option key={organizer.id} value={organizer.id}>
                {organizerName(organizer)}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
          >
            <option value="ALL">Todos os status</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {statusLabel(option)}
              </option>
            ))}
          </select>

          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value as Period)}
            className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
          >
            <option value="ALL">Todo período</option>
            <option value="TODAY">Hoje</option>
            <option value="WEEK">Últimos 7 dias</option>
            <option value="MONTH">Últimos 30 dias</option>
            <option value="YEAR">Este ano</option>
            <option value="CUSTOM">Personalizado</option>
          </select>

          {period === "CUSTOM" ? (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
              />
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
              />
            </>
          ) : null}

          <button
            type="button"
            onClick={resetFilters}
            className="h-12 rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-700"
          >
            Limpar
          </button>

          <button
            type="button"
            onClick={exportEvents}
            className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Publicados / ativos"
          value={filteredStats.published}
          helper="Eventos disponíveis ou ativos"
        />
        <Metric
          label="Rascunhos"
          value={filteredStats.draft}
          helper="Eventos ainda em preparo"
        />
        <Metric
          label="Pedidos pagos"
          value={filteredStats.paidOrders.length}
          helper="Pedidos PAID no filtro"
        />
        <Metric
          label="Média por evento"
          value={
            filteredEvents.length
              ? Math.round(filteredStats.totalTickets / filteredEvents.length)
              : 0
          }
          helper="Ingressos pagos por evento"
        />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">Lista de eventos</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {filteredEvents.length} resultado(s) no filtro atual.
          </p>
        </div>

        <div className="flex rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              viewMode === "cards" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-xl px-4 py-2 text-sm font-black ${
              viewMode === "list" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
            }`}
          >
            Lista
          </button>
        </div>
      </section>

      {filteredEvents.length === 0 ? (
        <Empty />
      ) : viewMode === "cards" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredEvents.map((event) => {
            const organizer = event.organizer || organizerById.get(organizerIdFromEvent(event));
            const orders = ordersByEvent.get(event.id) || [];
            const paidOrders = orders.filter(isPaid);
            const revenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
            const tickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);

            return (
              <article
                key={event.id}
                className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {organizerName(organizer)}
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">
                      {eventName(event)}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {eventLocation(event)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-2 text-xs font-black ring-1 ${statusClass(
                      event.status,
                    )}`}
                  >
                    {statusLabel(event.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Data
                    </p>
                    <p className="mt-2 text-sm font-black text-slate-950">
                      {dateTime(eventDate(event))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Pedidos
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {paidOrders.length}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Ingressos
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">{tickets}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Receita
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {money(revenue)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/super/orders?eventId=${event.id}`}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
                  >
                    Ver pedidos
                  </Link>
                  <Link
                    href={`/admin/super/finance?eventId=${event.id}`}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Ver financeiro
                  </Link>
                  <Link
                    href={`/admin/super/reports?eventId=${event.id}`}
                    className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 ring-1 ring-orange-200"
                  >
                    Relatório
                  </Link>
                  <Link
                    href={`/admin/super/support?eventId=${event.id}`}
                    className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700"
                  >
                    Suporte
                  </Link>
                </div>

                <p className="mt-4 text-xs font-semibold text-slate-400">
                  ID: {shortId(event.id)}
                </p>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.4fr_1fr_180px_130px_140px] gap-3 border-b bg-slate-50 p-4 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            <span>Evento</span>
            <span>Organizador</span>
            <span>Data</span>
            <span>Status</span>
            <span className="text-right">Receita</span>
          </div>

          {filteredEvents.map((event) => {
            const organizer = event.organizer || organizerById.get(organizerIdFromEvent(event));
            const orders = ordersByEvent.get(event.id) || [];
            const revenue = orders.filter(isPaid).reduce((sum, order) => sum + orderAmount(order), 0);

            return (
              <article
                key={event.id}
                className="grid grid-cols-[1.4fr_1fr_180px_130px_140px] gap-3 border-b p-4 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-black text-slate-950">{eventName(event)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {eventLocation(event)}
                  </p>
                </div>
                <span className="font-semibold text-slate-600">
                  {organizerName(organizer)}
                </span>
                <span className="font-semibold text-slate-600">
                  {dateTime(eventDate(event))}
                </span>
                <span className={`w-fit rounded-full px-3 py-2 text-xs font-black ring-1 ${statusClass(event.status)}`}>
                  {statusLabel(event.status)}
                </span>
                <span className="text-right font-black text-slate-950">
                  {money(revenue)}
                </span>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}