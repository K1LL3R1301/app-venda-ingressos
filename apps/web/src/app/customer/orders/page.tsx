"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  sectorMapImageUrl?: string;
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

type EventBasic = {
  id?: string;
  name?: string;
  description?: string;
  eventDate?: string;
  startDate?: string;
  media?: EventMedia | null;
  location?: EventLocation | null;
};

type OrderItem = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: string | number;
  status?: string;
  createdAt?: string;
  expiresAt?: string | null;
  event?: EventBasic;
  items?: Array<{
    id: string;
    quantity?: number;
    ticketType?: {
      id?: string;
      name?: string;
    };
    tickets?: Array<{
      id: string;
      code?: string;
      status?: string;
      currentOwnerUserId?: string | null;
    }>;
  }>;
  payments?: Array<{
    id: string;
    method?: string;
    amount?: string | number;
    status?: string;
    createdAt?: string;
  }>;
};

type TransferUserInfo = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  cpfNormalized?: string;
};

type TicketTransferRequestItem = {
  id: string;
  status?: string;
  responseReason?: string;
  requestedAt?: string;
  respondedAt?: string;
  expiresAt?: string;
  requestedByName?: string;
  requestedByEmail?: string;
  requestedByCpf?: string;
  fromName?: string;
  fromEmail?: string;
  fromCpf?: string;
  toName?: string;
  toEmail?: string;
  toCpf?: string;
  mode?: string;
  returnOfTransferRequestId?: string | null;
  ticket?: {
    id: string;
    code?: string;
    status?: string;
    holderName?: string;
    holderEmail?: string;
    holderCpf?: string;
    currentOwnerUserId?: string | null;
    orderItem?: {
      id?: string;
      ticketType?: {
        id?: string;
        name?: string;
      };
      order?: {
        id?: string;
        event?: EventBasic;
      };
    };
  };
  order?: {
    id?: string;
    event?: EventBasic;
  };
  requestedByUser?: TransferUserInfo;
  fromUser?: TransferUserInfo;
  toUser?: TransferUserInfo;
};

type TicketItem = {
  id: string;
  code?: string;
  status?: string;
  holderName?: string;
  holderEmail?: string;
  holderCpf?: string;
  currentOwnerUserId?: string | null;
  createdAt?: string;
  currentOwnerUser?: TransferUserInfo | null;
  orderItem?: {
    id?: string;
    ticketType?: {
      id?: string;
      name?: string;
    };
    order?: {
      id?: string;
      status?: string;
      customerName?: string;
      customerEmail?: string;
      event?: EventBasic;
    };
  };
  transferRequests?: TicketTransferRequestItem[];
};

type UnifiedEntry =
  | {
      type: "order";
      id: string;
      order: OrderItem;
      sortDate: string;
    }
  | {
      type: "transfer";
      id: string;
      transfer: TicketTransferRequestItem;
      sortDate: string;
    };

type ViewFilter = "active" | "pending" | "canceled" | "closed" | "all";

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
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(ms?: number | null) {
  if (ms === null || ms === undefined) return "--:--";

  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function getCountdownNumberClass(ms?: number | null) {
  if (ms === null || ms === undefined) return "text-slate-700";
  if (ms <= 5 * 60 * 1000) return "text-rose-600";

  return "text-emerald-600";
}

function getOrderTimeLeftMs(order: OrderItem, nowMs: number) {
  if (!order.expiresAt) return null;

  const expiresAt = new Date(order.expiresAt).getTime();

  if (Number.isNaN(expiresAt)) return null;

  return Math.max(0, expiresAt - nowMs);
}

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function isPendingOrder(order?: OrderItem | null) {
  return order?.status === "PENDING" || order?.status === "PENDING_PAYMENT";
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID") return "Pago";
  if (normalized === "PENDING") return "Pendente";
  if (normalized === "PENDING_PAYMENT") return "Aguardando pagamento";
  if (normalized === "AVAILABLE") return "Disponível";
  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "PENDING_ACCEPTANCE") return "Aguardando aceite";
  if (normalized === "TRANSFER_PENDING") return "Transferência pendente";
  if (normalized === "ACCEPTED") return "Aceita";
  if (normalized === "RETURNED") return "Devolvido";
  if (normalized === "REJECTED") return "Recusada";
  if (normalized === "TRANSFERRED") return "Transferido";
  if (normalized === "USED") return "Utilizado";
  if (normalized === "CANCELED") return "Cancelado";

  return status || "Sem status";
}

