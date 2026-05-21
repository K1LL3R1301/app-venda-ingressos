"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SuperAdminNav from "./_components/SuperAdminNav";

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
  email?: string | null;
  status?: string | null;
};

type EventItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  status?: string | null;
  organizerId?: string | null;
  organizer?: Organizer | null;
  startDate?: string | null;
  eventDate?: string | null;
  createdAt?: string | null;
  capacity?: number | null;
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
  items?: Array<{
    quantity?: number | null;
    tickets?: Array<unknown> | null;
  }> | null;
};

type Assignment = {
  id: string;
  organizerId?: string | null;
  eventId?: string | null;
  operatorName?: string | null;
  operatorEmail?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  userName?: string | null;
  userEmail?: string | null;
};

type LoadState = {
  user: User | null;
  loading: boolean;
  error: string;
  organizers: Organizer[];
  events: EventItem[];
  orders: OrderItem[];
  assignments: Assignment[];
};

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

function organizerName(organizer?: Organizer | null) {
  return organizer?.tradeName || organizer?.legalName || organizer?.email || organizer?.id || "Organizador";
}

function eventName(event?: EventItem | null) {
  return event?.name || event?.title || event?.slug || event?.id || "Evento";
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
  };

  return labels[key] || status || "-";
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

function MiniRow({
  title,
  description,
  value,
  href,
}: {
  title: string;
  description: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-black text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
        </div>
        <p className="font-black text-slate-950">{value}</p>
      </div>
    </Link>
  );
}

