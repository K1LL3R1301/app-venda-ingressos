"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatDocument(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 11) {
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

  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }

  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
      5,
      8,
    )}/${digits.slice(8)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
    5,
    8,
  )}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

function formatPhone(value: string) {
  const digits = onlyDigits(value);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(
    7,
    11,
  )}`;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-13 w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
      />
    </div>
  );
}

export default function NewOrganizerPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [checking, setChecking] = useState(true);

  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);

  const role = String(user?.role || "").toUpperCase();
  const canCreateMultipleProducers = role === "SUPER_ADMIN";
  const alreadyHasProducer = organizers.length > 0;
  const shouldBlockCreation = alreadyHasProducer && !canCreateMultipleProducers;

  useEffect(() => {
    async function loadInitialData() {
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
              : "Erro ao verificar produtora",
          );
          return;
        }

        setOrganizers(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("LOAD PRODUCER ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setChecking(false);
      }
    }

    loadInitialData();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (shouldBlockCreation) {
      alert("Esta conta já possui uma produtora cadastrada.");
      window.location.href = "/admin/organizers";
      return;
    }

    if (!tradeName.trim()) {
      alert("Informe o nome fantasia da produtora.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/organizers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tradeName: tradeName.trim(),
          legalName: legalName.trim() || undefined,
          document: document.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
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

      alert("Produtora cadastrada com sucesso.");
      window.location.href = "/admin/organizers";
    } catch (error) {
      console.error("CREATE PRODUCER ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Verificando cadastro da produtora...
          </p>
        </section>
      </main>
    );
  }

  if (shouldBlockCreation) {
    const producer = organizers[0];

    return (
      <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-8">
        <section className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-sm md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />

          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
              Produtora já cadastrada
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
              Esta conta já possui uma produtora.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              A conta ADMIN representa o dono da produtora. Para criar várias
              produtoras, vamos usar futuramente a conta SUPER_ADMIN.
            </p>

            <div className="mt-8 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/50">
                Produtora atual
              </p>

              <p className="mt-2 text-2xl font-black text-white">
                {producer?.tradeName || "Produtora"}
              </p>

              <p className="mt-2 text-sm text-white/60">
                {producer?.legalName || "Sem razão social informada"}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admin/organizers"
                className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                Ver minha produtora
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

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
              Cadastro da produtora
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Cadastre sua produtora.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              Esses dados identificam a produtora responsável pelos eventos,
              vendas, operação e relatórios dentro da plataforma.
            </p>
          </div>

          <Link
            href="/admin/organizers"
            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-white/15"
          >
            Voltar
          </Link>
        </div>
      </section>

      <section className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8"
        >
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
              Informações principais
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Dados comerciais
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Preencha os dados da produtora que aparecerá nos eventos e nas
              operações internas.
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="Nome fantasia"
                value={tradeName}
                onChange={setTradeName}
                placeholder="Ex: Magic Plays"
                required
              />
            </div>

            <div className="md:col-span-2">
              <Field
                label="Razão social"
                value={legalName}
                onChange={setLegalName}
                placeholder="Ex: Magic Plays LTDA"
              />
            </div>

            <Field
              label="Documento"
              value={document}
              onChange={(value) => setDocument(formatDocument(value))}
              placeholder="Ex: 00.000.000/0001-00"
              maxLength={18}
            />

            <Field
              label="Telefone"
              value={phone}
              onChange={(value) => setPhone(formatPhone(value))}
              placeholder="Ex: (11) 99999-9999"
              maxLength={15}
            />

            <div className="md:col-span-2">
              <Field
                label="E-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="Ex: contato@produtora.com"
              />
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {saving ? "Salvando..." : "Cadastrar produtora"}
            </button>

            <Link
              href="/admin/organizers"
              className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>
          </div>
        </form>

        <aside className="space-y-7 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
              Regra do projeto
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Quem pode criar?
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Hoje, a conta ADMIN representa o dono da produtora. Por isso, ela
              deve ter uma produtora principal. Depois, a conta SUPER_ADMIN será
              responsável por criar e gerenciar várias produtoras na plataforma.
            </p>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
              Próximo passo
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Eventos vinculados
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Depois de cadastrar a produtora, os eventos criados no painel
              serão vinculados a ela para separar operação, relatórios e
              permissões.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}