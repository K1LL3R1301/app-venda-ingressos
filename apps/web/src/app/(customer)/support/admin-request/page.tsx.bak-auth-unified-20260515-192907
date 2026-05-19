"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type FormState = {
  fullName: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  producerName: string;
  producerDocument: string;
  city: string;
  state: string;
  websiteOrSocial: string;
  eventTypes: string;
  firstEventDescription: string;
  estimatedEventDate: string;
  expectedAudience: string;
  experience: string;
  reason: string;
  extraNotes: string;
  acceptedReviewTerm: boolean;
  acceptedTruthTerm: boolean;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const initialForm: FormState = {
  fullName: "",
  email: "",
  cpfCnpj: "",
  phone: "",
  producerName: "",
  producerDocument: "",
  city: "",
  state: "",
  websiteOrSocial: "",
  eventTypes: "",
  firstEventDescription: "",
  estimatedEventDate: "",
  expectedAudience: "",
  experience: "",
  reason: "",
  extraNotes: "",
  acceptedReviewTerm: false,
  acceptedTruthTerm: false,
};

const requiredFields: Array<keyof FormState> = [
  "fullName",
  "email",
  "cpfCnpj",
  "phone",
  "producerName",
  "producerDocument",
  "city",
  "state",
  "websiteOrSocial",
  "eventTypes",
  "firstEventDescription",
  "estimatedEventDate",
  "expectedAudience",
  "experience",
  "reason",
];

function getUserFromStorage() {
  try {
    const rawUser = localStorage.getItem("user");
    return rawUser ? (JSON.parse(rawUser) as StoredUser) : null;
  } catch {
    return null;
  }
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  helper,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
        {label} <span className="text-orange-600">*</span>
      </span>
      <input
        required
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm font-bold text-neutral-800 outline-none transition focus:border-[#19002f] focus:ring-4 focus:ring-orange-100"
      />
      {helper ? <span className="mt-1 block text-xs text-neutral-500">{helper}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.16em] text-neutral-400">
        {label} {required ? <span className="text-orange-600">*</span> : null}
      </span>
      <textarea
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="mt-2 w-full resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-bold text-neutral-800 outline-none transition focus:border-[#19002f] focus:ring-4 focus:ring-orange-100"
      />
    </label>
  );
}

