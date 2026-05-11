"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type EventDetails = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  capacity?: number | null;
  status?: string | null;
  category?: string | { name?: string | null } | null;
  categoryName?: string | null;
  visibility?: string | null;
  timezone?: string | null;
  occupancyMode?: string | null;
  featured?: boolean | null;
  highlightTag?: string | null;
  checkoutTitle?: string | null;
  checkoutSubtitle?: string | null;
  content?: {
    headline?: string | null;
    summary?: string | null;
    fullDescription?: string | null;
    attractions?: string | null;
    schedule?: string | null;
    sectorDetails?: string | null;
    importantInfo?: string | null;
    faq?: string | null;
    producerDescription?: string | null;
    purchaseInstructions?: string | null;
  } | null;
  location?: {
    mode?: string | null;
    venueName?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    reference?: string | null;
    mapUrl?: string | null;
    instructions?: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  } | null;
  media?: {
    coverImageUrl?: string | null;
    bannerImageUrl?: string | null;
    thumbnailUrl?: string | null;
    mobileBannerUrl?: string | null;
    sectorMapImageUrl?: string | null;
    gallery?: string[] | null;
  } | null;
  policy?: {
    ageRating?: string | null;
    refundPolicy?: string | null;
    halfEntryPolicy?: string | null;
    transferPolicy?: string | null;
    termsNotes?: string | null;
    entryRules?: string | null;
    documentRules?: string | null;
  } | null;
};

type EditForm = {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  status: string;
  visibility: string;
  capacity: string;
  startDate: string;
  endDate: string;
  headline: string;
  summary: string;
  fullDescription: string;
  attractions: string;
  importantInfo: string;
  venueName: string;
  addressLine1: string;
  addressLine2: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference: string;
  mapUrl: string;
  instructions: string;
  bannerImageUrl: string;
  coverImageUrl: string;
  thumbnailUrl: string;
  ageRating: string;
  refundPolicy: string;
  halfEntryPolicy: string;
  transferPolicy: string;
  termsNotes: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

function categoryValue(value?: EventDetails["category"] | string | null) {
  if (typeof value === "object") return value?.name || "";
  return String(value || "");
}

function getStatusLabel(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  const labels: Record<string, string> = {
    ACTIVE: "Ativo",
    DRAFT: "Rascunho",
    PUBLISHED: "Publicado",
    CANCELED: "Cancelado",
    CANCELLED: "Cancelado",
    FINISHED: "Finalizado",
    SOLD_OUT: "Esgotado",
    PAUSED: "Pausado",
  };

  return labels[normalized] || status || "Publicado";
}

function getVisibilityLabel(visibility?: string | null) {
  const normalized = String(visibility || "").toUpperCase();

  const labels: Record<string, string> = {
    PUBLIC: "Público",
    PRIVATE: "Privado",
    UNLISTED: "Não listado",
  };

  return labels[normalized] || visibility || "Público";
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

function initialForm(event: EventDetails): EditForm {
  return {
    name: event.name || "",
    slug: event.slug || "",
    shortDescription: event.shortDescription || "",
    description: event.description || "",
    category: categoryValue(event.category || event.categoryName),
    status: event.status || "PUBLISHED",
    visibility: event.visibility || "PUBLIC",
    capacity: String(event.capacity || ""),
    startDate: toDateTimeLocal(event.startDate || event.eventDate),
    endDate: toDateTimeLocal(event.endDate),
    headline: event.content?.headline || "",
    summary: event.content?.summary || "",
    fullDescription: event.content?.fullDescription || "",
    attractions: event.content?.attractions || "",
    importantInfo: event.content?.importantInfo || "",
    venueName: event.location?.venueName || "",
    addressLine1: event.location?.addressLine1 || "",
    addressLine2: event.location?.addressLine2 || "",
    neighborhood: event.location?.neighborhood || "",
    city: event.location?.city || "",
    state: event.location?.state || "",
    zipCode: event.location?.zipCode || "",
    reference: event.location?.reference || "",
    mapUrl: event.location?.mapUrl || "",
    instructions: event.location?.instructions || "",
    bannerImageUrl: event.media?.bannerImageUrl || "",
    coverImageUrl: event.media?.coverImageUrl || "",
    thumbnailUrl: event.media?.thumbnailUrl || "",
    ageRating: event.policy?.ageRating || "",
    refundPolicy: event.policy?.refundPolicy || "",
    halfEntryPolicy: event.policy?.halfEntryPolicy || "",
    transferPolicy: event.policy?.transferPolicy || "",
    termsNotes: event.policy?.termsNotes || "",
  };
}

function removeUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function inputClasses() {
  return "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function lockedInputClasses() {
  return "w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-500 outline-none";
}

function labelClasses() {
  return "mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-400";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClasses()}>{label}</span>
      {children}
    </label>
  );
}

