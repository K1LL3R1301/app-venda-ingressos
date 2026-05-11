"use client";

import { useEffect, useMemo, useState } from "react";

type WalletTransaction = {
  id: string;
  type?: string;
  source?: string;
  sourceId?: string;
  amount?: string | number;
  description?: string;
  createdAt?: string;
};

type WalletSummary = {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    cpf?: string;
  };
  balance?: string | number;
  transactions?: WalletTransaction[];
};

type WalletViewFilter = "all" | "refunds" | "credit" | "debit";

const API_BASE_URL = "http://localhost:3001/v1";

function toNumber(value?: string | number | null) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
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

function normalizeText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isRefundTransaction(transaction: WalletTransaction) {
  const source = String(transaction.source || "").toUpperCase();
  const description = normalizeText(transaction.description);

  return (
    source === "TICKET_CANCELLATION" ||
    source === "ORDER_CANCELLATION" ||
    source.includes("REFUND") ||
    description.includes("estorno") ||
    description.includes("reembolso") ||
    description.includes("cancelamento")
  );
}

function getTransactionTitle(transaction: WalletTransaction) {
  const source = String(transaction.source || "").toUpperCase();

  if (source === "ORDER_PAYMENT") {
    return "Compra usando wallet";
  }

  if (source === "TICKET_CANCELLATION") {
    return "Estorno de ingresso na wallet";
  }

  if (source === "ORDER_CANCELLATION") {
    return "Estorno de pedido na wallet";
  }

  if (source.includes("REFUND")) {
    return "Reembolso na wallet";
  }

  return transaction.type === "CREDIT"
    ? "Crédito na wallet"
    : transaction.type === "DEBIT"
      ? "Débito da wallet"
      : "Movimentação da wallet";
}

function getTransactionSourceLabel(transaction: WalletTransaction) {
  const normalized = String(transaction.source || "").toUpperCase();

  if (normalized === "ORDER_PAYMENT") return "Pagamento com saldo";
  if (normalized === "TICKET_CANCELLATION") return "Estorno 80% por ingresso";
  if (normalized === "ORDER_CANCELLATION") return "Estorno de pedido";
  if (normalized.includes("REFUND")) return "Reembolso";

  return "Movimentação";
}

function getTransactionTypeLabel(type?: string) {
  if (type === "CREDIT") return "Crédito";
  if (type === "DEBIT") return "Débito";
  return "Movimentação";
}

function getTransactionTypeClasses(transaction: WalletTransaction) {
  if (transaction.type === "CREDIT") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (transaction.type === "DEBIT") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border border-slate-200 bg-slate-50 text-slate-700";
}

function cardClass(extra = "") {
  return `rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm ${extra}`;
}

function pillClass(active: boolean) {
  return active
    ? "border-slate-950 bg-slate-950 text-white"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
}

