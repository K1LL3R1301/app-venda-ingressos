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

type SupportFilter = "all" | "active" | "producer" | "closed";

const API_BASE_URL = "http://localhost:3001/v1";

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value?: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function normalizeText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getStatusLabel(status?: string) {
  if (status === "OPEN") return "Aberto";
  if (status === "CUSTOMER_REPLY") return "Você respondeu";
  if (status === "PRODUCER_REPLY") return "Resposta recebida";
  if (status === "CLOSED") return "Fechado";
  return status || "Sem status";
}

function getStatusClasses(status?: string) {
  if (status === "OPEN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CUSTOMER_REPLY") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "PRODUCER_REPLY") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "CLOSED") return "border-slate-200 bg-slate-100 text-slate-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getUrgencyLabel(thread: SupportThreadListItem) {
  const last = thread.lastMessageAt || thread.updatedAt || thread.createdAt;
  if (!last) return "Sem histórico";
  const diffHours = (Date.now() - new Date(last).getTime()) / 1000 / 60 / 60;
  if (Number.isNaN(diffHours)) return "Sem histórico";
  if (thread.status === "PRODUCER_REPLY") return "Precisa da sua resposta";
  if (thread.status === "CLOSED") return "Concluído";
  if (diffHours >= 48) return "Aguardando há mais de 48h";
  if (diffHours >= 24) return "Aguardando há mais de 24h";
  return "Em andamento";
}

