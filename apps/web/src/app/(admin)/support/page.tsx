"use client";

import Link from "next/link";
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

export default function AdminSupportPage() {
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
        const res = await fetch("http://localhost:3001/v1/support/admin", {
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
        console.error(error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadThreads();
  }, []);

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
        thread.messages?.[0]?.message,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [threads, search]);

  const totalThreads = threads.length;
  const openThreads = threads.filter((item) => item.status === "OPEN").length;
  const customerReplyThreads = threads.filter(
    (item) => item.status === "CUSTOMER_REPLY",
  ).length;
  const closedThreads = threads.filter((item) => item.status === "CLOSED").length;

  return (
    <div className="rounded-2xl bg-white p-6 shadow">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atendimentos 💬</h1>
          <p className="mt-1 text-gray-600">
            Veja conversas entre clientes e produtores dentro do app.
          </p>
        </div>

        <div className="w-full lg:max-w-md">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Buscar atendimento
          </label>
          <input
            type="text"
            className="w-full rounded-xl border p-3"
            placeholder="Pedido, evento, cliente, assunto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-gray-50 p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="mt-2 text-3xl font-black text-gray-900">{totalThreads}</p>
        </div>

        <div className="rounded-2xl border bg-emerald-50 p-4">
          <p className="text-sm text-emerald-700">Abertos</p>
          <p className="mt-2 text-3xl font-black text-emerald-700">{openThreads}</p>
        </div>

        <div className="rounded-2xl border bg-sky-50 p-4">
          <p className="text-sm text-sky-700">Cliente aguardando resposta</p>
          <p className="mt-2 text-3xl font-black text-sky-700">
            {customerReplyThreads}
          </p>
        </div>

        <div className="rounded-2xl border bg-gray-100 p-4">
          <p className="text-sm text-gray-600">Fechados</p>
          <p className="mt-2 text-3xl font-black text-gray-700">{closedThreads}</p>
        </div>
      </div>

      {loading ? (
        <p>Carregando atendimentos...</p>
      ) : filteredThreads.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-gray-50 p-8 text-center">
          <p className="font-medium text-gray-900">Nenhum atendimento encontrado.</p>
          <p className="mt-2 text-sm text-gray-500">
            Quando um cliente falar com o produtor, ele aparece aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredThreads.map((thread) => {
            const organizerName =
              thread.organizer?.tradeName ||
              thread.organizer?.legalName ||
              "Produtor";

            const firstMessage = thread.messages?.[0]?.message || "-";

            return (
              <div key={thread.id} className="rounded-2xl border p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          thread.status,
                        )}`}
                      >
                        {thread.status || "SEM STATUS"}
                      </span>

                      <span className="text-xs text-gray-500">
                        Atualizado em {formatDate(thread.lastMessageAt)}
                      </span>
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-gray-900">
                      {thread.subject || "Atendimento sem assunto"}
                    </h2>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Cliente</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {thread.customerName || "-"}
                        </p>
                        <p className="mt-1 break-all text-sm text-gray-500">
                          {thread.customerEmail || "-"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Evento</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {thread.event?.name || "-"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {formatDate(thread.event?.eventDate)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Pedido</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          #{thread.order?.id || "-"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {thread.order?.status || "-"} •{" "}
                          {formatMoney(thread.order?.totalAmount)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Produtor</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {organizerName}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Responsável</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {thread.assignedUser?.name || "Não atribuído"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Criado em</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDate(thread.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Mensagem inicial</p>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-700">
                        {firstMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3 xl:w-[220px] xl:flex-col">
                    <Link
                      href={`/support/${thread.id}`}
                      className="rounded-xl bg-black px-4 py-3 text-center text-sm font-semibold text-white"
                    >
                      Abrir atendimento
                    </Link>

                    {thread.order?.id ? (
                      <Link
                        href={`/orders/${thread.order.id}`}
                        className="rounded-xl border px-4 py-3 text-center text-sm font-semibold text-gray-700"
                      >
                        Ver pedido
                      </Link>
                    ) : null}

                    {thread.event?.id ? (
                      <Link
                        href={`/events/${thread.event.id}`}
                        className="rounded-xl border px-4 py-3 text-center text-sm font-semibold text-gray-700"
                      >
                        Ver evento
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}