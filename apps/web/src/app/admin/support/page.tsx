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

type SupportFilter = "all" | "queue" | "open" | "closed" | "unassigned";

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
    year: "2-digit",
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
  const normalized = String(status || "").toUpperCase();
  if (normalized === "OPEN") return "Aberto";
  if (normalized === "CUSTOMER_REPLY") return "Na fila";
  if (normalized === "PRODUCER_REPLY") return "Respondido";
  if (normalized === "CLOSED") return "Fechado";
  return status || "Sem status";
}

function getStatusClasses(status?: string) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CUSTOMER_REPLY") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (normalized === "OPEN") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (normalized === "PRODUCER_REPLY") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }
  if (normalized === "CLOSED") {
    return "border-slate-200 bg-slate-100 text-slate-600";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getAgeLabel(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(0, Math.floor(diffMs / 1000 / 60 / 60));

  if (diffHours < 1) return "agora";
  if (diffHours < 24) return `${diffHours}h`;
  const days = Math.floor(diffHours / 24);
  return `${days}d`;
}

function firstMessage(thread: SupportThreadListItem) {
  return thread.messages?.[0]?.message || "Sem mensagem.";
}

function rowNeedsAttention(thread: SupportThreadListItem) {
  const status = String(thread.status || "").toUpperCase();
  return status === "CUSTOMER_REPLY" || status === "OPEN";
}

export default function AdminSupportPage() {
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
        console.error("ADMIN SUPPORT LIST ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadThreads();
  }, []);

  const summary = useMemo(() => {
    return {
      total: threads.length,
      queue: threads.filter((item) => item.status === "CUSTOMER_REPLY").length,
      open: threads.filter((item) => item.status === "OPEN" || item.status === "PRODUCER_REPLY").length,
      closed: threads.filter((item) => item.status === "CLOSED").length,
      unassigned: threads.filter((item) => !item.assignedUser?.id).length,
    };
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const term = normalizeText(search);

    return [...threads]
      .filter((thread) => {
        const status = String(thread.status || "").toUpperCase();

        if (activeFilter === "queue" && status !== "CUSTOMER_REPLY") return false;
        if (activeFilter === "open" && !["OPEN", "PRODUCER_REPLY"].includes(status)) return false;
        if (activeFilter === "closed" && status !== "CLOSED") return false;
        if (activeFilter === "unassigned" && thread.assignedUser?.id) return false;

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
            thread.assignedUser?.name,
            thread.assignedUser?.email,
            firstMessage(thread),
            thread.status,
          ]
            .filter(Boolean)
            .join(" "),
        );

        return haystack.includes(term);
      })
      .sort((a, b) => {
        const attentionA = rowNeedsAttention(a) ? 1 : 0;
        const attentionB = rowNeedsAttention(b) ? 1 : 0;
        if (attentionA !== attentionB) return attentionB - attentionA;

        const aTime = new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [threads, search, activeFilter]);

  const filters: Array<{ id: SupportFilter; label: string; count: number }> = [
    { id: "all", label: "Todos", count: summary.total },
    { id: "queue", label: "Fila", count: summary.queue },
    { id: "open", label: "Ativos", count: summary.open },
    { id: "closed", label: "Fechados", count: summary.closed },
    { id: "unassigned", label: "Sem resp.", count: summary.unassigned },
  ];

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5">
      <section className="rounded-[28px] border border-slate-800 bg-slate-950 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
              Suporte operacional
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Atendimentos
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Fila compacta para responder clientes, abrir pedido e acessar evento sem rolagem gigante.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 lg:min-w-[560px]">
            <Metric label="Total" value={summary.total} />
            <Metric label="Fila" value={summary.queue} tone="danger" />
            <Metric label="Ativos" value={summary.open} tone="success" />
            <Metric label="Fechados" value={summary.closed} />
            <Metric label="Sem resp." value={summary.unassigned} tone="warning" />
          </div>
        </div>
      </section>

      <section className="sticky top-0 z-10 mt-5 rounded-[24px] border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <div className="flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4">
            <span className="mr-3 text-slate-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar cliente, pedido, evento, produtor, responsável ou mensagem..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
            {filters.map((filter) => {
              const active = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {filter.label} <span className="opacity-70">{filter.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-600">
              Fila
            </p>
            <h2 className="text-xl font-black text-slate-950">
              {loading ? "Carregando..." : `${filteredThreads.length} atendimento(s)`}
            </h2>
          </div>
          <p className="hidden text-sm text-slate-500 md:block">
            Os que precisam de resposta sobem automaticamente.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-slate-500">Carregando atendimentos...</div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-lg font-black text-slate-950">Nenhum atendimento encontrado.</p>
            <p className="mt-2 text-sm text-slate-500">Troque o filtro ou limpe a busca.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Atendimento</th>
                    <th className="px-5 py-3 font-bold">Cliente</th>
                    <th className="px-5 py-3 font-bold">Evento</th>
                    <th className="px-5 py-3 font-bold">Pedido</th>
                    <th className="px-5 py-3 font-bold">Responsável</th>
                    <th className="px-5 py-3 font-bold">Atualizado</th>
                    <th className="px-5 py-3 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredThreads.map((thread) => (
                    <SupportRow key={thread.id} thread={thread} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 xl:hidden">
              {filteredThreads.map((thread) => (
                <SupportMobileCard key={thread.id} thread={thread} />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  const valueClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "danger"
        ? "text-rose-300"
        : tone === "warning"
          ? "text-amber-300"
          : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className={`mt-1 text-2xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function SupportRow({ thread }: { thread: SupportThreadListItem }) {
  const organizerName = thread.organizer?.tradeName || thread.organizer?.legalName || "Produtor";
  const message = firstMessage(thread);

  return (
    <tr className="align-top transition hover:bg-slate-50/80">
      <td className="px-5 py-4">
        <div className="flex items-start gap-3">
          {rowNeedsAttention(thread) ? <span className="mt-2 h-2.5 w-2.5 rounded-full bg-rose-500" /> : <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-300" />}
          <div className="min-w-0">
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(thread.status)}`}>
              {getStatusLabel(thread.status)}
            </span>
            <p className="mt-2 max-w-[320px] truncate text-base font-black text-slate-950">
              {thread.subject || "Atendimento sem assunto"}
            </p>
            <p className="mt-1 max-w-[360px] truncate text-xs text-slate-500">{message}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[180px] truncate font-bold text-slate-900">{thread.customerName || "-"}</p>
        <p className="max-w-[180px] truncate text-xs text-slate-500">{thread.customerEmail || "-"}</p>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[220px] truncate font-bold text-slate-900">{thread.event?.name || "-"}</p>
        <p className="text-xs text-slate-500">{organizerName}</p>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[170px] truncate font-bold text-slate-900">#{thread.order?.id || "-"}</p>
        <p className="text-xs text-slate-500">
          {thread.order?.status || "-"} · {formatMoney(thread.order?.totalAmount)}
        </p>
      </td>

      <td className="px-5 py-4">
        <p className="max-w-[170px] truncate font-bold text-slate-900">{thread.assignedUser?.name || "Não atribuído"}</p>
        <p className="max-w-[170px] truncate text-xs text-slate-500">{thread.assignedUser?.email || "-"}</p>
      </td>

      <td className="px-5 py-4">
        <p className="font-bold text-slate-900">{getAgeLabel(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}</p>
        <p className="text-xs text-slate-500">{formatDate(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}</p>
      </td>

      <td className="px-5 py-4 text-right">
        <div className="flex justify-end gap-2">
          <Link href={`/admin/support/${thread.id}`} className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
            Atender
          </Link>
          {thread.order?.id ? (
            <Link href={`/orders/${thread.order.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-white">
              Pedido
            </Link>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function SupportMobileCard({ thread }: { thread: SupportThreadListItem }) {
  const organizerName = thread.organizer?.tradeName || thread.organizer?.legalName || "Produtor";

  return (
    <article className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusClasses(thread.status)}`}>
            {getStatusLabel(thread.status)}
          </span>
          <h3 className="mt-3 text-lg font-black text-slate-950">{thread.subject || "Atendimento sem assunto"}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{firstMessage(thread)}</p>
        </div>
        <p className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {getAgeLabel(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Info label="Cliente" value={thread.customerName || "-"} detail={thread.customerEmail || "-"} />
        <Info label="Evento" value={thread.event?.name || "-"} detail={organizerName} />
        <Info label="Pedido" value={`#${thread.order?.id || "-"}`} detail={`${thread.order?.status || "-"} · ${formatMoney(thread.order?.totalAmount)}`} />
        <Info label="Responsável" value={thread.assignedUser?.name || "Não atribuído"} detail={thread.assignedUser?.email || "-"} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/admin/support/${thread.id}`} className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">
          Atender
        </Link>
        {thread.order?.id ? (
          <Link href={`/orders/${thread.order.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            Ver pedido
          </Link>
        ) : null}
        {thread.event?.id ? (
          <Link href={`/events/${thread.event.id}`} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">
            Ver evento
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function Info({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-0.5 truncate text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}
