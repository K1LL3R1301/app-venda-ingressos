"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  eventId?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerDocument?: string | null;
  status?: string | null;
  totalAmount?: string | number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  event?: {
    id?: string | null;
    name?: string | null;
    eventDate?: string | null;
  } | null;
  items?: Array<{
    id: string;
    quantity?: number | null;
    unitPrice?: string | number | null;
    totalPrice?: string | number | null;
    ticketType?: {
      id?: string | null;
      name?: string | null;
    } | null;
    tickets?: Array<{
      id: string;
      code?: string | null;
      status?: string | null;
      accessKind?: string | null;
      accessLabel?: string | null;
    }>;
  }>;
  payments?: Array<{
    id: string;
    method?: string | null;
    amount?: string | number | null;
    status?: string | null;
    createdAt?: string | null;
  }>;
};

type StatusFilter = "ALL" | "PAID" | "PENDING" | "CANCELED" | "REFUNDED";
type PeriodFilter = "ALL" | "TODAY" | "7D" | "30D";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

function toNumber(value?: string | number | null) {
  if (typeof value === "number") return value;

  const normalized = String(value ?? "0")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function formatDate(value?: string | null) {
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

function normalize(value?: string | number | null) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeStatus(status?: string | null) {
  return String(status || "").toUpperCase();
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeStatus(status);

  const labels: Record<string, string> = {
    PAID: "Pago",
    PENDING: "Pendente",
    CANCELED: "Cancelado",
    CANCELLED: "Cancelado",
    EXPIRED: "Expirado",
    REFUNDED: "Reembolsado",
    PARTIALLY_REFUNDED: "Parcial",
    FAILED: "Falhou",
  };

  return labels[normalized] || status || "-";
}

function getStatusClasses(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (normalized === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (["CANCELED", "CANCELLED", "EXPIRED", "FAILED"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(normalized)) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getPaymentLabel(method?: string | null) {
  const normalized = String(method || "").toUpperCase();

  const labels: Record<string, string> = {
    PIX: "Pix",
    CARD: "Cartão",
    CREDIT_CARD: "Cartão",
    DEBIT_CARD: "Débito",
    BOLETO: "Boleto",
    CASH: "Dinheiro",
    MANUAL: "Manual",
    WALLET: "Wallet",
    COURTESY: "Cortesia",
    TRANSFER: "Transferência",
  };

  return labels[normalized] || method || "-";
}

function getPaymentSummary(order: OrderItem) {
  if (!order.payments?.length) return "-";

  return Array.from(new Set(order.payments.map((payment) => getPaymentLabel(payment.method)))).join(", ");
}

function getEventName(order: OrderItem) {
  return order.event?.name || order.eventId || "Evento não informado";
}

function getCustomerName(order: OrderItem) {
  return order.customerName || "Cliente não informado";
}

function getOrderLimitQuantity(order: OrderItem) {
  return (order.items || []).reduce((total, item) => {
    const qty = Number(item.quantity ?? 0);
    return total + (Number.isFinite(qty) ? qty : 0);
  }, 0);
}

function getOrderQrQuantity(order: OrderItem) {
  return (order.items || []).reduce((total, item) => total + (item.tickets?.length || 0), 0);
}

function getTicketTypeNames(order: OrderItem) {
  const names = new Set<string>();

  (order.items || []).forEach((item) => {
    const name = item.ticketType?.name?.trim();
    if (name) names.add(name);
  });

  if (!names.size) return "-";

  const list = Array.from(names);
  return list.length <= 2 ? list.join(", ") : `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
}

function isCanceledLike(order: OrderItem) {
  return ["CANCELED", "CANCELLED", "EXPIRED", "FAILED"].includes(normalizeStatus(order.status));
}

function isRefundLike(order: OrderItem) {
  const status = normalizeStatus(order.status);
  const ticketStatuses = (order.items || [])
    .flatMap((item) => item.tickets || [])
    .map((ticket) => normalizeStatus(ticket.status));

  return (
    status.includes("REFUND") ||
    ticketStatuses.some((ticketStatus) =>
      ["CANCELED", "CANCELLED", "REFUNDED"].includes(ticketStatus),
    )
  );
}

function isInPeriod(order: OrderItem, period: PeriodFilter) {
  if (period === "ALL") return true;

  const created = new Date(order.createdAt || "");
  if (Number.isNaN(created.getTime())) return false;

  const now = new Date();

  if (period === "TODAY") {
    return (
      created.getDate() === now.getDate() &&
      created.getMonth() === now.getMonth() &&
      created.getFullYear() === now.getFullYear()
    );
  }

  if (period === "7D") return created.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
  if (period === "30D") return created.getTime() >= now.getTime() - 30 * 24 * 60 * 60 * 1000;

  return true;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("ALL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          alert(typeof result?.message === "string" ? result.message : "Erro ao carregar pedidos");
          return;
        }

        const list = Array.isArray(result) ? result : [];
        setOrders(list);
        setSelectedOrderId(list[0]?.id || null);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aDate = new Date(a.createdAt || 0).getTime();
      const bDate = new Date(b.createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [orders]);

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();

    sortedOrders.forEach((order) => {
      const id = order.event?.id || order.eventId;
      if (!id) return;

      map.set(id, order.event?.name || id);
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [sortedOrders]);

  const filteredOrders = useMemo(() => {
    const term = normalize(search);

    return sortedOrders.filter((order) => {
      const status = normalizeStatus(order.status);

      if (statusFilter !== "ALL") {
        if (statusFilter === "CANCELED") {
          if (!isCanceledLike(order)) return false;
        } else if (statusFilter === "REFUNDED") {
          if (!isRefundLike(order)) return false;
        } else if (status !== statusFilter) {
          return false;
        }
      }

      if (eventFilter !== "ALL") {
        const orderEventId = order.event?.id || order.eventId;
        if (orderEventId !== eventFilter) return false;
      }

      if (!isInPeriod(order, periodFilter)) return false;

      if (!term) return true;

      const haystack = [
        order.id,
        order.customerName,
        order.customerEmail,
        order.customerDocument,
        order.status,
        order.totalAmount,
        order.event?.name,
        order.eventId,
        getPaymentSummary(order),
        ...(order.items?.flatMap((item) => [
          item.ticketType?.name,
          item.quantity,
          ...(item.tickets?.flatMap((ticket) => [
            ticket.code,
            ticket.status,
            ticket.accessKind,
            ticket.accessLabel,
          ]) || []),
        ]) || []),
      ]
        .map((value) => normalize(String(value ?? "")))
        .join(" ");

      return haystack.includes(term);
    });
  }, [sortedOrders, search, statusFilter, eventFilter, periodFilter]);

  const selectedOrder = useMemo(() => {
    return filteredOrders.find((order) => order.id === selectedOrderId) || filteredOrders[0] || null;
  }, [filteredOrders, selectedOrderId]);

  const stats = useMemo(() => {
    const paid = orders.filter((order) => normalizeStatus(order.status) === "PAID");
    const pending = orders.filter((order) => normalizeStatus(order.status) === "PENDING");
    const canceled = orders.filter(isCanceledLike);
    const refundLike = orders.filter(isRefundLike);
    const revenue = paid.reduce((total, order) => total + toNumber(order.totalAmount), 0);
    const accessCount = orders.reduce((total, order) => total + getOrderQrQuantity(order), 0);

    return {
      total: orders.length,
      paid: paid.length,
      pending: pending.length,
      canceled: canceled.length,
      refundLike: refundLike.length,
      revenue,
      accessCount,
    };
  }, [orders]);

  const visibleRevenue = useMemo(() => {
    return filteredOrders
      .filter((order) => normalizeStatus(order.status) === "PAID")
      .reduce((total, order) => total + toNumber(order.totalAmount), 0);
  }, [filteredOrders]);

  function setQuickStatus(next: StatusFilter) {
    setStatusFilter(next);
    setSelectedOrderId(null);
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[#020617] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-300">
              Central operacional
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              Pedidos, pagamentos e ingressos no mesmo radar.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Esta é a tela de pedidos. Para gráficos e relatório contábil, use a tela Financeiro.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">
                Receita paga
              </p>
              <p className="mt-3 text-3xl font-black">{formatMoney(stats.revenue)}</p>
              <p className="mt-1 text-xs text-white/55">{stats.paid} pedido(s) pago(s)</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">
                Acessos
              </p>
              <p className="mt-3 text-3xl font-black">{stats.accessCount}</p>
              <p className="mt-1 text-xs text-white/55">QR Codes vinculados</p>
            </div>

            <Link
              href="/admin/finance"
              className="rounded-2xl border border-white/15 bg-white px-5 py-4 text-center text-sm font-black text-slate-950 transition hover:bg-slate-100"
            >
              Ver financeiro
            </Link>

            <Link
              href="/admin/support"
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-white/15"
            >
              Abrir suporte
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setQuickStatus("ALL")}
          className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
            statusFilter === "ALL"
              ? "border-slate-950 bg-slate-950 text-white"
              : "border-slate-200 bg-white text-slate-950 hover:border-slate-300"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">Total</p>
          <p className="mt-3 text-3xl font-black">{stats.total}</p>
        </button>

        <button
          type="button"
          onClick={() => setQuickStatus("PAID")}
          className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
            statusFilter === "PAID"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-100 bg-white text-slate-950 hover:border-emerald-300"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">Pagos</p>
          <p className="mt-3 text-3xl font-black">{stats.paid}</p>
        </button>

        <button
          type="button"
          onClick={() => setQuickStatus("PENDING")}
          className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
            statusFilter === "PENDING"
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-amber-100 bg-white text-slate-950 hover:border-amber-300"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">Pendentes</p>
          <p className="mt-3 text-3xl font-black">{stats.pending}</p>
        </button>

        <button
          type="button"
          onClick={() => setQuickStatus("CANCELED")}
          className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
            statusFilter === "CANCELED"
              ? "border-rose-600 bg-rose-600 text-white"
              : "border-rose-100 bg-white text-slate-950 hover:border-rose-300"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">Cancelados</p>
          <p className="mt-3 text-3xl font-black">{stats.canceled}</p>
        </button>

        <button
          type="button"
          onClick={() => setQuickStatus("REFUNDED")}
          className={`rounded-[24px] border p-5 text-left shadow-sm transition ${
            statusFilter === "REFUNDED"
              ? "border-sky-600 bg-sky-600 text-white"
              : "border-sky-100 bg-white text-slate-950 hover:border-sky-300"
          }`}
        >
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">Estornos</p>
          <p className="mt-3 text-3xl font-black">{stats.refundLike}</p>
        </button>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_220px_180px_180px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
              🔎
            </span>
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
              placeholder="Buscar por cliente, email, CPF, evento, pedido, QR Code ou status..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            value={eventFilter}
            onChange={(event) => {
              setEventFilter(event.target.value);
              setSelectedOrderId(null);
            }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-400"
          >
            <option value="ALL">Todos os eventos</option>
            {eventOptions.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>

          <select
            value={periodFilter}
            onChange={(event) => {
              setPeriodFilter(event.target.value as PeriodFilter);
              setSelectedOrderId(null);
            }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-sky-400"
          >
            <option value="ALL">Todo período</option>
            <option value="TODAY">Hoje</option>
            <option value="7D">Últimos 7 dias</option>
            <option value="30D">Últimos 30 dias</option>
          </select>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
              Visível
            </p>
            <p className="font-black text-slate-950">
              {filteredOrders.length} pedido(s)
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
                Lista de compras
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Pedidos</h2>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Receita filtrada: </span>
              <strong>{formatMoney(visibleRevenue)}</strong>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-slate-500">Carregando pedidos...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-lg font-black text-slate-950">Nenhum pedido encontrado.</p>
              <p className="mt-2 text-sm text-slate-500">
                Ajuste os filtros ou limpe a busca para ver mais resultados.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-5 py-4">Pedido</th>
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Evento</th>
                      <th className="px-5 py-4">Ingressos</th>
                      <th className="px-5 py-4">Valor</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Criado</th>
                      <th className="px-5 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const selected = selectedOrder?.id === order.id;

                      return (
                        <tr
                          key={order.id}
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`cursor-pointer border-b border-slate-100 align-top transition hover:bg-slate-50 ${
                            selected ? "bg-sky-50/70" : "bg-white"
                          }`}
                        >
                          <td className="px-5 py-4">
                            <p className="max-w-[150px] truncate font-black text-slate-950">
                              #{order.id}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {getPaymentSummary(order)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-bold text-slate-950">{getCustomerName(order)}</p>
                            <p className="mt-1 max-w-[180px] truncate text-xs text-slate-500">
                              {order.customerEmail || "-"}
                            </p>
                            <p className="mt-1 max-w-[180px] truncate text-xs text-slate-400">
                              {order.customerDocument || "sem documento"}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[210px] truncate font-bold text-slate-950">
                              {getEventName(order)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatDate(order.event?.eventDate)}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-950">
                              {getOrderLimitQuantity(order)} limite / {getOrderQrQuantity(order)} QR
                            </p>
                            <p className="mt-1 max-w-[210px] truncate text-xs text-slate-500">
                              {getTicketTypeNames(order)}
                            </p>
                          </td>

                          <td className="px-5 py-4 font-black text-slate-950">
                            {formatMoney(order.totalAmount)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                                order.status,
                              )}`}
                            >
                              {getStatusLabel(order.status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-xs text-slate-500">
                            {formatDate(order.createdAt)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/orders/${order.id}`}
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                            >
                              Abrir
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 xl:hidden">
                {filteredOrders.map((order) => {
                  const selected = selectedOrder?.id === order.id;

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        selected
                          ? "border-sky-300 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950">#{order.id}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-700">
                            {getCustomerName(order)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                            order.status,
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      <p className="mt-3 truncate text-sm text-slate-500">{getEventName(order)}</p>

                      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">Valor</p>
                          <p className="mt-1 font-black text-slate-950">
                            {formatMoney(order.totalAmount)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">Limite</p>
                          <p className="mt-1 font-black text-slate-950">
                            {getOrderLimitQuantity(order)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3">
                          <p className="text-slate-400">QRs</p>
                          <p className="mt-1 font-black text-slate-950">
                            {getOrderQrQuantity(order)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
          {!selectedOrder ? (
            <div className="rounded-3xl bg-slate-50 p-6 text-center">
              <p className="font-black text-slate-950">Selecione um pedido</p>
              <p className="mt-2 text-sm text-slate-500">O resumo operacional aparece aqui.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
                    Pedido selecionado
                  </p>
                  <h3 className="mt-2 truncate text-2xl font-black text-slate-950">
                    #{selectedOrder.id}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                    selectedOrder.status,
                  )}`}
                >
                  {getStatusLabel(selectedOrder.status)}
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Cliente
                  </p>
                  <p className="mt-2 font-black text-slate-950">{getCustomerName(selectedOrder)}</p>
                  <p className="mt-1 break-all text-sm text-slate-500">
                    {selectedOrder.customerEmail || "-"}
                  </p>
                  {selectedOrder.customerDocument ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Documento: {selectedOrder.customerDocument}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Evento
                  </p>
                  <p className="mt-2 font-black text-slate-950">{getEventName(selectedOrder)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(selectedOrder.event?.eventDate)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl bg-emerald-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                      Valor
                    </p>
                    <p className="mt-2 text-xl font-black text-emerald-950">
                      {formatMoney(selectedOrder.totalAmount)}
                    </p>
                  </div>

                  <div className="rounded-3xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                      Pagamento
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {getPaymentSummary(selectedOrder)}
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    Ingressos
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-950">
                    {getOrderLimitQuantity(selectedOrder)} ingresso(s) no pedido
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {getOrderQrQuantity(selectedOrder)} QR code(s) vinculado(s)
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {getTicketTypeNames(selectedOrder)}
                  </p>
                </div>

                <Link
                  href={`/orders/${selectedOrder.id}`}
                  className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-slate-800"
                >
                  Abrir pedido completo
                </Link>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

