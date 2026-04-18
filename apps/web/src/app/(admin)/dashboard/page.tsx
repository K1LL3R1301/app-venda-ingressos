"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardSummary = {
  organizers?: number;
  events?: number;
  ticketTypes?: number;
  orders?: number;
  tickets?: number;
  checkins?: number;
  revenue?: string | number | { paidTotal?: string | number };
  ordersByStatus?: Record<string, number>;
  paidTotal?: string | number;
};

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

function formatValue(value: unknown): string | number {
  if (typeof value === "string" || typeof value === "number") return value;

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (
      typeof obj.paidTotal === "string" ||
      typeof obj.paidTotal === "number"
    ) {
      return obj.paidTotal;
    }
    return JSON.stringify(obj);
  }

  return "-";
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const [summaryRes, eventsRes] = await Promise.all([
          fetch("http://localhost:3001/v1/dashboard/summary", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:3001/v1/events", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const summaryResult = await summaryRes.json();
        const eventsResult = await eventsRes.json();

        if (!summaryRes.ok) {
          alert(
            typeof summaryResult?.message === "string"
              ? summaryResult.message
              : "Erro ao carregar dashboard",
          );
          window.location.href = "/login";
          return;
        }

        if (!eventsRes.ok) {
          alert(
            typeof eventsResult?.message === "string"
              ? eventsResult.message
              : "Erro ao carregar eventos",
          );
          return;
        }

        setSummary(summaryResult);
        setEvents(Array.isArray(eventsResult) ? eventsResult : []);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const revenueValue = useMemo(() => {
    if (!summary) return "-";
    if (summary.revenue !== undefined) return formatValue(summary.revenue);
    if (summary.paidTotal !== undefined) return formatValue(summary.paidTotal);
    return "-";
  }, [summary]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Carregando dashboard...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Não foi possível carregar o dashboard.</p>
      </div>
    );
  }

  const cards = [
    { label: "Organizadores", value: summary.organizers ?? 0 },
    { label: "Eventos", value: summary.events ?? 0 },
    { label: "Tipos de ingresso", value: summary.ticketTypes ?? 0 },
    { label: "Pedidos", value: summary.orders ?? 0 },
    { label: "Tickets", value: summary.tickets ?? 0 },
    { label: "Check-ins", value: summary.checkins ?? 0 },
    { label: "Receita", value: revenueValue },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl shadow p-6">
            <p className="text-sm text-gray-500 mb-2">{card.label}</p>
            <h2 className="text-3xl font-bold">{card.value}</h2>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Eventos</h2>
          <div className="flex gap-3">
            <Link
              href="/organizers/new"
              className="bg-white border px-4 py-2 rounded-xl"
            >
              Novo organizador
            </Link>

            <Link
              href="/events/new"
              className="bg-black text-white px-4 py-2 rounded-xl"
            >
              Novo evento
            </Link>
          </div>
        </div>

        {events.length === 0 ? (
          <p>Nenhum evento encontrado.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="inline-flex min-w-[280px] max-w-[340px] flex-col rounded-2xl border border-gray-300 bg-white p-4 shadow-sm"
              >
                <h3 className="text-lg font-semibold">{event.name || "-"}</h3>

                <p className="mt-2 text-sm text-gray-700">
                  {event.description || "Sem descrição"}
                </p>

                <div className="mt-3 space-y-1 text-sm text-gray-800">
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
                </div>

                <div className="mt-4">
                  <Link
                    href={`/events/${event.id}`}
                    className="block rounded-xl bg-black px-4 py-2.5 text-center text-white font-medium"
                  >
                    Abrir evento
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Pedidos por status</h2>

        {summary.ordersByStatus && Object.keys(summary.ordersByStatus).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(summary.ordersByStatus).map(([status, value]) => (
              <div key={status} className="flex justify-between border-b pb-2">
                <span>{status}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>Nenhum dado disponível.</p>
        )}
      </div>
    </div>
  );
}