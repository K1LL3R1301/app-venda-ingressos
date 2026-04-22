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

const collections = [
  { id: "1", label: "Festas e shows", icon: "🎵" },
  { id: "2", label: "Teatros e espetáculos", icon: "🎭" },
  { id: "3", label: "Stand up comedy", icon: "🎤" },
  { id: "4", label: "Esportes", icon: "⚽" },
  { id: "5", label: "Passeios e tours", icon: "🌎" },
  { id: "6", label: "Congressos", icon: "🏛️" },
  { id: "7", label: "Infantil", icon: "🎈" },
  { id: "8", label: "Gastronomia", icon: "🍔" },
];

const faqItems = [
  "Como cancelo um ingresso ou peço reembolso?",
  "Como localizar meus ingressos?",
  "Como trocar a titularidade do ingresso?",
  "Como funciona o saldo da wallet?",
];

const gradients = [
  "from-sky-600 via-blue-600 to-indigo-700",
  "from-fuchsia-600 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-700",
  "from-orange-500 via-amber-500 to-yellow-500",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-slate-700 via-slate-800 to-slate-900",
];

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

function previewText(value?: string, max = 110) {
  if (!value) {
    return "Descubra os detalhes deste evento e acompanhe novidades na plataforma.";
  }

  if (value.length <= max) return value;

  return `${value.slice(0, max).trim()}...`;
}

function buildSection(events: EventItem[], start: number, count: number) {
  if (events.length === 0) return [];

  const output: EventItem[] = [];

  for (let i = 0; i < count; i += 1) {
    output.push(events[(start + i) % events.length]);
  }

  return output;
}

