"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import SuperAdminNav from "../_components/SuperAdminNav";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type User = { id?: string; name?: string; email?: string; role?: string };

type Organizer = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  createdAt?: string | null;
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
  eventId?: string | null;
  event?: EventItem | null;
  items?: Array<{ quantity?: number | null; tickets?: Array<unknown> | null }> | null;
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

function organizerName(organizer?: Organizer | null) {
  return (
    organizer?.tradeName ||
    organizer?.legalName ||
    organizer?.email ||
    organizer?.id ||
    "Organizador"
  );
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

function orderAmount(order: OrderItem) {
  return num(order.totalAmount ?? order.amount ?? order.grossAmount);
}

function orderTickets(order: OrderItem) {
  return (order.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity || 0) || Number(item.tickets?.length || 0)),
    0,
  );
}

function shortId(id?: string | null) {
  if (!id) return "-";
  return id.length > 12 ? `${id.slice(0, 8)}...${id.slice(-4)}` : id;
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
  };

  return labels[key] || status || "-";
}

function dateShort(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

export default function SuperOrganizersPage() {
  const [state, setState] = useState<LoadState>({
    user: null,
    loading: true,
    error: "",
    organizers: [],
    events: [],
    orders: [],
    assignments: [],
  });
  const [query, setQuery] = useState("");

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
          error: error instanceof Error ? error.message : "Erro ao carregar organizadores.",
        }));
      }
    }

    load();
  }, []);

  const rows = useMemo(() => {
    return state.organizers
      .map((organizer) => {
        const events = state.events.filter(
          (event) => organizerIdFromEvent(event) === organizer.id,
        );
        const eventIds = new Set(events.map((event) => event.id));
        const orders = state.orders.filter((order) => eventIds.has(orderEventId(order)));
        const paidOrders = orders.filter(isPaid);
        const revenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
        const tickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);
        const operatorCount = new Set(
          state.assignments
            .filter(
              (assignment) =>
                assignment.organizerId === organizer.id ||
                eventIds.has(String(assignment.eventId || "")),
            )
            .map(
              (assignment) =>
                assignment.operatorEmail ||
                assignment.customerEmail ||
                assignment.userEmail ||
                assignment.operatorName ||
                assignment.customerName ||
                assignment.userName ||
                assignment.id,
            ),
        ).size;

        return {
          organizer,
          events,
          orders,
          paidOrders,
          revenue,
          tickets,
          operatorCount,
        };
      })
      .filter((row) => {
        const haystack = [
          row.organizer.id,
          row.organizer.tradeName,
          row.organizer.legalName,
          row.organizer.document,
          row.organizer.email,
          row.organizer.phone,
          row.organizer.status,
        ]
          .map(norm)
          .join(" ");

        return !query || haystack.includes(norm(query));
      })
      .sort((first, second) => second.revenue - first.revenue);
  }, [state.organizers, state.events, state.orders, state.assignments, query]);

  const totals = useMemo(() => {
    return {
      organizers: rows.length,
      events: rows.reduce((sum, row) => sum + row.events.length, 0),
      operators: rows.reduce((sum, row) => sum + row.operatorCount, 0),
      revenue: rows.reduce((sum, row) => sum + row.revenue, 0),
    };
  }, [rows]);

  if (state.loading) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando organizadores...
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
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="rounded-[34px] bg-[#020617] p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">
          Super admin • organizadores
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Organizadores do site todo.
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          Entre em um organizador para ver os eventos, operadores e taxas dele. A tela de
          evento fica dentro desse caminho, com receita, relatórios e suporte do evento.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Organizadores
            </p>
            <p className="mt-3 text-3xl font-black">{totals.organizers}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Eventos
            </p>
            <p className="mt-3 text-3xl font-black">{totals.events}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Operadores
            </p>
            <p className="mt-3 text-3xl font-black">{totals.operators}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Receita paga
            </p>
            <p className="mt-3 text-3xl font-black">{money(totals.revenue)}</p>
          </div>
        </div>
      </section>

      <SuperAdminNav />

      <section className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar organizador por nome, documento, e-mail, telefone ou status..."
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
        />
      </section>

      {rows.length === 0 ? (
        <section className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-2xl font-black text-slate-950">Nenhum organizador encontrado</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Ajuste a busca para ver todos os organizadores.
          </p>
        </section>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <article
              key={row.organizer.id}
              className="overflow-hidden rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {statusLabel(row.organizer.status)}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {organizerName(row.organizer)}
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    {row.organizer.email || "Sem e-mail"} • {row.organizer.phone || "Sem telefone"}
                  </p>
                  {row.organizer.document ? (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Documento: {row.organizer.document}
                    </p>
                  ) : null}
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                  ID {shortId(row.organizer.id)}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric label="Eventos" value={row.events.length} />
                <Metric label="Pedidos pagos" value={row.paidOrders.length} />
                <Metric label="Ingressos" value={row.tickets} />
                <Metric label="Receita" value={money(row.revenue)} />
              </div>

              <div className="mt-6">
                <Link
                  href={`/admin/super/organizers/${row.organizer.id}?tab=agenda`}
                  className="inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600"
                >
                  Abrir organizador
                </Link>
              </div>

              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Próximos eventos
                </p>
                <div className="mt-3 space-y-2">
                  {row.events.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      href={`/admin/super/events/${event.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                    >
                      <span>{eventName(event)}</span>
                      <span className="text-xs text-slate-400">
                        {dateShort(event.startDate || event.eventDate)}
                      </span>
                    </Link>
                  ))}

                  {row.events.length === 0 ? (
                    <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-400">
                      Nenhum evento vinculado ainda.
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}