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
  logoUrl?: string;
};

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  gallery?: string[];
};

type EventLocation = {
  mode?: string;
  venueName?: string;
  addressLine1?: string;
  addressLine2?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
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
  category?: string;
  highlightTag?: string;
  checkoutTitle?: string;
  checkoutSubtitle?: string;
  organizer?: OrganizerInfo;
  ticketTypes?: TicketTypeItem[];
  media?: EventMedia | null;
  location?: EventLocation | null;
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
    month: "short",
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

function getEventImage(event?: EventDetail | null) {
  if (!event) return "";

  return (
    event.media?.bannerImageUrl ||
    event.media?.coverImageUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.thumbnailUrl ||
    event.media?.gallery?.[0] ||
    ""
  );
}

function getLocationLabel(event?: EventDetail | null) {
  if (!event?.location) return "Local a confirmar";

  if (String(event.location.mode || "").toUpperCase() === "ONLINE") {
    return "Evento online";
  }

  const cityState = [event.location.city, event.location.state]
    .filter(Boolean)
    .join(" - ");

  return [event.location.venueName, cityState].filter(Boolean).join(", ") ||
    "Local a confirmar";
}

function getFullAddress(event?: EventDetail | null) {
  if (!event?.location) return "Endereço a confirmar";

  if (String(event.location.mode || "").toUpperCase() === "ONLINE") {
    return "O acesso será enviado pelos canais do evento.";
  }

  const pieces = [
    event.location.addressLine1,
    event.location.addressLine2,
    event.location.neighborhood,
    event.location.city,
    event.location.state,
    event.location.zipCode,
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(", ") : "Endereço a confirmar";
}

function inputClass() {
  return "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100";
}

function readOnlyBoxClass() {
  return "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "ACTIVE") return "Disponível";
  if (normalized === "PUBLISHED") return "Publicado";
  if (normalized === "INACTIVE") return "Indisponível";
  if (normalized === "SOLD_OUT") return "Esgotado";
  if (normalized === "CANCELED") return "Cancelado";

  return status || "Disponível";
}

function getStatusClass(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "ACTIVE" ||
    normalized === "PUBLISHED" ||
    normalized === "AVAILABLE"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "INACTIVE" || normalized === "SOLD_OUT") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
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
              Authorization: `Bearer ${token}`,
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
          console.warn("Não foi possível carregar wallet:", walletData);
          setWallet({
            balance: 0,
            transactions: [],
          });
        } else {
          setWallet(walletData);
        }

        const availableTicketTypes = (eventData.ticketTypes || []).filter(
          (ticket: TicketTypeItem) =>
            ticket.status === "ACTIVE" && !ticket.isHidden,
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

  const holderStats = useMemo(() => {
    const buyerCpfDigits = onlyDigits(customerCpf);
    let buyerCount = 0;
    let otherCount = 0;

    for (const item of selectedItemsDetailed) {
      const holders = holdersByTicketType[item.ticketTypeId] || [];

      for (const holder of holders) {
        const holderCpfDigits = onlyDigits(
          holder.useBuyerData ? customerCpf : holder.cpf,
        );

        if (!holderCpfDigits || holderCpfDigits === buyerCpfDigits) {
          buyerCount += 1;
        } else {
          otherCount += 1;
        }
      }
    }

    const total = buyerCount + otherCount;
    const validTotal = total <= 4;
    const validBuyer = buyerCount <= 2;
    const validOther = otherCount <= 2;
    const atLeastOneBuyer = total === 0 ? true : buyerCount >= 1;

    let message = "Distribuição válida para continuar.";

    if (!validTotal) {
      message = "Cada compra pode ter no máximo 4 ingressos.";
    } else if (!validBuyer) {
      message = "No máximo 2 ingressos podem ficar no CPF do comprador.";
    } else if (!validOther) {
      message = "No máximo 2 ingressos podem ir para outros CPFs.";
    } else if (!atLeastOneBuyer) {
      message = "Pelo menos 1 ingresso deve permanecer com o comprador.";
    }

    return {
      buyerCount,
      otherCount,
      total,
      isValid: validTotal && validBuyer && validOther && atLeastOneBuyer,
      message,
    };
  }, [selectedItemsDetailed, holdersByTicketType, customerCpf]);

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
                email: checked ? customerEmail : "",
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
    field: "name" | "cpf",
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
      alert("Dados do comprador incompletos: nome não encontrado.");
      return;
    }

    if (!customerEmail.trim()) {
      alert("Dados do comprador incompletos: email não encontrado.");
      return;
    }

    if (customerCpfDigits.length !== 11) {
      alert("Dados do comprador incompletos: CPF inválido.");
      return;
    }

    if (selectedItemsDetailed.length === 0) {
      alert("Selecione pelo menos um ingresso");
      return;
    }

    if (!holderStats.isValid) {
      alert(holderStats.message);
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
          `A quantidade de ${
            item.ticketType.name || "ingresso"
          } é maior do que a disponível`,
        );
        return;
      }

      const holders = holdersByTicketType[item.ticketTypeId] || [];

      if (holders.length !== item.quantity) {
        alert(
          `Os titulares do item ${
            item.ticketType.name || "ingresso"
          } ainda não foram preparados corretamente`,
        );
        return;
      }

      for (let index = 0; index < holders.length; index += 1) {
        const holder = holders[index];
        const holderName = holder.useBuyerData ? customerName : holder.name;
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
                email: (
                  holder.useBuyerData ? customerEmail : holder.email || ""
                ).trim(),
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
      <div className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
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
      <div className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Checkout não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const eventImage = getEventImage(event);
  const organizerName =
    event.organizer?.tradeName || event.organizer?.legalName || "Organizador";

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <div className="mx-auto max-w-[1180px] px-4 pb-32 pt-7 xl:pb-12">
        <section className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
          <button
            type="button"
            onClick={() => goTo("/customer/dashboard")}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Página inicial
          </button>
          <span>&gt;</span>
          <button
            type="button"
            onClick={() => goTo("/customer/events")}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Eventos
          </button>
          <span>&gt;</span>
          <button
            type="button"
            onClick={() => goTo(`/customer/events/${event.id}`)}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            {event.name || "Evento"}
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700">Checkout</span>
        </section>

        <section className="overflow-hidden rounded-[30px] bg-white shadow-sm">
          <div className="grid md:grid-cols-[0.95fr_1.05fr]">
            <div className="relative min-h-[260px] bg-slate-900">
              {eventImage ? (
                <img
                  src={eventImage}
                  alt={event.name || "Evento"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-900" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-slate-800">
                  Checkout
                </span>
                <h1 className="mt-4 text-[34px] font-black leading-tight md:text-[44px]">
                  Finalize seu pedido
                </h1>
                <p className="mt-3 text-sm leading-6 text-white/85">
                  Revise seus ingressos, titulares e pagamento antes de criar o
                  pedido.
                </p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Evento selecionado
              </p>

              <h2 className="mt-3 text-3xl font-black leading-tight text-slate-950">
                {event.name || "Evento sem nome"}
              </h2>

              <div className="mt-5 grid gap-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Data
                  </p>
                  <p className="mt-1 font-bold text-slate-950">
                    {formatDate(event.startDate || event.eventDate)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Local
                  </p>
                  <p className="mt-1 font-bold text-slate-950">
                    {getLocationLabel(event)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {getFullAddress(event)}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Organizador
                  </p>
                  <p className="mt-1 font-bold text-slate-950">
                    {organizerName}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
          <form
            id="customer-checkout-form"
            onSubmit={handleCreateOrder}
            className="space-y-6"
          >
            <section className={cardClass()}>
              <h2 className="text-2xl font-black text-slate-950">
                Dados do comprador
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Esses dados vêm da conta logada e ficam travados nesta etapa.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Nome do comprador
                  </p>
                  <div className={readOnlyBoxClass()}>
                    {customerName || "Nome não encontrado"}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    Email do comprador
                  </p>
                  <div className={`${readOnlyBoxClass()} break-all`}>
                    {customerEmail || "Email não encontrado"}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    CPF do comprador
                  </p>
                  <div className={readOnlyBoxClass()}>
                    {formatCpf(customerCpf) || "CPF não encontrado"}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm leading-6 text-amber-800">
                  Regras da compra: no máximo <strong>4 ingressos</strong> por
                  pedido, sendo até <strong>2 no CPF do comprador</strong> e até{" "}
                  <strong>2 para outros CPFs</strong>. O prazo de 10 minutos
                  começa depois que o pedido é criado.
                </p>
              </div>
            </section>

            <section className={cardClass()}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Titulares
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Defina o nome e o CPF de cada titular.
                  </p>
                </div>

                <div
                  className={`rounded-[22px] border px-4 py-3 text-sm ${
                    holderStats.isValid
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  <p className="font-semibold">
                    Comprador: {holderStats.buyerCount} · Outros:{" "}
                    {holderStats.otherCount}
                  </p>
                  <p className="mt-1">{holderStats.message}</p>
                </div>
              </div>

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
                                />
                                Usar dados do comprador
                              </label>
                            </div>

                            {holder.useBuyerData ? (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    Nome
                                  </p>
                                  <div className={readOnlyBoxClass()}>
                                    {customerName || "-"}
                                  </div>
                                </div>

                                <div>
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    CPF
                                  </p>
                                  <div className={readOnlyBoxClass()}>
                                    {formatCpf(customerCpf) || "-"}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 grid gap-3 md:grid-cols-2">
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
                                    placeholder="Nome completo"
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
                                    maxLength={14}
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
                Nesta etapa o pedido é criado. Se houver saldo na wallet, ele
                pode ser usado automaticamente.
              </p>

              <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Usar saldo da wallet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Saldo disponível:{" "}
                      <strong>{formatMoney(walletBalanceNumber)}</strong>
                    </p>
                  </div>

                  <label className="flex cursor-pointer items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm">
                    <input
                      type="checkbox"
                      checked={useWalletBalance}
                      onChange={(event) =>
                        setUseWalletBalance(event.target.checked)
                      }
                      disabled={walletBalanceNumber <= 0}
                    />
                    Aplicar wallet
                  </label>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Subtotal
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {formatMoney(subtotal)}
                  </p>
                </div>

                <div className="rounded-[20px] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Wallet
                  </p>
                  <p className="mt-2 text-xl font-black text-emerald-700">
                    - {formatMoney(walletApplied)}
                  </p>
                </div>

                <div className="rounded-[20px] bg-slate-950 p-4 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/60">
                    A pagar
                  </p>
                  <p className="mt-2 text-xl font-black">
                    {formatMoney(remainingAmount)}
                  </p>
                </div>
              </div>

              <div
                className={`mt-5 rounded-[22px] border p-5 ${
                  purchaseWillBePaid
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                <p className="text-sm leading-6">
                  {purchaseWillBePaid
                    ? "Com o saldo aplicado, este pedido deve ser criado como pago pela wallet."
                    : "Após criar o pedido, você poderá continuar o pagamento do valor restante conforme as opções disponíveis no sistema."}
                </p>
              </div>
            </section>
          </form>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Resumo
                </p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Seu pedido
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {totalTickets} ingresso(s) selecionado(s)
                </p>
              </div>

              <div className="space-y-4 p-5">
                {selectedItemsDetailed.map((item) => (
                  <div
                    key={`summary-${item.ticketTypeId}`}
                    className="rounded-[20px] border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {getTicketLabel(item.ticketType)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.quantity}x {formatMoney(item.unitTotal)}
                        </p>
                      </div>

                      <p className="whitespace-nowrap font-black text-slate-950">
                        {formatMoney(item.totalPrice)}
                      </p>
                    </div>

                    {item.feeAmount > 0 ? (
                      <p className="mt-2 text-xs text-slate-400">
                        Inclui {formatMoney(item.feeAmount)} de taxa por
                        ingresso.
                      </p>
                    ) : null}

                    {item.ticketType.benefitDescription ? (
                      <p className="mt-2 text-xs font-bold text-emerald-700">
                        {item.ticketType.benefitDescription}
                      </p>
                    ) : null}

                    <span
                      className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                        item.ticketType.status,
                      )}`}
                    >
                      {getStatusLabel(item.ticketType.status)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-bold text-slate-950">
                      {formatMoney(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Wallet</span>
                    <span className="font-bold text-emerald-700">
                      - {formatMoney(walletApplied)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                        Total a pagar
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {totalTickets} ingresso(s)
                      </p>
                    </div>

                    <span className="text-2xl font-black text-slate-950">
                      {formatMoney(remainingAmount)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  form="customer-checkout-form"
                  disabled={creatingOrder || !holderStats.isValid}
                  className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {creatingOrder ? "Criando pedido..." : "Finalizar pedido"}
                </button>

                <button
                  type="button"
                  onClick={() => goTo(`/customer/events/${event.id}`)}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Voltar ao evento
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-4 shadow-2xl xl:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Total
            </p>
            <p className="text-lg font-black text-slate-950">
              {formatMoney(remainingAmount)}
            </p>
            <p className="text-xs text-slate-500">{totalTickets} ingresso(s)</p>
          </div>

          <button
            type="submit"
            form="customer-checkout-form"
            disabled={creatingOrder || !holderStats.isValid}
            className="rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {creatingOrder ? "Criando..." : "Finalizar"}
          </button>
        </div>
      </div>
    </main>
  );
}