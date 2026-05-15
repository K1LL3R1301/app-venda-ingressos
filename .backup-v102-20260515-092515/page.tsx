"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

type TicketKind = "INTEIRA" | "MEIA" | "SOCIAL";
type PlaceKind = "SEAT" | "TABLE_CHAIR" | "TABLE_FULL";

type TicketTypeItem = {
  id: string;
  name?: string;
  lotLabel?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
  feeAmount?: string | number;
  isHidden?: boolean;
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
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  ticketTypes?: TicketTypeItem[];
  media?: EventMedia | null;
  location?: EventLocation | null;
};

type WalletSummary = {
  balance?: string | number;
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

type PlaceSubTicket = {
  ticketTypeId: string;
  kind: TicketKind;
  label: string;
  quantity: number;
  unitAmount: number;
};

type CheckoutPlaceSelection = {
  id: string;
  ticketTypeId: string;
  sessionId: string;
  sectorId: string;
  objectId: string;
  kind: PlaceKind;
  label: string;
  quantity: number;
  amount?: number;
  chairCount?: number;
  subTickets?: PlaceSubTicket[];
};

type CreateCustomerOrderResponse = {
  order?: {
    id?: string;
  };
  walletAppliedAmount?: string | number;
  remainingAmount?: string | number;
  message?: string;
};

type AppliedCoupon = {
  valid?: boolean;
  couponId?: string;
  couponCode?: string;
  promoterId?: string | null;
  promoterName?: string | null;
  discountType?: string;
  discountValue?: string | number;
  grossAmount?: string | number;
  discountAmount?: string | number;
  totalAmount?: string | number;
  message?: string;
};

type PromoterRefInfo = {
  valid?: boolean;
  ref?: string;
  linkId?: string;
  promoterId?: string;
  promoterName?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
};

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value?: string | null) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

function toNumber(value?: string | number | null) {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function normalizeCouponCode(value?: string | null) {
  return String(value || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9_-]/g, "");
}

function normalizeRef(value?: string | null) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}

function formatDate(value?: string | null) {
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

function getPlaceQuantity(selection: CheckoutPlaceSelection) {
  return selection.kind === "TABLE_FULL" ? 1 : Math.max(1, Number(selection.quantity || 1));
}

function getPlaceAmount(selection: CheckoutPlaceSelection) {
  if (typeof selection.amount === "number" && Number.isFinite(selection.amount)) {
    return selection.amount;
  }

  return (selection.subTickets || []).reduce(
    (sum, item) => sum + toNumber(item.unitAmount) * Math.max(0, Number(item.quantity || 0)),
    0,
  );
}

function parseRequestedItems(searchParams: URLSearchParams): CheckoutCartItem[] {
  const itemsParam = searchParams.get("items");
  if (itemsParam) {
    try {
      const parsed = JSON.parse(itemsParam) as Array<{ ticketTypeId?: string; quantity?: number }>;
      return (Array.isArray(parsed) ? parsed : [])
        .map((item) => ({
          ticketTypeId: String(item.ticketTypeId || "").trim(),
          quantity: Math.max(1, Number(item.quantity || 1)),
        }))
        .filter((item) => item.ticketTypeId);
    } catch (error) {
      console.error("Erro ao ler items do checkout:", error);
    }
  }

  const ticketTypeId = String(searchParams.get("ticketTypeId") || "").trim();
  const quantity = Math.max(1, Number(searchParams.get("quantity") || 1));
  return ticketTypeId ? [{ ticketTypeId, quantity }] : [];
}

function parsePlaceSelections(searchParams: URLSearchParams): CheckoutPlaceSelection[] {
  const rawFromUrl = searchParams.get("places");
  const candidates = [rawFromUrl];

  try {
    candidates.push(localStorage.getItem("checkoutPlaceSelections"));
  } catch {
    candidates.push(null);
  }

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as CheckoutPlaceSelection[];
      return (Array.isArray(parsed) ? parsed : [])
        .map((selection) => ({
          ...selection,
          id: String(selection.id || "").trim(),
          ticketTypeId: String(selection.ticketTypeId || "").trim(),
          sessionId: String(selection.sessionId || "").trim(),
          sectorId: String(selection.sectorId || "").trim(),
          objectId: String(selection.objectId || "").trim(),
          kind: String(selection.kind || "SEAT").toUpperCase() as PlaceKind,
          label: String(selection.label || "Lugar").trim(),
          quantity: Math.max(1, Number(selection.quantity || 1)),
          amount: Number(selection.amount || getPlaceAmount(selection)),
          chairCount: selection.chairCount ? Number(selection.chairCount) : undefined,
          subTickets: Array.isArray(selection.subTickets) ? selection.subTickets : undefined,
        }))
        .filter(
          (selection) =>
            selection.id &&
            selection.ticketTypeId &&
            selection.sessionId &&
            selection.sectorId &&
            selection.objectId,
        );
    } catch (error) {
      console.error("Erro ao ler lugares do checkout:", error);
    }
  }

  return [];
}

