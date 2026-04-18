"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  eventId?: string;
  customerName?: string;
  customerEmail?: string;
  status?: string;
  totalAmount?: string | number;
  createdAt?: string;
  event?: {
    id: string;
    name?: string;
  };
  items?: Array<{
    id: string;
    quantity?: number;
    ticketType?: {
      id: string;
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
  }>;
};

export default function OrdersPage() {
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
        const res = await fetch("http://localhost:3001/v1/orders", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
          alert(
            typeof result?.message === "string"
              ? result.message
              : "Erro ao carregar pedidos",
          );
          return;
        }

        setOrders(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((order) => {
      const fields = [
        order.id,
        order.customerName,
        order.customerEmail,
        order.status,
        order.totalAmount,
        order.event?.name,
        ...(order.items?.flatMap((item) => [
          item.ticketType?.name,
          ...(item.tickets?.flatMap((ticket) => [ticket.code, ticket.status]) ||
            []),
        ]) || []),
      ];

      return fields.some((field) =>
        String(field || "").toLowerCase().includes(q),
      );
    });
  }, [orders, search]);

  function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("pt-BR");
  }

  function getTicketTypeNames(order: OrderItem) {
    if (!order.items?.length) return "-";

    return order.items
      .map((item) => item.ticketType?.name)
      .filter(Boolean)
      .join(", ");
  }

  function getTotalQuantity(order: OrderItem) {
    if (!order.items?.length) return 0;

    return order.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pedidos 🧾</h1>
          <p className="text-gray-600 mt-1">
            Visualize e gerencie todos os pedidos da plataforma
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/events"
            className="bg-white border px-4 py-2 rounded-xl"
          >
            Ver eventos
          </Link>

          <Link
            href="/orders/new"
            className="bg-black text-white px-4 py-2 rounded-xl"
          >
            Novo pedido
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          className="w-full md:max-w-md border rounded-xl p-3"
          placeholder="Buscar por cliente, email, evento, status, ticket..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Carregando pedidos...</p>
      ) : filteredOrders.length === 0 ? (
        <p>Nenhum pedido encontrado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-3 pr-4">Evento</th>
                <th className="py-3 pr-4">Cliente</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Ingressos</th>
                <th className="py-3 pr-4">Qtd</th>
                <th className="py-3 pr-4">Valor</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Criado em</th>
                <th className="py-3 pr-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b align-top">
                  <td className="py-3 pr-4">
                    {order.event?.name || order.eventId || "-"}
                  </td>
                  <td className="py-3 pr-4 font-medium">
                    {order.customerName || "-"}
                  </td>
                  <td className="py-3 pr-4">{order.customerEmail || "-"}</td>
                  <td className="py-3 pr-4">{getTicketTypeNames(order)}</td>
                  <td className="py-3 pr-4">{getTotalQuantity(order)}</td>
                  <td className="py-3 pr-4">R$ {order.totalAmount ?? "-"}</td>
                  <td className="py-3 pr-4">{order.status || "-"}</td>
                  <td className="py-3 pr-4">{formatDate(order.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="bg-white border px-3 py-2 rounded-xl inline-block"
                      >
                        Ver pedido
                      </Link>

                      {order.status !== "PAID" &&
                      order.status !== "CANCELED" ? (
                        <Link
                          href={`/orders/${order.id}/payment`}
                          className="bg-black text-white px-3 py-2 rounded-xl inline-block"
                        >
                          Pagamento
                        </Link>
                      ) : null}

                      {order.event?.id ? (
                        <Link
                          href={`/events/${order.event.id}`}
                          className="bg-white border px-3 py-2 rounded-xl inline-block"
                        >
                          Evento
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}