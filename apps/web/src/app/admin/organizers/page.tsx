"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

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

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "ACTIVE") return "Ativa";
  if (normalized === "INACTIVE") return "Inativa";
  if (normalized === "PENDING") return "Pendente";
  if (normalized === "BLOCKED") return "Bloqueada";

  return status || "-";
}

function getStatusClasses(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "ACTIVE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "BLOCKED" || normalized === "INACTIVE") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>

      <p className="mt-3 break-all text-lg font-black text-slate-950">
        {value || "-"}
      </p>

      {detail ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
      ) : null}
    </div>
  );
}

export default function OrganizersPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrganizers() {
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
              : "Erro ao carregar produtora",
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

  const role = String(user?.role || "").toUpperCase();

  const primaryOrganizer = useMemo(() => {
    return organizers[0] || null;
  }, [organizers]);

  const pageTitle = role === "SUPER_ADMIN" ? "Produtoras" : "Minha produtora";

  const pageDescription =
    role === "SUPER_ADMIN"
      ? "Gerencie as produtoras cadastradas na plataforma."
      : "Confira as informações cadastrais da produtora responsável pelos seus eventos.";

  if (loading) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Carregando informações da produtora...
          </p>
        </section>
      </main>
    );
  }

  if (!primaryOrganizer) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-8">
        <section className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-sm md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />

          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
              Produtora
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
              Cadastre sua produtora para começar a criar eventos.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              A produtora é a identidade responsável pelos eventos, contatos,
              documentos e operações comerciais dentro da plataforma.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admin/organizers/new"
                className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                Cadastrar produtora
              </Link>

              <Link
                href="/admin/dashboard"
                className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                Voltar ao painel
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-8">
      <section className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-sm md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10">
          <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
            Perfil da produtora
          </p>

          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
            {pageTitle}
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
            {pageDescription}
          </p>
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <InfoCard
          label="Nome fantasia"
          value={primaryOrganizer.tradeName || "Sem nome fantasia"}
          detail="Nome público usado na organização dos eventos."
        />

        <InfoCard
          label="Documento"
          value={primaryOrganizer.document || "-"}
          detail="CNPJ, CPF ou documento cadastral da produtora."
        />

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
            Status
          </p>

          <span
            className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
              primaryOrganizer.status,
            )}`}
          >
            {getStatusLabel(primaryOrganizer.status)}
          </span>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Situação operacional da produtora na plataforma.
          </p>
        </div>
      </section>

      <section className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-7">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
                  Cadastro
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Dados comerciais
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Informações principais usadas para identificar a produtora.
                </p>
              </div>

              <Link
                href="/admin/dashboard"
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Voltar ao painel
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <InfoCard
                label="Razão social"
                value={primaryOrganizer.legalName || "-"}
              />

              <InfoCard label="E-mail" value={primaryOrganizer.email || "-"} />

              <InfoCard
                label="Telefone"
                value={primaryOrganizer.phone || "-"}
              />

              <InfoCard
                label="Criado em"
                value={formatDate(primaryOrganizer.createdAt)}
              />
            </div>
          </section>

          {role === "SUPER_ADMIN" && organizers.length > 1 ? (
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
                  Plataforma
                </p>

                <h2 className="mt-2 text-2xl font-black text-slate-950">
                  Todas as produtoras
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Visão reservada para o administrador geral da plataforma.
                </p>
              </div>

              <div className="mt-6 grid gap-4">
                {organizers.map((organizer) => (
                  <article
                    key={organizer.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-950">
                          {organizer.tradeName || "Sem nome fantasia"}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {organizer.legalName || "-"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                          organizer.status,
                        )}`}
                      >
                        {getStatusLabel(organizer.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        <strong>Documento:</strong> {organizer.document || "-"}
                      </p>

                      <p>
                        <strong>E-mail:</strong> {organizer.email || "-"}
                      </p>

                      <p>
                        <strong>Telefone:</strong> {organizer.phone || "-"}
                      </p>

                      <p>
                        <strong>ID:</strong> {organizer.id}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-7 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
              Identificação
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Registro interno
            </h2>

            <p className="mt-3 break-all rounded-2xl bg-slate-50 p-4 text-sm font-black text-slate-700">
              {primaryOrganizer.id}
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Este ID será usado futuramente para separar dados por produtora,
              eventos, operadores e relatórios.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}