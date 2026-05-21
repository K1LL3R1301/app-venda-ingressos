"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  document?: string | null;
  email?: string | null;
  phone?: string | null;
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
  endDate?: string | null;
  createdAt?: string | null;
  capacity?: number | null;
  location?: { venueName?: string | null; city?: string | null; state?: string | null } | null;
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
  workDates?: Array<{ date?: string | null; amount?: string | number | null; functions?: string | null; status?: string | null }> | null;
};

type FeeConfig = {
  organizerId: string;
  percent: number;
  fixedCents: number;
  notes: string;
  updatedAt: string;
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

type Tab = "agenda" | "operators" | "fees";
type CalendarMode = "month" | "week";

const paidStatuses = new Set(["PAID", "CONFIRMED", "COMPLETED", "APPROVED", "AUTHORIZED"]);
const weekdayLabels = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];

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

function timeLabel(value?: string | null) {
  const date = safeDate(value);

  if (!date) return "--:--";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

function weekLabel(date: Date) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);

  return `${start.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })} - ${end.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const current = startOfDay(date);
  current.setDate(current.getDate() - current.getDay());

  return current;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);

  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);

  return next;
}

function dayKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function eventDayKey(event: EventItem) {
  const date = safeDate(eventStart(event));

  return date ? dayKey(date) : "";
}

function monthGridDays(baseDate: Date) {
  const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const start = startOfWeek(first);

  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function weekGridDays(baseDate: Date) {
  const start = startOfWeek(baseDate);

  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function isSameDay(first: Date, second: Date) {
  return dayKey(first) === dayKey(second);
}

function eventLocation(event: EventItem) {
  return [event.location?.venueName, event.location?.city, event.location?.state]
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
    ACCEPTED: "Aceito",
    ASSIGNED: "Atribuído",
    PENDING: "Pendente",
  };

  return labels[key] || status || "-";
}

function eventPillClass(index: number) {
  const classes = [
    "bg-emerald-500 text-white",
    "bg-blue-500 text-white",
    "bg-violet-500 text-white",
    "bg-orange-500 text-white",
    "bg-rose-500 text-white",
    "bg-cyan-500 text-white",
  ];

  return classes[index % classes.length];
}

function readFees(): FeeConfig[] {
  try {
    const raw = localStorage.getItem("astro_super_admin_fee_configs");
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFees(configs: FeeConfig[]) {
  localStorage.setItem("astro_super_admin_fee_configs", JSON.stringify(configs));
}

function feeOf(configs: FeeConfig[], organizerId: string): FeeConfig {
  return (
    configs.find((config) => config.organizerId === organizerId) || {
      organizerId,
      percent: 10,
      fixedCents: 0,
      notes: "",
      updatedAt: "",
    }
  );
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

function OrganizerAgenda({
  organizerEvents,
}: {
  organizerEvents: EventItem[];
}) {
  const firstEventDate = safeDate(eventStart(organizerEvents[0])) || new Date();
  const [calendarDate, setCalendarDate] = useState(firstEventDate);
  const [mode, setMode] = useState<CalendarMode>("month");

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();

    for (const event of organizerEvents) {
      const key = eventDayKey(event);

      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)?.push(event);
    }

    for (const [, events] of map) {
      events.sort((first, second) => {
        const firstDate = safeDate(eventStart(first))?.getTime() || 0;
        const secondDate = safeDate(eventStart(second))?.getTime() || 0;

        return firstDate - secondDate;
      });
    }

    return map;
  }, [organizerEvents]);

  useEffect(() => {
    if (organizerEvents.length > 0) {
      setCalendarDate(safeDate(eventStart(organizerEvents[0])) || new Date());
    }
  }, [organizerEvents]);

  const days = mode === "month" ? monthGridDays(calendarDate) : weekGridDays(calendarDate);
  const today = new Date();
  const title = mode === "month" ? monthLabel(calendarDate) : weekLabel(calendarDate);

  function previous() {
    setCalendarDate((current) => (mode === "month" ? addMonths(current, -1) : addDays(current, -7)));
  }

  function next() {
    setCalendarDate((current) => (mode === "month" ? addMonths(current, 1) : addDays(current, 7)));
  }

  if (organizerEvents.length === 0) {
    return (
      <section className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <h2 className="text-2xl font-black text-slate-950">Nenhum evento na agenda</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Quando esse organizador tiver eventos, eles aparecem no calendário.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
            Agenda do organizador
          </p>
          <h2 className="mt-2 text-3xl font-black capitalize text-slate-950">{title}</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Eventos desse organizador aparecem no calendário pelo dia e horário real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCalendarDate(new Date())}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700"
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={previous}
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700"
          >
            ›
          </button>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as CalendarMode)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 outline-none"
          >
            <option value="month">Mês</option>
            <option value="week">Semana</option>
          </select>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[26px] border border-slate-200">
        <div className="grid grid-cols-7 bg-slate-50">
          {weekdayLabels.map((weekday) => (
            <div
              key={weekday}
              className="border-r border-slate-200 px-3 py-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 last:border-r-0"
            >
              {weekday}
            </div>
          ))}
        </div>

        <div className={`grid grid-cols-7 ${mode === "month" ? "" : "min-h-[420px]"}`}>
          {days.map((day) => {
            const key = dayKey(day);
            const dayEvents = eventsByDay.get(key) || [];
            const outsideMonth = mode === "month" && day.getMonth() !== calendarDate.getMonth();

            return (
              <div
                key={key}
                className={`min-h-[132px] border-r border-t border-slate-200 p-3 last:border-r-0 ${
                  outsideMonth ? "bg-slate-50/70 text-slate-300" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${
                      isSameDay(day, today) ? "bg-slate-100 text-slate-950" : "text-slate-600"
                    }`}
                  >
                    {day.getDate()}
                  </span>

                  {dayEvents.length > 3 ? (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">
                      +{dayEvents.length - 3}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-1.5">
                  {dayEvents.slice(0, mode === "month" ? 3 : 8).map((event, index) => (
                    <Link
                      key={event.id}
                      href={`/admin/super/events/${event.id}`}
                      title={eventName(event)}
                      className={`block truncate rounded-lg px-2 py-1.5 text-[11px] font-black shadow-sm ${eventPillClass(index)}`}
                    >
                      {timeLabel(eventStart(event))} {eventName(event)}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function SuperOrganizerDetailPage() {
  const params = useParams<{ organizerId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const organizerId = String(params.organizerId || "");
  const requestedTab = String(searchParams.get("tab") || "agenda");
  const tab: Tab =
    requestedTab === "events"
      ? "agenda"
      : ["agenda", "operators", "fees"].includes(requestedTab)
        ? (requestedTab as Tab)
        : "agenda";

  const [state, setState] = useState<LoadState>({
    user: null,
    loading: true,
    error: "",
    organizers: [],
    events: [],
    orders: [],
    assignments: [],
  });
  const [fee, setFee] = useState<FeeConfig>({
    organizerId,
    percent: 10,
    fixedCents: 0,
    notes: "",
    updatedAt: "",
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
          error: error instanceof Error ? error.message : "Erro ao carregar organizador.",
        }));
      }
    }

    load();
  }, []);

  useEffect(() => {
    const configs = readFees();
    setFee(feeOf(configs, organizerId));
  }, [organizerId]);

  const organizer = useMemo(
    () => state.organizers.find((item) => item.id === organizerId) || null,
    [state.organizers, organizerId],
  );

  const organizerEvents = useMemo(
    () =>
      state.events
        .filter((event) => organizerIdFromEvent(event) === organizerId)
        .sort((first, second) => {
          const firstDate = safeDate(eventStart(first))?.getTime() || 0;
          const secondDate = safeDate(eventStart(second))?.getTime() || 0;

          return firstDate - secondDate;
        }),
    [state.events, organizerId],
  );

  const eventIds = useMemo(
    () => new Set(organizerEvents.map((event) => event.id)),
    [organizerEvents],
  );

  const organizerOrders = useMemo(
    () => state.orders.filter((order) => eventIds.has(orderEventId(order))),
    [state.orders, eventIds],
  );

  const organizerAssignments = useMemo(
    () =>
      state.assignments.filter(
        (assignment) =>
          assignment.organizerId === organizerId ||
          eventIds.has(String(assignment.eventId || "")),
      ),
    [state.assignments, organizerId, eventIds],
  );

  const paidOrders = organizerOrders.filter(isPaid);
  const revenue = paidOrders.reduce((sum, order) => sum + orderAmount(order), 0);
  const tickets = paidOrders.reduce((sum, order) => sum + orderTickets(order), 0);

  function setTab(nextTab: Tab) {
    router.push(`/admin/super/organizers/${organizerId}?tab=${nextTab}`);
  }

  function saveFee() {
    const configs = readFees();
    const nextFee = {
      ...fee,
      organizerId,
      percent: Number(fee.percent || 0),
      fixedCents: Number(fee.fixedCents || 0),
      updatedAt: new Date().toISOString(),
    };
    const nextConfigs = [
      ...configs.filter((config) => config.organizerId !== organizerId),
      nextFee,
    ];

    saveFees(nextConfigs);
    setFee(nextFee);
    alert("Taxa do organizador salva localmente. Depois podemos ligar isso no backend.");
  }

  if (state.loading) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando organizador...
        </section>
      </main>
    );
  }

  if (state.error || !organizer) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-600">
            Organizador indisponível
          </p>
          <h1 className="mt-3 text-3xl font-black text-rose-950">
            {state.error || "Organizador não encontrado."}
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

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="rounded-[34px] bg-[#020617] p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">
          Super admin • organizador
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          {organizerName(organizer)}
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          A agenda mostra os eventos desse organizador em calendário real. Operadores
          e taxas continuam no mesmo contexto.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Eventos
            </p>
            <p className="mt-3 text-3xl font-black">{organizerEvents.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Operadores
            </p>
            <p className="mt-3 text-3xl font-black">{organizerAssignments.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Receita paga
            </p>
            <p className="mt-3 text-3xl font-black">{money(revenue)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Ingressos
            </p>
            <p className="mt-3 text-3xl font-black">{tickets}</p>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <button
          type="button"
          onClick={() => setTab("agenda")}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            tab === "agenda" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Agenda
        </button>
        <button
          type="button"
          onClick={() => setTab("operators")}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            tab === "operators" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Operadores
        </button>
        <button
          type="button"
          onClick={() => setTab("fees")}
          className={`rounded-2xl px-4 py-3 text-sm font-black ${
            tab === "fees" ? "bg-slate-950 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Taxas
        </button>

        <Link
          href="/admin/super/organizers"
          className="ml-auto rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-600 hover:text-white"
        >
          Voltar
        </Link>
      </section>

      {tab === "agenda" ? (
        <OrganizerAgenda organizerEvents={organizerEvents} />
      ) : null}

      {tab === "operators" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {organizerAssignments.map((assignment) => (
            <article
              key={assignment.id}
              className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                {statusLabel(assignment.status)}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {assignment.operatorName ||
                  assignment.customerName ||
                  assignment.userName ||
                  assignment.operatorEmail ||
                  assignment.customerEmail ||
                  "Operador"}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {assignment.operatorEmail ||
                  assignment.customerEmail ||
                  assignment.userEmail ||
                  "Sem e-mail"}
              </p>
              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                Evento: {eventName(assignment.event || organizerEvents.find((event) => event.id === assignment.eventId))}
              </p>
            </article>
          ))}

          {organizerAssignments.length === 0 ? (
            <section className="rounded-[30px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm lg:col-span-2">
              <h2 className="text-2xl font-black text-slate-950">Nenhum operador vinculado</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Quando houver operadores vinculados aos eventos desse organizador, eles aparecem aqui.
              </p>
            </section>
          ) : null}
        </section>
      ) : null}

      {tab === "fees" ? (
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
            Taxa do organizador
          </p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">
            Configurar taxa cobrada nos eventos desse organizador
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
            Por enquanto essa taxa fica salva localmente para validar a experiência da tela.
            Depois conectamos no backend para virar regra real de cobrança por organizador/evento.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Taxa percentual (%)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={fee.percent}
                onChange={(event) =>
                  setFee((current) => ({ ...current, percent: Number(event.target.value) }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-black text-slate-700">Taxa fixa em centavos</span>
              <input
                type="number"
                min="0"
                step="1"
                value={fee.fixedCents}
                onChange={(event) =>
                  setFee((current) => ({ ...current, fixedCents: Number(event.target.value) }))
                }
                className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <label className="mt-4 block space-y-2">
            <span className="text-sm font-black text-slate-700">Observações</span>
            <textarea
              value={fee.notes}
              onChange={(event) =>
                setFee((current) => ({ ...current, notes: event.target.value }))
              }
              rows={4}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none"
              placeholder="Ex: taxa promocional, contrato especial, regra do organizador..."
            />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveFee}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
            >
              Salvar taxa
            </button>
            <Link
              href="/admin/super/finance"
              className="rounded-2xl bg-orange-50 px-5 py-3 text-sm font-black text-orange-700 ring-1 ring-orange-200"
            >
              Ver receita geral
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}