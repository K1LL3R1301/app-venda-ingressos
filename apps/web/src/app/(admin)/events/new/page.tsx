"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type OrganizerItem = {
  id: string;
  tradeName?: string;
  legalName?: string;
  document?: string;
  email?: string;
  phone?: string;
  status?: string;
};

export default function NewEventPage() {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [saving, setSaving] = useState(false);

  const [organizerId, setOrganizerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [capacity, setCapacity] = useState("100");

  useEffect(() => {
    async function loadOrganizers() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/organizers", {
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
              : "Erro ao carregar organizadores",
          );
          return;
        }

        const organizersList = Array.isArray(result) ? result : [];
        setOrganizers(organizersList);

        if (organizersList.length > 0) {
          setOrganizerId(organizersList[0].id);
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoadingOrganizers(false);
      }
    }

    loadOrganizers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!organizerId) {
      alert("Selecione um organizador");
      return;
    }

    if (!name.trim()) {
      alert("Informe o nome do evento");
      return;
    }

    if (!eventDate) {
      alert("Informe a data do evento");
      return;
    }

    if (!capacity || Number(capacity) < 1) {
      alert("Informe uma capacidade válida");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organizerId,
          name: name.trim(),
          description: description.trim() || undefined,
          eventDate: new Date(eventDate).toISOString(),
          capacity: Number(capacity),
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

      alert("Evento criado com sucesso 🎉");
      window.location.href = "/events";
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Novo evento 🎫</h1>
          <p className="text-gray-600 mt-1">
            Cadastre um novo evento vinculado a um organizador
          </p>
        </div>

        <Link
          href="/events"
          className="bg-white border px-4 py-2 rounded"
        >
          Voltar
        </Link>
      </div>

      {loadingOrganizers ? (
        <p>Carregando organizadores...</p>
      ) : organizers.length === 0 ? (
        <div className="border rounded-2xl p-6 bg-gray-50">
          <p className="font-medium">Nenhum organizador encontrado.</p>
          <p className="text-gray-600 mt-2">
            Você precisa criar um organizador antes de cadastrar um evento.
          </p>

          <Link
            href="/organizers/new"
            className="inline-block mt-4 bg-black text-white px-4 py-2 rounded"
          >
            Criar organizador
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Organizador *
            </label>
            <select
              className="w-full border rounded p-3"
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
            >
              <option value="">Selecione um organizador</option>
              {organizers.map((organizer) => (
                <option key={organizer.id} value={organizer.id}>
                  {organizer.tradeName || organizer.legalName || organizer.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Nome do evento *
            </label>
            <input
              type="text"
              className="w-full border rounded p-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Festival de Verão"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Descrição
            </label>
            <textarea
              className="w-full border rounded p-3 min-h-[120px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o evento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Data e hora *
            </label>
            <input
              type="datetime-local"
              className="w-full border rounded p-3"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Capacidade *
            </label>
            <input
              type="number"
              className="w-full border rounded p-3"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              min={1}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-5 py-3 rounded"
          >
            {saving ? "Salvando..." : "Criar evento"}
          </button>
        </form>
      )}
    </div>
  );
}