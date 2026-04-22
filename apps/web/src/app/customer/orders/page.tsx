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
  requestedByName?: string;
  requestedByEmail?: string;
  requestedByCpf?: string;
  fromName?: string;
  fromEmail?: string;
  fromCpf?: string;
  toName?: string;
  toEmail?: string;
  toCpf?: string;
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

function getStatusClasses(status?: string) {
  if (
    status === "PAID" ||
    status === "AVAILABLE" ||
    status === "ACTIVE" ||
    status === "ACCEPTED"
  ) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (
    status === "PENDING" ||
    status === "PENDING_ACCEPTANCE" ||
    status === "TRANSFER_PENDING"
  ) {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (status === "PENDING_PAYMENT") {
    return "bg-sky-50 text-sky-700 border border-sky-200";
  }

  if (status === "TRANSFERRED" || status === "TRANSFERIDO") {
    return "bg-violet-50 text-violet-700 border border-violet-200";
  }

  if (status === "REJECTED") {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  if (status === "CANCELED") {
    return "bg-gray-50 text-gray-700 border border-gray-200";
  }

  return "bg-gray-50 text-gray-700 border border-gray-200";
}

const gradients = [
  "from-sky-600 via-blue-600 to-indigo-700",
  "from-fuchsia-600 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-700",
  "from-orange-500 via-amber-500 to-yellow-500",
];

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<
    TicketTransferRequestItem[]
  >([]);
  const [ownedTickets, setOwnedTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<StoredUser | null>(null);

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
        const [ordersRes, incomingRes, ticketsRes] = await Promise.all([
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

        const ordersData = await ordersRes.json();
        const incomingData = await incomingRes.json();
        const ticketsData = await ticketsRes.json();

        if (!ordersRes.ok) {
          alert(
            typeof ordersData?.message === "string"
              ? ordersData.message
              : "Erro ao carregar pedidos",
          );
          return;
        }

        if (!incomingRes.ok) {
          alert(
            typeof incomingData?.message === "string"
              ? incomingData.message
              : "Erro ao carregar transferências recebidas",
          );
          return;
        }

        if (!ticketsRes.ok) {
          alert(
            typeof ticketsData?.message === "string"
              ? ticketsData.message
              : "Erro ao carregar ingressos",
          );
          return;
        }

        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setIncomingTransfers(Array.isArray(incomingData) ? incomingData : []);
        setOwnedTickets(Array.isArray(ticketsData) ? ticketsData : []);
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

  const unifiedEntries = useMemo(() => {
    const entries: UnifiedEntry[] = [
      ...orders.map((order) => ({
        type: "order" as const,
        id: order.id,
        order,
        sortDate: order.createdAt || "",
      })),
      ...incomingTransfers.map((transfer) => ({
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
  }, [orders, incomingTransfers, acceptedTransfers]);

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return unifiedEntries;

    return unifiedEntries.filter((entry) => {
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
  }, [unifiedEntries, search]);

  const summary = useMemo(() => {
    return {
      totalOrders: orders.length,
      paidOrders: orders.filter((order) => order.status === "PAID").length,
      pendingOrders: orders.filter((order) => order.status === "PENDING").length,
      receivedTransfers: incomingTransfers.length + acceptedTransfers.length,
    };
  }, [orders, incomingTransfers, acceptedTransfers]);

  if (loading) {
    return (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-gray-800">
            Carregando seus pedidos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-8">
        <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white px-4">
            <span className="mr-3 text-gray-400">🔎</span>
            <input
              type="text"
              placeholder="Buscar em meus pedidos e transferências"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      </section>

      <section className="rounded-[32px] bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 p-8 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
          Área do cliente
        </p>

        <h1 className="mt-4 text-4xl font-black leading-tight md:text-5xl">
          Meus pedidos
        </h1>

        <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
          Aqui ficam suas compras e também os ingressos que chegaram para você
          por transferência, tudo na mesma área.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-4">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pedidos</p>
          <h2 className="mt-3 text-3xl font-black text-gray-900">
            {summary.totalOrders}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pedidos pagos</p>
          <h2 className="mt-3 text-3xl font-black text-emerald-600">
            {summary.paidOrders}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pedidos pendentes</p>
          <h2 className="mt-3 text-3xl font-black text-amber-600">
            {summary.pendingOrders}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Recebidos por transferência</p>
          <h2 className="mt-3 text-3xl font-black text-sky-600">
            {summary.receivedTransfers}
          </h2>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Histórico completo
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Compras e transferências recebidas no mesmo lugar
          </p>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Nenhum registro encontrado.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredEntries.map((entry, index) => {
              const gradient = gradients[index % gradients.length];

              if (entry.type === "order") {
                const order = entry.order;

                const totalTickets =
                  order.status === "PAID"
                    ? order.items?.reduce(
                        (sum, item) => sum + (item.quantity || 0),
                        0,
                      ) || 0
                    : 0;

                return (
                  <div
                    key={`order-${order.id}`}
                    className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm"
                  >
                    <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                          {order.status || "SEM STATUS"}
                        </span>

                        <span className="text-xs font-medium text-white/75">
                          Pedido #{order.id.slice(0, 8)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-3xl font-black">
                        {order.event?.name || "Evento sem nome"}
                      </h3>

                      <p className="mt-2 max-w-3xl text-sm text-white/80">
                        {order.event?.description || "Sem descrição"}
                      </p>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr]">
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-5 text-sm text-gray-600">
                          <span>
                            📅 Evento:{" "}
                            {formatDate(order.event?.startDate || order.event?.eventDate)}
                          </span>
                          <span>🛒 Compra: {formatDate(order.createdAt)}</span>
                          {order.status === "PAID" ? (
                            <span>🎟️ {totalTickets} ingresso(s)</span>
                          ) : (
                            <span>💳 Ingressos liberados após pagamento</span>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Comprador</p>
                            <p className="mt-2 font-semibold text-gray-900">
                              {order.customerName || "-"}
                            </p>
                            <p className="mt-1 break-all text-sm text-gray-500">
                              {order.customerEmail || "-"}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-gray-50 p-4">
                            <p className="text-sm text-gray-500">Valor total</p>
                            <p className="mt-2 text-2xl font-black text-gray-900">
                              {formatMoney(order.totalAmount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 rounded-[24px] bg-gray-50 p-5">
                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                            order.status,
                          )}`}
                        >
                          {order.status || "SEM STATUS"}
                        </span>

                        <p className="text-sm text-gray-600">
                          Abra o pedido para ver pagamentos, cancelamentos,
                          tickets e o fluxo completo.
                        </p>

                        <button
                          type="button"
                          onClick={() => goTo(`/customer/orders/${order.id}`)}
                          className="mt-auto rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                        >
                          Abrir pedido
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const transfer = entry.transfer;
              const isAccepted = transfer.status === "ACCEPTED";
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
                  className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm"
                >
                  <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                        {transfer.status || "SEM STATUS"}
                      </span>

                      <span className="text-xs font-medium text-white/75">
                        {isAccepted
                          ? `Transferência #${transfer.id.slice(0, 8)}`
                          : `Recebimento pendente #${transfer.id.slice(0, 8)}`}
                      </span>
                    </div>

                    <h3 className="mt-4 text-3xl font-black">
                      {transferEvent?.name || "Transferência recebida"}
                    </h3>

                    <p className="mt-2 max-w-3xl text-sm text-white/80">
                      {isAccepted
                        ? "Este ingresso já foi aceito e agora faz parte da sua conta."
                        : "Você recebeu um ingresso por transferência e pode analisar esse recebimento."}
                    </p>
                  </div>

                  <div className="grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-5 text-sm text-gray-600">
                        <span>
                          📅 Evento:{" "}
                          {formatDate(
                            transferEvent?.startDate || transferEvent?.eventDate,
                          )}
                        </span>

                        <span>
                          {isAccepted ? "✅ Aceita em" : "📨 Recebida em"}{" "}
                          {formatDate(
                            isAccepted
                              ? transfer.respondedAt || transfer.requestedAt
                              : transfer.requestedAt,
                          )}
                        </span>

                        <span>🎟️ {transferTicketName}</span>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">Enviado por</p>
                          <p className="mt-2 font-semibold text-gray-900">
                            {senderName}
                          </p>
                          <p className="mt-1 break-all text-sm text-gray-500">
                            {senderEmail}
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            CPF:{" "}
                            {formatCpf(
                              transfer.fromCpf ||
                                transfer.requestedByCpf ||
                                transfer.fromUser?.cpfNormalized,
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-gray-50 p-4">
                          <p className="text-sm text-gray-500">
                            {isAccepted ? "Valor da transferência" : "Valor previsto"}
                          </p>
                          <p className="mt-2 text-2xl font-black text-gray-900">
                            R$ 0,00
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-[24px] bg-gray-50 p-5">
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          transfer.status,
                        )}`}
                      >
                        {transfer.status || "SEM STATUS"}
                      </span>

                      <p className="text-sm text-gray-600">
                        {isAccepted
                          ? "Abra para ver o relatório da transferência e acessar o ingresso."
                          : "Abra para aceitar ou recusar essa transferência."}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          goTo(`/customer/orders/transfer_${transfer.id}`)
                        }
                        className="mt-auto rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                      >
                        {isAccepted ? "Abrir transferência" : "Abrir recebimento"}
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