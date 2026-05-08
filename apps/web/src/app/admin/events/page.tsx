"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type EventMedia = {
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  thumbnailUrl?: string | null;
  mobileBannerUrl?: string | null;
  sectorMapImageUrl?: string | null;
  gallery?: string[] | null;
};

type Organizer = {
  id?: string;
  tradeName?: string | null;
  legalName?: string | null;
  name?: string | null;
};

type EventLocation = {
  venueName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  reference?: string | null;
  mapUrl?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  mode?: string | null;
};

type EventSession = {
  id?: string;
  name?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  status?: string | null;
  displayOrder?: number | null;
};

type VenueSector = {
  id?: string;
  name?: string | null;
  type?: string | null;
  occupancyMode?: string | null;
  capacity?: number | null;
  color?: string | null;
  gateName?: string | null;
};

type TicketType = {
  id?: string;
  name?: string | null;
  lotLabel?: string | null;
  quantity?: number | null;
  price?: string | number | null;
  status?: string | null;
  isHidden?: boolean | null;
};

type EventItem = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  status?: string | null;
  visibility?: string | null;
  category?: string | { name?: string | null } | null;
  categoryName?: string | null;
  occupancyMode?: string | null;
  multiSession?: boolean | null;
  allowSeatMap?: boolean | null;
  allowTableMap?: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  organizer?: Organizer | null;
  media?: EventMedia | null;
  location?: EventLocation | null;
  sessions?: EventSession[] | null;
  sectors?: VenueSector[] | null;
  ticketTypes?: TicketType[] | null;
};

type DateFilter = "all" | "upcoming" | "today" | "week" | "month" | "past";
type StatusFilter =
  | "all"
  | "published"
  | "draft"
  | "active"
  | "finished"
  | "canceled";
type SortFilter =
  | "created_desc"
  | "date_asc"
  | "date_desc"
  | "name_asc"
  | "capacity_desc";
type ViewMode = "cards" | "table";

type ApiState = {
  loading: boolean;
  error: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "upcoming", label: "Próximos" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "7 dias" },
  { value: "month", label: "30 dias" },
  { value: "past", label: "Passados" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "published", label: "Publicado" },
  { value: "active", label: "Ativo" },
  { value: "draft", label: "Rascunho" },
  { value: "finished", label: "Finalizado" },
  { value: "canceled", label: "Cancelado" },
];

function normalizeText(value?: string | number | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeUrl(value?: string | null) {
  const text = String(value || "").trim();

  if (!text) return "";

  if (/^https?:\/\//i.test(text) || text.startsWith("/")) {
    return text;
  }

  if (/^(localhost|127\.0\.0\.1|www\.)/i.test(text)) {
    return `http://${text}`;
  }

  return text;
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value || "").replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function formatInteger(value?: number | null) {
  return Number(value || 0).toLocaleString("pt-BR");
}

function formatDate(
  value?: string | null,
  options?: Intl.DateTimeFormatOptions,
) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}


function getEventSessions(event: EventItem) {
  return Array.isArray(event.sessions) ? event.sessions : [];
}

function getEventSectors(event: EventItem) {
  return Array.isArray(event.sectors) ? event.sectors : [];
}

function getEventTicketTypes(event: EventItem) {
  return Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
}

function getEventStartValue(event: EventItem) {
  const firstSession = getEventSessions(event).find(
    (session) => session.startsAt,
  );

  return firstSession?.startsAt || event.startDate || event.eventDate || "";
}

function getEventEndValue(event: EventItem) {
  const sessions = getEventSessions(event).filter(
    (session) => session.startsAt,
  );
  const lastSession = sessions[sessions.length - 1];

  return (
    lastSession?.endsAt ||
    lastSession?.startsAt ||
    event.endDate ||
    event.startDate ||
    event.eventDate ||
    ""
  );
}