function LockedNote() {
  return (
    <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
      Campo travado para evitar alteração operacional depois do evento configurado.
    </p>
  );
}

export default function AdminEditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params.id || "");

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  async function loadEvent() {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    if (!eventId) {
      setError("Evento inválido.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Erro ao carregar evento.",
        );
      }

      setEvent(result);
      setForm(initialForm(result));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  const previewTitle = useMemo(() => {
    return form?.name || event?.name || "Evento";
  }, [event?.name, form?.name]);

  function updateField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setSavedMessage("");
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(eventSubmit: FormEvent) {
    eventSubmit.preventDefault();

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!form) return;

    const numericCapacity = Number(form.capacity);

    if (!form.name.trim()) {
      alert("Informe o nome do evento.");
      return;
    }

    if (!Number.isFinite(numericCapacity) || numericCapacity <= 0) {
      alert("Informe uma capacidade válida.");
      return;
    }

    setSaving(true);
    setError("");
    setSavedMessage("");

    const payload = removeUndefined({
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      shortDescription: form.shortDescription.trim() || undefined,
      description: form.description.trim() || undefined,
      capacity: numericCapacity,
      endDate: fromDateTimeLocal(form.endDate),
      content: {
        headline: form.headline.trim() || undefined,
        summary: form.summary.trim() || undefined,
        fullDescription: form.fullDescription.trim() || undefined,
        attractions: form.attractions.trim() || undefined,
        importantInfo: form.importantInfo.trim() || undefined,
      },
      location: {
        venueName: form.venueName.trim() || undefined,
        addressLine1: form.addressLine1.trim() || undefined,
        addressLine2: form.addressLine2.trim() || undefined,
        neighborhood: form.neighborhood.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        zipCode: form.zipCode.trim() || undefined,
        reference: form.reference.trim() || undefined,
        mapUrl: form.mapUrl.trim() || undefined,
        instructions: form.instructions.trim() || undefined,
      },
      media: {
        bannerImageUrl: form.bannerImageUrl.trim() || undefined,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
      },
      policy: {
        ageRating: form.ageRating.trim() || undefined,
        refundPolicy: form.refundPolicy.trim() || undefined,
        halfEntryPolicy: form.halfEntryPolicy.trim() || undefined,
        transferPolicy: form.transferPolicy.trim() || undefined,
        termsNotes: form.termsNotes.trim() || undefined,
      },
    });

    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          typeof result?.message === "string"
            ? result.message
            : "Erro ao salvar evento.",
        );
      }

      setEvent(result);
      setForm(initialForm(result));
      setSavedMessage("Evento salvo com sucesso.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Erro ao conectar com a API.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          Carregando evento...
        </div>
      </main>
    );
  }

  if (error && !form) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          <p className="text-xl font-black">Erro ao carregar evento</p>
          <p className="mt-2 text-sm">{error}</p>
          <Link
            href="/admin/events"
            className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Voltar para eventos
          </Link>
        </div>
      </main>
    );
  }

  if (!form) return null;

  return (
    <main className="mx-auto max-w-[1300px] space-y-6 px-4 py-6">
      <section className="rounded-[32px] border border-slate-200 bg-[#020617] p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-300">
              Editar evento
            </p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">
              {previewTitle}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Edite dados permitidos do evento. Categoria, status, visibilidade e início
              ficam travados para proteger a operação.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/events/${eventId}`}
              className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
            >
              Voltar ao evento
            </Link>
            <Link
              href={`/events/${eventId}`}
              target="_blank"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100"
            >
              Página pública
            </Link>
          </div>
        </div>
      </section>

      {savedMessage ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
          {savedMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
              Dados principais
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Identidade do evento</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Field label="Nome">
                  <input
                    className={inputClasses()}
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                  />
                </Field>
              </div>

              <Field label="Slug">
                <input
                  className={inputClasses()}
                  value={form.slug}
                  onChange={(event) => updateField("slug", event.target.value)}
                  placeholder="nome-do-evento"
                />
              </Field>

              <Field label="Categoria">
                <input
                  className={lockedInputClasses()}
                  value={form.category}
                  disabled
                  readOnly
                />
                <LockedNote />
              </Field>

              <Field label="Status">
                <input
                  className={lockedInputClasses()}
                  value={getStatusLabel(form.status)}
                  disabled
                  readOnly
                />
                <LockedNote />
              </Field>

              <Field label="Visibilidade">
                <input
                  className={lockedInputClasses()}
                  value={getVisibilityLabel(form.visibility)}
                  disabled
                  readOnly
                />
                <LockedNote />
              </Field>

              <Field label="Capacidade geral">
                <input
                  type="number"
                  min={1}
                  className={inputClasses()}
                  value={form.capacity}
                  onChange={(event) => updateField("capacity", event.target.value)}
                />
              </Field>

              <Field label="Início do evento">
                <input
                  type="datetime-local"
                  className={lockedInputClasses()}
                  value={form.startDate}
                  disabled
                  readOnly
                />
                <LockedNote />
              </Field>

              <Field label="Fim do evento">
                <input
                  type="datetime-local"
                  className={inputClasses()}
                  value={form.endDate}
                  onChange={(event) => updateField("endDate", event.target.value)}
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Descrição curta">
                  <textarea
                    className={`${inputClasses()} min-h-[90px]`}
                    value={form.shortDescription}
                    onChange={(event) => updateField("shortDescription", event.target.value)}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Descrição principal">
                  <textarea
                    className={`${inputClasses()} min-h-[140px]`}
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                  />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
              Conteúdo público
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Textos da página pública</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Chamada">
                <input className={inputClasses()} value={form.headline} onChange={(event) => updateField("headline", event.target.value)} />
              </Field>

              <Field label="Resumo">
                <input className={inputClasses()} value={form.summary} onChange={(event) => updateField("summary", event.target.value)} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Descrição completa">
                  <textarea className={`${inputClasses()} min-h-[150px]`} value={form.fullDescription} onChange={(event) => updateField("fullDescription", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Atrações">
                  <textarea className={`${inputClasses()} min-h-[110px]`} value={form.attractions} onChange={(event) => updateField("attractions", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Informações importantes">
                  <textarea className={`${inputClasses()} min-h-[110px]`} value={form.importantInfo} onChange={(event) => updateField("importantInfo", event.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
              Local e imagens
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Endereço, mapa e mídia</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nome do local">
                <input className={inputClasses()} value={form.venueName} onChange={(event) => updateField("venueName", event.target.value)} />
              </Field>

              <Field label="Cidade">
                <input className={inputClasses()} value={form.city} onChange={(event) => updateField("city", event.target.value)} />
              </Field>

              <Field label="Estado">
                <input className={inputClasses()} value={form.state} onChange={(event) => updateField("state", event.target.value)} />
              </Field>

              <Field label="CEP">
                <input className={inputClasses()} value={form.zipCode} onChange={(event) => updateField("zipCode", event.target.value)} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Endereço">
                  <input className={inputClasses()} value={form.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} />
                </Field>
              </div>

              <Field label="Complemento">
                <input className={inputClasses()} value={form.addressLine2} onChange={(event) => updateField("addressLine2", event.target.value)} />
              </Field>

              <Field label="Bairro">
                <input className={inputClasses()} value={form.neighborhood} onChange={(event) => updateField("neighborhood", event.target.value)} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Link do mapa">
                  <input className={inputClasses()} value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Instruções de acesso">
                  <textarea className={`${inputClasses()} min-h-[100px]`} value={form.instructions} onChange={(event) => updateField("instructions", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Banner">
                  <input className={inputClasses()} value={form.bannerImageUrl} onChange={(event) => updateField("bannerImageUrl", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Capa">
                  <input className={inputClasses()} value={form.coverImageUrl} onChange={(event) => updateField("coverImageUrl", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Miniatura">
                  <input className={inputClasses()} value={form.thumbnailUrl} onChange={(event) => updateField("thumbnailUrl", event.target.value)} />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">
              Políticas
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Regras públicas</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Classificação indicativa">
                <input className={inputClasses()} value={form.ageRating} onChange={(event) => updateField("ageRating", event.target.value)} />
              </Field>

              <Field label="Referência">
                <input className={inputClasses()} value={form.reference} onChange={(event) => updateField("reference", event.target.value)} />
              </Field>

              <div className="md:col-span-2">
                <Field label="Política de reembolso">
                  <textarea className={`${inputClasses()} min-h-[100px]`} value={form.refundPolicy} onChange={(event) => updateField("refundPolicy", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Meia-entrada">
                  <textarea className={`${inputClasses()} min-h-[100px]`} value={form.halfEntryPolicy} onChange={(event) => updateField("halfEntryPolicy", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Transferência">
                  <textarea className={`${inputClasses()} min-h-[100px]`} value={form.transferPolicy} onChange={(event) => updateField("transferPolicy", event.target.value)} />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Termos e observações">
                  <textarea className={`${inputClasses()} min-h-[100px]`} value={form.termsNotes} onChange={(event) => updateField("termsNotes", event.target.value)} />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-24">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">
              Salvar
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Publicação</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Esta edição salva apenas os campos permitidos. Categoria, status, visibilidade
              e início do evento continuam travados.
            </p>

            <button
              type="submit"
              disabled={saving}
              className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">
              Acesso rápido
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href={`/admin/events/${eventId}`}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Ver detalhes
              </Link>
              <Link
                href={`/events/${eventId}`}
                target="_blank"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Página pública
              </Link>
              <Link
                href={`/admin/orders?search=${encodeURIComponent(eventId)}`}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Pedidos deste evento
              </Link>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
