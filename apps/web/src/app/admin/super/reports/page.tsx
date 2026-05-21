"use client";

import SuperAdminNav from "../_components/SuperAdminNav";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type User = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Organizer = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  email?: string | null;
};

type EventItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  organizerId?: string | null;
};

type Totals = {
  paidPaymentsGrossTotal?: string | number;
  activePaidOrdersTotal?: string | number;
  paidPaymentsCount?: number;
  activePaidOrdersCount?: number;
  canceledOrdersCount?: number;
  canceledOriginalTotal?: string | number;
  walletCreditTotal?: string | number;
  cancellationRetainedTotal?: string | number;
  bankWithdrawalGrossTotal?: string | number;
  bankWithdrawalFeeTotal?: string | number;
  bankPayoutNetTotal?: string | number;
  totalRetainedTotal?: string | number;
  checkins?: number;
  usedTickets?: number;
  activeTickets?: number;
  totalTicketsInActivePaidOrders?: number;
};

type OrganizerRow = {
  organizerId: string;
  organizerName: string;
  paidPaymentsGrossTotal?: string | number;
  activePaidOrdersTotal?: string | number;
  canceledOriginalTotal?: string | number;
  walletCreditTotal?: string | number;
  cancellationRetainedTotal?: string | number;
  orders?: number;
};

type LatestPayment = {
  id: string;
  orderId?: string;
  amount?: string | number;
  status?: string;
  createdAt?: string;
  eventName?: string | null;
  organizerName?: string | null;
};

type LatestCancellation = {
  id: string;
  ticketId?: string;
  orderId?: string;
  mode?: string;
  originalAmount?: string | number;
  returnedAmount?: string | number;
  status?: string;
  createdAt?: string;
  eventName?: string | null;
};

type LatestWithdrawal = {
  id: string;
  userName?: string | null;
  userEmail?: string | null;
  grossAmount?: string | number;
  feeAmount?: string | number;
  bankAmount?: string | number;
  createdAt?: string;
};

type FinancialDashboard = {
  rules?: {
    cancellationWalletPercent?: string;
    withdrawalBankPercentOfWallet?: string;
    withdrawalBankPercentOfOriginalTicket?: string;
    withdrawalFeePercentOfWallet?: string;
    withdrawalFeePercentOfOriginalTicket?: string;
    note?: string;
  };
  totals?: Totals;
  byOrganizer?: OrganizerRow[];
  latest?: {
    payments?: LatestPayment[];
    cancellations?: LatestCancellation[];
    bankWithdrawals?: LatestWithdrawal[];
  };
};

type Period = "TODAY" | "WEEK" | "MONTH" | "YEAR" | "ALL" | "CUSTOM";

function num(value?: string | number | null) {
  if (value == null) return 0;

  const parsed =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num(value));
}

