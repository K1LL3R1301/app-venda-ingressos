"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type EventLocation = {
  city?: string | null;
  state?: string | null;
};

type EventItem = {
  id: string;
  name?: string;
  title?: string;
  category?: string | null;
  startDate?: string | null;
  eventDate?: string | null;
  location?: EventLocation | null;
};

type CityGroup = {
  city: string;
  state?: string;
  key: string;
  total: number;
  nextDate?: string | null;
  categories: string[];
};

function normalizeText(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDate(value?: string | null) {
  if (!value) return "Próximas datas";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Próximas datas";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getEventDate(event: EventItem) {
  return event.startDate || event.eventDate || null;
}

function getGradient(index: number) {
  const gradients = [
    "from-orange-600 via-orange-800 to-slate-950",
    "from-[#19002f] via-orange-900 to-orange-600",
    "from-slate-950 via-orange-900 to-orange-700",
    "from-orange-500 via-orange-950 to-slate-950",
    "from-sky-900 via-slate-950 to-orange-800",
    "from-emerald-900 via-slate-950 to-orange-700",
  ];

  return gradients[index % gradients.length];
}

function buildCities(events: EventItem[]) {
  const map = new Map<string, CityGroup>();

  for (const event of events) {
    const city = String(event.location?.city || "").trim();
    if (!city) continue;

    const state = String(event.location?.state || "").trim();
    const key = `${normalizeText(city)}|${normalizeText(state)}`;
    const category = String(event.category || "").trim();
    const date = getEventDate(event);

    const existing = map.get(key);

    if (existing) {
      existing.total += 1;

      if (category && !existing.categories.includes(category)) {
        existing.categories.push(category);
      }

      if (date) {
        const currentTime = existing.nextDate ? new Date(existing.nextDate).getTime() : Number.POSITIVE_INFINITY;
        const nextTime = new Date(date).getTime();

        if (!Number.isNaN(nextTime) && nextTime < currentTime) {
          existing.nextDate = date;
        }
      }
    } else {
      map.set(key, {
        city,
        state,
        key,
        total: 1,
        nextDate: date,
        categories: category ? [category] : [],
      });
    }
  }

  return Array.from(map.values()).sort((first, second) => {
    if (second.total !== first.total) return second.total - first.total;
    return first.city.localeCompare(second.city, "pt-BR");
  });
}

export default function EventCitiesPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadEvents() {
      try {
        const response = await fetch(`${API_BASE_URL}/events`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json().catch(() => []);

        if (Array.isArray(data)) {
          setEvents(data);
        } else if (Array.isArray(data?.items)) {
          setEvents(data.items);
        } else if (Array.isArray(data?.events)) {
          setEvents(data.events);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error("EVENT CITIES LOAD ERROR:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  const cities = useMemo(() => buildCities(events), [events]);

  const filteredCities = useMemo(() => {
    const term = normalizeText(search);

    if (!term) return cities;

    return cities.filter((city) => {
      const cityText = normalizeText(`${city.city} ${city.state || ""}`);
      return cityText.includes(term);
    });
  }, [cities, search]);

  function openCity(city: CityGroup) {
    window.location.href = `/events?city=${encodeURIComponent(city.city)}`;
  }

  return (
    <main className="min-h-screen bg-[#f4f4f5] text-slate-950">
      <section className="bg-orange-600">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-white">
          <button
            type="button"
            onClick={() => (window.location.href = "/dashboard")}
            className="text-sm font-black"
          >
            ← Voltar
          </button>
          <strong className="text-xl font-black">ASTRO INGRESSOS</strong>
          <button
            type="button"
            onClick={() => (window.location.href = "/events")}
            className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-orange-700"
          >
            Todos os eventos
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <section className="overflow-hidden rounded-[34px] bg-slate-950 p-8 text-white shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.32em] text-orange-300">
            Cidades
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
            Descubra todos os lugares com eventos cadastrados.
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/75">
            A lista nasce automaticamente dos eventos. Ao clicar em uma cidade, você vê os eventos filtrados daquele local.
          </p>

          <div className="mt-6 max-w-xl rounded-2xl bg-white p-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cidade..."
              className="h-12 w-full rounded-xl px-4 text-sm font-bold text-slate-950 outline-none"
            />
          </div>
        </section>

        {loading ? (
          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            Carregando cidades...
          </section>
        ) : filteredCities.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-2xl font-black">Nenhuma cidade encontrada</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              Cadastre eventos com cidade preenchida para eles aparecerem aqui.
            </p>
          </section>
        ) : (
          <section className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCities.map((city, index) => (
              <button
                type="button"
                key={city.key}
                onClick={() => openCity(city)}
                className={`relative min-h-[180px] overflow-hidden rounded-[26px] bg-gradient-to-r ${getGradient(index)} p-6 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="absolute inset-0 bg-black/25" />
                <div className="relative z-10 flex min-h-[132px] flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/65">
                      {city.total} {city.total === 1 ? "evento" : "eventos"}
                    </p>
                    <h2 className="mt-3 text-3xl font-black">{city.city}</h2>
                    {city.state ? (
                      <p className="mt-1 text-sm font-bold text-white/80">{city.state}</p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-white/70">
                      Próximo: {formatDate(city.nextDate)}
                    </p>
                    {city.categories.length > 0 ? (
                      <p className="mt-1 line-clamp-1 text-xs font-bold text-white/70">
                        {city.categories.slice(0, 3).join(" • ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