function getStatusClasses(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "PAID" ||
    normalized === "AVAILABLE" ||
    normalized === "ACTIVE" ||
    normalized === "ACCEPTED"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "PENDING" ||
    normalized === "PENDING_ACCEPTANCE" ||
    normalized === "TRANSFER_PENDING"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "PENDING_PAYMENT") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "RETURNED" || normalized === "TRANSFERRED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (normalized === "CANCELED" || normalized === "USED") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getEventImage(event?: EventBasic | null) {
  return (
    event?.media?.bannerImageUrl ||
    event?.media?.coverImageUrl ||
    event?.media?.mobileBannerUrl ||
    event?.media?.thumbnailUrl ||
    event?.media?.gallery?.[0] ||
    ""
  );
}

function getLocationLabel(event?: EventBasic | null) {
  if (!event?.location) return "Local a confirmar";

  if (String(event.location.mode || "").toUpperCase() === "ONLINE") {
    return "Evento online";
  }

  const cityState = [event.location.city, event.location.state]
    .filter(Boolean)
    .join(", ");

  return [event.location.venueName, cityState].filter(Boolean).join(" · ") ||
    "Local a confirmar";
}

function gradientByIndex(index: number) {
  const gradients = [
    "from-sky-600 via-blue-600 to-indigo-700",
    "from-fuchsia-600 via-purple-600 to-indigo-700",
    "from-emerald-500 via-teal-500 to-cyan-700",
    "from-orange-500 via-amber-500 to-yellow-500",
    "from-slate-800 via-slate-900 to-slate-950",
    "from-rose-500 via-pink-600 to-purple-800",
  ];

  return gradients[index % gradients.length];
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function isTransferVisibleOnMainList(transfer?: TicketTransferRequestItem | null) {
  const normalized = String(transfer?.status || "").toUpperCase();

  if (!transfer) return false;
  if (normalized === "RETURNED") return false;

  return true;
}

function getTransferEvent(transfer: TicketTransferRequestItem) {
  return (
    transfer.ticket?.orderItem?.order?.event ||
    transfer.order?.event ||
    undefined
  );
}

function getTransferTitle(transfer: TicketTransferRequestItem) {
  return (
    transfer.ticket?.orderItem?.order?.event?.name ||
    transfer.order?.event?.name ||
    "Transferência recebida"
  );
}

function getTransferTicketTypeName(transfer: TicketTransferRequestItem) {
  return transfer.ticket?.orderItem?.ticketType?.name || "Ingresso transferido";
}

function getOrderTicketTotal(order: OrderItem) {
  return (
    order.items?.reduce((sum, item) => {
      const quantity =
        typeof item.quantity === "number"
          ? item.quantity
          : (item.tickets || []).length;

      return sum + quantity;
    }, 0) || 0
  );
}

function getOrderPaidAmount(order: OrderItem) {
  return (
    order.payments?.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    ) || 0
  );
}

function isClosedEntry(entry: UnifiedEntry) {
  if (entry.type === "transfer") {
    return ["ACCEPTED", "REJECTED", "CANCELED", "RETURNED"].includes(
      String(entry.transfer.status || "").toUpperCase(),
    );
  }

  return ["PAID", "USED"].includes(String(entry.order.status || "").toUpperCase());
}

function isCanceledEntry(entry: UnifiedEntry) {
  if (entry.type === "transfer") {
    return ["REJECTED", "CANCELED", "RETURNED"].includes(
      String(entry.transfer.status || "").toUpperCase(),
    );
  }

  return ["CANCELED"].includes(String(entry.order.status || "").toUpperCase());
}

