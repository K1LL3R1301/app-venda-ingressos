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

export default function EventsPage() {
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

  function formatDate(value?: string) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("pt-BR");
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Eventos 🎫</h1>
          <p className="text-gray-600 mt-1">
            Escolha um evento para operar pedidos, tickets e check-in
          </p>
        </div>

        <Link
          href="/events/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          Novo evento
        </Link>
      </div>

      {loading ? (
        <p>Carregando eventos...</p>
      ) : events.length === 0 ? (
        <p>Nenhum evento encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {events.map((event) => (
            <div key={event.id} className="border rounded-2xl p-5">
              <h2 className="text-xl font-semibold">{event.name}</h2>
              <p className="text-gray-600 mt-2">
                {event.description || "Sem descrição"}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                <p>
                  <strong>Data:</strong> {formatDate(event.eventDate)}
                </p>
                <p>
                  <strong>Capacidade:</strong> {event.capacity ?? "-"}
                </p>
                <p>
                  <strong>Organizador:</strong>{" "}
                  {event.organizer?.tradeName || "-"}
                </p>
                <p>
                  <strong>ID:</strong> {event.id}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/events/${event.id}`}
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  Abrir evento
                </Link>

                <Link
                  href={`/events/${event.id}/tickets`}
                  className="bg-white border px-4 py-2 rounded"
                >
                  Ingressos
                </Link>

                <Link
                  href={`/orders/new?eventId=${event.id}`}
                  className="bg-white border px-4 py-2 rounded"
                >
                  Novo pedido
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}