function mergeCartItems(items: CheckoutCartItem[]) {
  const grouped = new Map<string, number>();
  for (const item of items) {
    grouped.set(item.ticketTypeId, (grouped.get(item.ticketTypeId) || 0) + Math.max(1, item.quantity));
  }
  return Array.from(grouped.entries()).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
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
  if (String(event.location.mode || "").toUpperCase() === "ONLINE") return "Evento online";
  const cityState = [event.location.city, event.location.state].filter(Boolean).join(" - ");
  return [event.location.venueName, cityState].filter(Boolean).join(", ") || "Local a confirmar";
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
}

function readOnlyBoxClass() {
  return "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900";
}

export default function CustomerCheckoutPage() {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  const [placeSelections, setPlaceSelections] = useState<CheckoutPlaceSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCpf, setCustomerCpf] = useState("");
  const [useWalletBalance, setUseWalletBalance] = useState(true);
  const [holdersByTicketType, setHoldersByTicketType] = useState<Record<string, CheckoutHolderForm[]>>({});

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const [promoterRef, setPromoterRef] = useState("");
  const [promoterRefInfo, setPromoterRefInfo] = useState<PromoterRefInfo | null>(null);

  const searchParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  const eventId = searchParams.get("eventId") || "";
  const requestedItems = useMemo(() => parseRequestedItems(searchParams), [searchParams]);
  const requestedPlaces = useMemo(() => parsePlaceSelections(searchParams), [searchParams]);

  useEffect(() => {
    const refFromUrl = normalizeRef(searchParams.get("ref"));
    const refFromStorage = typeof window !== "undefined" ? normalizeRef(localStorage.getItem("astro_promoter_ref")) : "";
    const resolvedRef = refFromUrl || refFromStorage;

    if (!resolvedRef) return;

    setPromoterRef(resolvedRef);
    localStorage.setItem("astro_promoter_ref", resolvedRef);

    fetch(`${API_BASE_URL}/promoters/checkout/resolve-ref`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: resolvedRef }),
    })
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (response.ok && result?.valid) {
          setPromoterRefInfo(result);
          localStorage.setItem("astro_promoter_ref", result.ref || resolvedRef);
        }
      })
      .catch(() => {
        // O checkout não pode quebrar se o ref estiver inválido.
      });
  }, [searchParams]);

  useEffect(() => {
    async function loadCheckoutBase() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (!eventId || requestedItems.length === 0) {
        alert("Checkout inválido ou sem ingressos selecionados.");
        window.location.href = eventId ? `/events/${eventId}` : "/events";
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
          fetch(`${API_BASE_URL}/events/${eventId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/users/me/wallet`, {
            method: "GET",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          }),
        ]);

        const eventData = await eventRes.json();
        const walletData = await walletRes.json();

        if (!eventRes.ok) {
          alert(typeof eventData?.message === "string" ? eventData.message : "Erro ao carregar checkout");
          window.location.href = "/events";
          return;
        }

        setWallet(walletRes.ok ? walletData : { balance: 0 });

        const availableTicketTypes = (eventData.ticketTypes || []).filter(
          (ticket: TicketTypeItem) => ticket.status === "ACTIVE" && !ticket.isHidden,
        );
        const normalizedItems = requestedItems.filter((item) =>
          availableTicketTypes.some((ticket: TicketTypeItem) => ticket.id === item.ticketTypeId),
        );

        if (normalizedItems.length === 0) {
          alert("Nenhum ingresso válido encontrado para este checkout");
          window.location.href = `/events/${eventId}`;
          return;
        }

        setEvent(eventData);
        setCartItems(mergeCartItems(normalizedItems));
        setPlaceSelections(requestedPlaces);
      } catch (error) {
        console.error("CUSTOMER CHECKOUT ERROR:", error);
        alert("Erro ao conectar com a API");
        window.location.href = "/events";
      } finally {
        setLoading(false);
      }
    }

    loadCheckoutBase();
  }, [eventId, requestedItems, requestedPlaces]);

  const activeTicketTypes = useMemo(
    () => (event?.ticketTypes || []).filter((ticket) => ticket.status === "ACTIVE" && !ticket.isHidden),
    [event],
  );

  const selectedItemsDetailed = useMemo(() => {
    return cartItems
      .map((item) => {
        const ticketType = activeTicketTypes.find((ticket) => ticket.id === item.ticketTypeId);
        if (!ticketType) return null;

        const unitPrice = toNumber(ticketType.price) + toNumber(ticketType.feeAmount);
        const relatedPlaces = placeSelections.filter((selection) => selection.ticketTypeId === item.ticketTypeId);
        const placeQuantity = relatedPlaces.reduce((sum, selection) => sum + getPlaceQuantity(selection), 0);
        const placeTotal = relatedPlaces.reduce((sum, selection) => sum + getPlaceAmount(selection), 0);
        const commonQuantity = Math.max(0, item.quantity - placeQuantity);
        const totalPrice = placeTotal + commonQuantity * unitPrice;

        return {
          ...item,
          ticketType,
          unitPrice,
          totalPrice,
          placeQuantity,
          relatedPlaces,
        };
      })
      .filter(Boolean) as Array<{
      ticketTypeId: string;
      quantity: number;
      ticketType: TicketTypeItem;
      unitPrice: number;
      totalPrice: number;
      placeQuantity: number;
      relatedPlaces: CheckoutPlaceSelection[];
    }>;
  }, [cartItems, activeTicketTypes, placeSelections]);

  const subtotal = selectedItemsDetailed.reduce((sum, item) => sum + item.totalPrice, 0);

  useEffect(() => {
    if (!appliedCoupon) return;

    const couponGross = toNumber(appliedCoupon.grossAmount);
    if (Math.abs(couponGross - subtotal) > 0.01) {
      setAppliedCoupon(null);
      setCouponMessage("O carrinho mudou. Aplique o cupom novamente.");
    }
  }, [subtotal, appliedCoupon]);

  const couponDiscount = appliedCoupon ? Math.min(subtotal, toNumber(appliedCoupon.discountAmount)) : 0;
  const subtotalAfterDiscount = Math.max(0, subtotal - couponDiscount);
  const totalTickets = selectedItemsDetailed.reduce((sum, item) => sum + item.quantity, 0);
  const walletBalanceNumber = toNumber(wallet?.balance);
  const walletApplied = useWalletBalance ? Math.min(walletBalanceNumber, subtotalAfterDiscount) : 0;
  const remainingAmount = Math.max(0, subtotalAfterDiscount - walletApplied);

  useEffect(() => {
    setHoldersByTicketType((prev) => {
      const next: Record<string, CheckoutHolderForm[]> = {};
      const formattedBuyerCpf = formatCpf(customerCpf);

      for (const item of selectedItemsDetailed) {
        const existing = prev[item.ticketTypeId] || [];
        next[item.ticketTypeId] = Array.from({ length: item.quantity }).map((_, index) => {
          const previousHolder = existing[index];
          if (!previousHolder || previousHolder.useBuyerData) {
            return { useBuyerData: true, name: customerName, email: customerEmail, cpf: formattedBuyerCpf };
          }
          return previousHolder;
        });
      }

      return next;
    });
  }, [selectedItemsDetailed, customerName, customerEmail, customerCpf]);

  function updateHolder(ticketTypeId: string, index: number, patch: Partial<CheckoutHolderForm>) {
    setHoldersByTicketType((prev) => {
      const current = prev[ticketTypeId] || [];
      return {
        ...prev,
        [ticketTypeId]: current.map((holder, holderIndex) =>
          holderIndex === index ? { ...holder, ...patch } : holder,
        ),
      };
    });
  }

  async function applyCoupon() {
    if (!event?.id) {
      alert("Evento não encontrado para validar o cupom.");
      return;
    }

    const normalizedCode = normalizeCouponCode(couponCode);

    if (!normalizedCode) {
      alert("Digite o código do cupom.");
      return;
    }

    setCouponLoading(true);
    setCouponMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/promoters/checkout/validate-coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: event.id,
          code: normalizedCode,
          subtotal: String(subtotal),
          customerCpf: onlyDigits(customerCpf),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setAppliedCoupon(null);
        setCouponMessage(
          typeof result?.message === "string"
            ? result.message
            : "Não foi possível aplicar este cupom.",
        );
        return;
      }

      setAppliedCoupon(result);
      setCouponCode(result?.couponCode || normalizedCode);
      setCouponMessage(result?.message || "Cupom aplicado com sucesso.");
    } catch (error) {
      console.error("APPLY COUPON ERROR:", error);
      setAppliedCoupon(null);
      setCouponMessage("Erro ao conectar com a API para validar o cupom.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponMessage("");
    setCouponCode("");
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
    if (!customerName.trim() || !customerEmail.trim() || customerCpfDigits.length !== 11) {
      alert("Dados do comprador incompletos.");
      return;
    }

    if (selectedItemsDetailed.length === 0) {
      alert("Selecione pelo menos um ingresso");
      return;
    }

    for (const item of selectedItemsDetailed) {
      const availableQuantity = typeof item.ticketType.quantity === "number" ? item.ticketType.quantity : 0;
      if (availableQuantity > 0 && item.quantity > availableQuantity) {
        alert(`A quantidade de ${item.ticketType.name || "ingresso"} é maior do que a disponível`);
        return;
      }

      const holders = holdersByTicketType[item.ticketTypeId] || [];
      if (holders.length !== item.quantity) {
        alert(`Os titulares do item ${item.ticketType.name || "ingresso"} ainda não foram preparados corretamente`);
        return;
      }

      for (let index = 0; index < holders.length; index += 1) {
        const holder = holders[index];
        const holderName = holder.useBuyerData ? customerName : holder.name;
        const holderCpf = holder.useBuyerData ? customerCpf : holder.cpf;
        if (!String(holderName || "").trim()) {
          alert(`Informe o nome do titular do ingresso ${index + 1}`);
          return;
        }
        if (onlyDigits(holderCpf).length !== 11) {
          alert(`Informe um CPF válido para o ingresso ${index + 1}`);
          return;
        }
      }
    }

    setCreatingOrder(true);
    try {
      const cleanCoupon = appliedCoupon?.couponCode || normalizeCouponCode(couponCode);
      const cleanRef = normalizeRef(promoterRef || promoterRefInfo?.ref || localStorage.getItem("astro_promoter_ref"));

      const res = await fetch(`${API_BASE_URL}/orders/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          eventId: event.id,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerCpf: customerCpfDigits,
          useWalletBalance,
          couponCode: cleanCoupon || undefined,
          promoterRef: cleanRef || undefined,
          placeSelections,
          items: selectedItemsDetailed.map((item) => ({
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            holders: (holdersByTicketType[item.ticketTypeId] || []).map((holder) => ({
              name: (holder.useBuyerData ? customerName : holder.name).trim(),
              email: (holder.useBuyerData ? customerEmail : holder.email || "").trim(),
              cpf: onlyDigits(holder.useBuyerData ? customerCpf : holder.cpf),
            })),
          })),
        }),
      });

      const data: CreateCustomerOrderResponse = await res.json();
      if (!res.ok) {
        alert(typeof data?.message === "string" ? data.message : "Erro ao criar pedido");
        return;
      }

      try {
        localStorage.removeItem("checkoutPlaceSelections");
      } catch {}

      if (!data?.order?.id) {
        window.location.href = "/orders";
        return;
      }

      alert("Pedido criado com sucesso");
      window.location.href = `/orders/${data.order.id}`;
    } catch (error) {
      console.error("CREATE CUSTOMER ORDER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setCreatingOrder(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-950">Carregando checkout...</main>;
  }

  if (!event || selectedItemsDetailed.length === 0) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-950">Checkout não encontrado.</main>;
  }

  const eventImage = getEventImage(event);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <button
          type="button"
          onClick={() => (window.location.href = `/events/${event.id}`)}
          className="mb-4 text-sm font-black text-sky-700"
        >
          ← Voltar para o evento
        </button>

        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div className="grid md:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-[260px] bg-slate-900">
              {eventImage ? (
                <img src={eventImage} alt={event.name || "Evento"} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-700 to-slate-950" />
              )}
              <div className="absolute inset-0 bg-black/55" />
              <div className="absolute bottom-0 p-7 text-white">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-sky-200">Checkout</p>
                <h1 className="mt-3 text-4xl font-black">Finalizar compra</h1>
              </div>
            </div>
            <div className="p-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Evento</p>
              <h2 className="mt-2 text-3xl font-black">{event.name || "Evento"}</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className={readOnlyBoxClass()}>{formatDate(event.startDate || event.eventDate)}</div>
                <div className={readOnlyBoxClass()}>{getLocationLabel(event)}</div>
              </div>
              {promoterRefInfo?.promoterName ? (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">
                    Indicação ativa
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    Você chegou por {promoterRefInfo.promoterName}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <form onSubmit={handleCreateOrder} className="mt-8 grid gap-7 lg:grid-cols-[1fr_390px]">
          <div className="space-y-6">
            <section className={cardClass()}>
              <h2 className="text-2xl font-black">Dados do comprador</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className={readOnlyBoxClass()}>{customerName || "Nome não encontrado"}</div>
                <div className={`${readOnlyBoxClass()} break-all`}>{customerEmail || "Email não encontrado"}</div>
                <div className={readOnlyBoxClass()}>{formatCpf(customerCpf) || "CPF não encontrado"}</div>
              </div>
            </section>

            <section className={cardClass()}>
              <h2 className="text-2xl font-black">Titulares</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Mesa completa conta como 1 ingresso principal. A distribuição interna da mesa fica salva na reserva.
              </p>
              <div className="mt-5 space-y-4">
                {selectedItemsDetailed.map((item) => {
                  const holders = holdersByTicketType[item.ticketTypeId] || [];
                  return (
                    <div key={item.ticketTypeId} className="rounded-3xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-lg font-black">{item.ticketType.name || "Ingresso"}</p>
                          <p className="text-sm font-semibold text-slate-500">
                            {item.quantity} ingresso(s) · {formatMoney(item.totalPrice)}
                          </p>
                        </div>
                      </div>

                      {item.relatedPlaces.length > 0 ? (
                        <div className="mt-3 rounded-2xl bg-cyan-50 p-3 text-sm font-bold text-cyan-900">
                          {item.relatedPlaces.map((place) => (
                            <p key={place.id}>
                              {place.label} · {place.kind === "TABLE_FULL" ? "mesa completa" : `${getPlaceQuantity(place)} lugar(es)`} · {formatMoney(getPlaceAmount(place))}
                            </p>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 grid gap-3">
                        {holders.map((holder, index) => (
                          <div key={`${item.ticketTypeId}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                            <label className="flex items-center gap-2 text-sm font-black">
                              <input
                                type="checkbox"
                                checked={holder.useBuyerData}
                                onChange={(e) =>
                                  updateHolder(item.ticketTypeId, index, {
                                    useBuyerData: e.target.checked,
                                    name: e.target.checked ? customerName : "",
                                    email: e.target.checked ? customerEmail : "",
                                    cpf: e.target.checked ? formatCpf(customerCpf) : "",
                                  })
                                }
                              />
                              Usar dados do comprador no ingresso {index + 1}
                            </label>
                            {!holder.useBuyerData ? (
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <input
                                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold outline-none"
                                  placeholder="Nome do titular"
                                  value={holder.name}
                                  onChange={(e) => updateHolder(item.ticketTypeId, index, { name: e.target.value })}
                                />
                                <input
                                  className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-bold outline-none"
                                  placeholder="CPF do titular"
                                  value={holder.cpf}
                                  onChange={(e) => updateHolder(item.ticketTypeId, index, { cpf: formatCpf(e.target.value) })}
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Resumo</p>
            <h2 className="mt-2 text-2xl font-black">Seu pedido</h2>

            <div className="mt-5 space-y-3">
              {selectedItemsDetailed.map((item) => (
                <div key={item.ticketTypeId} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-black">{item.ticketType.name || "Ingresso"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {item.quantity} ingresso(s) · {formatMoney(item.totalPrice)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[24px] border border-orange-200 bg-orange-50 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-600">
                Cupom de desconto
              </p>
              <div className="mt-3 flex gap-2">
                <input
                  value={couponCode}
                  disabled={Boolean(appliedCoupon) || couponLoading}
                  onChange={(e) => setCouponCode(normalizeCouponCode(e.target.value))}
                  placeholder="EX: JOAO10"
                  className="min-w-0 flex-1 rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-black uppercase outline-none focus:border-orange-400"
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={removeCoupon}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white"
                  >
                    Remover
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading}
                    className="rounded-2xl bg-orange-600 px-4 py-3 text-xs font-black text-white disabled:bg-slate-300"
                  >
                    {couponLoading ? "..." : "Aplicar"}
                  </button>
                )}
              </div>
              {couponMessage ? (
                <p className={`mt-3 text-xs font-bold leading-5 ${appliedCoupon ? "text-emerald-700" : "text-red-700"}`}>
                  {couponMessage}
                </p>
              ) : (
                <p className="mt-3 text-xs font-bold leading-5 text-orange-800">
                  O desconto será validado na API e aplicado antes da wallet.
                </p>
              )}
              {promoterRefInfo?.promoterName ? (
                <p className="mt-2 rounded-2xl bg-white p-3 text-xs font-bold text-slate-700">
                  Indicação: {promoterRefInfo.promoterName}
                </p>
              ) : promoterRef ? (
                <p className="mt-2 rounded-2xl bg-white p-3 text-xs font-bold text-slate-700">
                  Ref salva: {promoterRef}
                </p>
              ) : null}
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 p-4">
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Ingressos</span>
                <span>{totalTickets}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              {couponDiscount > 0 ? (
                <div className="flex justify-between text-sm font-bold text-emerald-700">
                  <span>Cupom {appliedCoupon?.couponCode}</span>
                  <span>- {formatMoney(couponDiscount)}</span>
                </div>
              ) : null}
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
                <span>Usar wallet</span>
                <input type="checkbox" checked={useWalletBalance} onChange={(e) => setUseWalletBalance(e.target.checked)} />
              </label>
              <div className="flex justify-between text-sm font-bold text-slate-600">
                <span>Wallet aplicada</span>
                <span>- {formatMoney(walletApplied)}</span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span>{formatMoney(remainingAmount)}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingOrder}
              className="mt-5 w-full rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {creatingOrder ? "Criando pedido..." : "Criar pedido"}
            </button>

            <p className="mt-4 text-center text-xs font-bold leading-5 text-slate-500">
              A API confere CPF, estoque, mesa, cadeira, cupom, indicação e reserva temporária antes de criar o pedido.
            </p>
          </aside>
        </form>
      </div>
    </main>
  );
}