export default function AdminRequestPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successProtocol, setSuccessProtocol] = useState("");

  const role = useMemo(() => String(user?.role || "").toUpperCase(), [user]);
  const isAdmin = role === "ADMIN";

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const storedUser = getUserFromStorage();

    setUser(storedUser);

    setForm((current) => ({
      ...current,
      fullName: storedUser?.name || "",
      email: storedUser?.email || "",
      cpfCnpj: storedUser?.cpf || "",
    }));
  }, []);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function validateForm() {
    const missing = requiredFields.filter((field) => {
      const value = form[field];

      return typeof value === "string" && value.trim().length === 0;
    });

    if (missing.length > 0) return "Preencha todos os campos obrigatórios antes de enviar.";

    if (!form.acceptedReviewTerm) {
      return "Confirme que você entendeu o prazo de análise de até 15 dias úteis.";
    }

    if (!form.acceptedTruthTerm) {
      return "Confirme que as informações enviadas são verdadeiras.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/admin-access-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || "Não foi possível enviar a solicitação.");
      }

      setSuccessProtocol(data.protocol || "Solicitação enviada");
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isAdmin) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] px-4 py-10 text-neutral-950">
        <section className="mx-auto max-w-[920px] rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
            Conta administradora
          </p>
          <h1 className="mt-3 text-[42px] font-black leading-tight">
            Sua conta já pode criar eventos.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
            Como seu perfil já é administrador, você não precisa abrir solicitação.
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/admin/events/new";
            }}
            className="mt-6 rounded-xl bg-[#19002f] px-6 py-3 text-sm font-black text-white hover:bg-[#2a0648]"
          >
            Ir para criar evento
          </button>
        </section>
      </main>
    );
  }

  if (successProtocol) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] px-4 py-10 text-neutral-950">
        <section className="mx-auto max-w-[920px] overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="bg-gradient-to-r from-orange-500 to-[#19002f] p-8 text-white">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
              Solicitação enviada ao suporte do moderador
            </p>
            <h1 className="mt-3 text-[42px] font-black leading-tight">
              Seu chamado foi aberto para análise.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
              Um moderador da Astro Ingressos irá aprovar ou reprovar sua solicitação em até 15 dias úteis.
            </p>
          </div>

          <div className="p-8">
            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-700">
                Protocolo
              </p>
              <p className="mt-2 break-all text-[24px] font-black text-[#19002f]">
                {successProtocol}
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                A solicitação agora aparece na tela do moderador em <strong>/admin/support/admin-requests</strong>.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="mt-6 rounded-xl bg-[#19002f] px-6 py-3 text-sm font-black text-white hover:bg-[#2a0648]"
            >
              Voltar para a página inicial
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] px-4 py-10 text-neutral-950">
      <section className="mx-auto max-w-[1100px] overflow-hidden rounded-[28px] bg-white shadow-sm">
        <div className="grid gap-8 bg-gradient-to-r from-orange-500 to-[#19002f] p-8 text-white lg:grid-cols-[1fr_340px] lg:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/70">
              Abrir chamado para virar administrador
            </p>
            <h1 className="mt-3 text-[40px] font-black leading-tight md:text-[50px]">
              Solicite liberação para criar eventos.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
              Sua solicitação será enviada diretamente para o suporte do moderador. Ele verá todas as informações e poderá aprovar ou reprovar.
            </p>
          </div>

          <div className="rounded-2xl bg-white/12 p-5 ring-1 ring-white/20">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
              Prazo obrigatório
            </p>
            <p className="mt-2 text-[34px] font-black leading-none">Até 15 dias úteis</p>
            <p className="mt-3 text-sm leading-6 text-white/75">
              O moderador pode aprovar ou reprovar. Só envie dados completos e verdadeiros.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          {error ? (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          ) : null}

          <section className="mb-8">
            <h2 className="text-[24px] font-black text-neutral-950">Dados da conta</h2>
            <p className="mt-2 text-sm text-neutral-500">
              Todos os campos marcados são obrigatórios para abrir o chamado.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-3">
              <InputField label="Nome completo" value={form.fullName} onChange={(value) => setField("fullName", value)} />
              <InputField label="E-mail" type="email" value={form.email} onChange={(value) => setField("email", value)} />
              <InputField label="CPF ou CNPJ da conta" value={form.cpfCnpj} onChange={(value) => setField("cpfCnpj", value)} />
              <InputField label="Telefone / WhatsApp" value={form.phone} onChange={(value) => setField("phone", value)} />
              <InputField label="Cidade" value={form.city} onChange={(value) => setField("city", value)} />
              <InputField label="Estado" value={form.state} onChange={(value) => setField("state", value)} />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-[24px] font-black text-neutral-950">Dados da produtora</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <InputField label="Nome da produtora / empresa" value={form.producerName} onChange={(value) => setField("producerName", value)} />
              <InputField label="Documento da produtora" value={form.producerDocument} onChange={(value) => setField("producerDocument", value)} />
              <InputField
                label="Site ou rede social"
                value={form.websiteOrSocial}
                onChange={(value) => setField("websiteOrSocial", value)}
                placeholder="Instagram, site, TikTok, LinkedIn..."
                helper="Obrigatório para ajudar o moderador a validar a produtora."
              />
              <InputField label="Tipos de evento" value={form.eventTypes} onChange={(value) => setField("eventTypes", value)} placeholder="Shows, rodeios, teatro, congressos..." />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-[24px] font-black text-neutral-950">Plano de uso</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <InputField label="Data estimada do primeiro evento" type="date" value={form.estimatedEventDate} onChange={(value) => setField("estimatedEventDate", value)} />
              <InputField label="Público esperado" value={form.expectedAudience} onChange={(value) => setField("expectedAudience", value)} placeholder="Ex: 500, 2000, 10000 pessoas" />
              <div className="md:col-span-2">
                <TextAreaField label="Descrição do primeiro evento" value={form.firstEventDescription} onChange={(value) => setField("firstEventDescription", value)} />
              </div>
              <TextAreaField label="Experiência com eventos" value={form.experience} onChange={(value) => setField("experience", value)} />
              <TextAreaField label="Motivo da solicitação" value={form.reason} onChange={(value) => setField("reason", value)} />
              <div className="md:col-span-2">
                <TextAreaField label="Observações extras" required={false} value={form.extraNotes} onChange={(value) => setField("extraNotes", value)} />
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <h2 className="text-[20px] font-black text-[#19002f]">Confirmações obrigatórias</h2>

            <label className="mt-4 flex gap-3 text-sm font-bold leading-6 text-neutral-700">
              <input
                required
                type="checkbox"
                checked={form.acceptedReviewTerm}
                onChange={(event) => setField("acceptedReviewTerm", event.target.checked)}
                className="mt-1 h-4 w-4 accent-[#19002f]"
              />
              <span>
                Entendo que a solicitação será analisada por um moderador e pode levar até 15 dias úteis para ser aprovada ou reprovada.
              </span>
            </label>

            <label className="mt-3 flex gap-3 text-sm font-bold leading-6 text-neutral-700">
              <input
                required
                type="checkbox"
                checked={form.acceptedTruthTerm}
                onChange={(event) => setField("acceptedTruthTerm", event.target.checked)}
                className="mt-1 h-4 w-4 accent-[#19002f]"
              />
              <span>
                Declaro que todas as informações enviadas são verdadeiras e autorizo a análise pelo suporte/moderação da Astro Ingressos.
              </span>
            </label>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 pt-6">
            <p className="max-w-xl text-sm leading-6 text-neutral-500">
              Ao enviar, o chamado ficará visível para o moderador com status <strong>Pendente de análise</strong>.
            </p>

            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#19002f] px-7 py-4 text-sm font-black text-white shadow-sm transition hover:bg-[#2a0648] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Enviando..." : "Abrir chamado para moderação"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

