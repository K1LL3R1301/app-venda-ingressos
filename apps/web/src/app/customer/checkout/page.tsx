"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TicketTypeItem = {
  id: string;
  name?: string;
  description?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
};

type EventDetail = {
  id: string;
  name?: string;
  description?: string;
  eventDate?: string;
  capacity?: number;
  status?: string;
  organizer?: {
    id?: string;
    tradeName?: string;
    legalName?: string;
  };
  ticketTypes?: TicketTypeItem[];
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
  balance?: string | number;
  transactions?: WalletTransaction[];
};

type CreateCustomerOrderResponse = {
  order?: {
    id?: string;
  };
  walletAppliedAmount?: string | number;
  remainingAmount?: string | number;
};

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR");
}

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

function getInitial(user: StoredUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
}

export default function CustomerCheckoutPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [selectedTicketType, setSelectedTicketType] =
    useState<TicketTypeItem | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [useWalletBalance, setUseWalletBalance] = useState(true);

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const eventId = searchParams.get("eventId") || "";
  const ticketTypeId = searchParams.get("ticketTypeId") || "";

  useEffect(() => {
    async function loadCheckoutBase() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (!eventId || !ticketTypeId) {
        alert("Checkout inválido");
        window.location.href = "/customer/events";
        return;
      }

      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser) as StoredUser;
          setUser(parsed);
          setCustomerName(parsed.name || "");
          setCustomerEmail(parsed.email || "");
        } catch (error) {
          console.error("Erro ao ler usuário do localStorage:", error);
        }
      }

      try {
        const [eventRes, walletRes] = await Promise.all([
          fetch(`http://localhost:3001/v1/events/${eventId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }),
          fetch("http://localhost:3001/v1/users/me/wallet", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const eventData = await eventRes.json();
        const walletData = await walletRes.json();

        if (!eventRes.ok) {
          alert(
            typeof eventData?.message === "string"
              ? eventData.message
              : "Erro ao carregar checkout",
          );
          window.location.href = "/customer/events";
          return;
        }

        if (!walletRes.ok) {
          alert(
            typeof walletData?.message === "string"
              ? walletData.message
              : "Erro ao carregar wallet",
          );
          return;
        }

        const foundTicketType = (eventData.ticketTypes || []).find(
          (ticket: TicketTypeItem) => ticket.id === ticketTypeId,
        );

        if (!foundTicketType) {
          alert("Tipo de ingresso não encontrado");
          window.location.href = `/customer/events/${eventId}`;
          return;
        }

        setEvent(eventData);
        setSelectedTicketType(foundTicketType);
        setWallet(walletData);
      } catch (error) {
        console.error("CUSTOMER CHECKOUT ERROR:", error);
        alert("Erro ao conectar com a API");
        window.location.href = "/customer/events";
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutBase();
  }, [eventId, ticketTypeId]);

  function goTo(path: string) {
    window.location.href = path;
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  const quantityNumber = Math.max(1, Number(quantity || 1));
  const unitPriceNumber = toNumber(selectedTicketType?.price);
  const subtotal = quantityNumber * unitPriceNumber;
  const walletBalanceNumber = toNumber(wallet?.balance);

  const walletApplied = useWalletBalance
    ? Math.min(walletBalanceNumber, subtotal)
    : 0;

  const remainingAmount = Math.max(0, subtotal - walletApplied);
  const purchaseWillBePaid = remainingAmount === 0;

  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!event?.id || !selectedTicketType?.id) {
      alert("Dados do checkout inválidos");
      return;
    }

    if (!customerName.trim()) {
      alert("Informe o nome");
      return;
    }

    if (!customerEmail.trim()) {
      alert("Informe o email");
      return;
    }

    if (!quantityNumber || quantityNumber < 1) {
      alert("Informe uma quantidade válida");
      return;
    }

    if (
      typeof selectedTicketType.quantity === "number" &&
      quantityNumber > selectedTicketType.quantity
    ) {
      alert("Quantidade maior do que a disponível");
      return;
    }

    setCreatingOrder(true);

    try {
      const res = await fetch("http://localhost:3001/v1/orders/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: event.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          useWalletBalance,
          items: [
            {
              ticketTypeId: selectedTicketType.id,
              quantity: quantityNumber,
            },
          ],
        }),
      });

      const data: CreateCustomerOrderResponse & { message?: string } =
        await res.json();

      if (!res.ok) {
        alert(
          typeof data?.message === "string"
            ? data.message
            : "Erro ao criar pedido",
        );
        return;
      }

      if (!data?.order?.id) {
        alert("Pedido criado, mas a API não retornou o id");
        window.location.href = "/customer/orders";
        return;
      }

      const walletUsedNumber = toNumber(data.walletAppliedAmount);
      const remainingNumber = toNumber(data.remainingAmount);

      if (walletUsedNumber > 0 && remainingNumber <= 0) {
        alert("Pedido criado e pago integralmente com a wallet");
      } else if (walletUsedNumber > 0) {
        alert("Pedido criado com abatimento da wallet");
      } else {
        alert("Pedido criado com sucesso");
      }

      window.location.href = `/customer/orders/${data.order.id}`;
    } catch (error) {
      console.error("CREATE CUSTOMER ORDER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCreatingOrder(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Carregando checkout...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!event || !selectedTicketType) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Checkout não encontrado.
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

          <nav className="ml-auto hidden items-center gap-5 md:flex">
            <button
              type="button"
              onClick={() => goTo("/customer/events")}
              className="text-sm font-semibold text-sky-600"
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
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
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
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            Checkout
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Finalize seu pedido
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
            Agora o checkout já pode usar seu saldo da wallet para reduzir ou
            quitar o valor da compra.
          </p>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900">
              Dados da compra
            </h2>

            <form onSubmit={handleCreateOrder} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Nome do comprador
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email do comprador
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                  placeholder="seuemail@exemplo.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Quantidade
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedTicketType.quantity || 1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value || 1)))
                  }
                  className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-sky-500"
                />
              </div>

              <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-violet-900">
                      Usar saldo da wallet
                    </p>
                    <p className="mt-1 text-sm leading-6 text-violet-800">
                      Saldo disponível: {formatMoney(walletBalanceNumber)}
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useWalletBalance}
                      onChange={(e) => setUseWalletBalance(e.target.checked)}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-sm text-gray-500">Abatimento da wallet</p>
                    <p className="mt-1 font-bold text-violet-700">
                      {formatMoney(walletApplied)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-sm text-gray-500">Valor restante</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {formatMoney(remainingAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-5">
                <p className="text-sm leading-6 text-sky-800">
                  {purchaseWillBePaid
                    ? "Com o saldo atual, este pedido pode ser quitado integralmente pela wallet."
                    : "Depois de criar o pedido, você seguirá para a tela do pedido para concluir o pagamento do valor restante."}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={creatingOrder}
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingOrder ? "Criando pedido..." : "Criar pedido"}
                </button>

                <button
                  type="button"
                  onClick={() => goTo(`/customer/events/${event.id}`)}
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Voltar ao evento
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Resumo do pedido
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Evento</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {event.name || "Evento sem nome"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatDate(event.eventDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Ingresso</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedTicketType.name || "Ingresso"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedTicketType.description || "Sem descrição"}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Valor unitário</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {formatMoney(selectedTicketType.price)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Disponível</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {selectedTicketType.quantity ?? 0}
                    </p>
                  </div>
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-500">Quantidade</p>
                      <p className="font-semibold text-gray-900">
                        {quantityNumber}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-500">Subtotal</p>
                      <p className="font-semibold text-gray-900">
                        {formatMoney(subtotal)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-500">Wallet aplicada</p>
                      <p className="font-semibold text-violet-700">
                        {formatMoney(walletApplied)}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-gray-700">
                          Valor restante
                        </p>
                        <p className="text-2xl font-black text-gray-900">
                          {formatMoney(remainingAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {purchaseWillBePaid ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                    Este pedido ficará pago automaticamente com a wallet.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                    Após criar o pedido, restará um valor pendente para pagar.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Próximo passo
              </h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Criar pedido
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Aplicar wallet automaticamente
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                  Pagar apenas o restante, se existir
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}