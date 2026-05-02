"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

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

type OrganizerInfo = {
  id?: string;
  tradeName?: string;
  legalName?: string;
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
  checkoutTitle?: string;
  checkoutSubtitle?: string;
  organizer?: OrganizerInfo;
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

type CheckoutHolderForm = {
  useBuyerData: boolean;
  name: string;
  email: string;
  cpf: string;
};

type StoredUser = {
  name?: string;
  email?: string;
  cpf?: string;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9, 11)}`;
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

  return [{ ticketTypeId, quantity }];
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

function getTicketLabel(ticket: TicketTypeItem) {
  return ticket.lotLabel
    ? `${ticket.name || "Ingresso"} · ${ticket.lotLabel}`
    : ticket.name || "Ingresso";
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-sky-500";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

export default function CustomerCheckoutPage() {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [holdersByTicketType, setHoldersByTicketType] = useState<
    Record<string, CheckoutHolderForm[]>
  >({});

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
          setCustomerName(parsed.name || "");
          setCustomerEmail(parsed.email || "");
          setCustomerCpf(formatCpf(parsed.cpf || ""));
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
          availableTicketTypes.some(
            (ticket: TicketTypeItem) => ticket.id === item.ticketTypeId,
          ),
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

        const unitPrice = toNumber(ticketType.price);
        const feeAmount = toNumber(ticketType.feeAmount);
        const unitTotal = unitPrice + feeAmount;

        return {
          ...item,
          ticketType,
          unitPrice,
          feeAmount,
          unitTotal,
          totalPrice: unitTotal * item.quantity,
        };
      })
      .filter(Boolean) as Array<{
      ticketTypeId: string;
      quantity: number;
      ticketType: TicketTypeItem;
      unitPrice: number;
      feeAmount: number;
      unitTotal: number;
      totalPrice: number;
    }>;
  }, [cartItems, activeTicketTypes]);

  const notSelectedTicketTypes = useMemo(() => {
    const selectedIds = new Set(cartItems.map((item) => item.ticketTypeId));
    return activeTicketTypes.filter((ticket) => !selectedIds.has(ticket.id));
  }, [activeTicketTypes, cartItems]);

  const subtotal = useMemo(
    () => selectedItemsDetailed.reduce((sum, item) => sum + item.totalPrice, 0),
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

  useEffect(() => {
    setHoldersByTicketType((prev) => {
      const next: Record<string, CheckoutHolderForm[]> = {};
      const formattedBuyerCpf = formatCpf(customerCpf);

      for (const item of selectedItemsDetailed) {
        const existing = prev[item.ticketTypeId] || [];

        next[item.ticketTypeId] = Array.from({ length: item.quantity }).map(
          (_, index) => {
            const previousHolder = existing[index];

            if (!previousHolder) {
              return {
                useBuyerData: true,
                name: customerName,
                email: customerEmail,
                cpf: formattedBuyerCpf,
              };
            }

            if (previousHolder.useBuyerData) {
              return {
                ...previousHolder,
                name: customerName,
                email: customerEmail,
                cpf: formattedBuyerCpf,
              };
            }

            return previousHolder;
          },
        );
      }

      return next;
    });
  }, [selectedItemsDetailed, customerName, customerEmail, customerCpf]);

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

  function handleHolderUseBuyerChange(
    ticketTypeId: string,
    index: number,
    checked: boolean,
  ) {
    setHoldersByTicketType((prev) => {
      const current = prev[ticketTypeId] || [];

      return {
        ...prev,
        [ticketTypeId]: current.map((holder, holderIndex) =>
          holderIndex === index
            ? {
                ...holder,
                useBuyerData: checked,
                name: checked ? customerName : holder.name,
                email: checked ? customerEmail : holder.email,
                cpf: checked ? formatCpf(customerCpf) : holder.cpf,
              }
            : holder,
        ),
      };
    });
  }

  function handleHolderFieldChange(
    ticketTypeId: string,
    index: number,
    field: "name" | "email" | "cpf",
    value: string,
  ) {
    setHoldersByTicketType((prev) => {
      const current = prev[ticketTypeId] || [];

      return {
        ...prev,
        [ticketTypeId]: current.map((holder, holderIndex) =>
          holderIndex === index
            ? {
                ...holder,
                [field]: field === "cpf" ? formatCpf(value) : value,
              }
            : holder,
        ),
      };
    });
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

    const customerCpfDigits = onlyDigits(customerCpf);

    if (!customerName.trim()) {
      alert("Informe o nome");
      return;
    }

    if (!customerEmail.trim()) {
      alert("Informe o email");
      return;
    }

    if (customerCpfDigits.length !== 11) {
      alert("Informe o CPF do comprador com 11 dígitos");
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

      const holders = holdersByTicketType[item.ticketTypeId] || [];

      if (holders.length !== item.quantity) {
        alert(
          `Os titulares do item ${item.ticketType.name || "ingresso"} ainda não foram preparados corretamente`,
        );
        return;
      }

      for (let index = 0; index < holders.length; index += 1) {
        const holder = holders[index];
        const holderName = holder.useBuyerData ? customerName : holder.name;
        const holderEmail = holder.useBuyerData ? customerEmail : holder.email;
        const holderCpf = holder.useBuyerData ? customerCpf : holder.cpf;
        const holderCpfDigits = onlyDigits(holderCpf);

        if (!String(holderName || "").trim()) {
          alert(
            `Informe o nome do titular do ingresso ${index + 1} em ${
              item.ticketType.name || "ingresso"
            }`,
          );
          return;
        }

        if (holderCpfDigits.length !== 11) {
          alert(
            `Informe um CPF válido para o ingresso ${index + 1} em ${
              item.ticketType.name || "ingresso"
            }`,
          );
          return;
        }

        if (
          !holder.useBuyerData &&
          holderCpfDigits !== customerCpfDigits &&
          holderEmail.trim().length === 0
        ) {
          // Mantido opcional.
        }
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
          customerCpf: customerCpfDigits,
          useWalletBalance,
          items: selectedItemsDetailed.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            holders: (holdersByTicketType[item.ticketTypeId] || []).map(
              (holder) => ({
                name: (holder.useBuyerData ? customerName : holder.name).trim(),
                email: (holder.useBuyerData ? customerEmail : holder.email).trim(),
                cpf: onlyDigits(holder.useBuyerData ? customerCpf : holder.cpf),
              }),
            ),
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
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
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
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Checkout não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-32 xl:pb-8">
      <section className="overflow-hidden rounded-[34px] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
          Checkout
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
          Finalize seu pedido
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-white/85 md:text-base">
          Revise seus ingressos, defina os titulares e confirme o pagamento com
          uma experiência mais clara e operacional.
        </p>

        <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/85">
          <span>🎟️ {event.name || "Evento"}</span>
          <span>👤 {event.organizer?.tradeName || event.organizer?.legalName || "Organizador"}</span>
          <span>📅 {formatDate(event.startDate || event.eventDate)}</span>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <form onSubmit={handleCreateOrder} className="space-y-6">
          <section className={cardClass()}>
            <h2 className="text-2xl font-black text-slate-950">
              Dados do comprador
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Esses dados serão usados no pedido e podem ser reaproveitados nos
              titulares.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nome do comprador
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass()}
                  placeholder="Seu nome"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email do comprador
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={inputClass()}
                  placeholder="seuemail@exemplo.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  CPF do comprador
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customerCpf}
                  onChange={(e) => setCustomerCpf(formatCpf(e.target.value))}
                  className={inputClass()}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
              <p className="text-sm leading-6 text-amber-800">
                Se o CPF do titular for de outra pessoa, o ingresso ficará
                vinculado à conta dessa pessoa. Para funcionar, esse CPF precisa
                existir na plataforma.
              </p>
            </div>
          </section>

          <section className={cardClass()}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  Ingressos escolhidos
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Ajuste quantidades e monte o pedido final.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {selectedItemsDetailed.map((item) => (
                <div
                  key={item.ticketTypeId}
                  className="rounded-[24px] border border-slate-200 bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      {item.ticketType.lotLabel ? (
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          {item.ticketType.lotLabel}
                        </span>
                      ) : null}

                      <h3 className="mt-3 text-xl font-black text-slate-950">
                        {item.ticketType.name || "Ingresso"}
                      </h3>

                      {item.ticketType.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {item.ticketType.description}
                        </p>
                      ) : null}

                      {item.ticketType.benefitDescription ? (
                        <p className="mt-2 text-sm font-medium text-emerald-700">
                          {item.ticketType.benefitDescription}
                        </p>
                      ) : null}

                      <div className="mt-3 space-y-1 text-sm text-slate-500">
                        <p>Valor base: {formatMoney(item.unitPrice)}</p>
                        {item.feeAmount > 0 ? (
                          <p>Taxa: {formatMoney(item.feeAmount)}</p>
                        ) : null}
                        <p>Disponível: {item.ticketType.quantity ?? 0}</p>
                        {item.ticketType.salesEndAt ? (
                          <p>Vendas até {formatDate(item.ticketType.salesEndAt)}</p>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTicketType(item.ticketTypeId)}
                      className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(
                            item.ticketTypeId,
                            Math.max(1, item.quantity - 1),
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700 hover:bg-slate-50"
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
                        className="w-24 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-center outline-none focus:border-sky-500"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          handleQuantityChange(item.ticketTypeId, item.quantity + 1)
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-bold text-slate-700 hover:bg-slate-50"
                      >
                        +
                      </button>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                        Total deste item
                      </p>
                      <p className="mt-1 text-xl font-black text-slate-950">
                        {formatMoney(item.totalPrice)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {notSelectedTicketTypes.length > 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5">
                <h3 className="text-lg font-black text-slate-950">
                  Adicionar mais ingressos
                </h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  {notSelectedTicketTypes.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => handleAddTicketType(ticket.id)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      + {getTicketLabel(ticket)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section className={cardClass()}>
            <h2 className="text-2xl font-black text-slate-950">Titulares</h2>
            <p className="mt-2 text-sm text-slate-500">
              Defina para quem cada ingresso vai ficar.
            </p>

            <div className="mt-6 space-y-5">
              {selectedItemsDetailed.map((item) => (
                <div
                  key={`holders-${item.ticketTypeId}`}
                  className="rounded-[24px] border border-sky-100 bg-sky-50 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-950">
                        {getTicketLabel(item.ticketType)}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.quantity} ingresso(s) neste item
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-4">
                    {(holdersByTicketType[item.ticketTypeId] || []).map(
                      (holder, index) => (
                        <div
                          key={`${item.ticketTypeId}-${index}`}
                          className="rounded-[22px] border border-slate-200 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                Ingresso {index + 1}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.ticketType.name || "Ingresso"}
                              </p>
                            </div>

                            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                              <input
                                type="checkbox"
                                checked={holder.useBuyerData}
                                onChange={(e) =>
                                  handleHolderUseBuyerChange(
                                    item.ticketTypeId,
                                    index,
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4"
                              />
                              Usar dados do comprador
                            </label>
                          </div>

                          {holder.useBuyerData ? (
                            <div className="mt-4 grid gap-3 md:grid-cols-3">
                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                  Nome
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                  {customerName || "-"}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                  Email
                                </p>
                                <p className="mt-1 break-all font-semibold text-slate-900">
                                  {customerEmail || "-"}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                                  CPF
                                </p>
                                <p className="mt-1 font-semibold text-slate-900">
                                  {customerCpf || "-"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  Nome do titular
                                </label>
                                <input
                                  type="text"
                                  value={holder.name}
                                  onChange={(e) =>
                                    handleHolderFieldChange(
                                      item.ticketTypeId,
                                      index,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  className={inputClass()}
                                  placeholder="Nome da pessoa"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  Email do titular
                                </label>
                                <input
                                  type="email"
                                  value={holder.email}
                                  onChange={(e) =>
                                    handleHolderFieldChange(
                                      item.ticketTypeId,
                                      index,
                                      "email",
                                      e.target.value,
                                    )
                                  }
                                  className={inputClass()}
                                  placeholder="email@exemplo.com"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-700">
                                  CPF do titular
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={holder.cpf}
                                  maxLength={14}
                                  onChange={(e) =>
                                    handleHolderFieldChange(
                                      item.ticketTypeId,
                                      index,
                                      "cpf",
                                      e.target.value,
                                    )
                                  }
                                  className={inputClass()}
                                  placeholder="000.000.000-00"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className={cardClass()}>
            <h2 className="text-2xl font-black text-slate-950">Pagamento</h2>
            <p className="mt-2 text-sm text-slate-500">
              Escolha como a wallet entra nesta compra.
            </p>

            <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Saldo disponível
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {formatMoney(wallet?.balance)}
                  </p>
                </div>

                <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={useWalletBalance}
                    onChange={(e) => setUseWalletBalance(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Usar wallet nesta compra
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Subtotal
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {formatMoney(subtotal)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Abatimento wallet
                  </p>
                  <p className="mt-2 text-lg font-black text-emerald-700">
                    {formatMoney(walletApplied)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Falta pagar
                  </p>
                  <p className="mt-2 text-lg font-black text-slate-950">
                    {formatMoney(remainingAmount)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 text-sm text-sky-800">
                {purchaseWillBePaid
                  ? "Seu pedido será quitado integralmente com a wallet."
                  : "Depois da wallet, o pedido seguirá com saldo pendente para pagamento."}
              </div>
            </div>
          </section>
        </form>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {event.checkoutTitle || "Resumo do pedido"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {event.name || "Evento"}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {event.checkoutSubtitle ||
                  event.shortDescription ||
                  "Revise tudo antes de finalizar."}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Quando
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {formatDate(event.startDate || event.eventDate)}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Organizador
                </p>
                <p className="mt-2 font-semibold text-slate-900">
                  {event.organizer?.tradeName ||
                    event.organizer?.legalName ||
                    "Organizador parceiro"}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  Itens
                </p>
                <div className="mt-3 space-y-3">
                  {selectedItemsDetailed.map((item) => (
                    <div
                      key={`summary-${item.ticketTypeId}`}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {getTicketLabel(item.ticketType)}
                        </p>
                        <p className="text-slate-500">
                          {item.quantity} x {formatMoney(item.unitTotal)}
                        </p>
                      </div>

                      <p className="font-semibold text-slate-900">
                        {formatMoney(item.totalPrice)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Ingressos</span>
                  <span className="font-semibold text-slate-900">
                    {totalTickets}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-semibold text-slate-900">
                    {formatMoney(subtotal)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Wallet</span>
                  <span className="font-semibold text-emerald-700">
                    - {formatMoney(walletApplied)}
                  </span>
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      Total final
                    </span>
                    <span className="text-2xl font-black text-slate-950">
                      {formatMoney(remainingAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    const form = document.querySelector("form");
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  disabled={creatingOrder}
                  className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingOrder ? "Criando pedido..." : "Finalizar pedido"}
                </button>

                <button
                  type="button"
                  onClick={() => goTo(`/customer/events/${event.id}`)}
                  className="w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Voltar para o evento
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Total final
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {totalTickets} ingresso(s)
            </p>
            <p className="text-lg font-black text-slate-950">
              {formatMoney(remainingAmount)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const form = document.querySelector("form");
              if (form) {
                form.requestSubmit();
              }
            }}
            disabled={creatingOrder}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creatingOrder ? "Enviando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </main>
  );
}