function getEventDateObject(event: EventItem) {
  const value = getEventStartValue(event);
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventEndDateObject(event: EventItem) {
  const value = getEventEndValue(event);
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getDaysUntil(event: EventItem) {
  const date = getEventDateObject(event);

  if (!date) return null;

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const eventDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diff = Math.ceil((eventDay - today) / 86400000);

  return diff;
}

function getEventImage(event: EventItem) {
  const gallery = Array.isArray(event.media?.gallery)
    ? event.media?.gallery
    : [];

  return normalizeUrl(
    event.media?.bannerImageUrl ||
      event.media?.coverImageUrl ||
      event.media?.thumbnailUrl ||
      event.media?.mobileBannerUrl ||
      gallery?.[0] ||
      "",
  );
}

function categoryLabel(value?: EventItem["category"] | string | null) {
  const raw = typeof value === "object" ? value?.name : value;
  const normalized = String(raw || "").toUpperCase();

  const labels: Record<string, string> = {
    FESTAS_SHOWS: "Festas e shows",
    TEATROS_ESPETACULOS: "Teatros e espetáculos",
    STAND_UP_COMEDY: "Stand-up comedy",
    CONGRESSOS: "Congressos e palestras",
    GASTRONOMIA: "Gastronomia",
    ESPORTES: "Esportes",
    PASSEIOS_TOURS: "Passeios e tours",
    INFANTIL: "Infantil",
  };

  return labels[normalized] || String(raw || "Evento");
}

function occupancyLabel(value?: string | null) {
  const normalized = String(value || "").toUpperCase();

  const labels: Record<string, string> = {
    GENERAL_ADMISSION: "Evento aberto",
    RESERVED_SEATING: "Cadeiras numeradas",
    RESERVED_TABLE: "Mesas",
    MIXED: "Modelo misto",
  };

  return labels[normalized] || String(value || "Modelo não informado");
}

function getLocationLabel(event: EventItem) {
  const location = event.location;

  if (!location) return "Local a confirmar";

  const place = location.venueName || location.addressLine1;
  const cityState = [location.city, location.state].filter(Boolean).join(" - ");

  if (place && cityState) return `${place}, ${cityState}`;
  if (place) return place;
  if (cityState) return cityState;

  return "Local a confirmar";
}

function getOrganizerLabel(event: EventItem) {
  return (
    event.organizer?.tradeName ||
    event.organizer?.legalName ||
    event.organizer?.name ||
    "Produtora não informada"
  );
}

function getStatusLabel(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    DRAFT: "Rascunho",
    PUBLISHED: "Publicado",
    CANCELED: "Cancelado",
    CANCELLED: "Cancelado",
    FINISHED: "Finalizado",
    SOLD_OUT: "Esgotado",
    PAUSED: "Pausado",
  };

  return labels[normalized] || status || "Publicado";
}

function getVisibilityLabel(visibility?: string | null) {
  const normalized = String(visibility || "").toUpperCase();

  const labels: Record<string, string> = {
    PUBLIC: "Público",
    PRIVATE: "Privado",
    UNLISTED: "Não listado",
  };

  return labels[normalized] || visibility || "Público";
}

function getStatusClasses(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  if (["ACTIVE", "PUBLISHED", ""].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "DRAFT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (["FINISHED", "PAUSED"].includes(normalized)) {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (["CANCELED", "CANCELLED", "SOLD_OUT"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getPublicEventHref(event: EventItem) {
  return `/events/${event.id}`;
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function eventMatchesDateFilter(event: EventItem, filter: DateFilter) {
  if (filter === "all") return true;

  const startDate = getEventDateObject(event);
  const endDate = getEventEndDateObject(event) || startDate;

  if (!startDate) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekLimit = new Date(todayStart);
  weekLimit.setDate(weekLimit.getDate() + 7);

  const monthLimit = new Date(todayStart);
  monthLimit.setDate(monthLimit.getDate() + 30);

  if (filter === "today") {
    return (
      isSameDay(startDate, now) || Boolean(endDate && isSameDay(endDate, now))
    );
  }

  if (filter === "upcoming") return endDate >= todayStart;
  if (filter === "week")
    return startDate >= todayStart && startDate <= weekLimit;
  if (filter === "month")
    return startDate >= todayStart && startDate <= monthLimit;
  if (filter === "past") return endDate < todayStart;

  return true;
}

function eventMatchesStatusFilter(event: EventItem, filter: StatusFilter) {
  if (filter === "all") return true;

  const status = String(event.status || "PUBLISHED").toUpperCase();

  if (filter === "published") return status === "PUBLISHED";
  if (filter === "active") return status === "ACTIVE" || status === "PUBLISHED";
  if (filter === "draft") return status === "DRAFT";
  if (filter === "finished") return status === "FINISHED";
  if (filter === "canceled")
    return status === "CANCELED" || status === "CANCELLED";

  return true;
}

function sortEvents(events: EventItem[], sort: SortFilter) {
  const copy = [...events];

  if (sort === "name_asc") {
    return copy.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"),
    );
  }

  if (sort === "capacity_desc") {
    return copy.sort((a, b) => toNumber(b.capacity) - toNumber(a.capacity));
  }

  if (sort === "date_desc") {
    return copy.sort((a, b) => {
      const first = getEventDateObject(a)?.getTime() || 0;
      const second = getEventDateObject(b)?.getTime() || 0;

      return second - first;
    });
  }

  if (sort === "date_asc") {
    return copy.sort((a, b) => {
      const first = getEventDateObject(a)?.getTime() || Number.MAX_SAFE_INTEGER;
      const second =
        getEventDateObject(b)?.getTime() || Number.MAX_SAFE_INTEGER;

      return first - second;
    });
  }

  return copy.sort((a, b) => {
    const first = new Date(a.createdAt || "").getTime() || 0;
    const second = new Date(b.createdAt || "").getTime() || 0;

    return second - first;
  });
}

function getEventSummary(event: EventItem) {
  const sessions = getEventSessions(event);
  const sectors = getEventSectors(event);
  const tickets = getEventTicketTypes(event);
  const totalTickets = tickets.reduce(
    (sum, ticket) => sum + toNumber(ticket.quantity),
    0,
  );

  return {
    sessions: sessions.length,
    sectors: sectors.length,
    ticketTypes: tickets.length,
    totalTickets,
    capacity: toNumber(event.capacity),
  };
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      {helper ? (
        <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>
      ) : null}
    </div>
  );
}

function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${className}`}
    >
      {children}
    </span>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const image = getEventImage(event);
  const summary = getEventSummary(event);
  const daysUntil = getDaysUntil(event);
  const sessions = getEventSessions(event);
  const sectors = getEventSectors(event);

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
      <div className="relative h-48 overflow-hidden bg-slate-950">
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.45),transparent_34%),linear-gradient(135deg,#020617,#0f172a,#075985)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className="border-white/20 bg-white text-slate-950">
            {categoryLabel(event.category || event.categoryName)}
          </Badge>
          <Badge className={getStatusClasses(event.status)}>
            {getStatusLabel(event.status)}
          </Badge>
          <Badge className="border-white/20 bg-white/15 text-white backdrop-blur">
            {getVisibilityLabel(event.visibility)}
          </Badge>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200">
            {formatDate(getEventStartValue(event))}
          </p>
          <h2 className="mt-2 line-clamp-2 text-2xl font-black leading-tight text-white">
            {event.name || "Evento sem nome"}
          </h2>
        </div>
      </div>

      <div className="p-5">
        <p className="line-clamp-2 min-h-[48px] text-sm font-semibold leading-6 text-slate-500">
          {event.shortDescription ||
            event.description ||
            "Sem descrição cadastrada."}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-3 md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Local
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-black text-slate-800">
              {getLocationLabel(event)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Capacidade
            </p>
            <p className="mt-1 text-sm font-black text-slate-800">
              {formatInteger(summary.capacity)}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Quando
            </p>
            <p className="mt-1 text-sm font-black text-slate-800">
              {daysUntil === null
                ? "-"
                : daysUntil < 0
                  ? "Já passou"
                  : daysUntil === 0
                    ? "Hoje"
                    : `${daysUntil} dia(s)`}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Datas
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {summary.sessions}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Setores
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {summary.sectors}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Ingressos
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {summary.ticketTypes > 0 ? summary.ticketTypes : "-"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${event.id}`}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
          >
            Abrir
          </Link>

          <Link
            href={getPublicEventHref(event)}
            target="_blank"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Página pública
          </Link>
        </div>
      </div>
    </article>
  );
}

