"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TicketTypeItem = {
  id: string;
  name?: string;
  description?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
};

type EventDetail = {
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
    email?: string;
    phone?: string;
  };
  ticketTypes?: TicketTypeItem[];
};

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function formatMoney(value?: string | number) {
  if (value === undefined || value === null) return "R$ 0,00";

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (Number.isNaN(numeric)) return `R$ ${value}`;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

function getInitial(user: StoredUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
}

function getTicketStatusClasses(status?: string) {
  if (status === "ACTIVE") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "INACTIVE") {
    return "bg-gray-50 text-gray-700 border border-gray-200";
  }

  return "bg-sky-50 text-sky-700 border border-sky-200";
}

export default function CustomerEventDetailPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const eventId = useMemo(() => {
    if (typeof window === "undefined") return "";

    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "";
  }, []);

  useEffect(() => {
    async function loadEvent() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (rawUser) {
        try {
          setUser(JSON.parse(rawUser) as StoredUser);
        } catch (error) {
          console.error("Erro ao ler usuário do localStorage:", error);
        }
      }

      try {
        const res = await fetch(`http://localhost:3001/v1/events/${eventId}`, {
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
              : "Erro ao carregar evento",
          );
          window.location.href = "/customer/events";
          return;
        }

        setEvent(data);
      } catch (error) {
        console.error("CUSTOMER EVENT DETAIL ERROR:", error);
        alert("Erro ao conectar com a API");
        window.location.href = "/customer/events";
      } finally {
        setLoading(false);
      }
    }

    if (!eventId) {
      window.location.href = "/customer/events";
      return;
    }

    loadEvent();
  }, [eventId]);

  function goTo(path: string) {
    window.location.href = path;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  function handleStartCheckout(ticketTypeId?: string) {
    if (!ticketTypeId || !event?.id) {
      alert("Tipo de ingresso inválido");
      return;
    }

    window.location.href = `/customer/checkout?eventId=${event.id}&ticketTypeId=${ticketTypeId}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Carregando evento...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Evento não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const availableTicketTypes =
    event.ticketTypes?.filter((ticket) => ticket.status === "ACTIVE") || [];

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="shrink-0 text-3xl font-black tracking-tight text-sky-600"
          >
            Sympla
          </button>

          <nav className="ml-auto hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={() => goTo("/customer/events")}
              className="text-sm font-semibold text-sky-600"
            >
              Eventos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/orders")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Meus pedidos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/wallet")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Wallet
            </button>
          </nav>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-12 items-center gap-3 rounded-full border border-gray-200 bg-white px-3 shadow-sm hover:bg-gray-50"
            >
              <span className="text-lg">☰</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                {getInitial(user)}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-500">
                    {user?.email || "-"}
                  </p>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => goTo("/customer/dashboard")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Início
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/events")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Eventos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/orders")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Meus pedidos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/tickets")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Meus ingressos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/wallet")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Wallet
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            Evento
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            {event.name || "Evento sem nome"}
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
            {event.description || "Sem descrição"}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => goTo("/customer/events")}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
            >
              Voltar para eventos
            </button>

            <button
              type="button"
              onClick={() => alert("Escolha um tipo de ingresso abaixo para seguir ao checkout.")}
              className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
            >
              Comprar ingresso
            </button>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Data do evento</p>
            <h2 className="mt-3 text-xl font-bold text-gray-900">
              {formatDate(event.eventDate)}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Capacidade</p>
            <h2 className="mt-3 text-xl font-bold text-gray-900">
              {event.capacity ?? 0}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Status</p>
            <h2 className="mt-3 text-xl font-bold text-gray-900">
              {event.status || "-"}
            </h2>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Tipos de ingresso
            </h2>

            {availableTicketTypes.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500">
                Nenhum tipo de ingresso ativo disponível.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {availableTicketTypes.map((ticketType) => (
                  <div
                    key={ticketType.id}
                    className="rounded-[24px] border border-gray-100 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getTicketStatusClasses(
                              ticketType.status,
                            )}`}
                          >
                            {ticketType.status || "SEM STATUS"}
                          </span>
                        </div>

                        <h3 className="mt-4 text-xl font-bold text-gray-900">
                          {ticketType.name || "Ingresso"}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {ticketType.description || "Sem descrição"}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                          <span>💵 {formatMoney(ticketType.price)}</span>
                          <span>🎟️ {ticketType.quantity ?? 0} disponível(is)</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartCheckout(ticketType.id)}
                        className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        Selecionar ingresso
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Organizador
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Nome</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {event.organizer?.tradeName ||
                      event.organizer?.legalName ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="mt-1 break-all font-semibold text-gray-900">
                    {event.organizer?.email || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Telefone</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {event.organizer?.phone || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Próximo passo
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Seleção do ingresso
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Checkout do cliente
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Uso da wallet na compra
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}