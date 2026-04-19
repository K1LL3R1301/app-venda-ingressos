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

export default function OperatorOrdersPage() {
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
        const res = await fetch("http://localhost:3001/v1/orders/operator", {
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
          ...(item.tickets?.flatMap((ticket) => [ticket.code, ticket.status]) || []),
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

  if (loading) {
    return (
      <div className="p-8">
        <p>Carregando pedidos atribuídos...</p>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
        Nenhum pedido atribuído a este operador.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Pedidos Atribuídos</h1>

      <div className="mb-6">
        <input
          type="text"
          className="w-full md:max-w-md border rounded-2xl p-3"
          placeholder="Buscar por cliente, email, status, ticket..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-3">Evento</th>
              <th className="py-3">Cliente</th>
              <th className="py-3">Email</th>
              <th className="py-3">Ingressos</th>
              <th className="py-3">Qtd</th>
              <th className="py-3">Valor</th>
              <th className="py-3">Status</th>
              <th className="py-3">Criado em</th>
              <th className="py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id} className="border-b align-top">
                <td className="py-3">{order.event?.name || "-"}</td>
                <td className="py-3 font-medium">{order.customerName || "-"}</td>
                <td className="py-3">{order.customerEmail || "-"}</td>
                <td className="py-3">{getTicketTypeNames(order)}</td>
                <td className="py-3">{getTotalQuantity(order)}</td>
                <td className="py-3">{order.totalAmount ?? "-"}</td>
                <td className="py-3">{order.status || "-"}</td>
                <td className="py-3">{formatDate(order.createdAt)}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/operator/orders/${order.id}`}
                      className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                    >
                      Ver pedido
                    </Link>

                    {order.status !== "PAID" &&
                    order.status !== "CANCELED" ? (
                      <Link
                        href={`/operator/orders/${order.id}/payment`}
                        className="rounded-2xl bg-black px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                      >
                        Pagamento
                      </Link>
                    ) : null}

                    {order.event?.id ? (
                      <Link
                        href={`/operator/events/${order.event.id}`}
                        className="rounded-2xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
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
    </div>
  );
}