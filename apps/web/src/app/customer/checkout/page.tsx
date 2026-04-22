"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import CustomerHeader from "../../../components/customer/CustomerHeader";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type TicketTypeItem = {
  id: string;
  name?: string;
  lotLabel?: string;
  description?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
  salesEndAt?: string;
  feeAmount?: string | number;
  feeDescription?: string;
  benefitDescription?: string;
  isHidden?: boolean;
};

type EventDetail = {
  id: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
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
  message?: string;
};

type CheckoutCartItem = {
  ticketTypeId: string;
  quantity: number;
};

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

function parseRequestedItems(searchParams: URLSearchParams): CheckoutCartItem[] {
  const itemsParam = searchParams.get("items");

  if (itemsParam) {
    try {
      const parsed = JSON.parse(itemsParam) as Array<{
        ticketTypeId?: string;
        quantity?: number;
      }>;

      const normalized = (Array.isArray(parsed) ? parsed : [])
        .map((item) => ({
          ticketTypeId: String(item.ticketTypeId || "").trim(),
          quantity: Math.max(1, Number(item.quantity || 1)),
        }))
        .filter((item) => item.ticketTypeId);

      if (normalized.length > 0) {
        return normalized;
      }
    } catch (error) {
      console.error("Erro ao ler items do checkout:", error);
    }
  }

  const ticketTypeId = String(searchParams.get("ticketTypeId") || "").trim();
  const quantity = Math.max(1, Number(searchParams.get("quantity") || 1));

  if (!ticketTypeId) return [];

  return [
    {
      ticketTypeId,
      quantity,
    },
  ];
}

function mergeCartItems(items: CheckoutCartItem[]) {
  const grouped = new Map<string, number>();

  for (const item of items) {
    grouped.set(
      item.ticketTypeId,
      (grouped.get(item.ticketTypeId) || 0) + Math.max(1, item.quantity),
    );
  }

  return Array.from(grouped.entries()).map(([ticketTypeId, quantity]) => ({
    ticketTypeId,
    quantity,
  }));
}

