"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventMedia = {
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  thumbnailUrl?: string | null;
  mobileBannerUrl?: string | null;
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
  city?: string | null;
  state?: string | null;
  mode?: string | null;
};

type EventSession = {
  id?: string;
  name?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  status?: string | null;
};

type VenueSector = {
  id?: string;
  name?: string | null;
  type?: string | null;
  occupancyMode?: string | null;
  capacity?: number | null;
  color?: string | null;
};

type TicketType = {
  id?: string;
  name?: string | null;
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
type StatusFilter = "all" | "published" | "active" | "draft" | "finished" | "canceled";
type ViewMode = "cards" | "table";

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

function formatLocationValue(value: unknown) {
  if (!value) return "Local não informado";

  if (typeof value === "string" || typeof value === "number") {
    return String(value || "").trim() || "Local não informado";
  }

  if (typeof value === "object") {
    const item = value as {
      venueName?: string | null;
      name?: string | null;
      addressLine1?: string | null;
      neighborhood?: string | null;
      city?: string | null;
      state?: string | null;
      mode?: string | null;
    };

    const parts = [
      item.venueName || item.name,
      item.addressLine1,
      item.neighborhood,
      [item.city, item.state].filter(Boolean).join(" - "),
      item.mode,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean);

    return parts.length ? parts.join(" • ") : "Local não informado";
  }

  return String(value || "Local não informado");
}
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

  if (/^https?:\/\//i.test(text) || text.startsWith("/")) return text;
  if (/^(localhost|127\.0\.0\.1|www\.)/i.test(text)) return `http://${text}`;

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

function formatMoney(value?: string | number | null) {
  const amount = toNumber(value);

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null) {
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
  const firstSession = getEventSessions(event).find((session) => session.startsAt);
  return firstSession?.startsAt || event.startDate || event.eventDate || "";
}

function getEventEndValue(event: EventItem) {
  const sessions = getEventSessions(event).filter((session) => session.startsAt || session.endsAt);
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
  const date = new Date(getEventStartValue(event));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventEndDateObject(event: EventItem) {
  const date = new Date(getEventEndValue(event));
  return Number.isNaN(date.getTime()) ? getEventDateObject(event) : date;
}

function getDaysUntil(event: EventItem) {
  const date = getEventDateObject(event);

  if (!date) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  return Math.ceil((eventDay - today) / 86400000);
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getEventImage(event: EventItem) {
  const gallery = Array.isArray(event.media?.gallery) ? event.media?.gallery : [];

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
    ONLINE: "Online",
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
    return isSameDay(startDate, now) || Boolean(endDate && isSameDay(endDate, now));
  }

  if (filter === "upcoming") return Boolean(endDate && endDate >= todayStart);
  if (filter === "week") return startDate >= todayStart && startDate <= weekLimit;
  if (filter === "month") return startDate >= todayStart && startDate <= monthLimit;
  if (filter === "past") return Boolean(endDate && endDate < todayStart);

  return true;
}

function eventMatchesStatusFilter(event: EventItem, filter: StatusFilter) {
  if (filter === "all") return true;

  const status = String(event.status || "PUBLISHED").toUpperCase();

  if (filter === "published") return status === "PUBLISHED";
  if (filter === "active") return status === "ACTIVE" || status === "PUBLISHED";
  if (filter === "draft") return status === "DRAFT";
  if (filter === "finished") return status === "FINISHED";
  if (filter === "canceled") return status === "CANCELED" || status === "CANCELLED";

  return true;
}

function sortEvents(events: EventItem[]) {
  return [...events].sort((a, b) => {
    const first = getEventDateObject(a)?.getTime() || Number.MAX_SAFE_INTEGER;
    const second = getEventDateObject(b)?.getTime() || Number.MAX_SAFE_INTEGER;
    return first - second;
  });
}

function getEventSummary(event: EventItem) {
  const sessions = getEventSessions(event);
  const sectors = getEventSectors(event);
  const tickets = getEventTicketTypes(event);
  const totalTickets = tickets.reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);
  const prices = tickets
    .map((ticket) => toNumber(ticket.price))
    .filter((price) => price > 0)
    .sort((a, b) => a - b);

  return {
    sessions: sessions.length,
    sectors: sectors.length,
    ticketTypes: tickets.length,
    totalTickets,
    minPrice: prices[0] || 0,
    capacity: toNumber(event.capacity),
  };
}

function EventCard({ event }: { event: EventItem }) {
  const image = getEventImage(event);
  const summary = getEventSummary(event);
  const daysUntil = getDaysUntil(event);

  return (
    <article className="group overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg">
      <div className="relative h-40 overflow-hidden bg-slate-950">
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.45),transparent_34%),linear-gradient(135deg,#020617,#0f172a,#075985)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-white/20 bg-white px-2.5 py-1 text-[10px] font-black text-slate-950">
            {categoryLabel(event.category || event.categoryName)}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getStatusClasses(event.status)}`}>
            {getStatusLabel(event.status)}
          </span>
          <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
            {getVisibilityLabel(event.visibility)}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
            {formatDate(getEventStartValue(event))}
          </p>
          <h2 className="mt-1 line-clamp-2 text-xl font-black leading-tight text-white">
            {event.name || "Evento sem nome"}
          </h2>
        </div>
      </div>

      <div className="p-4">
        <p className="line-clamp-2 min-h-[40px] text-sm font-semibold leading-5 text-slate-500">
          {event.shortDescription || event.description || "Sem descrição cadastrada."}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Local
            </p>
            <p className="mt-1 line-clamp-2 text-xs font-black text-slate-800">
              {getLocationLabel(event)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Capacidade
            </p>
            <p className="mt-1 text-sm font-black text-slate-800">
              {formatInteger(summary.capacity)}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Quando
            </p>
            <p className="mt-1 text-sm font-black text-slate-800">
              {daysUntil === null
                ? "-"
                : daysUntil < 0
                  ? "Passado"
                  : daysUntil === 0
                    ? "Hoje"
                    : `${daysUntil} dia(s)`}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Datas
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">{summary.sessions}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Setores
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">{summary.sectors}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
              Ingressos
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              {summary.ticketTypes > 0 ? summary.ticketTypes : "-"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${event.id}`}
            className="rounded-xl bg-slate-950 px-3.5 py-2.5 text-xs font-black text-white transition hover:bg-sky-700"
          >
            Abrir
          </Link>

          <Link
            href={`/admin/events/${event.id}/edit`}
            className="rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-black text-sky-700 transition hover:bg-sky-100"
          >
            Editar
          </Link>

          <Link
            href={`/admin/orders?search=${encodeURIComponent(event.id)}`}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            Pedidos
          </Link>

          <Link
            href={getPublicEventHref(event)}
            target="_blank"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
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
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
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
              <th className="px-5 py-4 text-right text-[11px] font-black uppercase tracking-[0.16em]">
                Ações
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 bg-white">
            {events.map((event) => {
              const summary = getEventSummary(event);
              const daysUntil = getDaysUntil(event);

              return (
                <tr key={event.id} className="align-top transition hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="max-w-[360px] truncate font-black text-slate-950">
                      {event.name || "Evento sem nome"}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {categoryLabel(event.category || event.categoryName)} • {getOrganizerLabel(event)}
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
                      {daysUntil === null
                        ? "-"
                        : daysUntil < 0
                          ? "Passado"
                          : daysUntil === 0
                            ? "Hoje"
                            : `${daysUntil} dia(s)`}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <div className="grid min-w-[250px] grid-cols-4 gap-2">
                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Datas
                        </p>
                        <p className="font-black text-slate-950">{summary.sessions}</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Setores
                        </p>
                        <p className="font-black text-slate-950">{summary.sectors}</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Tipos
                        </p>
                        <p className="font-black text-slate-950">{summary.ticketTypes}</p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                          Cap.
                        </p>
                        <p className="font-black text-slate-950">{formatInteger(summary.capacity)}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(event.status)}`}>
                        {getStatusLabel(event.status)}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                        {getVisibilityLabel(event.visibility)}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <div className="flex min-w-[310px] flex-wrap justify-end gap-2">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-sky-700"
                      >
                        Abrir
                      </Link>

                      <Link
                        href={`/admin/events/${event.id}/edit`}
                        className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-100"
                      >
                        Editar
                      </Link>

                      <Link
                        href={`/admin/orders?search=${encodeURIComponent(event.id)}`}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        Pedidos
                      </Link>

                      <Link
                        href={getPublicEventHref(event)}
                        target="_blank"
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                      >
                        Pública
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  async function loadEvents() {
    const token = sessionStorage.getItem("astro_session_token");

    if (!token || token === "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/events/admin-scope`, {
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
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = normalizeText(search);

    const result = events.filter((event) => {
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
          getEventSessions(event).map((session) => `${session.name} ${session.startsAt}`).join(" "),
          getEventSectors(event).map((sector) => `${sector.name} ${sector.type}`).join(" "),
        ].join(" "),
      );

      return (
        (!query || searchableContent.includes(query)) &&
        eventMatchesDateFilter(event, dateFilter) &&
        eventMatchesStatusFilter(event, statusFilter)
      );
    });

    return sortEvents(result);
  }, [events, search, dateFilter, statusFilter]);

  const overview = useMemo(() => {
    const upcoming = events.filter((event) => eventMatchesDateFilter(event, "upcoming")).length;
    const published = events.filter((event) =>
      ["ACTIVE", "PUBLISHED", ""].includes(String(event.status || "").toUpperCase()),
    ).length;
    const drafts = events.filter((event) => String(event.status || "").toUpperCase() === "DRAFT").length;
    const totalCapacity = events.reduce((sum, event) => sum + getEventSummary(event).capacity, 0);

    return {
      total: events.length,
      upcoming,
      published,
      drafts,
      totalCapacity,
    };
  }, [events]);

  return (
    <main className="mx-auto max-w-[1210px] space-y-5 px-4 py-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-sky-600">
              Eventos cadastrados
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
              Meus eventos
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              A tela continua em cards como antes, mas agora tem edição rápida,
              pedidos do evento, filtros melhores e cards mais compactos.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadEvents}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Atualizar
            </button>

            <Link
              href="/admin/events/new"
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700"
            >
              Criar novo evento
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl bg-slate-950 p-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
              Total
            </p>
            <p className="mt-2 text-2xl font-black">{overview.total}</p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
              Próximos
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">{overview.upcoming}</p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700/60">
              Publicados
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-700">{overview.published}</p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700/60">
              Rascunhos
            </p>
            <p className="mt-2 text-2xl font-black text-amber-700">{overview.drafts}</p>
          </div>

          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-700/60">
              Capacidade
            </p>
            <p className="mt-2 text-2xl font-black text-sky-700">
              {formatInteger(overview.totalCapacity)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
              🔎
            </span>
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
              placeholder="Buscar por nome, local, produtora, setor, status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {DATE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setDateFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
                  dateFilter === filter.value
                    ? "bg-slate-950 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-xl px-3 py-2 text-sm font-black ${
                viewMode === "cards" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-xl px-3 py-2 text-sm font-black ${
                viewMode === "table" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
              }`}
            >
              Tabela
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-xs font-black transition ${
                statusFilter === filter.value
                  ? "border-sky-300 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-sky-600">
              Eventos encontrados
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {filteredEvents.length} resultado(s)
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
            Carregando eventos...
          </div>
        ) : error ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-5 text-rose-700 shadow-sm">
            <p className="font-black">Erro ao carregar eventos</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-lg font-black text-slate-950">Nenhum evento encontrado.</p>
            <p className="mt-2 text-sm text-slate-500">
              Ajuste os filtros ou crie um novo evento.
            </p>
          </div>
        ) : viewMode === "table" ? (
          <EventsTable events={filteredEvents} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
