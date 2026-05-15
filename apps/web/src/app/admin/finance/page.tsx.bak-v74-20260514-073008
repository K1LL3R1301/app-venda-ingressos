"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderStatus =
  | "ALL"
  | "PAID"
  | "PENDING"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED"
  | string;

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
      accessMetadata?: unknown;
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

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type StatusFilter = "ALL" | "PAID" | "PENDING" | "CANCELED" | "REFUNDED";
type PeriodFilter = "ALL" | "TODAY" | "7D" | "30D" | "YEAR" | "CUSTOM";

type ChartPoint = {
  label: string;
  value: number;
};

type RankedItem = {
  key: string;
  label: string;
  amount: number;
  count: number;
  tickets: number;
};

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");

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
  return BRL_FORMATTER.format(toNumber(value));
}

function formatNumber(value?: number | null) {
  return NUMBER_FORMATTER.format(value || 0);
}

function formatPercent(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1).replace(".", ",") : "0,0"}%`;
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

function formatDateShort(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dayKey(value?: string | null) {
  if (!value) return "sem-data";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem-data";

  return dateInputValue(date);
}

function monthKey(value?: string | null) {
  if (!value) return "sem-mes";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sem-mes";

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  if (!/^\d{4}-\d{2}$/.test(key)) return key;

  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
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

  if (normalized === "PAID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

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
    CREDIT_CARD: "Cartão de crédito",
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

  const methods = Array.from(
    new Set(order.payments.map((payment) => getPaymentLabel(payment.method))),
  );

  return methods.join(", ");
}

function getLastPaymentStatus(order: OrderItem) {
  const payment = order.payments?.[0];
  return payment?.status || "-";
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
  return (order.items || []).reduce((total, item) => {
    return total + (item.tickets?.length || 0);
  }, 0);
}

function getTicketTypeNames(order: OrderItem) {
  const names = new Set<string>();

  (order.items || []).forEach((item) => {
    const name = item.ticketType?.name?.trim();
    if (name) names.add(name);
  });

  if (!names.size) return "-";

  const list = Array.from(names);
  if (list.length <= 2) return list.join(", ");

  return `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
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

function isPaid(order: OrderItem) {
  return normalizeStatus(order.status) === "PAID";
}

function getOrderAmount(order: OrderItem) {
  return toNumber(order.totalAmount);
}

