"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type EventItem = {
  id: string;
  name?: string;
  description?: string;
  eventDate?: string;
  capacity?: number;
  organizer?: {
    id: string;
    tradeName?: string;
  };
};

export default function OperatorEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/events/operator", {
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

  function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR");
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Carregando eventos atribuídos...</p>
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
        Nenhum evento atribuído a este operador.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Eventos Atribuídos</h1>
      <div className="flex flex-wrap gap-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="w-full max-w-[360px] rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{event.name}</h2>
            <p className="text-gray-600 mt-2 line-clamp-3">
              {event.description || "Sem descrição"}
            </p>

            <div className="mt-4 space-y-1 text-sm text-gray-800">
              <p>
                <strong>Data:</strong> {formatDate(event.eventDate)}
              </p>
              <p>
                <strong>Capacidade:</strong> {event.capacity ?? "-"}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={`/operator/events/${event.id}`}
                className="block rounded-2xl bg-black px-4 py-2 text-center text-sm font-medium text-white hover:opacity-90"
              >
                Abrir evento
              </Link>

              <Link
                href={`/operator/events/${event.id}/orders`}
                className="block rounded-2xl border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Pedidos
              </Link>

              <Link
                href={`/operator/events/${event.id}/tickets`}
                className="block rounded-2xl border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Tipos de ingresso
              </Link>

              <Link
                href={`/operator/events/${event.id}/checkin`}
                className="block rounded-2xl border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                Check-ins
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}