"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type CancellationItem = {
  id: string;
  ticketId?: string;
  orderId?: string;
  mode?: string;
  originalAmount?: string | number;
  returnedAmount?: string | number;
  status?: string;
  createdAt?: string;
};

type OrderItem = {
  id: string;
  status?: string;
  createdAt?: string;
  event?: {
    id?: string;
    name?: string;
    description?: string;
    eventDate?: string;
  };
  cancellations?: CancellationItem[];
};

type WalletEntry = {
  id: string;
  orderId?: string;
  ticketId?: string;
  eventName: string;
  typeLabel: string;
  mode?: string;
  status?: string;
  originalAmount?: string | number;
  returnedAmount?: string | number;
  createdAt?: string;
};

function formatMoney(value?: string | number) {
  if (value === undefined || value === null) return "R$ 0,00";

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (Number.isNaN(numeric)) return `R$ ${value}`;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

function getStatusClasses(status?: string) {
  if (status === "CREDITED") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  if (status === "COMPLETED") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "REFUND_REQUESTED") {
    return "bg-orange-50 text-orange-700 border border-orange-200";
  }

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function getInitial(user: StoredUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
}

export default function CustomerWalletPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadWalletBase() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser) as StoredUser;
          setUser(parsedUser);
        } catch (error) {
          console.error("Erro ao ler usuário do localStorage:", error);
        }
      }

      try {
        const res = await fetch("http://localhost:3001/v1/orders/customer", {
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

        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("CUSTOMER WALLET ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadWalletBase();
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  function goTo(path: string) {
    window.location.href = path;
  }

  const walletEntries = useMemo(() => {
    const entries: WalletEntry[] = [];

    for (const order of orders) {
      for (const cancellation of order.cancellations || []) {
        if (cancellation.mode !== "WALLET_80") continue;

        entries.push({
          id: cancellation.id,
          orderId: cancellation.orderId,
          ticketId: cancellation.ticketId,
          eventName: order.event?.name || "Evento sem nome",
          typeLabel: cancellation.ticketId
            ? "Crédito por cancelamento de ingresso"
            : "Crédito por cancelamento de pedido",
          mode: cancellation.mode,
          status: cancellation.status,
          originalAmount: cancellation.originalAmount,
          returnedAmount: cancellation.returnedAmount,
          createdAt: cancellation.createdAt,
        });
      }
    }

    entries.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return entries;
  }, [orders]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return walletEntries;

    return walletEntries.filter((entry) => {
      const joined = [
        entry.eventName,
        entry.typeLabel,
        entry.mode,
        entry.status,
        entry.orderId,
        entry.ticketId,
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(term);
    });
  }, [walletEntries, search]);

  const walletSummary = useMemo(() => {
    const creditedEntries = walletEntries.filter(
      (entry) =>
        entry.mode === "WALLET_80" &&
        (entry.status === "CREDITED" || entry.status === "COMPLETED"),
    );

    const availableBalance = creditedEntries.reduce((sum, entry) => {
      const numeric =
        typeof entry.returnedAmount === "number"
          ? entry.returnedAmount
          : Number(String(entry.returnedAmount || 0).replace(",", "."));

      return sum + (Number.isNaN(numeric) ? 0 : numeric);
    }, 0);

    return {
      availableBalance,
      totalCredits: creditedEntries.length,
      totalEntries: walletEntries.length,
    };
  }, [walletEntries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
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
    <div className="min-h-screen bg-[#f6f7fb] text-gray-900">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="shrink-0 text-3xl font-black tracking-tight text-sky-600"
          >
            Sympla
          </button>

          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="flex h-12 flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
              <span className="mr-3 text-gray-400">🔎</span>
              <input
                type="text"
                placeholder="Buscar na wallet"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>

            <button
              type="button"
              className="h-12 rounded-2xl border border-violet-100 bg-violet-50 px-4 text-sm font-medium text-violet-700"
            >
              👛 Saldo disponível
            </button>
          </div>

          <nav className="ml-auto hidden items-center gap-5 md:flex">
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

        <div className="mx-auto px-4 pb-4 md:hidden">
          <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
            <span className="mr-3 text-gray-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar na wallet"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            Área do cliente
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Wallet
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
            Aqui ficam seus créditos gerados na plataforma, como os valores
            recebidos por cancelamentos com retorno em wallet.
          </p>

          <div className="mt-8 inline-flex rounded-[24px] bg-white/10 px-5 py-4 backdrop-blur">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                Saldo disponível
              </p>
              <p className="mt-2 text-4xl font-black">
                {formatMoney(walletSummary.availableBalance)}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Saldo disponível</p>
            <h2 className="mt-3 text-3xl font-black text-violet-600">
              {formatMoney(walletSummary.availableBalance)}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Créditos recebidos</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {walletSummary.totalCredits}
            </h2>
          </div>

          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">Lançamentos</p>
            <h2 className="mt-3 text-3xl font-black text-gray-900">
              {walletSummary.totalEntries}
            </h2>
          </div>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Extrato da wallet
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Histórico dos créditos gerados para sua conta
                </p>
              </div>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-gray-300 bg-gray-50 p-10 text-center text-gray-500">
                Nenhum crédito encontrado na wallet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[24px] border border-gray-100 bg-gray-50 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                              entry.status,
                            )}`}
                          >
                            {entry.status || "SEM STATUS"}
                          </span>

                          <span className="text-xs font-medium text-gray-400">
                            {entry.mode || "-"}
                          </span>
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-gray-900">
                          {entry.typeLabel}
                        </h3>

                        <p className="mt-1 text-sm text-gray-500">
                          {entry.eventName}
                        </p>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-gray-500">
                              Valor original
                            </p>
                            <p className="mt-1 font-semibold text-gray-900">
                              {formatMoney(entry.originalAmount)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-500">
                              Crédito gerado
                            </p>
                            <p className="mt-1 font-semibold text-violet-700">
                              {formatMoney(entry.returnedAmount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-[180px] rounded-2xl bg-white p-4">
                        <p className="text-sm text-gray-500">Data</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Como funciona
              </h2>

              <div className="mt-5 space-y-4 text-sm leading-6 text-gray-600">
                <p>
                  Quando você cancela um ingresso ou pedido escolhendo a opção
                  de crédito, o valor retorna para sua wallet da plataforma.
                </p>
                <p>
                  Pela regra atual, cancelamentos com wallet devolvem{" "}
                  <span className="font-semibold text-violet-700">80%</span> do
                  valor elegível.
                </p>
                <p>
                  Depois vamos ligar o uso desse saldo diretamente em novas
                  compras.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Próxima evolução
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Usar saldo da wallet em novas compras
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Débito automático do saldo no checkout
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Extrato financeiro mais completo
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}