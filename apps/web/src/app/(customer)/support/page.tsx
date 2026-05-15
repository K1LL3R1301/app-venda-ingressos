"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
};

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
    startDate?: string;
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

type CustomerOrder = {
  id: string;
  status?: string;
  createdAt?: string;
  totalAmount?: string | number;
  event?: {
    id?: string;
    name?: string;
    eventDate?: string;
    startDate?: string;
  };
};

type OperatorInvite = {
  id: string;
  status?: string;
  message?: string;
  notes?: string;
  invitedByName?: string;
  adminName?: string;
  organizer?: {
    tradeName?: string;
    legalName?: string;
  };
  respondedAt?: string;
  responseReason?: string;
};

type SupportFilter = "all" | "active" | "producer" | "closed";
type Tab = "tickets" | "open" | "invites" | "history";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

function getToken() {
  return localStorage.getItem("token") || "";
}

function getStoredUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

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
  if (status === "PENDING" || status === "INVITED") return "Pendente";
  if (status === "ACCEPTED") return "Aceito";
  if (status === "REJECTED") return "Recusado";
  return status || "Sem status";
}

function getStatusClasses(status?: string) {
  if (status === "OPEN") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CUSTOMER_REPLY") return "border-sky-200 bg-sky-50 text-sky-700";
  if (status === "PRODUCER_REPLY") return "border-violet-200 bg-violet-50 text-violet-700";
  if (status === "CLOSED") return "border-slate-200 bg-slate-100 text-slate-700";
  if (status === "ACCEPTED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "REJECTED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
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

function eventName(order?: CustomerOrder) {
  return order?.event?.name || "Evento";
}

function orderDate(order?: CustomerOrder) {
  return formatDate(order?.event?.startDate || order?.event?.eventDate || order?.createdAt);
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

export default function CustomerSupportPage() {
  const [user, setUser] = useState<StoredUser>({});
  const [threads, setThreads] = useState<SupportThreadListItem[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [invites, setInvites] = useState<OperatorInvite[]>([]);
  const [inviteHistory, setInviteHistory] = useState<OperatorInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("tickets");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<SupportFilter>("all");
  const [opening, setOpening] = useState(false);
  const [inviteProcessingId, setInviteProcessingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    orderId: "",
    subject: "",
    message: "",
  });

  async function loadData() {
    const token = getToken();

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setUser(getStoredUser());

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    setLoading(true);

    try {
      const [threadsResult, ordersResult, invitesResult] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/support/customer`, { method: "GET", headers }),
        fetch(`${API_BASE_URL}/orders/customer`, { method: "GET", headers }),
        fetch(`${API_BASE_URL}/operator-assignments/me`, { method: "GET", headers }),
      ]);

      if (threadsResult.status === "fulfilled") {
        const data = await threadsResult.value.json().catch(() => []);
        if (threadsResult.value.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }
        setThreads(threadsResult.value.ok && Array.isArray(data) ? data : []);
      }

      if (ordersResult.status === "fulfilled") {
        const data = await ordersResult.value.json().catch(() => []);
        setOrders(ordersResult.value.ok && Array.isArray(data) ? data : []);
      }

      if (invitesResult.status === "fulfilled") {
        const data = await invitesResult.value.json().catch(() => []);
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        setInvites(list.filter((item: OperatorInvite) => ["PENDING", "INVITED"].includes(String(item.status || "").toUpperCase())));
        setInviteHistory(list.filter((item: OperatorInvite) => !["PENDING", "INVITED"].includes(String(item.status || "").toUpperCase())));
      }
    } catch (error) {
      console.error("CUSTOMER SUPPORT ERROR:", error);
      alert("Erro ao conectar com a API do suporte");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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

  async function handleOpenSupport(event: FormEvent) {
    event.preventDefault();

    const token = getToken();

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!form.orderId || form.subject.trim().length < 3 || form.message.trim().length < 3) {
      alert("Escolha um pedido/evento e preencha assunto e mensagem.");
      return;
    }

    setOpening(true);

    try {
      const response = await fetch(`${API_BASE_URL}/support/customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: form.orderId,
          subject: form.subject.trim(),
          message: form.message.trim(),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        alert(typeof data?.message === "string" ? data.message : "Erro ao abrir atendimento.");
        return;
      }

      if (data?.id) {
        window.location.href = `/support/${data.id}`;
        return;
      }

      alert("Atendimento aberto.");
      setForm({ orderId: "", subject: "", message: "" });
      setActiveTab("tickets");
      await loadData();
    } catch (error) {
      console.error("OPEN SUPPORT ERROR:", error);
      alert("Erro ao conectar com a API.");
    } finally {
      setOpening(false);
    }
  }

  async function respondInvite(invite: OperatorInvite, accepted: boolean) {
    const token = getToken();

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setInviteProcessingId(invite.id);

    const paths = [
      `/operator-assignments/${invite.id}/respond`,
      `/operator-assignments/${invite.id}/${accepted ? "accept" : "reject"}`,
      `/operator-assignments/invitations/${invite.id}/respond`,
    ];

    for (const path of paths) {
      try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            accepted,
            status: accepted ? "ACCEPTED" : "REJECTED",
          }),
        });

        if (response.ok) {
          alert(accepted ? "Convite aceito. Agora veja suas propostas na área Operadores." : "Convite recusado.");
          await loadData();
          setInviteProcessingId(null);
          return;
        }
      } catch {
        // tenta proximo endpoint
      }
    }

    setInvites((current) => current.filter((item) => item.id !== invite.id));
    setInviteHistory((current) => [
      {
        ...invite,
        status: accepted ? "ACCEPTED" : "REJECTED",
        respondedAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setInviteProcessingId(null);
    alert(accepted ? "Convite aceito localmente." : "Convite recusado localmente.");
  }

  const tabs: Array<[Tab, string, number | null]> = [
    ["tickets", "Meus chamados", summary.total],
    ["open", "Abrir suporte", null],
    ["invites", "Convites", invites.length],
    ["history", "Histórico", inviteHistory.length],
  ];

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className={cardClass()}>
          <p className="text-lg font-semibold text-slate-800">Carregando suporte...</p>
          <p className="mt-2 text-sm text-slate-500">Buscando seus atendimentos, convites e pedidos.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-[36px] bg-slate-950 text-white shadow-sm">
        <div className="grid gap-8 p-8 md:p-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.32em] text-orange-300">Central de suporte</p>
            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">Ajuda, convites e atendimento.</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/80 md:text-base">
              Abra chamados para produtores dos eventos comprados, acompanhe respostas e aceite convites para virar operador.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => setActiveTab("open")} className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">
                Abrir suporte
              </button>
              <Link href="/operator/dashboard" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">
                Área Operadores
              </Link>
            </div>
          </div>

          <div className="grid gap-4 self-start sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Chamados</p>
              <p className="mt-3 text-4xl font-black">{summary.active}</p>
              <p className="mt-1 text-sm text-white/70">em andamento</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.2em] text-white/55">Convites</p>
              <p className="mt-3 text-4xl font-black">{invites.length}</p>
              <p className="mt-1 text-sm text-white/70">aguardando resposta</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                activeTab === key ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700 hover:bg-orange-50"
              }`}
            >
              {label}
              {count !== null ? <span className="ml-2 opacity-70">({count})</span> : null}
            </button>
          ))}
        </div>
      </section>

      {activeTab === "tickets" ? (
        <>
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
                <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Meus atendimentos</p>
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
                <button type="button" onClick={() => setActiveTab("open")} className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                  Abrir suporte
                </button>
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
                              <p className="mt-1 text-xs text-slate-500">{formatDate(thread.event?.eventDate || thread.event?.startDate)}</p>
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
        </>
      ) : null}

      {activeTab === "open" ? (
        <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Abrir suporte</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Falar com o produtor</h2>
          <p className="mt-2 text-sm text-slate-500">Escolha um pedido/evento comprado. O chamado vira conversa em /support/id.</p>

          <form onSubmit={handleOpenSupport} className="mt-6 grid gap-4">
            <select
              value={form.orderId}
              onChange={(event) => setForm({ ...form, orderId: event.target.value })}
              className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-orange-400 focus:bg-white"
            >
              <option value="">Selecione um pedido/evento</option>
              {orders.map((order) => (
                <option key={order.id} value={order.id}>
                  {eventName(order)} • {orderDate(order)} • Pedido {order.id}
                </option>
              ))}
            </select>

            <input
              value={form.subject}
              onChange={(event) => setForm({ ...form, subject: event.target.value })}
              placeholder="Assunto"
              className="h-14 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none focus:border-orange-400 focus:bg-white"
            />

            <textarea
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              placeholder="Mensagem para o produtor ou atendimento"
              className="min-h-[160px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-orange-400 focus:bg-white"
            />

            <button
              type="submit"
              disabled={opening}
              className="h-14 rounded-2xl bg-[#ff6900] px-5 text-sm font-black text-white hover:bg-[#e85f00] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {opening ? "Abrindo..." : "Abrir chamado"}
            </button>
          </form>
        </section>
      ) : null}

      {activeTab === "invites" ? (
        <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Convites recebidos</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Convites para virar operador</h2>
          <p className="mt-2 text-sm text-slate-500">Depois do aceite, propostas de data e operação aparecem na área Operadores.</p>

          <div className="mt-6 grid gap-4">
            {invites.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-lg font-black text-slate-900">Nenhum convite pendente.</p>
              </div>
            ) : (
              invites.map((invite) => (
                <article key={invite.id} className="rounded-[28px] border border-orange-200 bg-orange-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(invite.status)}`}>{getStatusLabel(invite.status)}</span>
                      <h3 className="mt-4 text-2xl font-black text-slate-950">
                        {invite.invitedByName || invite.adminName || invite.organizer?.tradeName || invite.organizer?.legalName || "Produtor"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{invite.message || invite.notes || "Convite para atuar como operador."}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => respondInvite(invite, false)}
                        disabled={inviteProcessingId === invite.id}
                        className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                      >
                        Recusar
                      </button>
                      <button
                        type="button"
                        onClick={() => respondInvite(invite, true)}
                        disabled={inviteProcessingId === invite.id}
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        Aceitar
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {activeTab === "history" ? (
        <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">Histórico</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Convites respondidos</h2>

          <div className="mt-6 grid gap-4">
            {inviteHistory.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                <p className="text-lg font-black text-slate-900">Nenhum histórico de convite ainda.</p>
              </div>
            ) : (
              inviteHistory.map((invite) => (
                <article key={invite.id} className="rounded-[28px] border border-slate-200 bg-white p-5">
                  <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(invite.status)}`}>{getStatusLabel(invite.status)}</span>
                  <h3 className="mt-4 text-xl font-black text-slate-950">
                    {invite.invitedByName || invite.adminName || invite.organizer?.tradeName || invite.organizer?.legalName || "Produtor"}
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">{invite.respondedAt ? formatDate(invite.respondedAt) : "Sem data de resposta"}</p>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
