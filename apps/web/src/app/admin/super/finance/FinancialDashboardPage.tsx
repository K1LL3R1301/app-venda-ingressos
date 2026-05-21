"use client";

import SuperAdminNav from "../_components/SuperAdminNav";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

type EventItem = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  organizerId?: string | null;
};

type Organizer = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  email?: string | null;
};

type FinancialTotals = {
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
  filters?: Record<string, string | null>;
  rules?: {
    cancellationWalletPercent?: string;
    withdrawalBankPercentOfWallet?: string;
    withdrawalBankPercentOfOriginalTicket?: string;
    withdrawalFeePercentOfWallet?: string;
    withdrawalFeePercentOfOriginalTicket?: string;
    note?: string;
  };
  totals?: FinancialTotals;
  byOrganizer?: OrganizerRow[];
  latest?: {
    payments?: LatestPayment[];
    cancellations?: LatestCancellation[];
    bankWithdrawals?: LatestWithdrawal[];
  };
  scopeNotes?: Record<string, string>;
};

type LoadState = {
  user: User | null;
  token: string;
  loading: boolean;
  error: string;
  dashboard: FinancialDashboard | null;
  organizers: Organizer[];
  events: EventItem[];
};

type Period = "TODAY" | "WEEK" | "MONTH" | "YEAR" | "ALL" | "CUSTOM";

function num(value?: string | number | null) {
  if (value == null) return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(",", "."));
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

function eventName(event: EventItem) {
  return event.name || event.title || event.slug || event.id;
}

function organizerName(organizer: Organizer) {
  return organizer.tradeName || organizer.legalName || organizer.email || organizer.id;
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
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      {helper ? <p className="mt-2 text-sm font-semibold text-slate-500">{helper}</p> : null}
    </article>
  );
}

function RuleCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="rounded-[28px] border border-orange-200 bg-orange-50 p-5">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-600">
        {title}
      </p>
      <p className="mt-3 text-4xl font-black text-orange-950">{value}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-orange-800">{description}</p>
    </article>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  helper,
}: {
  label: string;
  value: number;
  max: number;
  helper?: string;
}) {
  const width = max > 0 ? Math.max(5, (value / max) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between gap-3 text-sm">
        <span className="truncate font-black text-slate-800">{label}</span>
        <span className="font-black text-slate-950">{money(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-[#19002f]"
          style={{ width: `${width}%` }}
        />
      </div>
      {helper ? <p className="text-xs font-semibold text-slate-500">{helper}</p> : null}
    </div>
  );
}


function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
      {children}
    </div>
  );
}

export default function FinancialDashboardPage() {
  const [state, setState] = useState<LoadState>({
    user: null,
    token: "",
    loading: true,
    error: "",
    dashboard: null,
    organizers: [],
    events: [],
  });

  const [period, setPeriod] = useState<Period>("YEAR");
  const [customFrom, setCustomFrom] = useState(`${new Date().getFullYear()}-01-01`);
  const [customTo, setCustomTo] = useState(dateInput(new Date()));
  const [organizerId, setOrganizerId] = useState("ALL");
  const [eventId, setEventId] = useState("ALL");

  const selectedEvents = useMemo(() => {
    if (organizerId === "ALL") return state.events;
    return state.events.filter((event) => event.organizerId === organizerId);
  }, [organizerId, state.events]);

  const dashboard = state.dashboard;
  const totals = dashboard?.totals || {};
  const byOrganizer = dashboard?.byOrganizer || [];
  const latestPayments = dashboard?.latest?.payments || [];
  const latestCancellations = dashboard?.latest?.cancellations || [];
  const latestWithdrawals = dashboard?.latest?.bankWithdrawals || [];
  const maxOrganizerRevenue = Math.max(
    1,
    ...byOrganizer.map((row) => num(row.paidPaymentsGrossTotal)),
  );

  async function loadData(next?: {
    period?: Period;
    customFrom?: string;
    customTo?: string;
    organizerId?: string;
    eventId?: string;
  }) {
    const chosenPeriod = next?.period || period;
    const chosenFrom = next?.customFrom ?? customFrom;
    const chosenTo = next?.customTo ?? customTo;
    const chosenOrganizerId = next?.organizerId || organizerId;
    const chosenEventId = next?.eventId || eventId;

    const token = sessionStorage.getItem("astro_session_token") || "";
    const rawUser = sessionStorage.getItem("astro_session_user") || "";

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    let user: User | null = null;

    try {
      user = rawUser ? JSON.parse(rawUser) : null;
    } catch {
      user = null;
    }

    if (String(user?.role || "").toUpperCase() !== "SUPER_ADMIN") {
      setState((current) => ({
        ...current,
        user,
        token,
        loading: false,
        error: "Esta área é exclusiva do SUPER_ADMIN.",
      }));
      return;
    }

    const range = getRange(chosenPeriod, chosenFrom, chosenTo);
    const params = new URLSearchParams();

    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (chosenOrganizerId !== "ALL") params.set("organizerId", chosenOrganizerId);
    if (chosenEventId !== "ALL") params.set("eventId", chosenEventId);

    setState((current) => ({ ...current, loading: true, error: "" }));

    async function get(path: string) {
      const response = await fetch(`${API}${path}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

      const organizers = Array.isArray(organizersResponse)
        ? organizersResponse
        : organizersResponse?.items || organizersResponse?.organizers || [];

      const events = Array.isArray(eventsResponse)
        ? eventsResponse
        : eventsResponse?.items || eventsResponse?.events || [];

      setState({
        user,
        token,
        loading: false,
        error: "",
        dashboard: financial,
        organizers,
        events,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        user,
        token,
        loading: false,
        error: error instanceof Error ? error.message : "Erro ao carregar financeiro.",
      }));
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function applyFilters() {
    loadData();
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

  function updatePeriod(value: Period) {
    setPeriod(value);
    loadData({ period: value });
  }

  if (state.loading && !dashboard) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] bg-white p-8 shadow-sm">
          Carregando painel financeiro auditável...
        </section>
      </main>
    );
  }

  if (state.error) {
    return (
      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-600">
            Acesso ou carregamento bloqueado
          </p>
          <h1 className="mt-3 text-3xl font-black text-rose-950">{state.error}</h1>
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
          Super admin • financeiro auditável
        </p>
        <h1 className="mt-4 text-4xl font-black md:text-5xl">
          Receita, wallet, saques e retenções.
        </h1>
        <p className="mt-4 max-w-4xl text-sm font-semibold leading-7 text-white/70">
          Painel conectado ao endpoint financeiro real. Ele separa pagamento bruto,
          pedidos ativos, cancelamentos, crédito de 80% na wallet, saque bancário com
          envio de 60% do valor original e retenções da plataforma.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Pagamentos brutos
            </p>
            <p className="mt-3 text-3xl font-black">
              {money(totals.paidPaymentsGrossTotal)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Pedidos ativos
            </p>
            <p className="mt-3 text-3xl font-black">
              {money(totals.activePaidOrdersTotal)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Banco líquido
            </p>
            <p className="mt-3 text-3xl font-black">{money(totals.bankPayoutNetTotal)}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/55">
              Retenção total
            </p>
            <p className="mt-3 text-3xl font-black">{money(totals.totalRetainedTotal)}</p>
          </div>
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
          {state.organizers.map((organizer) => (
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
          onClick={applyFilters}
          className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white"
        >
          Atualizar
        </button>
      </section>
<section className="grid gap-4 md:grid-cols-4">
        <Metric
          label="Pagamentos pagos"
          value={money(totals.paidPaymentsGrossTotal)}
          helper={`${totals.paidPaymentsCount || 0} pagamento(s)`}
        />
        <Metric
          label="Receita ativa"
          value={money(totals.activePaidOrdersTotal)}
          helper={`${totals.activePaidOrdersCount || 0} pedido(s) PAID ativo(s)`}
        />
        <Metric
          label="Cancelado original"
          value={money(totals.canceledOriginalTotal)}
          helper={`${totals.canceledOrdersCount || 0} pedido(s) cancelado(s)`}
        />
        <Metric
          label="Wallet creditada"
          value={money(totals.walletCreditTotal)}
          helper="80% do valor cancelado"
        />
        <Metric
          label="Retenção inicial"
          value={money(totals.cancellationRetainedTotal)}
          helper="20% retido no cancelamento"
        />
        <Metric
          label="Saque bruto wallet"
          value={money(totals.bankWithdrawalGrossTotal)}
          helper="Valor debitado da wallet"
        />
        <Metric
          label="Taxa de saque"
          value={money(totals.bankWithdrawalFeeTotal)}
          helper="Mais 20% do valor original"
        />
        <Metric
          label="Banco líquido"
          value={money(totals.bankPayoutNetTotal)}
          helper="60% do valor original"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <RuleCard
          title="Cancelamento"
          value={dashboard?.rules?.cancellationWalletPercent || "80%"}
          description="Ao cancelar, o cliente recebe 80% do valor original como crédito interno na wallet."
        />
        <RuleCard
          title="Saque para banco"
          value={dashboard?.rules?.withdrawalBankPercentOfOriginalTicket || "60%"}
          description="Ao sacar a wallet para banco, o valor líquido enviado equivale a 60% do ingresso original."
        />
        <RuleCard
          title="Taxa do saque"
          value={dashboard?.rules?.withdrawalFeePercentOfOriginalTicket || "20%"}
          description="A retirada para banco retém mais 20% do valor original, descontado do crédito da wallet."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Receita por organizador"
          description="Ranking calculado pelo endpoint financeiro real."
        >
          {byOrganizer.length ? (
            <div className="space-y-4">
              {byOrganizer.map((row) => (
                <Bar
                  key={row.organizerId}
                  label={row.organizerName}
                  value={num(row.paidPaymentsGrossTotal)}
                  max={maxOrganizerRevenue}
                  helper={`Ativo: ${money(row.activePaidOrdersTotal)} • Wallet: ${money(row.walletCreditTotal)} • Retido: ${money(row.cancellationRetainedTotal)}`}
                />
              ))}
            </div>
          ) : (
            <Empty>Nenhum organizador com movimento financeiro no filtro atual.</Empty>
          )}
        </Section>

        <Section
          title="Resumo operacional"
          description="Ingressos, check-ins e status financeiro no período."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Check-ins" value={totals.checkins || 0} />
            <Metric label="Tickets usados" value={totals.usedTickets || 0} />
            <Metric label="Tickets ativos" value={totals.activeTickets || 0} />
            <Metric
              label="Tickets em pedidos ativos"
              value={totals.totalTicketsInActivePaidOrders || 0}
            />
          </div>
          {dashboard?.rules?.note ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">
              {dashboard.rules.note}
            </p>
          ) : null}
        </Section>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Section title="Últimos pagamentos">
          {latestPayments.length ? (
            <div className="space-y-3">
              {latestPayments.map((payment) => (
                <article key={payment.id} className="rounded-2xl border bg-slate-50 p-4">
                  <p className="font-black text-slate-950">{money(payment.amount)}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {payment.eventName || "Evento"} • {payment.organizerName || "Organizador"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {dateTime(payment.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <Empty>Nenhum pagamento no filtro.</Empty>
          )}
        </Section>

        <Section title="Últimos cancelamentos">
          {latestCancellations.length ? (
            <div className="space-y-3">
              {latestCancellations.map((item) => (
                <article key={item.id} className="rounded-2xl border bg-slate-50 p-4">
                  <p className="font-black text-slate-950">
                    {money(item.originalAmount)} → {money(item.returnedAmount)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.mode} • {item.eventName || "Evento"}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {dateTime(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <Empty>Nenhum cancelamento no filtro.</Empty>
          )}
        </Section>

        <Section title="Últimos saques bancários">
          {latestWithdrawals.length ? (
            <div className="space-y-3">
              {latestWithdrawals.map((item) => (
                <article key={item.id} className="rounded-2xl border bg-slate-50 p-4">
                  <p className="font-black text-slate-950">
                    Banco {money(item.bankAmount)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Wallet {money(item.grossAmount)} • Taxa {money(item.feeAmount)}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {item.userName || item.userEmail || "Cliente"} • {dateTime(item.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <Empty>Nenhum saque no filtro.</Empty>
          )}
        </Section>
      </section>
    </main>
  );
}