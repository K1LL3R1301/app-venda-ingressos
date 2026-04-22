"use client";

import { useEffect, useMemo, useState } from "react";

type EventItem = {
  id: string;
  name?: string;
  description?: string;
  eventDate?: string;
  capacity?: number;
  status?: string;
  organizer?: {
    id?: string;
    tradeName?: string;
    legalName?: string;
  };
};

const gradients = [
  "from-sky-600 via-blue-600 to-indigo-700",
  "from-fuchsia-600 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-700",
  "from-orange-500 via-amber-500 to-yellow-500",
];

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

export default function CustomerEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
          },
        });

        const data = await res.json();

        if (!res.ok) {
          alert(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar eventos",
          );
          return;
        }

        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("CUSTOMER EVENTS ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return events;

    return events.filter((event) =>
      [
        event.name,
        event.description,
        event.organizer?.tradeName,
        event.organizer?.legalName,
        event.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [events, search]);

  if (loading) {
    return (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-gray-800">
            Carregando eventos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8">
        <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white px-4">
            <span className="mr-3 text-gray-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar eventos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
          Área do cliente
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
          Explore eventos
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Descubra experiências, abra os detalhes do evento e prepare o
          próximo passo da compra.
        </p>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Eventos disponíveis
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Uma vitrine pronta para a próxima etapa do checkout
          </p>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Nenhum evento encontrado.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event, index) => (
              <button
                key={event.id}
                type="button"
                onClick={() => goTo(`/customer/events/${event.id}`)}
                className="overflow-hidden rounded-[28px] border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`h-52 bg-gradient-to-br ${
                    gradients[index % gradients.length]
                  } p-6 text-white`}
                >
                  <p className="text-xs uppercase tracking-[0.22em] text-white/75">
                    Evento
                  </p>

                  <h3 className="mt-4 line-clamp-2 text-3xl font-black leading-tight">
                    {event.name || "Evento sem nome"}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-sm text-white/80">
                    {event.organizer?.tradeName ||
                      event.organizer?.legalName ||
                      "Organizador"}
                  </p>
                </div>

                <div className="p-6">
                  <p className="line-clamp-3 text-sm leading-6 text-gray-600">
                    {event.description || "Sem descrição"}
                  </p>

                  <div className="mt-5 space-y-2 text-sm text-gray-600">
                    <p>📅 {formatDate(event.eventDate)}</p>
                    <p>👥 Capacidade: {event.capacity ?? 0}</p>
                    <p>🏷️ Status: {event.status || "-"}</p>
                  </div>

                  <div className="mt-6">
                    <span className="inline-flex rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white">
                      Ver evento
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}