export default function CustomerDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
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
        console.error("CUSTOMER DASHBOARD ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
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

  useEffect(() => {
    setActiveHeroIndex(0);
  }, [filteredEvents.length]);

  const heroEvents = filteredEvents.length > 0 ? filteredEvents : events;

  useEffect(() => {
    if (heroEvents.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % heroEvents.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroEvents]);

  const featuredEvent =
    heroEvents.length > 0 ? heroEvents[activeHeroIndex % heroEvents.length] : null;

  const baseEvents = filteredEvents.length ? filteredEvents : events;
  const mostPurchasedSection = buildSection(baseEvents, 0, 4);
  const todaySection = buildSection(baseEvents, 2, 4);
  const cultureSection = buildSection(baseEvents, 4, 4);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Carregando dashboard do cliente...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="flex h-12 flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
            <span className="mr-3 text-gray-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar experiências"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            type="button"
            className="h-12 rounded-2xl border border-sky-100 bg-sky-50 px-4 text-sm font-medium text-sky-700"
          >
            📍 Qualquer lugar
          </button>
        </div>
      </section>

      {featuredEvent ? (
        <section>
          <div className="mx-auto max-w-5xl">
            <div className="relative overflow-hidden rounded-[34px] border border-gray-200 bg-white p-3 shadow-sm">
              <div
                className={`relative min-h-[430px] overflow-hidden rounded-[28px] bg-gradient-to-br ${
                  gradients[activeHeroIndex % gradients.length]
                } p-8 text-white`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_28%)]" />

                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur">
                      Evento em destaque
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveHeroIndex((prev) =>
                            heroEvents.length === 0
                              ? 0
                              : (prev - 1 + heroEvents.length) % heroEvents.length,
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-bold backdrop-blur hover:bg-white/20"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveHeroIndex((prev) =>
                            heroEvents.length === 0 ? 0 : (prev + 1) % heroEvents.length,
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-bold backdrop-blur hover:bg-white/20"
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="relative z-10 mt-10 max-w-3xl">
                    <h1 className="text-4xl font-black leading-tight md:text-6xl">
                      {featuredEvent.name || "Evento sem nome"}
                    </h1>

                    <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                      {previewText(featuredEvent.description, 180)}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/85">
                      <span>📅 {formatDate(featuredEvent.eventDate)}</span>
                      <span>👥 Capacidade: {featuredEvent.capacity ?? 0}</span>
                      <span>🏷️ {featuredEvent.status || "Ativo"}</span>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => goTo(`/customer/events/${featuredEvent.id}`)}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
                      >
                        Ver evento
                      </button>

                      <button
                        type="button"
                        onClick={() => goTo(`/customer/events/${featuredEvent.id}`)}
                        className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                      >
                        Comprar ingresso
                      </button>
                    </div>
                  </div>

                  {heroEvents.length > 1 ? (
                    <div className="relative z-10 mt-10 grid gap-3 md:grid-cols-4">
                      {heroEvents.slice(0, 4).map((event, index) => {
                        const isActive = event.id === featuredEvent.id;

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setActiveHeroIndex(index)}
                            className={`rounded-[22px] border px-4 py-4 text-left backdrop-blur transition ${
                              isActive
                                ? "border-white/40 bg-white/20"
                                : "border-white/15 bg-white/8 hover:bg-white/14"
                            }`}
                          >
                            <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                              Destaque
                            </p>
                            <p className="mt-2 text-sm font-bold text-white">
                              {event.name || "Evento"}
                            </p>
                            <p className="mt-1 text-xs text-white/70">
                              {formatDate(event.eventDate)}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-[32px] border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-black text-gray-900">
            Sua vitrine de eventos vai nascer aqui
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-gray-500">
            Ainda não existem eventos cadastrados para exibir nesta home. Assim que
            você criar eventos no painel, eles aparecerão aqui.
          </p>
          <button
            type="button"
            onClick={() => goTo("/customer/events")}
            className="mt-6 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
          >
            Ir para eventos
          </button>
        </section>
      )}

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Explore nossas coleções
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Aqui pode ficar genérico por enquanto
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo("/customer/events")}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Ver tudo
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          {collections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goTo("/customer/events")}
              className="rounded-[22px] border border-gray-200 bg-white px-4 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-3 text-xs font-semibold text-gray-700">
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-sm">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
                Wallet do cliente
              </p>
              <h2 className="mt-4 text-3xl font-black md:text-4xl">
                Seus créditos agora fazem parte da jornada
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85">
                Quando houver cancelamento com retorno em carteira, o valor pode
                entrar na sua wallet e depois ser usado nas próximas compras.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goTo("/customer/wallet")}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                >
                  Abrir wallet
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Ver meus pedidos
                </button>
              </div>
            </div>

            <div className="rounded-[26px] border border-white/15 bg-white/10 p-6 backdrop-blur">
              <div className="grid gap-4">
                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Fluxo atual
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    Evento → Checkout → Pedido → Pagamento → Ingresso
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Evolução
                  </p>
                  <p className="mt-2 font-semibold text-white">
                    Wallet aplicada automaticamente quando houver saldo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Eventos mais comprados nas últimas 24h
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Aqui já aparecem os eventos reais cadastrados
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo("/customer/events")}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Ver tudo
          </button>
        </div>

        {mostPurchasedSection.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">
            Nenhum evento disponível no momento.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {mostPurchasedSection.map((event, index) => (
              <button
                key={`${event.id}-most-${index}`}
                type="button"
                onClick={() => goTo(`/customer/events/${event.id}`)}
                className="overflow-hidden rounded-[28px] border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`h-44 bg-gradient-to-br ${
                    gradients[index % gradients.length]
                  } p-5 text-white`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                    Evento
                  </p>
                  <h3 className="mt-4 text-2xl font-black leading-tight">
                    {event.name || "Evento sem nome"}
                  </h3>
                </div>

                <div className="p-5">
                  <p className="text-sm font-semibold text-gray-900">
                    {event.organizer?.tradeName ||
                      event.organizer?.legalName ||
                      "Organizador"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {previewText(event.description, 90)}
                  </p>
                  <p className="mt-4 text-sm text-gray-600">
                    {formatDate(event.eventDate)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">O que fazer hoje</h2>
            <p className="mt-1 text-sm text-gray-500">
              Seção em estilo vitrine, reaproveitando os eventos reais
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo("/customer/events")}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Ver tudo
          </button>
        </div>

        {todaySection.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">
            Nenhum evento disponível no momento.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {todaySection.map((event, index) => (
              <button
                key={`${event.id}-today-${index}`}
                type="button"
                onClick={() => goTo(`/customer/events/${event.id}`)}
                className="overflow-hidden rounded-[28px] border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`h-40 bg-gradient-to-br ${
                    gradients[(index + 2) % gradients.length]
                  } p-5 text-white`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                    Hoje
                  </p>
                  <h3 className="mt-4 text-xl font-black leading-tight">
                    {event.name || "Evento sem nome"}
                  </h3>
                </div>

                <div className="p-5">
                  <p className="text-sm leading-6 text-gray-600">
                    {previewText(event.description, 85)}
                  </p>
                  <div className="mt-4 space-y-1 text-sm text-gray-500">
                    <p>{formatDate(event.eventDate)}</p>
                    <p>Status: {event.status || "-"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Passeios e eventos culturais
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Outra faixa da home, ainda em modo híbrido
            </p>
          </div>

          <button
            type="button"
            onClick={() => goTo("/customer/events")}
            className="text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Ver tudo
          </button>
        </div>

        {cultureSection.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm">
            Nenhum evento disponível no momento.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {cultureSection.map((event, index) => (
              <button
                key={`${event.id}-culture-${index}`}
                type="button"
                onClick={() => goTo(`/customer/events/${event.id}`)}
                className="overflow-hidden rounded-[28px] border border-gray-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`h-40 bg-gradient-to-br ${
                    gradients[(index + 4) % gradients.length]
                  } p-5 text-white`}
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-white/75">
                    Cultura
                  </p>
                  <h3 className="mt-4 text-xl font-black leading-tight">
                    {event.name || "Evento sem nome"}
                  </h3>
                </div>

                <div className="p-5">
                  <p className="text-sm leading-6 text-gray-600">
                    {previewText(event.description, 85)}
                  </p>
                  <p className="mt-4 text-sm text-gray-500">
                    {event.organizer?.tradeName ||
                      event.organizer?.legalName ||
                      "Organizador"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            Tire suas dúvidas aqui
          </h2>

          <div className="mt-5 space-y-3">
            {faqItems.map((item) => (
              <button
                key={item}
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <span>{item}</span>
                <span className="text-lg text-gray-400">+</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900">
            Atalhos da sua conta
          </h2>

          <div className="mt-5 grid gap-3">
            <button
              type="button"
              onClick={() => goTo("/customer/events")}
              className="rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Explorar eventos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/orders")}
              className="rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Abrir meus pedidos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/wallet")}
              className="rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Ver wallet
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}