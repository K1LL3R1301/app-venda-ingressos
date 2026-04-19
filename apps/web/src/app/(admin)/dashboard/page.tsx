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
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200">
          <p className="text-lg font-medium">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-sm border border-gray-200">
          <p className="text-lg font-medium">
            Não foi possível carregar o dashboard.
          </p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Organizadores", value: summary.organizers ?? 0, icon: "🏢" },
    { label: "Eventos", value: summary.events ?? 0, icon: "🎫" },
    { label: "Pedidos", value: summary.orders ?? 0, icon: "🧾" },
    { label: "Receita", value: revenueValue, icon: "💰" },
  ];

  const quickActions = [
    {
      title: "Novo organizador",
      description: "Cadastre um novo organizador para operar eventos",
      href: "/organizers/new",
    },
    {
      title: "Novo evento",
      description: "Crie um novo evento dentro da plataforma",
      href: "/events/new",
    },
    {
      title: "Ver pedidos",
      description: "Acompanhe todos os pedidos realizados",
      href: "/orders",
    },
    {
      title: "Check-in manual",
      description: "Valide tickets manualmente pelo código",
      href: "/checkin",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-gray-500 font-semibold">
              Painel administrativo
            </p>
            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Dashboard Admin
            </h1>
            <p className="mt-3 text-gray-600 max-w-2xl">
              Gerencie organizadores, eventos, pedidos e receita da plataforma
              em um só lugar.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-3xl bg-white border border-gray-200 shadow-sm p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <h2 className="mt-3 text-3xl font-bold text-gray-900">
                  {card.value}
                </h2>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-xl">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Ações rápidas</h2>
            <p className="text-gray-600 mt-1">
              Atalhos para os principais fluxos do admin
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-5 hover:bg-gray-100 transition"
            >
              <h3 className="text-lg font-semibold text-gray-900">
                {action.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Eventos</h2>
            <p className="text-gray-600 mt-1">
              Selecione um evento para continuar a operação
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/organizers/new"
              className="rounded-2xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Novo organizador
            </Link>

            <Link
              href="/events/new"
              className="rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white hover:opacity-90"
            >
              Novo evento
            </Link>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
            Nenhum evento encontrado.
          </div>
        ) : (
          <div className="flex flex-wrap gap-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="w-full max-w-[360px] rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {event.name || "-"}
                </h3>

                <p className="mt-2 text-sm text-gray-600 line-clamp-3 min-h-[60px]">
                  {event.description || "Sem descrição"}
                </p>

                <div className="mt-4 space-y-2 text-sm text-gray-800">
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

                <div className="mt-5">
                  <Link
                    href={`/events/${event.id}`}
                    className="block rounded-2xl bg-black px-4 py-3 text-center text-sm font-medium text-white hover:opacity-90"
                  >
                    Abrir evento
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white border border-gray-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Pedidos por status
        </h2>

        {summary.ordersByStatus &&
        Object.keys(summary.ordersByStatus).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(summary.ordersByStatus).map(([status, value]) => (
              <div
                key={status}
                className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
              >
                <span className="font-medium text-gray-700">{status}</span>
                <span className="text-lg font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
            Nenhum dado disponível.
          </div>
        )}
      </section>
    </div>
  );
}