function inPeriod(order: OrderItem, period: PeriodFilter, startDate: string, endDate: string) {
  if (period === "ALL") return true;

  const created = new Date(order.createdAt || "");
  if (Number.isNaN(created.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "TODAY") {
    return created >= startOfToday;
  }

  if (period === "7D") {
    return created.getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
  }

  if (period === "30D") {
    return created.getTime() >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
  }

  if (period === "YEAR") {
    return created.getFullYear() === now.getFullYear();
  }

  if (period === "CUSTOM") {
    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      if (created < start) return false;
    }

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59`);
      if (created > end) return false;
    }

    return true;
  }

  return true;
}

function getCsvCell(value: unknown) {
  const text = String(value ?? "").replace(/"/g, '""');

  return `"${text}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const csv = rows.map((row) => row.map(getCsvCell).join(";")).join("\n");
  const blob = new Blob(["\ufeff", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function makeLinePath(points: ChartPoint[], width = 760, height = 220) {
  if (!points.length) return "";

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const step = points.length <= 1 ? width : width / (points.length - 1);

  return points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point.value / maxValue) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function makeAreaPath(points: ChartPoint[], width = 760, height = 220) {
  const line = makeLinePath(points, width, height);
  if (!line) return "";

  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function makeRollingDays(days = 14) {
  const today = new Date();

  return Array.from({ length: days }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - 1 - index));
    return dateInputValue(date);
  });
}

function TopBar({ label, amount, max }: { label: string; amount: number; max: number }) {
  const width = max > 0 ? Math.max(4, (amount / max) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-black text-slate-900">{label}</span>
        <span className="shrink-0 font-black text-slate-700">{formatMoney(amount)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#19002f]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "dark" | "green" | "amber" | "red" | "purple";
}) {
  const classes = {
    default: "border-slate-200 bg-white text-slate-950",
    dark: "border-slate-950 bg-slate-950 text-white",
    green: "border-emerald-100 bg-emerald-50 text-emerald-950",
    amber: "border-amber-100 bg-amber-50 text-amber-950",
    red: "border-rose-100 bg-rose-50 text-rose-950",
    purple: "border-[#19002f]/10 bg-[#19002f] text-white",
  }[tone];

  return (
    <div className={`rounded-[24px] border p-5 shadow-sm ${classes}`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] opacity-60">{label}</p>
      <p className="mt-3 text-3xl font-black">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold opacity-65">{helper}</p> : null}
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [eventFilter, setEventFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("YEAR");
  const [startDate, setStartDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(() => dateInputValue(new Date()));
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const role = String(user?.role || "").toUpperCase();
  const isSuperAdmin = role === "SUPER_ADMIN";

  useEffect(() => {
    async function loadOrders() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        setUser(rawUser ? (JSON.parse(rawUser) as StoredUser) : null);
      } catch {
        setUser(null);
      }

      try {
        const res = await fetch("http://localhost:3001/v1/orders", {
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
              : "Erro ao carregar pedidos",
          );
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

      if (!inPeriod(order, periodFilter, startDate, endDate)) return false;

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
        getLastPaymentStatus(order),
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
  }, [sortedOrders, search, statusFilter, eventFilter, periodFilter, startDate, endDate]);

  const selectedOrder = useMemo(() => {
    return (
      filteredOrders.find((order) => order.id === selectedOrderId) ||
      filteredOrders[0] ||
      null
    );
  }, [filteredOrders, selectedOrderId]);

  const stats = useMemo(() => {
    const paid = filteredOrders.filter(isPaid);
    const pending = filteredOrders.filter(
      (order) => normalizeStatus(order.status) === "PENDING",
    );
    const canceled = filteredOrders.filter(isCanceledLike);
    const refundLike = filteredOrders.filter(isRefundLike);

    const grossPaid = paid.reduce((total, order) => total + getOrderAmount(order), 0);
    const pendingAmount = pending.reduce((total, order) => total + getOrderAmount(order), 0);
    const canceledAmount = canceled.reduce((total, order) => total + getOrderAmount(order), 0);
    const refundAmount = refundLike.reduce((total, order) => total + getOrderAmount(order), 0);
    const netOperational = Math.max(0, grossPaid - refundAmount);
    const ticketQuantity = paid.reduce((total, order) => total + getOrderLimitQuantity(order), 0);
    const qrQuantity = filteredOrders.reduce((total, order) => total + getOrderQrQuantity(order), 0);
    const averageTicket = paid.length ? grossPaid / paid.length : 0;
    const paidRate = filteredOrders.length ? (paid.length / filteredOrders.length) * 100 : 0;

    return {
      total: filteredOrders.length,
      paid: paid.length,
      pending: pending.length,
      canceled: canceled.length,
      refundLike: refundLike.length,
      grossPaid,
      pendingAmount,
      canceledAmount,
      refundAmount,
      netOperational,
      ticketQuantity,
      qrQuantity,
      averageTicket,
      paidRate,
      uniqueCustomerDocuments: new Set(
        paid.map((order) => order.customerDocument).filter(Boolean),
      ).size,
    };
  }, [filteredOrders]);

  const globalStats = useMemo(() => {
    const paid = orders.filter(isPaid);
    const gross = paid.reduce((total, order) => total + getOrderAmount(order), 0);
    const qrQuantity = orders.reduce((total, order) => total + getOrderQrQuantity(order), 0);

    return {
      total: orders.length,
      paid: paid.length,
      gross,
      qrQuantity,
    };
  }, [orders]);

  const dailyRevenue = useMemo<ChartPoint[]>(() => {
    const keys = makeRollingDays(14);
    const map = new Map(keys.map((key) => [key, 0]));

    filteredOrders.filter(isPaid).forEach((order) => {
      const key = dayKey(order.createdAt);
      if (!map.has(key)) return;
      map.set(key, (map.get(key) || 0) + getOrderAmount(order));
    });

    return keys.map((key) => ({
      label: formatDateShort(`${key}T00:00:00`),
      value: map.get(key) || 0,
    }));
  }, [filteredOrders]);

  const monthlyRevenue = useMemo<ChartPoint[]>(() => {
    const map = new Map<string, number>();

    filteredOrders.filter(isPaid).forEach((order) => {
      const key = monthKey(order.createdAt);
      map.set(key, (map.get(key) || 0) + getOrderAmount(order));
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }, [filteredOrders]);

  const paymentRanking = useMemo<RankedItem[]>(() => {
    const map = new Map<string, RankedItem>();

    filteredOrders.filter(isPaid).forEach((order) => {
      const method = getPaymentSummary(order);
      const current = map.get(method) || {
        key: method,
        label: method,
        amount: 0,
        count: 0,
        tickets: 0,
      };

      current.amount += getOrderAmount(order);
      current.count += 1;
      current.tickets += getOrderLimitQuantity(order);
      map.set(method, current);
    });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredOrders]);

  const eventRanking = useMemo<RankedItem[]>(() => {
    const map = new Map<string, RankedItem>();

    filteredOrders.filter(isPaid).forEach((order) => {
      const id = order.event?.id || order.eventId || getEventName(order);
      const current = map.get(id) || {
        key: id,
        label: getEventName(order),
        amount: 0,
        count: 0,
        tickets: 0,
      };

      current.amount += getOrderAmount(order);
      current.count += 1;
      current.tickets += getOrderLimitQuantity(order);
      map.set(id, current);
    });

    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [filteredOrders]);

  const statusDistribution = useMemo(() => {
    const entries = [
      { label: "Pagos", value: stats.paid, className: "bg-emerald-500", color: "#10b981" },
      { label: "Pendentes", value: stats.pending, className: "bg-amber-500", color: "#f59e0b" },
      { label: "Cancelados", value: stats.canceled, className: "bg-rose-500", color: "#f43f5e" },
      { label: "Estornos", value: stats.refundLike, className: "bg-sky-500", color: "#0ea5e9" },
    ];

    return entries.filter((entry) => entry.value > 0);
  }, [stats]);

  const maxDailyRevenue = Math.max(...dailyRevenue.map((point) => point.value), 1);
  const maxPaymentAmount = Math.max(...paymentRanking.map((item) => item.amount), 1);
  const maxEventAmount = Math.max(...eventRanking.map((item) => item.amount), 1);

  function setQuickStatus(next: StatusFilter) {
    setStatusFilter(next);
    setSelectedOrderId(null);
  }

  function exportOrdersCsv() {
    downloadCsv("astro-pedidos-filtrados.csv", [
      [
        "Pedido",
        "Data",
        "Status",
        "Evento",
        "Cliente",
        "Email",
        "Documento",
        "Forma de pagamento",
        "Valor",
        "Ingressos",
        "QR codes",
      ],
      ...filteredOrders.map((order) => [
        order.id,
        formatDate(order.createdAt),
        getStatusLabel(order.status),
        getEventName(order),
        getCustomerName(order),
        order.customerEmail || "",
        order.customerDocument || "",
        getPaymentSummary(order),
        getOrderAmount(order).toFixed(2).replace(".", ","),
        getOrderLimitQuantity(order),
        getOrderQrQuantity(order),
      ]),
    ]);
  }

  function exportTaxCsv() {
    downloadCsv("astro-relatorio-contabil-ir.csv", [
      ["Campo", "Valor"],
      ["Perfil do relatório", isSuperAdmin ? "SUPER_ADMIN, visão global" : "ADMIN, eventos próprios"],
      ["Período", periodFilter],
      ["Data inicial", startDate || "-"],
      ["Data final", endDate || "-"],
      ["Pedidos visíveis", stats.total],
      ["Pedidos pagos", stats.paid],
      ["Receita bruta paga", stats.grossPaid.toFixed(2).replace(".", ",")],
      ["Estornos/reembolsos estimados", stats.refundAmount.toFixed(2).replace(".", ",")],
      ["Receita líquida operacional estimada", stats.netOperational.toFixed(2).replace(".", ",")],
      ["Pedidos pendentes", stats.pending],
      ["Valor pendente", stats.pendingAmount.toFixed(2).replace(".", ",")],
      ["Pedidos cancelados/expirados/falhos", stats.canceled],
      ["Valor cancelado/expirado/falho", stats.canceledAmount.toFixed(2).replace(".", ",")],
      ["Ingressos pagos", stats.ticketQuantity],
      ["QR codes gerados", stats.qrQuantity],
      ["Ticket médio por pedido pago", stats.averageTicket.toFixed(2).replace(".", ",")],
      ["Documentos únicos em pedidos pagos", stats.uniqueCustomerDocuments],
      ["Observação", "Relatório operacional para conferência e contador. Não substitui escrituração, nota fiscal ou apuração tributária oficial."],
      [],
      ["Receita por mês"],
      ["Mês", "Valor"],
      ...monthlyRevenue.map((row) => [monthLabel(row.label), row.value.toFixed(2).replace(".", ",")]),
      [],
      ["Receita por forma de pagamento"],
      ["Forma", "Valor", "Pedidos", "Ingressos"],
      ...paymentRanking.map((row) => [
        row.label,
        row.amount.toFixed(2).replace(".", ","),
        row.count,
        row.tickets,
      ]),
      [],
      ["Receita por evento"],
      ["Evento", "Valor", "Pedidos", "Ingressos"],
      ...eventRanking.map((row) => [
        row.label,
        row.amount.toFixed(2).replace(".", ","),
        row.count,
        row.tickets,
      ]),
    ]);
  }

  function exportMonthlyCsv() {
    downloadCsv("astro-receita-mensal.csv", [
      ["Mês", "Receita paga"],
      ...monthlyRevenue.map((row) => [
        monthLabel(row.label),
        row.value.toFixed(2).replace(".", ","),
      ]),
    ]);
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[#020617] text-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">
              Central financeira {isSuperAdmin ? "global" : "do administrador"}
            </p>
            <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">
              Financeiro, pedidos e relatório para contador no mesmo painel.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Acompanhe receita paga, pendências, estornos, métodos de pagamento,
              eventos mais rentáveis e exporte bases para conferência fiscal.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={exportOrdersCsv}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                Exportar pedidos CSV
              </button>
              <button
                type="button"
                onClick={exportTaxCsv}
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition hover:bg-orange-600"
              >
                Exportar relatório IR/contador
              </button>
              <button
                type="button"
                onClick={exportMonthlyCsv}
                className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                Exportar mensal
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">
                Receita paga filtrada
              </p>
              <p className="mt-3 text-3xl font-black">{formatMoney(stats.grossPaid)}</p>
              <p className="mt-1 text-xs text-white/55">{stats.paid} pedido(s) pago(s)</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">
                Receita líquida estimada
              </p>
              <p className="mt-3 text-3xl font-black">{formatMoney(stats.netOperational)}</p>
              <p className="mt-1 text-xs text-white/55">pagos menos estornos estimados</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">
                Base geral carregada
              </p>
              <p className="mt-3 text-3xl font-black">{formatMoney(globalStats.gross)}</p>
              <p className="mt-1 text-xs text-white/55">{globalStats.total} pedido(s) no radar</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-white/55">
                QR codes
              </p>
              <p className="mt-3 text-3xl font-black">{formatNumber(globalStats.qrQuantity)}</p>
              <p className="mt-1 text-xs text-white/55">ingressos vinculados</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
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
          <p className="mt-1 text-xs font-semibold opacity-60">pedidos filtrados</p>
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
          <p className="mt-1 text-xs font-semibold opacity-60">{formatMoney(stats.grossPaid)}</p>
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
          <p className="mt-1 text-xs font-semibold opacity-60">{formatMoney(stats.pendingAmount)}</p>
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
          <p className="mt-1 text-xs font-semibold opacity-60">{formatMoney(stats.canceledAmount)}</p>
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
          <p className="mt-1 text-xs font-semibold opacity-60">{formatMoney(stats.refundAmount)}</p>
        </button>

        <MetricCard
          label="Ticket médio"
          value={formatMoney(stats.averageTicket)}
          helper={`${formatPercent(stats.paidRate)} de conversão paga`}
          tone="purple"
        />
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_220px_170px_160px_160px_160px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
              🔎
            </span>
            <input
              type="text"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
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
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400"
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
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400"
          >
            <option value="ALL">Todo período</option>
            <option value="TODAY">Hoje</option>
            <option value="7D">Últimos 7 dias</option>
            <option value="30D">Últimos 30 dias</option>
            <option value="YEAR">Ano atual</option>
            <option value="CUSTOM">Personalizado</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value);
              setPeriodFilter("CUSTOM");
            }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400"
          />

          <input
            type="date"
            value={endDate}
            onChange={(event) => {
              setEndDate(event.target.value);
              setPeriodFilter("CUSTOM");
            }}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400"
          />

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

      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">
                Receita diária
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Últimos 14 dias pagos
              </h2>
            </div>
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black">
              Pico: {formatMoney(maxDailyRevenue)}
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-3xl bg-slate-950 p-4">
            <svg viewBox="0 0 760 260" className="h-[260px] w-full">
              <defs>
                <linearGradient id="astroRevenueArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#ff6900" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#19002f" stopOpacity="0.05" />
                </linearGradient>
                <linearGradient id="astroRevenueLine" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#ff6900" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>

              {[0, 1, 2, 3].map((line) => (
                <line
                  key={line}
                  x1="0"
                  x2="760"
                  y1={30 + line * 55}
                  y2={30 + line * 55}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
              ))}

              <path d={makeAreaPath(dailyRevenue)} fill="url(#astroRevenueArea)" />
              <path
                d={makeLinePath(dailyRevenue)}
                fill="none"
                stroke="url(#astroRevenueLine)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {dailyRevenue.map((point, index) => {
                const x = dailyRevenue.length <= 1 ? 0 : (760 / (dailyRevenue.length - 1)) * index;
                const y = 220 - (point.value / maxDailyRevenue) * 220;

                return (
                  <g key={point.label}>
                    <circle cx={x} cy={y} r="5" fill="#fff" />
                    <text
                      x={x}
                      y="252"
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.65)"
                      fontSize="11"
                      fontWeight="700"
                    >
                      {point.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">
            Saúde dos pedidos
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Distribuição por status
          </h2>

          <div className="mt-6 flex items-center justify-center">
            <div
              className="flex h-56 w-56 items-center justify-center rounded-full"
              style={{
                background:
                  statusDistribution.length === 0
                    ? "conic-gradient(#e2e8f0 0deg 360deg)"
                    : (() => {
                        let current = 0;
                        const total = statusDistribution.reduce((sum, item) => sum + item.value, 0);

                        return `conic-gradient(${statusDistribution
                          .map((item) => {
                            const start = current;
                            const end = current + (item.value / total) * 360;
                            current = end;
                            return `${item.color} ${start}deg ${end}deg`;
                          })
                          .join(", ")})`;
                      })(),
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                <p className="text-3xl font-black">{stats.total}</p>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  pedidos
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {statusDistribution.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">
                Sem dados para o período.
              </p>
            ) : (
              statusDistribution.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${item.className}`} />
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </div>
                  <span className="text-sm font-black text-slate-950">{item.value}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <MetricCard
          label="Base para contador"
          value={formatMoney(stats.grossPaid)}
          helper="receita bruta paga do período"
          tone="green"
        />
        <MetricCard
          label="Abatimentos operacionais"
          value={formatMoney(stats.refundAmount)}
          helper="estornos/reembolsos estimados"
          tone="red"
        />
        <MetricCard
          label="Documentos únicos"
          value={stats.uniqueCustomerDocuments}
          helper="CPF/CNPJ em pedidos pagos"
          tone="default"
        />
      </section>

      <section className="rounded-[28px] border border-orange-200 bg-orange-50 p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">
              Relatório para IR e contabilidade
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Informações prontas para conferência fiscal.
            </h2>
            <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-700">
              Este painel organiza receita bruta paga, estornos estimados, receita líquida
              operacional, documentos de compradores, métodos de pagamento e receita por mês.
              Use a exportação para enviar ao contador. Ele não substitui escrituração,
              emissão fiscal ou apuração tributária oficial.
            </p>
          </div>

          <button
            type="button"
            onClick={exportTaxCsv}
            className="rounded-3xl bg-[#19002f] px-6 py-5 text-sm font-black text-white transition hover:bg-[#2a0648]"
          >
            Baixar relatório contábil completo
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">
            Formas de pagamento
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Receita paga por método
          </h2>

          <div className="mt-6 space-y-5">
            {paymentRanking.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                Nenhum pagamento pago encontrado.
              </p>
            ) : (
              paymentRanking.map((item) => (
                <TopBar
                  key={item.key}
                  label={`${item.label} • ${item.count} pedido(s)`}
                  amount={item.amount}
                  max={maxPaymentAmount}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">
            Eventos mais fortes
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            Receita paga por evento
          </h2>

          <div className="mt-6 space-y-5">
            {eventRanking.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                Nenhum evento com receita paga.
              </p>
            ) : (
              eventRanking.slice(0, 7).map((item) => (
                <TopBar
                  key={item.key}
                  label={`${item.label} • ${item.tickets} ingresso(s)`}
                  amount={item.amount}
                  max={maxEventAmount}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_390px]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">
                Livro operacional de vendas
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">Pedidos</h2>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
              <span className="text-slate-500">Receita filtrada: </span>
              <strong>{formatMoney(stats.grossPaid)}</strong>
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
                            selected ? "bg-orange-50/70" : "bg-white"
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
                          ? "border-orange-300 bg-orange-50"
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
              <p className="mt-2 text-sm text-slate-500">
                O resumo financeiro aparece aqui.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-600">
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
                  <p className="mt-2 font-black text-slate-950">
                    {getCustomerName(selectedOrder)}
                  </p>
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
                  <p className="mt-2 font-black text-slate-950">
                    {getEventName(selectedOrder)}
                  </p>
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

