"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  gallery?: string[];
};

type EventItem = {
  id: string;
  name?: string;
  description?: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  status?: string;
  category?: string | { name?: string };
  categoryName?: string;
  venueName?: string;
  locationName?: string;
  localName?: string;
  address?: string;
  city?: string;
  state?: string;
  media?: EventMedia | null;
  organizer?: {
    id: string;
    tradeName?: string;
  };
};

type DateFilter = "all" | "upcoming" | "today" | "week" | "month" | "past";
type SortFilter = "date_asc" | "date_desc" | "name_asc" | "capacity_desc";

function normalizeText(value?: string | number | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value?: string) {
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

function getEventDate(event: EventItem) {
  return event.startDate || event.eventDate || "";
}

function getEventDateObject(event: EventItem) {
  const value = getEventDate(event);
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventLocation(event: EventItem) {
  const mainLocation =
    event.venueName || event.locationName || event.localName || event.address;

  const cityState = [event.city, event.state].filter(Boolean).join(" - ");

  if (mainLocation && cityState) return `${mainLocation}, ${cityState}`;
  if (mainLocation) return mainLocation;
  if (cityState) return cityState;

  return "Local a confirmar";
}

function getEventCategory(event: EventItem) {
  if (typeof event.category === "string") return event.category;
  if (event.category?.name) return event.category.name;
  if (event.categoryName) return event.categoryName;

  return "Evento";
}

function getEventImage(event: EventItem) {
  return (
    event.media?.bannerImageUrl ||
    event.media?.coverImageUrl ||
    event.media?.thumbnailUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.gallery?.[0] ||
    ""
  );
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "DRAFT") return "Rascunho";
  if (normalized === "PUBLISHED") return "Publicado";
  if (normalized === "CANCELED") return "Cancelado";
  if (normalized === "FINISHED") return "Finalizado";
  if (normalized === "SOLD_OUT") return "Esgotado";

  return status || "Ativo";
}

function getStatusClasses(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "PUBLISHED" ||
    normalized === ""
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "DRAFT") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "FINISHED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (normalized === "CANCELED" || normalized === "SOLD_OUT") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
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

  const date = getEventDateObject(event);

  if (!date) return false;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekLimit = new Date(todayStart);
  weekLimit.setDate(weekLimit.getDate() + 7);

  const monthLimit = new Date(todayStart);
  monthLimit.setDate(monthLimit.getDate() + 30);

  if (filter === "today") return isSameDay(date, now);
  if (filter === "upcoming") return date >= todayStart;
  if (filter === "week") return date >= todayStart && date <= weekLimit;
  if (filter === "month") return date >= todayStart && date <= monthLimit;
  if (filter === "past") return date < todayStart;

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
    return copy.sort((a, b) => (b.capacity || 0) - (a.capacity || 0));
  }

  if (sort === "date_desc") {
    return copy.sort((a, b) => {
      const first = getEventDateObject(a)?.getTime() || 0;
      const second = getEventDateObject(b)?.getTime() || 0;

      return second - first;
    });
  }

  return copy.sort((a, b) => {
    const first = getEventDateObject(a)?.getTime() || Number.MAX_SAFE_INTEGER;
    const second = getEventDateObject(b)?.getTime() || Number.MAX_SAFE_INTEGER;

    return first - second;
  });
}

function InfoPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function EventCard({ event }: { event: EventItem }) {
  const image = getEventImage(event);
  const category = getEventCategory(event);
  const location = getEventLocation(event);

  return (
    <article className="group overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl">
      <div className="relative h-44 overflow-hidden bg-slate-950">
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.45),transparent_34%),linear-gradient(135deg,#020617,#0f172a,#075985)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950 shadow-sm">
            {category}
          </span>

          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-black shadow-sm ${getStatusClasses(
              event.status,
            )}`}
          >
            {getStatusLabel(event.status)}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="line-clamp-2 text-2xl font-black leading-tight text-white">
            {event.name || "Evento sem nome"}
          </h2>
        </div>
      </div>

      <div className="p-5">
        <p className="line-clamp-2 min-h-[48px] text-sm leading-6 text-slate-500">
          {event.description || "Sem descrição cadastrada."}
        </p>

        <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Data
            </p>
            <p className="mt-1 font-black text-slate-800">
              {formatDate(getEventDate(event))}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Capacidade
            </p>
            <p className="mt-1 font-black text-slate-800">
              {event.capacity ?? "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Local
            </p>
            <p className="mt-1 font-black text-slate-800">{location}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3 md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Organizador
            </p>
            <p className="mt-1 font-black text-slate-800">
              {event.organizer?.tradeName || "-"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/admin/events/${event.id}`}
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Abrir evento
          </Link>

          <Link
            href={`/admin/events/${event.id}/tickets`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Ingressos
          </Link>

          <Link
            href={`/admin/orders/new?eventId=${event.id}`}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Novo pedido
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("date_asc");

  useEffect(() => {
    async function loadEvents() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/events", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
          alert(
            typeof result?.message === "string"
              ? result.message
              : "Erro ao carregar eventos",
          );
          return;
        }

        setEvents(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const query = normalizeText(search);

    const filtered = events.filter((event) => {
      const location = getEventLocation(event);
      const category = getEventCategory(event);
      const dateText = formatDate(getEventDate(event));

      const searchableContent = normalizeText(
        [
          event.name,
          event.description,
          event.organizer?.tradeName,
          location,
          category,
          dateText,
          event.capacity,
          event.id,
        ].join(" "),
      );

      const matchesSearch = !query || searchableContent.includes(query);
      const matchesDate = eventMatchesDateFilter(event, dateFilter);

      return matchesSearch && matchesDate;
    });

    return sortEvents(filtered, sortFilter);
  }, [events, search, dateFilter, sortFilter]);

  const upcomingCount = useMemo(() => {
    return events.filter((event) => eventMatchesDateFilter(event, "upcoming"))
      .length;
  }, [events]);

  const pastCount = useMemo(() => {
    return events.filter((event) => eventMatchesDateFilter(event, "past")).length;
  }, [events]);

  function clearFilters() {
    setSearch("");
    setDateFilter("all");
    setSortFilter("date_asc");
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Carregando eventos...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-8">
      <section className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-sm md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
              Operação de eventos
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Meus eventos
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              Pesquise, filtre e abra eventos para gerenciar ingressos, pedidos,
              lotes, operação e validação.
            </p>
          </div>

          <Link
            href="/admin/events/new"
            className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-slate-950 transition hover:bg-slate-100"
          >
            Novo evento
          </Link>
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-4">
        <InfoPill label="Total" value={events.length} />
        <InfoPill label="Encontrados" value={filteredEvents.length} />
        <InfoPill label="Próximos" value={upcomingCount} />
        <InfoPill label="Finalizados" value={pastCount} />
      </section>

      <section className="mt-7 rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_190px_220px_auto] xl:items-end">
          <div>
            <label className="mb-2 block text-sm font-black text-slate-700">
              Buscar evento
            </label>

            <div className="flex h-13 items-center rounded-2xl border border-slate-300 bg-white px-4 transition focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-100">
              <span className="mr-3 text-slate-400">🔎</span>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, data, local, organizador, categoria ou ID..."
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
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
              className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="all">Todas as datas</option>
              <option value="upcoming">Próximos eventos</option>
              <option value="today">Hoje</option>
              <option value="week">Próximos 7 dias</option>
              <option value="month">Próximos 30 dias</option>
              <option value="past">Eventos passados</option>
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
              className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            >
              <option value="date_asc">Data mais próxima</option>
              <option value="date_desc">Data mais distante</option>
              <option value="name_asc">Nome A-Z</option>
              <option value="capacity_desc">Maior capacidade</option>
            </select>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="h-13 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
              Lista
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Eventos encontrados
            </h2>
          </div>

          <p className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 shadow-sm">
            {filteredEvents.length} resultado(s)
          </p>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
              🎫
            </div>

            <h3 className="mt-5 text-2xl font-black text-slate-950">
              Nenhum evento encontrado
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Tente limpar os filtros ou buscar por outro nome, local, data,
              organizador ou categoria.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-6 rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Limpar filtros
            </button>
          </div>
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