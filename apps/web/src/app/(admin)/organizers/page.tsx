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
  createdAt?: string;
};

export default function OrganizersPage() {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loading, setLoading] = useState(true);

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

        setOrganizers(Array.isArray(result) ? result : []);
      } catch (err) {
        console.error(err);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadOrganizers();
  }, []);

  function formatDate(value?: string) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString("pt-BR");
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Organizadores 🏢</h1>
          <p className="text-gray-600 mt-1">
            Cadastre e gerencie os organizadores dos eventos
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/events"
            className="bg-white border px-4 py-2 rounded"
          >
            Voltar para eventos
          </Link>

          <Link
            href="/organizers/new"
            className="bg-black text-white px-4 py-2 rounded"
          >
            Novo organizador
          </Link>
        </div>
      </div>

      {loading ? (
        <p>Carregando organizadores...</p>
      ) : organizers.length === 0 ? (
        <div className="border rounded-2xl p-6 bg-gray-50">
          <p className="font-medium">Nenhum organizador encontrado.</p>
          <p className="text-gray-600 mt-2">
            Crie o primeiro organizador para conseguir cadastrar eventos.
          </p>

          <Link
            href="/organizers/new"
            className="inline-block mt-4 bg-black text-white px-4 py-2 rounded"
          >
            Criar primeiro organizador
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {organizers.map((organizer) => (
            <div key={organizer.id} className="border rounded-2xl p-5">
              <h2 className="text-xl font-semibold">
                {organizer.tradeName || "Sem nome fantasia"}
              </h2>

              <p className="text-gray-600 mt-2">
                <strong>Razão social:</strong> {organizer.legalName || "-"}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
                <p>
                  <strong>Documento:</strong> {organizer.document || "-"}
                </p>
                <p>
                  <strong>Email:</strong> {organizer.email || "-"}
                </p>
                <p>
                  <strong>Telefone:</strong> {organizer.phone || "-"}
                </p>
                <p>
                  <strong>Status:</strong> {organizer.status || "-"}
                </p>
                <p>
                  <strong>Criado em:</strong> {formatDate(organizer.createdAt)}
                </p>
                <p>
                  <strong>ID:</strong> {organizer.id}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}