function EventsTable({ events }: { events: EventItem[] }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-950 text-white">
            <tr>
              <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em]">
                Evento
              </th>
              <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em]">
                Data
              </th>
              <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em]">
                Operação
              </th>
              <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em]">
                Status
              </th>
              <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.16em]">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {events.map((event) => {
              const summary = getEventSummary(event);

              return (
                <tr
                  key={event.id}
                  className="align-top transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-950">
                      {event.name || "Evento sem nome"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {categoryLabel(event.category || event.categoryName)} •{" "}
                      {getOrganizerLabel(event)}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs font-semibold text-slate-400">
                      {getLocationLabel(event)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-900">
                      {formatDate(getEventStartValue(event))}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {getDaysUntil(event) === null
                        ? "-"
                        : `${getDaysUntil(event)} dia(s)`}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="grid min-w-[220px] grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Datas
                        </p>
                        <p className="font-black text-slate-950">
                          {summary.sessions}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Setores
                        </p>
                        <p className="font-black text-slate-950">
                          {summary.sectors}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Cap.
                        </p>
                        <p className="font-black text-slate-950">
                          {formatInteger(summary.capacity)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <Badge className={getStatusClasses(event.status)}>
                        {getStatusLabel(event.status)}
                      </Badge>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                        {getVisibilityLabel(event.visibility)}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex min-w-[210px] flex-wrap gap-2">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
                      >
                        Abrir
                      </Link>

                      <Link
                        href={getPublicEventHref(event)}
                        target="_blank"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        Página pública
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [apiState, setApiState] = useState<ApiState>({
    loading: true,
    error: "",
  });
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("created_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  async function loadEvents() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    setApiState({ loading: true, error: "" });

    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }

        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Erro ao carregar eventos.",
        );
      }

      setEvents(Array.isArray(result) ? result : []);
      setApiState({ loading: false, error: "" });
    } catch (error) {
      console.error(error);
      setApiState({
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro ao conectar com a API.",
      });
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = normalizeText(search);

    const filtered = events.filter((event) => {
      const summary = getEventSummary(event);
      const searchableContent = normalizeText(
        [
          event.id,
          event.name,
          event.slug,
          event.description,
          event.shortDescription,
          getOrganizerLabel(event),
          getLocationLabel(event),
          categoryLabel(event.category || event.categoryName),
          occupancyLabel(event.occupancyMode),
          getStatusLabel(event.status),
          getVisibilityLabel(event.visibility),
          formatDate(getEventStartValue(event)),
          summary.capacity,
          getEventSessions(event)
            .map((session) => `${session.name} ${session.startsAt}`)
            .join(" "),
          getEventSectors(event)
            .map((sector) => `${sector.name} ${sector.type} ${sector.gateName}`)
            .join(" "),
        ].join(" "),
      );

      return (
        (!query || searchableContent.includes(query)) &&
        eventMatchesDateFilter(event, dateFilter) &&
        eventMatchesStatusFilter(event, statusFilter)
      );
    });

    return sortEvents(filtered, sortFilter);
  }, [events, search, dateFilter, statusFilter, sortFilter]);

  const overview = useMemo(() => {
    const upcoming = events.filter((event) =>
      eventMatchesDateFilter(event, "upcoming"),
    ).length;
    const past = events.filter((event) =>
      eventMatchesDateFilter(event, "past"),
    ).length;
    const published = events.filter(
      (event) =>
        eventMatchesStatusFilter(event, "published") ||
        eventMatchesStatusFilter(event, "active"),
    ).length;
    const sessions = events.reduce(
      (sum, event) => sum + getEventSessions(event).length,
      0,
    );
    const sectors = events.reduce(
      (sum, event) => sum + getEventSectors(event).length,
      0,
    );

    return { upcoming, past, published, sessions, sectors };
  }, [events]);

  function clearFilters() {
    setSearch("");
    setDateFilter("all");
    setStatusFilter("all");
    setSortFilter("created_desc");
  }

  if (apiState.loading) {
    return (
      <main className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="h-7 w-48 animate-pulse rounded-full bg-slate-100" />
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-[1.5rem] bg-slate-100"
              />
            ))}
          </div>
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-96 animate-pulse rounded-[2rem] bg-slate-100"
              />
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-14 pt-8 md:px-6">
      <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-7 text-white shadow-sm md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.32),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.22),transparent_36%)]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-sky-200">
              Administração
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
              Meus eventos
            </h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/70">
              Encontre eventos criados, confira operação por datas e setores,
              abra detalhes, edite cadastros e inicie vendas manuais.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/15"
            >
              Atualizar
            </button>
            <Link
              href="/admin/events/new"
              className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 transition hover:bg-slate-100"
            >
              + Novo evento
            </Link>
          </div>
        </div>
      </section>

      {apiState.error ? (
        <section className="mt-6 rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-rose-700">
          <p className="font-black">Não foi possível carregar os eventos.</p>
          <p className="mt-1 text-sm font-semibold">{apiState.error}</p>
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="mt-4 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black text-white hover:bg-rose-700"
          >
            Tentar novamente
          </button>
        </section>
      ) : null}

      <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total"
          value={events.length}
          helper="Eventos cadastrados"
        />
        <StatCard
          label="Próximos"
          value={overview.upcoming}
          helper="Ainda vão acontecer"
        />
        <StatCard
          label="Publicados"
          value={overview.published}
          helper="Visíveis/ativos"
        />
        <StatCard
          label="Datas"
          value={overview.sessions}
          helper="Sessões cadastradas"
        />
        <StatCard
          label="Setores"
          value={overview.sectors}
          helper="Áreas operacionais"
        />
      </section>

      <section className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_170px_170px_220px_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Buscar evento
            </label>
            <div className="flex h-[54px] items-center rounded-2xl border border-slate-300 bg-white px-4 transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
              <span className="mr-3 text-slate-400">🔎</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, produtora, data, local, setor, categoria ou ID..."
                className="w-full bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Data
            </label>
            <select
              value={dateFilter}
              onChange={(event) =>
                setDateFilter(event.target.value as DateFilter)
              }
              className="h-[54px] w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              {DATE_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="h-[54px] w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Ordenar
            </label>
            <select
              value={sortFilter}
              onChange={(event) =>
                setSortFilter(event.target.value as SortFilter)
              }
              className="h-[54px] w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="created_desc">Criados recentemente</option>
              <option value="date_asc">Data mais próxima</option>
              <option value="date_desc">Data mais distante</option>
              <option value="name_asc">Nome A-Z</option>
              <option value="capacity_desc">Maior capacidade</option>
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="h-[54px] rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Limpar
          </button>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-4 border-t border-slate-100 pt-5 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((filter) => {
              const active = dateFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setDateFilter(filter.value)}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${viewMode === "cards" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-xl px-4 py-2 text-xs font-black transition ${viewMode === "table" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
            >
              Tabela
            </button>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
              Eventos encontrados
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              {filteredEvents.length} resultado(s)
            </h2>
          </div>

          <Link
            href="/admin/events/new"
            className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700"
          >
            Criar novo evento
          </Link>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
              🎫
            </div>
            <h3 className="mt-5 text-2xl font-black text-slate-950">
              Nenhum evento encontrado
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              Tente limpar os filtros ou busque por outro nome, local, data,
              produtor, setor ou categoria.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700"
            >
              Limpar filtros
            </button>
          </div>
        ) : viewMode === "table" ? (
          <EventsTable events={filteredEvents} />
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
