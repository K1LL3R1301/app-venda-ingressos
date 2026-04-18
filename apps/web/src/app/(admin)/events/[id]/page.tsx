"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EventDetails = {
  id: string;
  name?: string;
  description?: string;
  eventDate?: string;
  capacity?: number;
  organizer?: {
    id: string;
    tradeName?: string;
  };
};

type TicketTypeItem = {
  id: string;
  eventId?: string;
  name?: string;
  description?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
};

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

export default function EventDetailsPage() {
  const params = useParams();
  const eventId = String(params.id);

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const [eventRes, ticketTypesRes, ordersRes] = await Promise.all([
          fetch(`http://localhost:3001/v1/events/${eventId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:3001/v1/ticket-types", {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`http://localhost:3001/v1/orders/event/${eventId}`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const eventResult = await eventRes.json();
        const ticketTypesResult = await ticketTypesRes.json();
        const ordersResult = await ordersRes.json();

        if (!eventRes.ok) {
          alert(
            typeof eventResult?.message === "string"
              ? eventResult.message
              : "Erro ao carregar evento",
          );
          return;
        }

        if (!ticketTypesRes.ok) {
          alert(
            typeof ticketTypesResult?.message === "string"
              ? ticketTypesResult.message
              : "Erro ao carregar ingressos",
          );
          return;
        }

        if (!ordersRes.ok) {
          alert(
            typeof ordersResult?.message === "string"
              ? ordersResult.message
              : "Erro ao carregar pedidos",
          );
          return;
        }

        setEvent(eventResult);

        const eventTicketTypes = Array.isArray(ticketTypesResult)
          ? ticketTypesResult.filter((item) => item.eventId === eventId)
          : [];

        const eventOrders = Array.isArray(ordersResult) ? ordersResult : [];

        setTicketTypes(eventTicketTypes);
        setOrders(eventOrders);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

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

  function getTotalTickets() {
    return orders.reduce(
      (sum, order) =>
        sum +
        (order.items?.reduce(
          (inner, item) => inner + (item.tickets?.length || 0),
          0,
        ) || 0),
      0,
    );
  }

  function getPaidOrders() {
    return orders.filter((order) => order.status === "PAID").length;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Carregando evento...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{event.name || "Evento"}</h1>
            <p className="text-gray-600 mt-2">
              {event.description || "Sem descrição"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5 text-sm">
              <p>
                <strong>Data:</strong> {formatDate(event.eventDate)}
              </p>
              <p>
                <strong>Capacidade:</strong> {event.capacity ?? "-"}
              </p>
              <p>
                <strong>Organizador:</strong>{" "}
                {event.organizer?.tradeName || "-"}
              </p>
              <p>
                <strong>ID:</strong> {event.id}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/events"
              className="bg-white border px-4 py-2 rounded"
            >
              Voltar para eventos
            </Link>

            <Link
              href={`/orders/new?eventId=${event.id}`}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Novo pedido
            </Link>

            <Link
              href={`/events/${event.id}/tickets`}
              className="bg-white border px-4 py-2 rounded"
            >
              Gerir ingressos
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500 mb-2">Pedidos do evento</p>
          <h2 className="text-3xl font-bold">{orders.length}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500 mb-2">Pedidos pagos</p>
          <h2 className="text-3xl font-bold">{getPaidOrders()}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500 mb-2">Tipos de ingresso</p>
          <h2 className="text-3xl font-bold">{ticketTypes.length}</h2>
        </div>

        <div className="bg-white rounded-2xl shadow p-6">
          <p className="text-sm text-gray-500 mb-2">Tickets gerados</p>
          <h2 className="text-3xl font-bold">{getTotalTickets()}</h2>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-xl font-bold">Pedidos do evento</h2>

          <input
            type="text"
            className="border rounded p-3 min-w-[280px]"
            placeholder="Buscar por cliente, email, status, ticket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredOrders.length === 0 ? (
          <p>Nenhum pedido encontrado para este evento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b">
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
                    <td className="py-3 font-medium">
                      {order.customerName || "-"}
                    </td>
                    <td className="py-3">{order.customerEmail || "-"}</td>
                    <td className="py-3">{getTicketTypeNames(order)}</td>
                    <td className="py-3">{getTotalQuantity(order)}</td>
                    <td className="py-3">{order.totalAmount ?? "-"}</td>
                    <td className="py-3">{order.status || "-"}</td>
                    <td className="py-3">{formatDate(order.createdAt)}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="bg-white border px-3 py-2 rounded inline-block"
                        >
                          Ver pedido
                        </Link>

                        {order.status !== "PAID" &&
                        order.status !== "CANCELED" ? (
                          <Link
                            href={`/orders/${order.id}/payment`}
                            className="bg-black text-white px-3 py-2 rounded inline-block"
                          >
                            Pagamento
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

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Tipos de ingresso do evento</h2>

        {ticketTypes.length === 0 ? (
          <p>Nenhum tipo de ingresso cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {ticketTypes.map((ticketType) => (
              <div key={ticketType.id} className="border rounded-2xl p-4">
                <h3 className="text-lg font-semibold">{ticketType.name}</h3>
                <p className="text-gray-600 mt-1">
                  {ticketType.description || "-"}
                </p>

                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-500">Preço</p>
                    <strong>{ticketType.price ?? "-"}</strong>
                  </div>
                  <div>
                    <p className="text-gray-500">Estoque</p>
                    <strong>{ticketType.quantity ?? "-"}</strong>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <strong>{ticketType.status ?? "-"}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}