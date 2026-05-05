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

export default function EventTicketsPage() {
  const params = useParams();
  const eventId = String(params.id);

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const [eventRes, ticketTypesRes] = await Promise.all([
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
        ]);

        const eventResult = await eventRes.json();
        const ticketTypesResult = await ticketTypesRes.json();

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
              : "Erro ao carregar tipos de ingresso",
          );
          return;
        }

        setEvent(eventResult);

        const eventTicketTypes = Array.isArray(ticketTypesResult)
          ? ticketTypesResult.filter((item) => item.eventId === eventId)
          : [];

        setTicketTypes(eventTicketTypes);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  const filteredTicketTypes = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return ticketTypes;

    return ticketTypes.filter((item) => {
      const fields = [
        item.name,
        item.description,
        item.price,
        item.quantity,
        item.status,
      ];

      return fields.some((field) =>
        String(field || "").toLowerCase().includes(q),
      );
    });
  }, [ticketTypes, search]);

  async function reloadTicketTypes() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const res = await fetch("http://localhost:3001/v1/ticket-types", {
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
          : "Erro ao recarregar tipos de ingresso",
      );
      return;
    }

    const eventTicketTypes = Array.isArray(result)
      ? result.filter((item) => item.eventId === eventId)
      : [];

    setTicketTypes(eventTicketTypes);
  }

  async function handleCreateTicketType(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!name.trim()) {
      alert("Informe o nome do tipo de ingresso");
      return;
    }

    if (!price.trim()) {
      alert("Informe o preço");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      alert("Informe uma quantidade válida");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/ticket-types", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId,
          name: name.trim(),
          description: description.trim() || undefined,
          price: price.replace(",", "."),
          quantity: Number(quantity),
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

      alert("Tipo de ingresso criado com sucesso 🎟️");

      setName("");
      setDescription("");
      setPrice("");
      setQuantity("1");

      await reloadTicketTypes();
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-6">
        <p>Carregando ingressos do evento...</p>
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
            <h1 className="text-3xl font-bold">Gerir ingressos 🎟️</h1>
            <p className="text-gray-600 mt-1">
              Evento: <strong>{event.name || "Evento"}</strong>
            </p>
            <p className="text-gray-600 mt-1">
              Organizador: <strong>{event.organizer?.tradeName || "-"}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/events/${event.id}`}
              className="bg-white border px-4 py-2 rounded"
            >
              Voltar para evento
            </Link>

            <Link
              href={`/orders/new?eventId=${event.id}`}
              className="bg-black text-white px-4 py-2 rounded"
            >
              Novo pedido
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">Novo tipo de ingresso</h2>

        <form onSubmit={handleCreateTicketType} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nome do ingresso *
            </label>
            <input
              type="text"
              className="w-full border rounded p-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Pista / VIP / Camarote"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descrição
            </label>
            <textarea
              className="w-full border rounded p-3 min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o tipo de ingresso"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Preço *
              </label>
              <input
                type="text"
                className="w-full border rounded p-3"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 100.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Quantidade *
              </label>
              <input
                type="number"
                className="w-full border rounded p-3"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-5 py-3 rounded"
          >
            {saving ? "Salvando..." : "Criar tipo de ingresso"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h2 className="text-xl font-bold">Tipos de ingresso cadastrados</h2>

          <input
            type="text"
            className="border rounded p-3 min-w-[280px]"
            placeholder="Buscar por nome, descrição, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {filteredTicketTypes.length === 0 ? (
          <p>Nenhum tipo de ingresso cadastrado para este evento.</p>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredTicketTypes.map((ticketType) => (
              <div key={ticketType.id} className="border rounded-2xl p-4">
                <h3 className="text-lg font-semibold">{ticketType.name}</h3>
                <p className="text-gray-600 mt-1">
                  {ticketType.description || "-"}
                </p>

                <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                  <div>
                    <p className="text-gray-500">Preço</p>
                    <strong>R$ {ticketType.price ?? "-"}</strong>
                  </div>
                  <div>
                    <p className="text-gray-500">Quantidade</p>
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