function isActiveEntry(entry: UnifiedEntry) {
  if (entry.type === "transfer") {
    return ["PENDING_ACCEPTANCE", "ACCEPTED"].includes(
      String(entry.transfer.status || "").toUpperCase(),
    );
  }

  return ["PAID", "PENDING", "PENDING_PAYMENT"].includes(
    String(entry.order.status || "").toUpperCase(),
  );
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<
    TicketTransferRequestItem[]
  >([]);
  const [ownedTickets, setOwnedTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [activeView, setActiveView] = useState<ViewFilter>("active");
  const [pageWarning, setPageWarning] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadEverything() {
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
          console.error("Erro ao ler usuário:", error);
        }
      }

      try {
        const [ordersRes, incomingRes, ticketsRes] = await Promise.allSettled([
          fetch("http://localhost:3001/v1/orders/customer", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:3001/v1/tickets/customer/transfers/incoming", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:3001/v1/tickets/customer", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (ordersRes.status === "rejected") {
          alert("Erro ao carregar seus pedidos");
          return;
        }

        const ordersResponse = ordersRes.value;
        const ordersData = await safeJson<any>(ordersResponse);

        if (ordersResponse.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (!ordersResponse.ok) {
          alert(
            typeof ordersData?.message === "string"
              ? ordersData.message
              : "Erro ao carregar pedidos",
          );
          return;
        }

        setOrders(Array.isArray(ordersData) ? ordersData : []);

        const warningParts: string[] = [];

        if (incomingRes.status === "fulfilled") {
          const incomingResponse = incomingRes.value;
          const incomingData = await safeJson<any>(incomingResponse);

          if (incomingResponse.ok) {
            setIncomingTransfers(Array.isArray(incomingData) ? incomingData : []);
          } else {
            console.error(
              "Falha ao carregar transferências recebidas:",
              incomingData,
            );
            setIncomingTransfers([]);
            warningParts.push("transferências recebidas");
          }
        } else {
          console.error(
            "Falha ao carregar transferências recebidas:",
            incomingRes.reason,
          );
          setIncomingTransfers([]);
          warningParts.push("transferências recebidas");
        }

        if (ticketsRes.status === "fulfilled") {
          const ticketsResponse = ticketsRes.value;
          const ticketsData = await safeJson<any>(ticketsResponse);

          if (ticketsResponse.ok) {
            setOwnedTickets(Array.isArray(ticketsData) ? ticketsData : []);
          } else {
            console.error("Falha ao carregar ingressos do cliente:", ticketsData);
            setOwnedTickets([]);
            warningParts.push("ingressos");
          }
        } else {
          console.error("Falha ao carregar ingressos do cliente:", ticketsRes.reason);
          setOwnedTickets([]);
          warningParts.push("ingressos");
        }

        if (warningParts.length > 0) {
          setPageWarning(
            `Parte da página não carregou agora: ${warningParts.join(
              " e ",
            )}. Seus pedidos principais continuam disponíveis.`,
          );
        } else {
          setPageWarning("");
        }
      } catch (error) {
        console.error("CUSTOMER ORDERS ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadEverything();
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  function transferBelongsToMe(transfer?: TicketTransferRequestItem | null) {
    const currentUserId = user?.id;
    const currentUserEmail = String(user?.email || "").trim().toLowerCase();
    const currentUserCpf = onlyDigits(user?.cpf);

    const transferUserId = transfer?.toUser?.id;
    const transferEmail = String(
      transfer?.toEmail || transfer?.toUser?.email || "",
    )
      .trim()
      .toLowerCase();
    const transferCpf = onlyDigits(
      transfer?.toCpf || transfer?.toUser?.cpfNormalized || transfer?.toUser?.cpf,
    );

    return Boolean(
      (currentUserId && transferUserId && currentUserId === transferUserId) ||
        (currentUserEmail && transferEmail && currentUserEmail === transferEmail) ||
        (currentUserCpf && transferCpf && currentUserCpf === transferCpf),
    );
  }

  const acceptedTransfers = useMemo(() => {
    const collected: TicketTransferRequestItem[] = [];

    for (const ticket of ownedTickets) {
      for (const transfer of ticket.transferRequests || []) {
        if (transfer.status !== "ACCEPTED") continue;
        if (!transferBelongsToMe(transfer)) continue;
        if (!isTransferVisibleOnMainList(transfer)) continue;

        collected.push({
          ...transfer,
          ticket: transfer.ticket || {
            id: ticket.id,
            code: ticket.code,
            status: ticket.status,
            holderName: ticket.holderName,
            holderEmail: ticket.holderEmail,
            holderCpf: ticket.holderCpf,
            currentOwnerUserId: ticket.currentOwnerUserId,
            orderItem: {
              id: ticket.orderItem?.id,
              ticketType: ticket.orderItem?.ticketType,
              order: ticket.orderItem?.order
                ? {
                    id: ticket.orderItem.order.id,
                    event: ticket.orderItem.order.event,
                  }
                : undefined,
            },
          },
        });
      }
    }

    const map = new Map<string, TicketTransferRequestItem>();

    for (const transfer of collected) {
      map.set(transfer.id, transfer);
    }

    return Array.from(map.values()).sort((a, b) => {
      const aTime = new Date(a.respondedAt || a.requestedAt || 0).getTime();
      const bTime = new Date(b.respondedAt || b.requestedAt || 0).getTime();

      return bTime - aTime;
    });
  }, [ownedTickets, user]);

  const visibleIncomingTransfers = useMemo(() => {
    return incomingTransfers.filter((transfer) =>
      isTransferVisibleOnMainList(transfer),
    );
  }, [incomingTransfers]);

  const unifiedEntries = useMemo(() => {
    const entries: UnifiedEntry[] = [
      ...orders.map((order) => ({
        type: "order" as const,
        id: order.id,
        order,
        sortDate: order.createdAt || "",
      })),
      ...visibleIncomingTransfers.map((transfer) => ({
        type: "transfer" as const,
        id: transfer.id,
        transfer,
        sortDate: transfer.requestedAt || "",
      })),
      ...acceptedTransfers.map((transfer) => ({
        type: "transfer" as const,
        id: transfer.id,
        transfer,
        sortDate: transfer.respondedAt || transfer.requestedAt || "",
      })),
    ];

    const deduped = new Map<string, UnifiedEntry>();

    for (const entry of entries) {
      if (entry.type === "order") {
        deduped.set(`order:${entry.id}`, entry);
      } else {
        deduped.set(`transfer:${entry.id}`, entry);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => {
      const aTime = new Date(a.sortDate || 0).getTime();
      const bTime = new Date(b.sortDate || 0).getTime();

      return bTime - aTime;
    });
  }, [orders, visibleIncomingTransfers, acceptedTransfers]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return unifiedEntries.filter((entry) => {
      const matchesView =
        activeView === "all"
          ? true
          : activeView === "active"
            ? isActiveEntry(entry)
            : activeView === "pending"
              ? entry.type === "order"
                ? isPendingOrder(entry.order)
                : entry.transfer.status === "PENDING_ACCEPTANCE"
              : activeView === "canceled"
                ? isCanceledEntry(entry)
                : activeView === "closed"
                  ? isClosedEntry(entry)
                  : true;

      if (!matchesView) return false;

      if (!term) return true;

      if (entry.type === "order") {
        const order = entry.order;
        const joined = [
          order.id,
          order.status,
          order.customerName,
          order.customerEmail,
          order.event?.name,
          order.event?.description,
          order.event?.eventDate,
          order.event?.startDate,
          ...(order.items?.map((item) => item.ticketType?.name || "") || []),
        ]
          .join(" ")
          .toLowerCase();

        return joined.includes(term);
      }

      const transfer = entry.transfer;
      const joined = [
        transfer.id,
        transfer.status,
        transfer.responseReason,
        transfer.ticket?.orderItem?.ticketType?.name,
        transfer.ticket?.orderItem?.order?.event?.name,
        transfer.order?.event?.name,
        transfer.fromName,
        transfer.fromEmail,
        transfer.fromCpf,
        transfer.toName,
        transfer.toEmail,
        transfer.toCpf,
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(term);
    });
  }, [unifiedEntries, search, activeView]);

  const filterCounts = useMemo(() => {
    return {
      active: unifiedEntries.filter(isActiveEntry).length,
      pending: unifiedEntries.filter((entry) =>
        entry.type === "order"
          ? isPendingOrder(entry.order)
          : entry.transfer.status === "PENDING_ACCEPTANCE",
      ).length,
      canceled: unifiedEntries.filter(isCanceledEntry).length,
      closed: unifiedEntries.filter(isClosedEntry).length,
      all: unifiedEntries.length,
    };
  }, [unifiedEntries]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f5f8]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
          <div className="rounded-[22px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Carregando seus ingressos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f3f5f8] text-slate-950">
      <section className="bg-white">
        <div className="mx-auto max-w-[1180px] px-4 pb-10 pt-8">
          <h1 className="text-center text-[34px] font-black text-slate-950 md:text-[40px]">
            Ingressos
          </h1>

          <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <div className="flex h-11 w-full items-center rounded border border-slate-300 bg-white md:max-w-[420px]">
              <input
                type="text"
                placeholder="Buscar pelo nome, email, ingresso ou pedido"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-full flex-1 bg-transparent px-4 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                className="h-full border-l border-slate-200 px-4 text-[11px] font-bold uppercase text-slate-400"
              >
                Buscar
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1180px] px-4 pb-16 pt-8">
        {pageWarning ? (
          <section className="mb-6 rounded-[16px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            {pageWarning}
          </section>
        ) : null}

        <section className="flex flex-wrap gap-2">
          {[
            { id: "active", label: "Ativos", count: filterCounts.active },
            { id: "pending", label: "Pendentes", count: filterCounts.pending },
            { id: "canceled", label: "Cancelados", count: filterCounts.canceled },
            { id: "closed", label: "Encerrados", count: filterCounts.closed },
            { id: "all", label: "Todos", count: filterCounts.all },
          ].map((filter) => {
            const active = activeView === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveView(filter.id as ViewFilter)}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  active
                    ? "border-sky-500 bg-sky-50 text-sky-600"
                    : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:text-sky-600"
                }`}
              >
                {filter.label}
                <span className="ml-1 text-xs opacity-70">({filter.count})</span>
              </button>
            );
          })}
        </section>

        {filteredEntries.length === 0 ? (
          <div className="mt-8 rounded-[22px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
            Nenhum ingresso encontrado com esse filtro.
          </div>
        ) : (
          <section className="mt-8 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredEntries.map((entry, index) => {
              if (entry.type === "order") {
                const order = entry.order;
                const event = order.event;
                const eventImage = getEventImage(event);
                const totalTickets = getOrderTicketTotal(order);
                const paidAmount = getOrderPaidAmount(order);
                const isPending = isPendingOrder(order);
                const timeLeftMs = getOrderTimeLeftMs(order, nowMs);
                const showCountdown = isPending && timeLeftMs !== null;
                const eventDate = event?.startDate || event?.eventDate;
                const gradient = gradientByIndex(index);

                return (
                  <article
                    key={`order-${order.id}`}
                    className="overflow-hidden rounded-[8px] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                  >
                    <div className={`relative h-[170px] bg-gradient-to-br ${gradient}`}>
                      {eventImage ? (
                        <img
                          src={eventImage}
                          alt={event?.name || "Evento"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-6 text-center text-2xl font-black text-white">
                          {event?.name || "Evento"}
                        </div>
                      )}

                      <div className="absolute left-3 top-3">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClasses(
                            order.status,
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>

                      {showCountdown ? (
                        <div className="absolute right-3 top-3 rounded bg-white px-3 py-2 shadow-sm">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                            Restante
                          </p>
                          <p
                            className={`text-lg font-black ${getCountdownNumberClass(
                              timeLeftMs,
                            )}`}
                          >
                            {formatCountdown(timeLeftMs)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="border-b border-slate-200 p-5">
                      <h2 className="min-h-[48px] text-[17px] font-black leading-6 text-slate-950">
                        {event?.name || "Evento sem nome"}
                      </h2>
                    </div>

                    <div className="p-5">
                      <div className="space-y-4 text-sm text-slate-600">
                        <div className="flex gap-3">
                          <span className="text-slate-400">◷</span>
                          <div>
                            <p className="font-medium text-slate-700">
                              {formatDate(eventDate)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Compra em {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="text-slate-400">⌖</span>
                          <div className="flex-1">
                            <p className="font-medium text-slate-700">
                              {getLocationLabel(event)}
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                event?.id
                                  ? goTo(`/customer/events/${event.id}`)
                                  : undefined
                              }
                              className="mt-1 text-sm font-bold text-sky-600 hover:text-sky-700"
                            >
                              Ver evento
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <span className="text-slate-400">🎟️</span>
                          <div>
                            <p className="font-medium text-slate-700">
                              {totalTickets} ingresso(s)
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Total {formatMoney(order.totalAmount)} · Pago{" "}
                              {formatMoney(paidAmount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => goTo(`/customer/orders/${order.id}`)}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#242424] px-4 py-3 text-sm font-bold text-white hover:bg-black"
                      >
                        <span className="h-4 w-6 rounded-sm bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400" />
                        Ver detalhes do pedido
                      </button>
                    </div>
                  </article>
                );
              }

              const transfer = entry.transfer;
              const event = getTransferEvent(transfer);
              const eventImage = getEventImage(event);
              const gradient = gradientByIndex(index);
              const transferDate = transfer.respondedAt || transfer.requestedAt;
              const routeId = `transfer_${transfer.id}`;

              return (
                <article
                  key={`transfer-${transfer.id}`}
                  className="overflow-hidden rounded-[8px] bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
                >
                  <div className={`relative h-[170px] bg-gradient-to-br ${gradient}`}>
                    {eventImage ? (
                      <img
                        src={eventImage}
                        alt={getTransferTitle(transfer)}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-6 text-center text-2xl font-black text-white">
                        {getTransferTitle(transfer)}
                      </div>
                    )}

                    <div className="absolute left-3 top-3">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClasses(
                          transfer.status,
                        )}`}
                      >
                        {getStatusLabel(transfer.status)}
                      </span>
                    </div>
                  </div>

                  <div className="border-b border-slate-200 p-5">
                    <h2 className="min-h-[48px] text-[17px] font-black leading-6 text-slate-950">
                      {getTransferTitle(transfer)}
                    </h2>
                  </div>

                  <div className="p-5">
                    <div className="space-y-4 text-sm text-slate-600">
                      <div className="flex gap-3">
                        <span className="text-slate-400">◷</span>
                        <div>
                          <p className="font-medium text-slate-700">
                            {formatDate(event?.startDate || event?.eventDate)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Transferência em {formatDate(transferDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="text-slate-400">⌖</span>
                        <div className="flex-1">
                          <p className="font-medium text-slate-700">
                            {getLocationLabel(event)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            De: {transfer.fromName || transfer.fromUser?.name || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <span className="text-slate-400">🎟️</span>
                        <div>
                          <p className="font-medium text-slate-700">
                            {getTransferTicketTypeName(transfer)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Para: {transfer.toName || transfer.toUser?.name || "-"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => goTo(`/customer/orders/${routeId}`)}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[#242424] px-4 py-3 text-sm font-bold text-white hover:bg-black"
                    >
                      <span className="h-4 w-6 rounded-sm bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400" />
                      Ver detalhes
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}