export default function CustomerCheckoutPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [useWalletBalance, setUseWalletBalance] = useState(true);

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const eventId = searchParams.get("eventId") || "";
  const requestedItems = useMemo(
    () => parseRequestedItems(searchParams),
    [searchParams],
  );

  useEffect(() => {
    async function loadCheckoutBase() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (!eventId) {
        alert("Checkout inválido");
        window.location.href = "/customer/events";
        return;
      }

      if (requestedItems.length === 0) {
        alert("Nenhum ingresso selecionado");
        window.location.href = `/customer/events/${eventId}`;
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

        const availableTicketTypes = (eventData.ticketTypes || []).filter(
          (ticket: TicketTypeItem) => ticket.status === "ACTIVE" && !ticket.isHidden,
        );

        const normalizedItems = requestedItems.filter((item) =>
          availableTicketTypes.some((ticket: TicketTypeItem) => ticket.id === item.ticketTypeId),
        );

        if (normalizedItems.length === 0) {
          alert("Nenhum ingresso válido encontrado para este checkout");
          window.location.href = `/customer/events/${eventId}`;
          return;
        }

        setEvent(eventData);
        setWallet(walletData);
        setCartItems(mergeCartItems(normalizedItems));
      } catch (error) {
        console.error("CUSTOMER CHECKOUT ERROR:", error);
        alert("Erro ao conectar com a API");
        window.location.href = "/customer/events";
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutBase();
  }, [eventId, requestedItems]);

  function goTo(path: string) {
    window.location.href = path;
  }

  const activeTicketTypes = useMemo(
    () =>
      (event?.ticketTypes || []).filter(
        (ticket) => ticket.status === "ACTIVE" && !ticket.isHidden,
      ),
    [event],
  );

  const selectedItemsDetailed = useMemo(() => {
    return cartItems
      .map((item) => {
        const ticketType = activeTicketTypes.find(
          (ticket) => ticket.id === item.ticketTypeId,
        );

        if (!ticketType) return null;

        return {
          ...item,
          ticketType,
          unitPrice: toNumber(ticketType.price),
          totalPrice: toNumber(ticketType.price) * item.quantity,
        };
      })
      .filter(Boolean) as Array<{
      ticketTypeId: string;
      quantity: number;
      ticketType: TicketTypeItem;
      unitPrice: number;
      totalPrice: number;
    }>;
  }, [cartItems, activeTicketTypes]);

  const notSelectedTicketTypes = useMemo(() => {
    const selectedIds = new Set(cartItems.map((item) => item.ticketTypeId));
    return activeTicketTypes.filter((ticket) => !selectedIds.has(ticket.id));
  }, [activeTicketTypes, cartItems]);

  const subtotal = useMemo(
    () =>
      selectedItemsDetailed.reduce((sum, item) => sum + item.totalPrice, 0),
    [selectedItemsDetailed],
  );

  const totalTickets = useMemo(
    () => selectedItemsDetailed.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItemsDetailed],
  );

  const walletBalanceNumber = toNumber(wallet?.balance);
  const walletApplied = useWalletBalance
    ? Math.min(walletBalanceNumber, subtotal)
    : 0;
  const remainingAmount = Math.max(0, subtotal - walletApplied);
  const purchaseWillBePaid = remainingAmount === 0;

  function handleQuantityChange(ticketTypeId: string, nextQuantity: number) {
    setCartItems((prev) =>
      prev.map((item) =>
        item.ticketTypeId === ticketTypeId
          ? {
              ...item,
              quantity: Math.max(1, nextQuantity),
            }
          : item,
      ),
    );
  }

  function handleAddTicketType(ticketTypeId: string) {
    setCartItems((prev) =>
      mergeCartItems([
        ...prev,
        {
          ticketTypeId,
          quantity: 1,
        },
      ]),
    );
  }

  function handleRemoveTicketType(ticketTypeId: string) {
    setCartItems((prev) =>
      prev.filter((item) => item.ticketTypeId !== ticketTypeId),
    );
  }

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!event?.id) {
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

    if (selectedItemsDetailed.length === 0) {
      alert("Selecione pelo menos um ingresso");
      return;
    }

    for (const item of selectedItemsDetailed) {
      const availableQuantity =
        typeof item.ticketType.quantity === "number"
          ? item.ticketType.quantity
          : 0;

      if (item.quantity < 1) {
        alert(`Quantidade inválida para ${item.ticketType.name || "ingresso"}`);
        return;
      }

      if (availableQuantity > 0 && item.quantity > availableQuantity) {
        alert(
          `A quantidade de ${item.ticketType.name || "ingresso"} é maior do que a disponível`,
        );
        return;
      }
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
          items: selectedItemsDetailed.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
          })),
        }),
      });

      const data: CreateCustomerOrderResponse = await res.json();

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

  if (!event || selectedItemsDetailed.length === 0) {
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
      <CustomerHeader user={user} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[32px] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
            Checkout
          </p>

          <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
            Finalize seu pedido
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
            Agora você pode combinar setores e lotes diferentes no mesmo pedido,
            sem precisar abrir várias compras separadas.
          </p>
        </section>

        <section className="mt-10 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Dados do comprador
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

                <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        Itens selecionados
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Ajuste as quantidades dos setores e lotes no mesmo pedido.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {selectedItemsDetailed.map((item) => (
                      <div
                        key={item.ticketTypeId}
                        className="rounded-[22px] border border-gray-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            {item.ticketType.lotLabel ? (
                              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                                {item.ticketType.lotLabel}
                              </span>
                            ) : null}

                            <h4 className="mt-3 text-lg font-bold text-gray-900">
                              {item.ticketType.name || "Ingresso"}
                            </h4>

                            {item.ticketType.description ? (
                              <p className="mt-2 text-sm leading-6 text-gray-600">
                                {item.ticketType.description}
                              </p>
                            ) : null}

                            <div className="mt-3 space-y-1 text-sm text-gray-500">
                              <p>Valor unitário: {formatMoney(item.unitPrice)}</p>
                              <p>
                                Disponível: {item.ticketType.quantity ?? 0}
                              </p>
                              {item.ticketType.salesEndAt ? (
                                <p>
                                  Vendas até {formatDate(item.ticketType.salesEndAt)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveTicketType(item.ticketTypeId)}
                            className="rounded-2xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                          >
                            Remover
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  item.ticketTypeId,
                                  Math.max(1, item.quantity - 1),
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-lg font-bold text-gray-700 hover:bg-gray-50"
                            >
                              -
                            </button>

                            <input
                              type="number"
                              min={1}
                              max={item.ticketType.quantity || undefined}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(
                                  item.ticketTypeId,
                                  Math.max(1, Number(e.target.value || 1)),
                                )
                              }
                              className="w-24 rounded-2xl border border-gray-300 bg-white px-4 py-2 text-center outline-none focus:border-sky-500"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  item.ticketTypeId,
                                  item.quantity + 1,
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-lg font-bold text-gray-700 hover:bg-gray-50"
                            >
                              +
                            </button>
                          </div>

                          <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
                            <p className="text-xs uppercase tracking-[0.16em] text-gray-500">
                              Total deste item
                            </p>
                            <p className="mt-1 text-xl font-black text-gray-900">
                              {formatMoney(item.totalPrice)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {notSelectedTicketTypes.length > 0 ? (
                  <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                    <h3 className="text-lg font-bold text-gray-900">
                      Adicionar mais setores ou lotes
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Você pode combinar diferentes opções no mesmo pedido.
                    </p>

                    <div className="mt-5 space-y-3">
                      {notSelectedTicketTypes.map((ticket) => (
                        <div
                          key={ticket.id}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">
                              {ticket.lotLabel
                                ? `${ticket.name || "Ingresso"} • ${ticket.lotLabel}`
                                : ticket.name || "Ingresso"}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {formatMoney(ticket.price)} • disponível{" "}
                              {ticket.quantity ?? 0}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddTicketType(ticket.id)}
                            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                          >
                            Adicionar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

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
                  <p className="mt-1 text-sm text-gray-500">
                    {event.shortDescription || event.description || "Sem descrição"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Data</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {formatDate(event.startDate || event.eventDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Itens do pedido</p>
                  <div className="mt-3 space-y-3">
                    {selectedItemsDetailed.map((item) => (
                      <div
                        key={`summary-${item.ticketTypeId}`}
                        className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900">
                            {item.ticketType.name || "Ingresso"}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {item.ticketType.lotLabel || "Lote padrão"} • Qty{" "}
                            {item.quantity}
                          </p>
                        </div>

                        <p className="shrink-0 font-bold text-gray-900">
                          {formatMoney(item.totalPrice)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-gray-200 bg-white p-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm text-gray-500">Total de ingressos</p>
                      <p className="font-semibold text-gray-900">
                        {totalTickets}
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
                  Criar um pedido com vários setores/lotes
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