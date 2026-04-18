"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type TicketTypeItem = {
  id: string;
  name?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
  eventId?: string;
  event?: {
    id: string;
    name?: string;
  };
};

export default function NewOrderPage() {
  const searchParams = useSearchParams();
  const eventIdFromUrl = searchParams.get("eventId") || "";

  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
  const [loadingTicketTypes, setLoadingTicketTypes] = useState(true);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [ticketTypeId, setTicketTypeId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [selectedEventId, setSelectedEventId] = useState(eventIdFromUrl);

  useEffect(() => {
    async function loadTicketTypes() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/ticket-types", {
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
              : "Erro ao carregar tipos de ingresso",
          );
          return;
        }

        const activeTicketTypes = Array.isArray(result)
          ? result.filter(
              (item) =>
                item &&
                item.status === "ACTIVE" &&
                typeof item.quantity === "number" &&
                item.quantity > 0,
            )
          : [];

        setTicketTypes(activeTicketTypes);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoadingTicketTypes(false);
      }
    }

    loadTicketTypes();
  }, []);

  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();

    ticketTypes.forEach((item) => {
      const currentEventId = item.event?.id || item.eventId;

      if (currentEventId) {
        map.set(currentEventId, item.event?.name || "Evento");
      }
    });

    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [ticketTypes]);

  const filteredTicketTypes = useMemo(() => {
    if (!selectedEventId) return ticketTypes;

    return ticketTypes.filter(
      (item) => (item.event?.id || item.eventId) === selectedEventId,
    );
  }, [ticketTypes, selectedEventId]);

  const selectedTicketType = useMemo(() => {
    return filteredTicketTypes.find((item) => item.id === ticketTypeId) || null;
  }, [filteredTicketTypes, ticketTypeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!selectedEventId) {
      alert("Selecione um evento");
      return;
    }

    if (!customerName.trim()) {
      alert("Informe o nome do cliente");
      return;
    }

    if (!customerEmail.trim()) {
      alert("Informe o email do cliente");
      return;
    }

    if (!ticketTypeId) {
      alert("Selecione um tipo de ingresso");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      alert("Informe uma quantidade válida");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          customerName,
          customerEmail,
          items: [
            {
              ticketTypeId,
              quantity: Number(quantity),
            },
          ],
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : JSON.stringify(result),
        );
        return;
      }

      alert("Pedido criado com sucesso 🧾");
      window.location.href = `/events/${selectedEventId}`;
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  const estimatedTotal =
    selectedTicketType && quantity
      ? Number(selectedTicketType.price || 0) * Number(quantity)
      : 0;

  return (
    <div className="bg-white rounded-2xl shadow p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Novo pedido 🧾</h1>
          <p className="text-gray-600 mt-1">
            Crie uma venda vinculada a um evento
          </p>
        </div>

        <Link
          href={selectedEventId ? `/events/${selectedEventId}` : "/orders"}
          className="bg-white border px-4 py-2 rounded"
        >
          Voltar
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!eventIdFromUrl && (
          <div>
            <label className="block text-sm font-medium mb-2">Evento</label>
            <select
              className="w-full border rounded p-3"
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setTicketTypeId("");
              }}
            >
              <option value="">Selecione um evento</option>
              {eventOptions.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">
            Nome do cliente
          </label>
          <input
            type="text"
            className="w-full border rounded p-3"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Ex: Gabriel Teste"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Email do cliente
          </label>
          <input
            type="email"
            className="w-full border rounded p-3"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="Ex: gabriel@teste.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Tipo de ingresso
          </label>
          <select
            className="w-full border rounded p-3"
            value={ticketTypeId}
            onChange={(e) => setTicketTypeId(e.target.value)}
            disabled={loadingTicketTypes || !selectedEventId}
          >
            <option value="">
              {loadingTicketTypes
                ? "Carregando tipos de ingresso..."
                : !selectedEventId
                  ? "Selecione primeiro um evento"
                  : "Selecione um tipo de ingresso"}
            </option>

            {filteredTicketTypes.map((ticketType) => (
              <option key={ticketType.id} value={ticketType.id}>
                {(ticketType.event?.name || "Evento")} - {ticketType.name} | R${" "}
                {ticketType.price} | Estoque: {ticketType.quantity}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quantidade</label>
          <input
            type="number"
            className="w-full border rounded p-3"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min={1}
          />
        </div>

        <div className="bg-gray-50 border rounded-xl p-4">
          <p className="text-sm text-gray-600">Resumo</p>
          <p className="mt-2">
            <strong>Total estimado:</strong> R$ {estimatedTotal || 0}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-black text-white px-5 py-3 rounded"
        >
          {saving ? "Salvando..." : "Criar pedido"}
        </button>
      </form>
    </div>
  );
}