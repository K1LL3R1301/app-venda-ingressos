"use client";

import { useEffect, useMemo, useState } from "react";

type SupportThreadListItem = {
  id: string;
  subject?: string;
  status?: string;
  customerName?: string | null;
  customerEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  lastMessageAt?: string;
  event?: {
    id?: string;
    name?: string;
    eventDate?: string;
  } | null;
  order?: {
    id?: string;
    status?: string;
    totalAmount?: string | number;
  } | null;
  organizer?: {
    id?: string;
    tradeName?: string;
    legalName?: string;
  } | null;
  assignedUser?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  messages?: Array<{
    id: string;
    message?: string;
    senderType?: string;
    senderName?: string | null;
    createdAt?: string;
  }>;
};

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function formatMoney(value?: string | number) {
  const numeric =
    typeof value === "number" ? value : Number(String(value || 0).replace(",", "."));

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isNaN(numeric) ? 0 : numeric);
}

function getStatusClasses(status?: string) {
  if (status === "OPEN") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "CUSTOMER_REPLY") {
    return "bg-sky-50 text-sky-700 border border-sky-200";
  }

  if (status === "PRODUCER_REPLY") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  if (status === "CLOSED") {
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function getStatusLabel(status?: string) {
  if (status === "OPEN") return "Aberto";
  if (status === "CUSTOMER_REPLY") return "Você respondeu";
  if (status === "PRODUCER_REPLY") return "Produtor respondeu";
  if (status === "CLOSED") return "Fechado";
  return status || "Sem status";
}

export default function CustomerSupportPage() {
  const [threads, setThreads] = useState<SupportThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadThreads() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/support/customer", {
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
              : "Erro ao carregar atendimentos",
          );
          return;
        }

        setThreads(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("CUSTOMER SUPPORT LIST ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadThreads();
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return threads;

    return threads.filter((thread) => {
      const haystack = [
        thread.subject,
        thread.customerName,
        thread.customerEmail,
        thread.event?.name,
        thread.organizer?.tradeName,
        thread.organizer?.legalName,
        thread.order?.id,
        thread.order?.status,
        thread.messages?.[0]?.message,
        thread.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [threads, search]);

  const summary = useMemo(() => {
    return {
      total: threads.length,
      open: threads.filter((item) => item.status === "OPEN").length,
      producerReply: threads.filter((item) => item.status === "PRODUCER_REPLY")
        .length,
      closed: threads.filter((item) => item.status === "CLOSED").length,
    };
  }, [threads]);

  if (loading) {
    return (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-gray-800">
            Carregando suporte...
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
              placeholder="Buscar em meus atendimentos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700 p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
          Atendimento
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
          Suporte
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Aqui ficam seus tickets de atendimento com os produtores dos eventos.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-4">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total</p>
          <h2 className="mt-3 text-3xl font-black text-gray-900">
            {summary.total}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Abertos</p>
          <h2 className="mt-3 text-3xl font-black text-emerald-600">
            {summary.open}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Produtor respondeu</p>
          <h2 className="mt-3 text-3xl font-black text-violet-600">
            {summary.producerReply}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Fechados</p>
          <h2 className="mt-3 text-3xl font-black text-gray-700">
            {summary.closed}
          </h2>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Meus tickets de atendimento
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Abra um ticket para continuar a conversa dentro do app
          </p>
        </div>

        {filteredThreads.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Nenhum atendimento encontrado.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredThreads.map((thread) => {
              const organizerName =
                thread.organizer?.tradeName ||
                thread.organizer?.legalName ||
                "Produtor";

              const firstMessage = thread.messages?.[0]?.message || "-";

              return (
                <div
                  key={thread.id}
                  className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              thread.status,
                            )}`}
                          >
                            {getStatusLabel(thread.status)}
                          </span>

                          <span className="text-xs text-gray-500">
                            Última interação: {formatDate(thread.lastMessageAt)}
                          </span>
                        </div>

                        <h3 className="mt-4 text-2xl font-bold text-gray-900">
                          {thread.subject || "Ticket sem assunto"}
                        </h3>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Evento</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {thread.event?.name || "-"}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {formatDate(thread.event?.eventDate)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Produtor</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {organizerName}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Pedido</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              #{thread.order?.id || "-"}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {thread.order?.status || "-"} •{" "}
                              {formatMoney(thread.order?.totalAmount)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Criado em</p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {formatDate(thread.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Mensagem inicial
                          </p>
                          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">
                            {firstMessage}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3 xl:w-[220px] xl:flex-col">
                        <button
                          type="button"
                          onClick={() => goTo(`/customer/support/${thread.id}`)}
                          className="rounded-2xl bg-sky-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-sky-700"
                        >
                          Abrir atendimento
                        </button>

                        {thread.order?.id ? (
                          <button
                            type="button"
                            onClick={() => goTo(`/customer/orders/${thread.order?.id}`)}
                            className="rounded-2xl border border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Ver pedido
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}