function dateTime(value?: string | null) {
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

function csvValue(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function downloadCsv(
  fileName: string,
  rows: Array<Array<string | number | null | undefined>>,
) {
  const body = rows.map((row) => row.map(csvValue).join(";")).join("\n");
  const blob = new Blob(["\ufeff", body], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

function fileStamp() {
  return new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRange(period: Period, customFrom: string, customTo: string) {
  const now = new Date();
  const to = new Date(now);
  const from = new Date(now);

  if (period === "ALL") {
    return { from: "", to: "" };
  }

  if (period === "CUSTOM") {
    return {
      from: customFrom ? `${customFrom}T00:00:00.000Z` : "",
      to: customTo ? `${customTo}T23:59:59.999Z` : "",
    };
  }

  if (period === "TODAY") {
    from.setHours(0, 0, 0, 0);
  }

  if (period === "WEEK") {
    from.setDate(now.getDate() - 7);
  }

  if (period === "MONTH") {
    from.setDate(now.getDate() - 30);
  }

  if (period === "YEAR") {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function organizerName(organizer: Organizer) {
  return organizer.tradeName || organizer.legalName || organizer.email || organizer.id;
}

function eventName(event: EventItem) {
  return event.name || event.title || event.slug || event.id;
}

function Card({
  title,
  description,
  children,
  accent = "slate",
}: {
  title: string;
  description: string;
  children: ReactNode;
  accent?: "slate" | "orange" | "blue" | "emerald" | "violet";
}) {
  const accentClass = {
    slate: "border-slate-200 bg-white",
    orange: "border-orange-200 bg-orange-50",
    blue: "border-blue-200 bg-blue-50",
    emerald: "border-emerald-200 bg-emerald-50",
    violet: "border-violet-200 bg-violet-50",
  }[accent];

  return (
    <article className={`rounded-[30px] border p-5 shadow-sm ${accentClass}`}>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 min-h-[48px] text-sm font-semibold leading-6 text-slate-600">
        {description}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">{children}</div>
    </article>
  );
}

function ActionButton({
  children,
  onClick,
  variant = "dark",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "dark" | "light" | "orange";
}) {
  const className =
    variant === "orange"
      ? "bg-orange-600 text-white hover:bg-orange-700"
      : variant === "light"
        ? "bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
        : "bg-slate-950 text-white hover:bg-slate-800";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-black transition ${className}`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default function SuperReportsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboard, setDashboard] = useState<FinancialDashboard | null>(null);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);

  const [period, setPeriod] = useState<Period>("YEAR");
  const [customFrom, setCustomFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [customTo, setCustomTo] = useState(dateInput(new Date()));
  const [organizerId, setOrganizerId] = useState("ALL");
  const [eventId, setEventId] = useState("ALL");

  const totals = dashboard?.totals || {};
  const byOrganizer = dashboard?.byOrganizer || [];
  const latestPayments = dashboard?.latest?.payments || [];
  const latestCancellations = dashboard?.latest?.cancellations || [];
  const latestWithdrawals = dashboard?.latest?.bankWithdrawals || [];

  const selectedEvents = useMemo(() => {
    if (organizerId === "ALL") return events;
    return events.filter((event) => event.organizerId === organizerId);
  }, [events, organizerId]);

  async function loadData(next?: {
    period?: Period;
    customFrom?: string;
    customTo?: string;
    organizerId?: string;
    eventId?: string;
  }) {
    const storedToken = sessionStorage.getItem("astro_session_token") || "";
    const rawUser = sessionStorage.getItem("astro_session_user") || "";

    if (!storedToken || storedToken === "undefined") {
      window.location.href = "/login";
      return;
    }

    let parsedUser: User | null = null;

    try {
      parsedUser = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      parsedUser = null;
    }

    if (String(parsedUser?.role || "").toUpperCase() !== "SUPER_ADMIN") {
      setUser(parsedUser);
      setToken(storedToken);
      setError("Esta central é exclusiva do SUPER_ADMIN.");
      setLoading(false);
      return;
    }

    const chosenPeriod = next?.period || period;
    const chosenFrom = next?.customFrom ?? customFrom;
    const chosenTo = next?.customTo ?? customTo;
    const chosenOrganizerId = next?.organizerId || organizerId;
    const chosenEventId = next?.eventId || eventId;

    const range = getRange(chosenPeriod, chosenFrom, chosenTo);
    const params = new URLSearchParams();

    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (chosenOrganizerId !== "ALL") params.set("organizerId", chosenOrganizerId);
    if (chosenEventId !== "ALL") params.set("eventId", chosenEventId);

    setLoading(true);
    setError("");

    async function get(path: string) {
      const response = await fetch(`${API}${path}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${storedToken}`,
        },
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(typeof json?.message === "string" ? json.message : `Erro em ${path}`);
      }

      return json;
    }

    try {
      const [financial, organizersResponse, eventsResponse] = await Promise.all([
        get(`/dashboard/financial?${params.toString()}`),
        get("/organizers"),
        get("/events"),
      ]);

      setUser(parsedUser);
      setToken(storedToken);
      setDashboard(financial);
      setOrganizers(
        Array.isArray(organizersResponse)
          ? organizersResponse
          : organizersResponse?.items || organizersResponse?.organizers || [],
      );
      setEvents(
        Array.isArray(eventsResponse)
          ? eventsResponse
          : eventsResponse?.items || eventsResponse?.events || [],
      );
      setLoading(false);
    } catch (caught) {
      setUser(parsedUser);
      setToken(storedToken);
      setError(caught instanceof Error ? caught.message : "Erro ao carregar relatórios.");
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updatePeriod(value: Period) {
    setPeriod(value);
    loadData({ period: value });
  }

  function updateOrganizer(value: string) {
    setOrganizerId(value);
    setEventId("ALL");
    loadData({ organizerId: value, eventId: "ALL" });
  }

  function updateEvent(value: string) {
    setEventId(value);
    loadData({ eventId: value });
  }

  function exportFinancialSummary() {
    downloadCsv(`relatorio-financeiro-resumo-${fileStamp()}.csv`, [
      ["Campo", "Valor", "Observacao"],
      ["Pagamentos brutos", num(totals.paidPaymentsGrossTotal).toFixed(2).replace(".", ","), "Total de pagamentos PAID no período"],
      ["Pedidos ativos pagos", num(totals.activePaidOrdersTotal).toFixed(2).replace(".", ","), "Pedidos PAID que seguem ativos"],
      ["Pedidos cancelados", totals.canceledOrdersCount || 0, "Quantidade de pedidos CANCELED"],
      ["Valor original cancelado", num(totals.canceledOriginalTotal).toFixed(2).replace(".", ","), "Valor cheio dos ingressos cancelados"],
      ["Crédito wallet 80%", num(totals.walletCreditTotal).toFixed(2).replace(".", ","), "Valor creditado na wallet"],
      ["Retenção inicial 20%", num(totals.cancellationRetainedTotal).toFixed(2).replace(".", ","), "Retenção no cancelamento"],
      ["Saque bruto wallet", num(totals.bankWithdrawalGrossTotal).toFixed(2).replace(".", ","), "Valor debitado da wallet"],
      ["Taxa saque", num(totals.bankWithdrawalFeeTotal).toFixed(2).replace(".", ","), "Taxa retida ao sacar para banco"],
      ["Banco líquido 60%", num(totals.bankPayoutNetTotal).toFixed(2).replace(".", ","), "Valor enviado ao banco"],
      ["Retenção total", num(totals.totalRetainedTotal).toFixed(2).replace(".", ","), "Retenção inicial + taxa de saque"],
      ["Check-ins", totals.checkins || 0, "Check-ins no período"],
      ["Tickets usados", totals.usedTickets || 0, "Tickets USED no escopo"],
      ["Tickets ativos", totals.activeTickets || 0, "Tickets AVAILABLE no escopo"],
    ]);
  }

  function exportOrganizerSummary() {
    downloadCsv(`relatorio-organizadores-${fileStamp()}.csv`, [
      [
        "Organizador ID",
        "Organizador",
        "Pagamentos brutos",
        "Pedidos ativos pagos",
        "Valor cancelado original",
        "Crédito wallet",
        "Retenção cancelamento",
        "Qtd pagamentos",
      ],
      ...byOrganizer.map((row) => [
        row.organizerId,
        row.organizerName,
        num(row.paidPaymentsGrossTotal).toFixed(2).replace(".", ","),
        num(row.activePaidOrdersTotal).toFixed(2).replace(".", ","),
        num(row.canceledOriginalTotal).toFixed(2).replace(".", ","),
        num(row.walletCreditTotal).toFixed(2).replace(".", ","),
        num(row.cancellationRetainedTotal).toFixed(2).replace(".", ","),
        row.orders || 0,
      ]),
    ]);
  }

  function exportPayments() {
    downloadCsv(`relatorio-pagamentos-${fileStamp()}.csv`, [
      ["Pagamento ID", "Pedido ID", "Data", "Status", "Organizador", "Evento", "Valor"],
      ...latestPayments.map((payment) => [
        payment.id,
        payment.orderId || "",
        dateTime(payment.createdAt),
        payment.status || "",
        payment.organizerName || "",
        payment.eventName || "",
        num(payment.amount).toFixed(2).replace(".", ","),
      ]),
    ]);
  }

  function exportCancellations() {
    downloadCsv(`relatorio-cancelamentos-wallet-${fileStamp()}.csv`, [
      ["Cancelamento ID", "Pedido ID", "Ticket ID", "Data", "Modo", "Status", "Evento", "Valor original", "Valor wallet"],
      ...latestCancellations.map((item) => [
        item.id,
        item.orderId || "",
        item.ticketId || "",
        dateTime(item.createdAt),
        item.mode || "",
        item.status || "",
        item.eventName || "",
        num(item.originalAmount).toFixed(2).replace(".", ","),
        num(item.returnedAmount).toFixed(2).replace(".", ","),
      ]),
    ]);
  }

  function exportWithdrawals() {
    downloadCsv(`relatorio-saques-bancarios-${fileStamp()}.csv`, [
      ["Saque ID", "Data", "Cliente", "Email", "Valor wallet", "Taxa", "Banco líquido"],
      ...latestWithdrawals.map((item) => [
        item.id,
        dateTime(item.createdAt),
        item.userName || "",
        item.userEmail || "",
        num(item.grossAmount).toFixed(2).replace(".", ","),
        num(item.feeAmount).toFixed(2).replace(".", ","),
        num(item.bankAmount).toFixed(2).replace(".", ","),
      ]),
    ]);
  }

  function exportEventReport() {
    downloadCsv(`relatorio-eventos-${fileStamp()}.csv`, [
      ["Filtro evento", "Pagamentos brutos", "Pedidos ativos", "Cancelado original", "Wallet", "Banco líquido", "Check-ins", "Tickets usados"],
      [
        eventId === "ALL" ? "Todos os eventos" : eventId,
        num(totals.paidPaymentsGrossTotal).toFixed(2).replace(".", ","),
        num(totals.activePaidOrdersTotal).toFixed(2).replace(".", ","),
        num(totals.canceledOriginalTotal).toFixed(2).replace(".", ","),
        num(totals.walletCreditTotal).toFixed(2).replace(".", ","),
        num(totals.bankPayoutNetTotal).toFixed(2).replace(".", ","),
        totals.checkins || 0,
        totals.usedTickets || 0,
      ],
    ]);
  }

  function exportOperationsReport() {
    downloadCsv(`relatorio-operacional-${fileStamp()}.csv`, [
      ["Métrica", "Valor"],
      ["Check-ins", totals.checkins || 0],
      ["Tickets usados", totals.usedTickets || 0],
      ["Tickets ativos", totals.activeTickets || 0],
      ["Tickets em pedidos ativos", totals.totalTicketsInActivePaidOrders || 0],
    ]);
  }

  function exportAllReports() {
    exportFinancialSummary();
    exportOrganizerSummary();
    exportPayments();
    exportCancellations();
    exportWithdrawals();
    exportEventReport();
    exportOperationsReport();
  }

  if (loading && !dashboard) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando central de relatórios...
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-600">
            Acesso ou carregamento bloqueado
          </p>
          <h1 className="mt-3 text-3xl font-black text-rose-950">{error}</h1>
          <button
            type="button"
            onClick={() => loadData()}
            className="mt-6 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-6">
      <section className="rounded-[34px] bg-[#020617] p-7 text-white shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.34em] text-orange-300">
          Super admin • central de relatórios
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Relatórios, exportações e fechamento.
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          Gere arquivos administrativos com base nos mesmos números auditáveis do painel
          financeiro. Primeiro em CSV, depois podemos evoluir para Excel e PDF oficial.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Metric
            label="Pagamentos brutos"
            value={money(totals.paidPaymentsGrossTotal)}
            helper={`${totals.paidPaymentsCount || 0} pagamento(s)`}
          />
          <Metric
            label="Wallet creditada"
            value={money(totals.walletCreditTotal)}
            helper="80% dos cancelamentos"
          />
          <Metric
            label="Banco líquido"
            value={money(totals.bankPayoutNetTotal)}
            helper="60% do original"
          />
          <Metric
            label="Retenção total"
            value={money(totals.totalRetainedTotal)}
            helper="Cancelamento + saque"
          />
        </div>
      </section>

      <SuperAdminNav />

      <section className="flex flex-wrap gap-3 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
        <select
          value={period}
          onChange={(event) => updatePeriod(event.target.value as Period)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
        >
          <option value="TODAY">Hoje</option>
          <option value="WEEK">Últimos 7 dias</option>
          <option value="MONTH">Últimos 30 dias</option>
          <option value="YEAR">Este ano</option>
          <option value="ALL">Todo período</option>
          <option value="CUSTOM">Personalizado</option>
        </select>

        {period === "CUSTOM" ? (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
            />
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
            />
          </>
        ) : null}

        <select
          value={organizerId}
          onChange={(event) => updateOrganizer(event.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
        >
          <option value="ALL">Todos os organizadores</option>
          {organizers.map((organizer) => (
            <option key={organizer.id} value={organizer.id}>
              {organizerName(organizer)}
            </option>
          ))}
        </select>

        <select
          value={eventId}
          onChange={(event) => updateEvent(event.target.value)}
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
        >
          <option value="ALL">Todos os eventos</option>
          {selectedEvents.map((event) => (
            <option key={event.id} value={event.id}>
              {eventName(event)}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => loadData()}
          className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
        >
          Atualizar
        </button>

        <button
          type="button"
          onClick={exportAllReports}
          className="h-12 rounded-2xl bg-orange-600 px-5 text-sm font-black text-white"
        >
          Exportar tudo
        </button>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card
          title="Financeiro geral"
          description="Resumo oficial de pagamentos, pedidos ativos, cancelamentos, wallet, saques, banco líquido e retenções."
          accent="orange"
        >
          <ActionButton onClick={exportFinancialSummary} variant="orange">
            Baixar CSV
          </ActionButton>
          <Link
            href="/admin/super/finance"
            className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-orange-700 ring-1 ring-orange-200"
          >
            Ver painel
          </Link>
        </Card>

        <Card
          title="Receita por organizador"
          description="Ranking de organizadores com pagamentos brutos, receita ativa, cancelamentos, wallet e retenções."
          accent="violet"
        >
          <ActionButton onClick={exportOrganizerSummary}>Baixar CSV</ActionButton>
        </Card>

        <Card
          title="Pagamentos"
          description="Últimos pagamentos processados no filtro atual, com pedido, evento, organizador, data, status e valor."
          accent="blue"
        >
          <ActionButton onClick={exportPayments}>Baixar CSV</ActionButton>
        </Card>

        <Card
          title="Cancelamentos e wallet"
          description="Cancelamentos com valor original, crédito de 80% na wallet, status, evento, pedido e ticket."
          accent="orange"
        >
          <ActionButton onClick={exportCancellations} variant="orange">
            Baixar CSV
          </ActionButton>
        </Card>

        <Card
          title="Saques bancários"
          description="Saques solicitados da wallet para banco, mostrando valor debitado, taxa e banco líquido."
          accent="emerald"
        >
          <ActionButton onClick={exportWithdrawals}>Baixar CSV</ActionButton>
        </Card>

        <Card
          title="Relatório por evento"
          description="Resumo financeiro e operacional do evento filtrado, útil para fechamento após produção."
          accent="slate"
        >
          <ActionButton onClick={exportEventReport}>Baixar CSV</ActionButton>
        </Card>

        <Card
          title="Check-in operacional"
          description="Resumo de check-ins, tickets usados, tickets ativos e tickets vinculados a pedidos ativos."
          accent="blue"
        >
          <ActionButton onClick={exportOperationsReport}>Baixar CSV</ActionButton>
        </Card>

        <Card
          title="Suporte"
          description="Reservado para relatório de chamados, reaberturas, encaminhamentos e tempo de atendimento."
        >
          <ActionButton onClick={() => alert("Relatório de suporte será conectado na próxima etapa.")} variant="light">
            Em breve
          </ActionButton>
        </Card>

        <Card
          title="Operadores"
          description="Reservado para relatório de check-ins por operador, eventos vinculados e atividades operacionais."
        >
          <ActionButton onClick={() => alert("Relatório de operadores será conectado na próxima etapa.")} variant="light">
            Em breve
          </ActionButton>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Últimos pagamentos</h2>
          <div className="mt-4 space-y-3">
            {latestPayments.slice(0, 5).map((payment) => (
              <article key={payment.id} className="rounded-2xl border bg-slate-50 p-4">
                <p className="font-black text-slate-950">{money(payment.amount)}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {payment.eventName || "Evento"} • {dateTime(payment.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Últimos cancelamentos</h2>
          <div className="mt-4 space-y-3">
            {latestCancellations.slice(0, 5).map((item) => (
              <article key={item.id} className="rounded-2xl border bg-slate-50 p-4">
                <p className="font-black text-slate-950">
                  {money(item.originalAmount)} → {money(item.returnedAmount)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {item.mode || "Cancelamento"} • {dateTime(item.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black text-slate-950">Últimos saques</h2>
          <div className="mt-4 space-y-3">
            {latestWithdrawals.slice(0, 5).map((item) => (
              <article key={item.id} className="rounded-2xl border bg-slate-50 p-4">
                <p className="font-black text-slate-950">
                  Banco {money(item.bankAmount)}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Wallet {money(item.grossAmount)} • Taxa {money(item.feeAmount)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}