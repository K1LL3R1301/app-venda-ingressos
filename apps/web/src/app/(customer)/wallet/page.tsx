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
  };
  balance?: string | number;
  transactions?: WalletTransaction[];
};

type WalletViewFilter = "all" | "credit" | "debit";

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number) {
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

function getTransactionTitle(transaction: WalletTransaction) {
  const source = String(transaction.source || "").toUpperCase();

  if (source === "ORDER_PAYMENT") {
    return "Compra usando wallet";
  }

  if (source === "TICKET_CANCELLATION") {
    return "Cancelamento de ingresso";
  }

  if (source === "ORDER_CANCELLATION") {
    return "Cancelamento de pedido";
  }

  return "Movimentação da wallet";
}

function getTransactionSourceLabel(source?: string) {
  const normalized = String(source || "").toUpperCase();

  if (normalized === "ORDER_PAYMENT") return "Pagamento";
  if (normalized === "TICKET_CANCELLATION") return "Ingresso cancelado";
  if (normalized === "ORDER_CANCELLATION") return "Pedido cancelado";

  return "Movimentação";
}

function getTransactionTypeLabel(type?: string) {
  if (type === "CREDIT") return "Crédito";
  if (type === "DEBIT") return "Débito";
  return "Movimentação";
}

function getTransactionTypeClasses(type?: string) {
  if (type === "CREDIT") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (type === "DEBIT") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border border-slate-200 bg-slate-50 text-slate-700";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
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
        const res = await fetch("http://localhost:3001/v1/users/me/wallet", {
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
    const totalCredits = transactions
      .filter((transaction) => transaction.type === "CREDIT")
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    const totalDebits = transactions
      .filter((transaction) => transaction.type === "DEBIT")
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    const computedBalance = totalCredits - totalDebits;
    const apiBalance = wallet?.balance;

    const latestTransaction = [...transactions].sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    })[0];

    return {
      totalCredits,
      totalDebits,
      computedBalance,
      totalTransactions: transactions.length,
      latestTransaction,
      finalBalance:
        apiBalance !== undefined && apiBalance !== null
          ? toNumber(apiBalance)
          : computedBalance,
    };
  }, [transactions, wallet?.balance]);

  const filteredTransactions = useMemo(() => {
    const term = search.trim().toLowerCase();

    return [...transactions]
      .filter((transaction) => {
        const matchesView =
          activeView === "all"
            ? true
            : activeView === "credit"
              ? transaction.type === "CREDIT"
              : activeView === "debit"
                ? transaction.type === "DEBIT"
                : true;

        if (!matchesView) return false;

        if (!term) return true;

        const haystack = [
          transaction.id,
          transaction.type,
          transaction.source,
          transaction.sourceId,
          transaction.description,
          getTransactionTitle(transaction),
          getTransactionSourceLabel(transaction.source),
        ]
          .join(" ")
          .toLowerCase();

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
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-800 text-white shadow-sm">
        <div className="grid gap-8 p-8 md:p-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
              Wallet
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
              Sua carteira digital
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
              Aqui você acompanha créditos de cancelamentos, débitos de compras
              e o saldo real disponível para usar nos próximos pedidos.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/events")}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                Usar saldo
              </button>

              <button
                type="button"
                onClick={() => goTo("/orders")}
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Ver meus pedidos
              </button>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                Usuário
              </p>
              <p className="mt-3 text-lg font-black text-white">
                {wallet?.user?.name || "Cliente"}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {wallet?.user?.email || "-"}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                Saldo atual
              </p>
              <p className="mt-3 text-3xl font-black text-white">
                {formatMoney(totals.finalBalance)}
              </p>
              <p className="mt-1 text-sm text-white/80">
                disponível no checkout
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
          <p className="mt-3 text-3xl font-black text-violet-700">
            {formatMoney(totals.finalBalance)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Valor pronto para usar.
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Créditos
          </p>
          <p className="mt-3 text-3xl font-black text-emerald-600">
            {formatMoney(totals.totalCredits)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Entradas na carteira.
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Débitos
          </p>
          <p className="mt-3 text-3xl font-black text-rose-600">
            {formatMoney(totals.totalDebits)}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Compras feitas com saldo.
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
              placeholder="Buscar crédito, débito, pedido, cancelamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
            {[
              { id: "all", label: "Tudo" },
              { id: "credit", label: "Créditos" },
              { id: "debit", label: "Débitos" },
            ].map((filter) => {
              const active = activeView === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveView(filter.id as WalletViewFilter)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
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
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-600">
                Extrato
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Movimentações da wallet
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Créditos e débitos reais da sua carteira.
              </p>
            </div>

            <button
              type="button"
              onClick={() => goTo("/events")}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Usar saldo
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
                const amount = toNumber(transaction.amount);

                return (
                  <div
                    key={transaction.id}
                    className="rounded-[24px] border border-slate-100 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getTransactionTypeClasses(
                              transaction.type,
                            )}`}
                          >
                            {getTransactionTypeLabel(transaction.type)}
                          </span>

                          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {getTransactionSourceLabel(transaction.source)}
                          </span>

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
                            isCredit ? "bg-emerald-50" : "bg-rose-50"
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
              Resumo rápido
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">Última movimentação</p>
                <p className="mt-2 font-semibold text-slate-900">
                  {totals.latestTransaction
                    ? getTransactionTitle(totals.latestTransaction)
                    : "Nenhuma movimentação"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {totals.latestTransaction
                    ? formatDate(totals.latestTransaction.createdAt)
                    : "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">Entradas totais</p>
                <p className="mt-2 text-xl font-black text-emerald-600">
                  {formatMoney(totals.totalCredits)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-sm text-slate-500">Saídas totais</p>
                <p className="mt-2 text-xl font-black text-rose-600">
                  {formatMoney(totals.totalDebits)}
                </p>
              </div>
            </div>
          </div>

          <div className={cardClass()}>
            <h2 className="text-2xl font-black text-slate-950">
              Como funciona
            </h2>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                Cancelamento com wallet gera crédito na carteira.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                Compra com wallet gera débito no extrato.
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-700">
                O checkout usa primeiro o saldo disponível.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-200 bg-violet-50 p-6 shadow-sm">
            <p className="text-sm font-semibold text-violet-900">
              Saldo pronto para uso
            </p>
            <p className="mt-2 text-3xl font-black text-violet-700">
              {formatMoney(totals.finalBalance)}
            </p>
            <p className="mt-3 text-sm leading-6 text-violet-800">
              Quando você usar a wallet no checkout, o débito aparecerá aqui no
              extrato automaticamente.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/events")}
                className="rounded-2xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-800"
              >
                Explorar eventos
              </button>

              <button
                type="button"
                onClick={() => goTo("/dashboard")}
                className="rounded-2xl border border-violet-200 bg-white px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-100/40"
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