export default function SuperOverviewPage() {
  const [state, setState] = useState<LoadState>({
    user: null,
    loading: true,
    error: "",
    organizers: [],
    events: [],
    orders: [],
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

      try {
        const [organizers, events, orders] = await Promise.all([
          get("/organizers"),
          get("/events"),
          get("/orders"),
        ]);

        let assignments: Assignment[] = [];

        try {
          assignments = await get("/operator-assignments");
        } catch {
          assignments = [];
        }

        setState({
          user,
          loading: false,
          error: "",
          organizers,
          events,
          orders,
          assignments,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          user,
          loading: false,
          error: error instanceof Error ? error.message : "Erro ao carregar Super Admin.",
        }));
      }
    }

    load();
  }, []);

  const eventById = useMemo(() => {
    const map = new Map<string, EventItem>();

    for (const event of state.events) {
      map.set(event.id, event);
    }

    return map;
  }, [state.events]);

  const organizerById = useMemo(() => {
    const map = new Map<string, Organizer>();

    for (const organizer of state.organizers) {
      map.set(organizer.id, organizer);
    }

    return map;
  }, [state.organizers]);

  const paidOrders = state.orders.filter(isPaid);
  const canceledOrders = state.orders.filter(isCanceled);
  const totalRevenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
  const totalTickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);

  const organizerRanking = useMemo(() => {
    return state.organizers
      .map((organizer) => {
        const organizerEvents = state.events.filter(
          (event) => organizerIdFromEvent(event) === organizer.id,
        );
        const eventIds = new Set(organizerEvents.map((event) => event.id));
        const organizerOrders = state.orders.filter((order) => eventIds.has(orderEventId(order)));
        const organizerPaidOrders = organizerOrders.filter(isPaid);
        const revenue = organizerPaidOrders.reduce((sum, order) => sum + orderAmount(order), 0);

        return {
          organizer,
          events: organizerEvents.length,
          revenue,
          paidOrders: organizerPaidOrders.length,
        };
      })
      .sort((first, second) => second.revenue - first.revenue);
  }, [state.organizers, state.events, state.orders]);

  const nextEvents = useMemo(() => {
    const now = Date.now();

    return state.events
      .filter((event) => {
        const value = event.startDate || event.eventDate || event.createdAt;
        if (!value) return false;
        const date = new Date(value).getTime();

        return !Number.isNaN(date) && date >= now;
      })
      .sort((first, second) => {
        const firstDate = new Date(first.startDate || first.eventDate || first.createdAt || 0).getTime();
        const secondDate = new Date(second.startDate || second.eventDate || second.createdAt || 0).getTime();

        return firstDate - secondDate;
      })
      .slice(0, 6);
  }, [state.events]);

  const recentOrders = useMemo(() => {
    return [...state.orders]
      .sort((first, second) => {
        const firstDate = new Date(first.createdAt || 0).getTime();
        const secondDate = new Date(second.createdAt || 0).getTime();

        return secondDate - firstDate;
      })
      .slice(0, 6);
  }, [state.orders]);

  if (state.loading) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando visão geral do Super Admin...
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
          Super admin
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Visão geral do site.
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          Esta é a entrada principal do Super Admin. A navegação fica simples:
          visão geral, organizadores e receita geral. O restante nasce dentro do
          contexto de cada organizador ou evento.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Organizadores
            </p>
            <p className="mt-3 text-3xl font-black">{state.organizers.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Eventos
            </p>
            <p className="mt-3 text-3xl font-black">{state.events.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Pedidos pagos
            </p>
            <p className="mt-3 text-3xl font-black">{paidOrders.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Receita geral
            </p>
            <p className="mt-3 text-3xl font-black">{money(totalRevenue)}</p>
          </div>
        </div>
      </section>

      <SuperAdminNav />

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label="Ingressos pagos" value={totalTickets} helper="Ingressos em pedidos pagos" />
        <Metric label="Pedidos cancelados" value={canceledOrders.length} helper="Cancelados ou estornados" />
        <Metric label="Operadores vinculados" value={state.assignments.length} helper="Vínculos operacionais" />
        <Metric
          label="Média por evento"
          value={state.events.length ? Math.round(totalTickets / state.events.length) : 0}
          helper="Ingressos pagos por evento"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Atalho principal
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Organizadores por receita
              </h2>
            </div>

            <Link
              href="/admin/super/organizers"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
            >
              Ver organizadores
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {organizerRanking.slice(0, 6).map((row) => (
              <MiniRow
                key={row.organizer.id}
                href={`/admin/super/organizers/${row.organizer.id}`}
                title={organizerName(row.organizer)}
                description={`${row.events} evento(s) • ${row.paidOrders} pedido(s) pago(s)`}
                value={money(row.revenue)}
              />
            ))}

            {organizerRanking.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                Nenhum organizador encontrado.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
            Próximos eventos
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Agenda geral
          </h2>

          <div className="mt-5 space-y-3">
            {nextEvents.map((event) => {
              const organizer =
                event.organizer || organizerById.get(organizerIdFromEvent(event));

              return (
                <MiniRow
                  key={event.id}
                  href={`/admin/super/events/${event.id}`}
                  title={eventName(event)}
                  description={`${organizerName(organizer)} • ${dateTime(event.startDate || event.eventDate)}`}
                  value={statusLabel(event.status)}
                />
              );
            })}

            {nextEvents.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
                Nenhum evento futuro encontrado.
              </p>
            ) : null}
          </div>
        </section>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Últimos pedidos
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">
          Movimento recente
        </h2>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {recentOrders.map((order) => {
            const event = order.event || eventById.get(orderEventId(order));
            const organizer =
              event?.organizer || organizerById.get(organizerIdFromEvent(event));

            return (
              <article key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">
                      {order.customerName || order.customerEmail || order.id}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {eventName(event)} • {organizerName(organizer)} • {statusLabel(order.status)}
                    </p>
                  </div>
                  <p className="font-black text-slate-950">{money(orderAmount(order))}</p>
                </div>
              </article>
            );
          })}

          {recentOrders.length === 0 ? (
            <p className="rounded-2xl bg-slate-50 p-5 text-sm font-bold text-slate-500">
              Nenhum pedido encontrado.
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}