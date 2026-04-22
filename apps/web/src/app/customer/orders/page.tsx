"use client";

import { useEffect, useMemo, useState } from "react";

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
  if (status === "PAID") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (status === "PENDING") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }

  if (status === "CANCELED") {
    return "bg-red-50 text-red-700 border border-red-200";
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadOrders() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
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
              : "Erro ao carregar pedidos",
          );
          return;
        }

        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("CUSTOMER ORDERS ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return orders;

    return orders.filter((order) => {
      const joined = [
        order.id,
        order.status,
        order.customerName,
        order.customerEmail,
        order.event?.name,
        order.event?.description,
        order.event?.eventDate,
        ...(order.items?.map((item) => item.ticketType?.name || "") || []),
      ]
        .join(" ")
        .toLowerCase();

      return joined.includes(term);
    });
  }, [orders, search]);

  const summary = useMemo(() => {
    return {
      total: orders.length,
      paid: orders.filter((order) => order.status === "PAID").length,
      pending: orders.filter((order) => order.status === "PENDING").length,
    };
  }, [orders]);

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
              placeholder="Buscar em meus pedidos"
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
          Aqui ficam suas compras. Ao abrir um pedido, você vê o relatório
          completo e, quando o pagamento for aprovado, os ingressos ficam
          disponíveis.
        </p>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Total de pedidos</p>
          <h2 className="mt-3 text-3xl font-black text-gray-900">
            {summary.total}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pedidos pagos</p>
          <h2 className="mt-3 text-3xl font-black text-emerald-600">
            {summary.paid}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Pedidos pendentes</p>
          <h2 className="mt-3 text-3xl font-black text-amber-600">
            {summary.pending}
          </h2>
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-gray-900">
            Histórico de compras
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Cada pedido abre uma visão completa da compra
          </p>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Nenhum pedido encontrado.
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order, index) => {
              const totalTickets =
                order.status === "PAID"
                  ? order.items?.reduce(
                      (sum, item) => sum + (item.quantity || 0),
                      0,
                    ) || 0
                  : 0;

              const gradient = gradients[index % gradients.length];

              return (
                <div
                  key={order.id}
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
                        <span>📅 Evento: {formatDate(order.event?.eventDate)}</span>
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
            })}
          </div>
        )}
      </section>
    </main>
  );
}