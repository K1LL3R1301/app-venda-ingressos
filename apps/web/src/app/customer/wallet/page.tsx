"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

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

  return date.toLocaleString("pt-BR");
}

function getInitial(user: StoredUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
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
    return "border border-red-200 bg-red-50 text-red-700";
  }

  return "border border-gray-200 bg-gray-50 text-gray-700";
}

export default function CustomerWalletPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function loadWallet() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (rawUser) {
        try {
          setUser(JSON.parse(rawUser) as StoredUser);
        } catch (error) {
          console.error("Erro ao ler usuário do localStorage:", error);
        }
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

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
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

    return {
      totalCredits,
      totalDebits,
      computedBalance,
      finalBalance:
        apiBalance !== undefined && apiBalance !== null
          ? toNumber(apiBalance)
          : computedBalance,
    };
  }, [transactions, wallet?.balance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Carregando wallet...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="shrink-0 text-3xl font-black tracking-tight text-sky-600"
          >
            Sympla
          </button>

          <nav className="ml-auto hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={() => goTo("/customer/events")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Eventos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/orders")}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Meus pedidos
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/wallet")}
              className="text-sm font-semibold text-sky-600"
            >
              Wallet
            </button>
          </nav>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex h-12 items-center gap-3 rounded-full border border-gray-200 bg-white px-3 shadow-sm hover:bg-gray-50"
            >
              <span className="text-lg">☰</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                {getInitial(user)}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="border-b border-gray-100 px-4 py-4">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.name || "Usuário"}
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-500">
                    {user?.email || "-"}
                  </p>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => goTo("/customer/dashboard")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Início
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/events")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Eventos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/orders")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Meus pedidos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/tickets")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Meus ingressos
                  </button>

                  <button
                    type="button"
                    onClick={() => goTo("/customer/wallet")}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Wallet
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            Wallet
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Sua carteira digital
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
            Aqui você acompanha créditos de cancelamentos, débitos de compras e
            o saldo real disponível para usar em novos pedidos.
          </p>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Saldo disponível</p>
            <h2 className="mt-3 text-3xl font-black text-violet-700">
              {formatMoney(totals.finalBalance)}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Este é o saldo que será usado no checkout
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total de créditos</p>
            <h2 className="mt-3 text-3xl font-black text-emerald-600">
              {formatMoney(totals.totalCredits)}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Cancelamentos e devoluções em carteira
            </p>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Total de débitos</p>
            <h2 className="mt-3 text-3xl font-black text-red-600">
              {formatMoney(totals.totalDebits)}
            </h2>
            <p className="mt-2 text-xs text-gray-500">
              Compras pagas com saldo da wallet
            </p>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Extrato da wallet
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Créditos e débitos reais da sua carteira
                </p>
              </div>

              <button
                type="button"
                onClick={() => goTo("/customer/events")}
                className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Usar saldo
              </button>
            </div>

            {transactions.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500">
                Nenhuma movimentação encontrada na wallet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {transactions.map((transaction) => {
                  const isCredit = transaction.type === "CREDIT";
                  const amount = toNumber(transaction.amount);

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-[24px] border border-gray-100 bg-gray-50 p-5"
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

                            <span className="text-xs text-gray-500">
                              {formatDate(transaction.createdAt)}
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-bold text-gray-900">
                            {getTransactionTitle(transaction)}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-gray-600">
                            {transaction.description || "Movimentação registrada na wallet."}
                          </p>

                          {transaction.sourceId ? (
                            <p className="mt-2 break-all text-xs text-gray-400">
                              Referência: {transaction.sourceId}
                            </p>
                          ) : null}
                        </div>

                        <div className="shrink-0">
                          <div
                            className={`rounded-2xl px-4 py-3 text-right ${
                              isCredit ? "bg-emerald-50" : "bg-red-50"
                            }`}
                          >
                            <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                              {isCredit ? "Entrada" : "Saída"}
                            </p>
                            <p
                              className={`mt-1 text-xl font-black ${
                                isCredit ? "text-emerald-700" : "text-red-700"
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
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Como funciona
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-700">
                  Cancelamento com wallet gera crédito
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-700">
                  Compra com wallet gera débito
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-4 text-sm text-gray-700">
                  O checkout usa primeiro o saldo disponível
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Atalhos rápidos
              </h2>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  onClick={() => goTo("/customer/events")}
                  className="rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Explorar eventos
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Ver meus pedidos
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/dashboard")}
                  className="rounded-2xl border border-gray-200 px-4 py-4 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Voltar ao dashboard
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-violet-200 bg-violet-50 p-6 shadow-sm">
              <p className="text-sm font-semibold text-violet-900">
                Saldo atual
              </p>
              <p className="mt-2 text-3xl font-black text-violet-700">
                {formatMoney(totals.finalBalance)}
              </p>
              <p className="mt-3 text-sm leading-6 text-violet-800">
                Se você pagar um evento com wallet, o débito aparecerá aqui no
                extrato e o saldo será atualizado corretamente.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}