export default function CustomerWalletPage() {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeView, setActiveView] = useState<WalletViewFilter>("all");

  useEffect(() => {
    async function loadWallet() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/users/me/wallet`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (res.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          alert(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar wallet",
          );
          return;
        }

        setWallet(data);
      } catch (error) {
        console.error("CUSTOMER WALLET ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadWallet();
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  const transactions = wallet?.transactions || [];

  const totals = useMemo(() => {
    const credits = transactions.filter((transaction) => transaction.type === "CREDIT");
    const debits = transactions.filter((transaction) => transaction.type === "DEBIT");
    const refundCredits = credits.filter(isRefundTransaction);

    const totalCredits = credits.reduce(
      (sum, transaction) => sum + toNumber(transaction.amount),
      0,
    );

    const totalDebits = debits.reduce(
      (sum, transaction) => sum + toNumber(transaction.amount),
      0,
    );

    const totalRefundCredits = refundCredits.reduce(
      (sum, transaction) => sum + toNumber(transaction.amount),
      0,
    );

    const computedBalance = totalCredits - totalDebits;
    const apiBalance = wallet?.balance;

    const sortedTransactions = [...transactions].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return {
      totalCredits,
      totalDebits,
      totalRefundCredits,
      totalTransactions: transactions.length,
      refundCount: refundCredits.length,
      debitCount: debits.length,
      latestTransaction: sortedTransactions[0],
      latestRefund: sortedTransactions.find(isRefundTransaction),
      finalBalance:
        apiBalance !== undefined && apiBalance !== null
          ? toNumber(apiBalance)
          : computedBalance,
    };
  }, [transactions, wallet?.balance]);

  const filteredTransactions = useMemo(() => {
    const term = normalizeText(search);

    return [...transactions]
      .filter((transaction) => {
        const matchesView =
          activeView === "all"
            ? true
            : activeView === "refunds"
              ? isRefundTransaction(transaction)
              : activeView === "credit"
                ? transaction.type === "CREDIT"
                : activeView === "debit"
                  ? transaction.type === "DEBIT"
                  : true;

        if (!matchesView) return false;

        if (!term) return true;

        const haystack = normalizeText(
          [
            transaction.id,
            transaction.type,
            transaction.source,
            transaction.sourceId,
            transaction.description,
            getTransactionTitle(transaction),
            getTransactionSourceLabel(transaction),
          ].join(" "),
        );

        return haystack.includes(term);
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [transactions, activeView, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Carregando wallet...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-r from-slate-950 via-[#10172a] to-sky-900 text-white shadow-sm">
        <div className="grid gap-8 p-8 md:p-10 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-200">
              Wallet
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
              Carteira de créditos
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
              Todo estorno aprovado cai aqui como crédito. Por enquanto, o
              reembolso é automático para a wallet com 80% do valor de cada QR
              Code cancelado. A opção de saque/reembolso bancário ficará nesta
              tela quando o módulo financeiro estiver pronto.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/events")}
                className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-sky-600"
              >
                Usar saldo em eventos
              </button>

              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white/55"
                title="Será liberado quando o fluxo bancário estiver pronto."
              >
                Solicitar reembolso bancário em breve
              </button>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                Cliente
              </p>
              <p className="mt-3 text-lg font-black text-white">
                {wallet?.user?.name || "Cliente"}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {wallet?.user?.email || "-"}
              </p>
            </div>

            <div className="rounded-[28px] border border-sky-300/25 bg-sky-300/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-100">
                Saldo disponível
              </p>
              <p className="mt-3 text-4xl font-black text-white">
                {formatMoney(totals.finalBalance)}
              </p>
              <p className="mt-1 text-sm text-sky-100/80">
                liberado para usar no checkout
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Saldo disponível
          </p>
          <p className="mt-3 text-3xl font-black text-sky-700">
            {formatMoney(totals.finalBalance)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Valor pronto para abater no checkout.
          </p>
        </div>

        <div className={cardClass("border-emerald-200 bg-emerald-50/55")}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Estornos 80%
          </p>
          <p className="mt-3 text-3xl font-black text-emerald-700">
            {formatMoney(totals.totalRefundCredits)}
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            {totals.refundCount} QR Code(s) estornado(s).
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Usado em compras
          </p>
          <p className="mt-3 text-3xl font-black text-rose-600">
            {formatMoney(totals.totalDebits)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {totals.debitCount} pagamento(s) com wallet.
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Movimentações
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {totals.totalTransactions}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Registros no extrato.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="flex h-14 items-center rounded-2xl border border-slate-200 bg-white px-4">
            <span className="mr-3 text-slate-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar estorno, QR, pedido, compra com wallet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
            {[
              { id: "all", label: "Tudo" },
              { id: "refunds", label: "Estornos" },
              { id: "credit", label: "Créditos" },
              { id: "debit", label: "Débitos" },
            ].map((filter) => {
              const active = activeView === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveView(filter.id as WalletViewFilter)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${pillClass(
                    active,
                  )}`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={cardClass()}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
                Extrato
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Movimentações da wallet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Estornos individuais, pagamentos com saldo e ajustes ficam aqui.
              </p>
            </div>

            <button
              type="button"
              onClick={() => goTo("/orders")}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver pedidos
            </button>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
              Nenhuma movimentação encontrada com esse filtro.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filteredTransactions.map((transaction) => {
                const isCredit = transaction.type === "CREDIT";
                const isRefund = isRefundTransaction(transaction);
                const amount = toNumber(transaction.amount);

                return (
                  <div
                    key={transaction.id}
                    className={`rounded-[24px] border p-5 ${
                      isRefund
                        ? "border-emerald-200 bg-emerald-50/55"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getTransactionTypeClasses(
                              transaction,
                            )}`}
                          >
                            {getTransactionTypeLabel(transaction.type)}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {getTransactionSourceLabel(transaction)}
                          </span>

                          {isRefund ? (
                            <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-black text-emerald-700">
                              80% na wallet
                            </span>
                          ) : null}

                          <span className="text-xs text-slate-500">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-black text-slate-950">
                          {getTransactionTitle(transaction)}
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {transaction.description ||
                            "Movimentação registrada na wallet."}
                        </p>

                        {transaction.sourceId ? (
                          <p className="mt-2 break-all text-xs text-slate-400">
                            Referência: {transaction.sourceId}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0">
                        <div
                          className={`rounded-2xl px-4 py-3 text-right ${
                            isCredit ? "bg-emerald-100/70" : "bg-rose-50"
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                            {isCredit ? "Entrada" : "Saída"}
                          </p>
                          <p
                            className={`mt-1 text-xl font-black ${
                              isCredit ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatMoney(amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className={cardClass()}>
            <h2 className="text-2xl font-black text-slate-950">
              Reembolso bancário
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              O crédito já fica disponível na wallet. A retirada para banco será
              uma etapa separada, com dados bancários, revisão antifraude e
              status de processamento.
            </p>

            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Próxima fase
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-900">
                Solicitação de reembolso bancário, Pix de saída, conta de destino,
                taxa operacional e aprovação administrativa.
              </p>
            </div>

            <button
              type="button"
              disabled
              className="mt-5 w-full cursor-not-allowed rounded-2xl bg-slate-200 px-4 py-3 text-sm font-black text-slate-500"
            >
              Solicitar saque em breve
            </button>
          </div>

          <div className={cardClass()}>
            <h2 className="text-2xl font-black text-slate-950">
              Resumo rápido
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">Último estorno</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {totals.latestRefund
                    ? getTransactionTitle(totals.latestRefund)
                    : "Nenhum estorno ainda"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {totals.latestRefund
                    ? formatDate(totals.latestRefund.createdAt)
                    : "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                <p className="text-sm text-emerald-700">Total recebido por estorno</p>
                <p className="mt-2 text-xl font-black text-emerald-700">
                  {formatMoney(totals.totalRefundCredits)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">Saldo atual</p>
                <p className="mt-2 text-xl font-black text-sky-700">
                  {formatMoney(totals.finalBalance)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-sky-200 bg-sky-50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-sky-900">
              Como usar o saldo
            </p>
            <p className="mt-2 text-3xl font-black text-sky-700">
              {formatMoney(totals.finalBalance)}
            </p>
            <p className="mt-3 text-sm leading-6 text-sky-900">
              No checkout, marque a opção de usar wallet. O sistema abate o saldo
              disponível e registra o débito automaticamente no extrato.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/events")}
                className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Comprar com wallet
              </button>

              <button
                type="button"
                onClick={() => goTo("/dashboard")}
                className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100/40"
              >
                Voltar ao dashboard
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