function getLastMessage(thread: SupportThreadListItem) {
  const messages = thread.messages || [];
  const last = [...messages].sort((a, b) => {
    const aTime = new Date(a.createdAt || 0).getTime();
    const bTime = new Date(b.createdAt || 0).getTime();
    return bTime - aTime;
  })[0];

  return last?.message || messages[0]?.message || "Nenhuma mensagem registrada.";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

export default function CustomerSupportPage() {
  const [threads, setThreads] = useState<SupportThreadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<SupportFilter>("all");

  useEffect(() => {
    async function loadThreads() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/support/customer`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          alert(typeof result?.message === "string" ? result.message : "Erro ao carregar atendimentos");
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

  const summary = useMemo(() => {
    const active = threads.filter((item) => item.status !== "CLOSED").length;
    const producerReply = threads.filter((item) => item.status === "PRODUCER_REPLY").length;
    const customerReply = threads.filter((item) => item.status === "CUSTOMER_REPLY").length;
    const closed = threads.filter((item) => item.status === "CLOSED").length;

    return {
      total: threads.length,
      active,
      producerReply,
      customerReply,
      closed,
    };
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const term = normalizeText(search);

    return [...threads]
      .filter((thread) => {
        if (activeFilter === "active" && thread.status === "CLOSED") return false;
        if (activeFilter === "producer" && thread.status !== "PRODUCER_REPLY") return false;
        if (activeFilter === "closed" && thread.status !== "CLOSED") return false;

        if (!term) return true;

        const haystack = normalizeText(
          [
            thread.subject,
            thread.customerName,
            thread.customerEmail,
            thread.event?.name,
            thread.organizer?.tradeName,
            thread.organizer?.legalName,
            thread.order?.id,
            thread.order?.status,
            thread.status,
            getLastMessage(thread),
          ]
            .filter(Boolean)
            .join(" "),
        );

        return haystack.includes(term);
      })
      .sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [threads, search, activeFilter]);

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className={cardClass()}>
          <p className="text-lg font-semibold text-slate-800">Carregando suporte...</p>
          <p className="mt-2 text-sm text-slate-500">Buscando seus atendimentos.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-[36px] bg-slate-950 text-white shadow-sm">
        <div className="grid gap-8 p-8 md:p-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-cyan-300">Central de suporte</p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">Ajuda para seus pedidos</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/80 md:text-base">
              Acompanhe conversas com produtores, resolva dúvidas sobre ingresso, pagamento, reembolso, transferência e acesso ao evento.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/orders" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">
                Abrir pedido
              </Link>
              <Link href="/events" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                Ver eventos
              </Link>
            </div>
          </div>

          <div className="grid gap-4 self-start sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Ativos</p>
              <p className="mt-3 text-4xl font-black">{summary.active}</p>
              <p className="mt-1 text-sm text-white/70">em andamento</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Respostas</p>
              <p className="mt-3 text-4xl font-black">{summary.producerReply}</p>
              <p className="mt-1 text-sm text-white/70">aguardando você</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass()}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Total</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{summary.total}</p>
          <p className="mt-2 text-sm text-slate-500">atendimentos criados</p>
        </div>
        <div className={cardClass()}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Em andamento</p>
          <p className="mt-3 text-3xl font-black text-emerald-600">{summary.active}</p>
          <p className="mt-2 text-sm text-slate-500">abertos ou respondidos</p>
        </div>
        <div className={cardClass()}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Você respondeu</p>
          <p className="mt-3 text-3xl font-black text-sky-600">{summary.customerReply}</p>
          <p className="mt-2 text-sm text-slate-500">aguardando retorno</p>
        </div>
        <div className={cardClass()}>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Fechados</p>
          <p className="mt-3 text-3xl font-black text-slate-700">{summary.closed}</p>
          <p className="mt-2 text-sm text-slate-500">concluídos</p>
        </div>
      </section>

      <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="flex h-14 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
            <span className="mr-3 text-slate-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar por pedido, evento, produtor, assunto ou mensagem..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
            {[
              { id: "all", label: "Todos" },
              { id: "active", label: "Ativos" },
              { id: "producer", label: "Responder" },
              { id: "closed", label: "Fechados" },
            ].map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id as SupportFilter)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-black transition ${
                    active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-600">Meus atendimentos</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Tickets de suporte</h2>
            <p className="mt-2 text-sm text-slate-500">Abra um atendimento para continuar a conversa dentro do app.</p>
          </div>
          <p className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm">
            {filteredThreads.length} resultado(s)
          </p>
        </div>

        {filteredThreads.length === 0 ? (
          <div className="mt-6 rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-lg font-black text-slate-900">Nenhum atendimento encontrado.</p>
            <p className="mt-2 text-sm text-slate-500">Use outro filtro ou abra um atendimento a partir de um pedido.</p>
            <Link href="/orders" className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
              Ir para meus pedidos
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-5">
            {filteredThreads.map((thread) => {
              const organizerName = thread.organizer?.tradeName || thread.organizer?.legalName || "Produtor";
              const lastMessage = getLastMessage(thread);
              const hasProducerReply = thread.status === "PRODUCER_REPLY";

              return (
                <article key={thread.id} className={`overflow-hidden rounded-[30px] border bg-white shadow-sm ${hasProducerReply ? "border-violet-200 ring-4 ring-violet-50" : "border-slate-200"}`}>
                  <div className="grid gap-5 p-6 xl:grid-cols-[1fr_230px]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(thread.status)}`}>{getStatusLabel(thread.status)}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{getUrgencyLabel(thread)}</span>
                        <span className="text-xs text-slate-500">Última interação: {formatDate(thread.lastMessageAt || thread.updatedAt)}</span>
                      </div>

                      <h3 className="mt-4 text-2xl font-black text-slate-950">{thread.subject || "Ticket sem assunto"}</h3>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Evento</p>
                          <p className="mt-2 font-black text-slate-950">{thread.event?.name || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(thread.event?.eventDate)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Produtor</p>
                          <p className="mt-2 font-black text-slate-950">{organizerName}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Pedido</p>
                          <p className="mt-2 break-all font-black text-slate-950">#{thread.order?.id || "-"}</p>
                          <p className="mt-1 text-xs text-slate-500">{thread.order?.status || "-"} • {formatMoney(thread.order?.totalAmount)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Criado em</p>
                          <p className="mt-2 font-black text-slate-950">{formatDate(thread.createdAt)}</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Última mensagem</p>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{lastMessage}</p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-3 xl:flex-col xl:justify-center">
                      <Link href={`/support/${thread.id}`} className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white hover:bg-slate-800">
                        Abrir atendimento
                      </Link>
                      {thread.order?.id ? (
                        <Link href={`/orders/${thread.order.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50">
                          Ver pedido
                        </Link>
                      ) : null}
                      {thread.event?.id ? (
                        <Link href={`/events/${thread.event.id}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50">
                          Ver evento
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
