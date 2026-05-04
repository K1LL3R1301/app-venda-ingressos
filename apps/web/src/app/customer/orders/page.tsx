"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type OrderItem = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: string | number;
  status?: string;
  createdAt?: string;
  event?: {
    id: string;
    name?: string;
    description?: string;
    eventDate?: string;
    startDate?: string;
  };
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
        event?: {
          id?: string;
          name?: string;
          description?: string;
          eventDate?: string;
          startDate?: string;
        };
      };
    };
  };
  order?: {
    id?: string;
    event?: {
      id?: string;
      name?: string;
      description?: string;
      eventDate?: string;
      startDate?: string;
    };
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
      event?: {
        id?: string;
        name?: string;
        description?: string;
        eventDate?: string;
        startDate?: string;
      };
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

type ViewFilter = "all" | "orders" | "pending" | "paid" | "transfers";

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number) {
  if (value === undefined || value === null) return "R$ 0,00";

  const numeric = toNumber(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
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

function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function formatCpf(value?: string | null) {
  const digits = onlyDigits(value);

  if (!digits) return "-";
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

function getRelativeLabel(value?: string) {
  if (!value) return "Sem data";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Em breve";

  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 0) return "Já aconteceu";
  if (diffHours <= 24) return "Hoje";
  if (diffDays <= 3) return "Próximos dias";
  if (diffDays <= 7) return "Nesta semana";

  return "Agendado";
}

function previewText(value?: string, max = 130) {
  if (!value) {
    return "Acompanhe os detalhes deste registro na sua área do cliente.";
  }

  if (value.length <= max) return value;

  return `${value.slice(0, max).trim()}...`;
}

function gradientByIndex(index: number) {
  const gradients = [
    "from-sky-600 via-blue-600 to-indigo-700",
    "from-fuchsia-600 via-purple-600 to-indigo-700",
    "from-emerald-500 via-teal-500 to-cyan-700",
    "from-orange-500 via-amber-500 to-yellow-500",
    "from-slate-800 via-slate-900 to-slate-950",
  ];

  return gradients[index % gradients.length];
}

function cardClass() {
  return "rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm";
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

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<
    TicketTransferRequestItem[]
  >([]);
  const [ownedTickets, setOwnedTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<StoredUser | null>(null);
  const [activeView, setActiveView] = useState<ViewFilter>("all");
  const [pageWarning, setPageWarning] = useState("");

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

  const summary = useMemo(() => {
    return {
      totalOrders: orders.length,
      paidOrders: orders.filter((order) => order.status === "PAID").length,
      pendingOrders: orders.filter(
        (order) =>
          order.status === "PENDING" || order.status === "PENDING_PAYMENT",
      ).length,
      receivedTransfers: visibleIncomingTransfers.length + acceptedTransfers.length,
    };
  }, [orders, visibleIncomingTransfers, acceptedTransfers]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return unifiedEntries.filter((entry) => {
      const matchesView =
        activeView === "all"
          ? true
          : activeView === "orders"
            ? entry.type === "order"
            : activeView === "transfers"
              ? entry.type === "transfer"
              : activeView === "paid"
                ? entry.type === "order" && entry.order.status === "PAID"
                : activeView === "pending"
                  ? entry.type === "order" &&
                    (entry.order.status === "PENDING" ||
                      entry.order.status === "PENDING_PAYMENT")
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Carregando seus pedidos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-[36px] bg-gradient-to-r from-slate-950 via-slate-900 to-sky-900 text-white shadow-sm">
        <div className="grid gap-8 p-8 md:p-10 xl:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
              Área do cliente
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
              Meus pedidos
            </h1>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
              Aqui você acompanha compras, pagamentos pendentes, ingressos
              recebidos por transferência e o histórico completo da sua jornada.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/customer/dashboard")}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
              >
                Voltar para dashboard
              </button>

              <button
                type="button"
                onClick={() => goTo("/customer/events")}
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Explorar eventos
              </button>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                Perfil logado
              </p>
              <p className="mt-3 text-lg font-black text-white">
                {user?.name || "Cliente"}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {user?.email || "-"}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                Visão atual
              </p>
              <p className="mt-3 text-2xl font-black text-white">
                {filteredEntries.length}
              </p>
              <p className="mt-1 text-sm text-white/80">
                registro(s) na tela
              </p>
            </div>
          </div>
        </div>
      </section>

      {pageWarning ? (
        <section className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
          {pageWarning}
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Pedidos
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {summary.totalOrders}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Compras feitas na plataforma.
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Pedidos pagos
          </p>
          <p className="mt-3 text-3xl font-black text-emerald-600">
            {summary.paidOrders}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ingressos já liberados.
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Pendentes
          </p>
          <p className="mt-3 text-3xl font-black text-amber-600">
            {summary.pendingOrders}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Pedidos aguardando ação.
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Transferências
          </p>
          <p className="mt-3 text-3xl font-black text-sky-600">
            {summary.receivedTransfers}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Somente transferências ativas ou aceitas.
          </p>
        </div>
      </section>

      <section className="mt-8 rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="flex h-14 items-center rounded-2xl border border-slate-200 bg-white px-4">
            <span className="mr-3 text-slate-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar pedido, evento, email, transferência..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
            {[
              { id: "all", label: "Tudo" },
              { id: "orders", label: "Pedidos" },
              { id: "pending", label: "Pendentes" },
              { id: "paid", label: "Pagos" },
              { id: "transfers", label: "Transferências" },
            ].map((filter) => {
              const active = activeView === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveView(filter.id as ViewFilter)}
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

      <section className="mt-10">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            Histórico
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
            Compras e transferências no mesmo lugar
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Devoluções ficam só no histórico interno, sem virar card novo aqui.
          </p>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
            Nenhum registro encontrado com esse filtro.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredEntries.map((entry, index) => {
              const gradient = gradientByIndex(index);

              if (entry.type === "order") {
                const order = entry.order;

                const totalTickets =
                  order.items?.reduce((sum, item) => {
                    const quantity =
                      typeof item.quantity === "number"
                        ? item.quantity
                        : (item.tickets || []).length;
                    return sum + quantity;
                  }, 0) || 0;

                const isPaid = order.status === "PAID";
                const eventDate = order.event?.startDate || order.event?.eventDate;

                return (
                  <div
                    key={`order-${order.id}`}
                    className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
                  >
                    <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                          Pedido
                        </span>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            order.status,
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                        <span className="text-xs font-medium text-white/75">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-3xl font-black">
                        {order.event?.name || "Evento sem nome"}
                      </h3>

                      <p className="mt-2 max-w-3xl text-sm text-white/80">
                        {previewText(order.event?.description, 150)}
                      </p>
                    </div>

                    <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-5 text-sm text-slate-600">
                          <span>📅 {formatDate(eventDate)}</span>
                          <span>🛒 Compra em {formatDate(order.createdAt)}</span>
                          <span>🎟️ {totalTickets} ingresso(s)</span>
                          <span>{getRelativeLabel(eventDate)}</span>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Comprador</p>
                            <p className="mt-2 font-semibold text-slate-900">
                              {order.customerName || "-"}
                            </p>
                            <p className="mt-1 break-all text-sm text-slate-500">
                              {order.customerEmail || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-4">
                            <p className="text-sm text-slate-500">Valor total</p>
                            <p className="mt-2 text-2xl font-black text-slate-950">
                              {formatMoney(order.totalAmount)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {isPaid
                                ? "Pagamento confirmado"
                                : "Aguardando conclusão do pedido"}
                            </p>
                          </div>
                        </div>

                        {(order.items || []).length > 0 ? (
                          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                            <p className="text-sm font-semibold text-slate-900">
                              Itens deste pedido
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {(order.items || []).map((item) => (
                                <span
                                  key={item.id}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                >
                                  {item.ticketType?.name || "Ingresso"} ·{" "}
                                  {item.quantity ?? 0}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-3 rounded-[24px] bg-slate-50 p-5">
                        <span
                          className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            order.status,
                          )}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>

                        <p className="text-sm text-slate-600">
                          {isPaid
                            ? "Abra para ver ingressos, transferências e histórico completo."
                            : "Abra para finalizar pagamento ou acompanhar o andamento do pedido."}
                        </p>

                        <button
                          type="button"
                          onClick={() => goTo(`/customer/orders/${order.id}`)}
                          className="mt-auto rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                          Abrir pedido
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const transfer = entry.transfer;
              const transferEvent =
                transfer.ticket?.orderItem?.order?.event || transfer.order?.event;
              const transferTicketName =
                transfer.ticket?.orderItem?.ticketType?.name || "Ingresso";
              const senderName =
                transfer.fromName ||
                transfer.requestedByName ||
                transfer.fromUser?.name ||
                "-";
              const senderEmail =
                transfer.fromEmail ||
                transfer.requestedByEmail ||
                transfer.fromUser?.email ||
                "-";

              return (
                <div
                  key={`transfer-${transfer.id}`}
                  className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
                >
                  <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur">
                        Transferência
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          transfer.status,
                        )}`}
                      >
                        {getStatusLabel(transfer.status)}
                      </span>

                      <span className="text-xs font-medium text-white/75">
                        #{transfer.id.slice(0, 8)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-3xl font-black">
                      {transferEvent?.name || "Transferência recebida"}
                    </h3>

                    <p className="mt-2 max-w-3xl text-sm text-white/80">
                      Você recebeu um ingresso por transferência e pode revisar
                      esse recebimento.
                    </p>
                  </div>

                  <div className="grid gap-6 p-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-5 text-sm text-slate-600">
                        <span>
                          📅{" "}
                          {formatDate(
                            transferEvent?.startDate || transferEvent?.eventDate,
                          )}
                        </span>
                        <span>📨 {formatDate(transfer.requestedAt)}</span>
                        <span>🎟️ {transferTicketName}</span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">Enviado por</p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {senderName}
                          </p>
                          <p className="mt-1 break-all text-sm text-slate-500">
                            {senderEmail}
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            CPF:{" "}
                            {formatCpf(
                              transfer.fromCpf ||
                                transfer.requestedByCpf ||
                                transfer.fromUser?.cpfNormalized,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-sm text-slate-500">
                            Situação atual
                          </p>
                          <p className="mt-2 text-2xl font-black text-slate-950">
                            {getStatusLabel(transfer.status)}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {transfer.status === "PENDING_ACCEPTANCE"
                              ? "Aguardando sua ação"
                              : "Ingresso incorporado à sua conta"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-[24px] bg-slate-50 p-5">
                      <span
                        className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          transfer.status,
                        )}`}
                      >
                        {getStatusLabel(transfer.status)}
                      </span>

                      <p className="text-sm text-slate-600">
                        {transfer.status === "PENDING_ACCEPTANCE"
                          ? "Abra para aceitar ou recusar essa transferência."
                          : "Abra para ver o relatório completo da transferência."}
                      </p>

                      <button
                        type="button"
                        onClick={() => goTo(`/customer/orders/transfer_${transfer.id}`)}
                        className="mt-auto rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        {transfer.status === "PENDING_ACCEPTANCE"
                          ? "Abrir recebimento"
                          : "Abrir transferência"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}