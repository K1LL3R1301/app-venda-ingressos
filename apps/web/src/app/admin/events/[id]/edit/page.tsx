"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type EventDetails = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  status?: string | null;
  category?: string | { name?: string | null } | null;
  categoryName?: string | null;
  visibility?: string | null;
  content?: {
    headline?: string | null;
    summary?: string | null;
    fullDescription?: string | null;
    attractions?: string | null;
    importantInfo?: string | null;
  } | null;
  location?: {
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
  mobileBannerUrl: string;
  sectorMapImageUrl: string;
  ageRating: string;
  refundPolicy: string;
  halfEntryPolicy: string;
  transferPolicy: string;
  termsNotes: string;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (input: number) => String(input).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    mobileBannerUrl: event.media?.mobileBannerUrl || "",
    sectorMapImageUrl: event.media?.sectorMapImageUrl || "",
    ageRating: event.policy?.ageRating || "",
    refundPolicy: event.policy?.refundPolicy || "",
    halfEntryPolicy: event.policy?.halfEntryPolicy || "",
    transferPolicy: event.policy?.transferPolicy || "",
    termsNotes: event.policy?.termsNotes || "",
  };
}

function removeUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
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

function normalizePublicUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === "localhost") url.hostname = "127.0.0.1";
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  try {
    const apiUrl = new URL(API_BASE_URL);
    const origin = `${apiUrl.protocol}//${apiUrl.hostname === "localhost" ? "127.0.0.1" : apiUrl.hostname}${apiUrl.port ? `:${apiUrl.port}` : ""}`;
    return trimmed.startsWith("/") ? `${origin}${trimmed}` : `${origin}/${trimmed}`;
  } catch {
    return trimmed;
  }
}

function extractPlaceNameFromMapUrl(value: string) {
  const text = value.trim();
  if (!text) return "";

  const patterns = [/\/place\/([^/@?]+)/i, /[?&]q=([^&]+)/i, /[?&]query=([^&]+)/i];
  const match = patterns.map((pattern) => text.match(pattern)?.[1]).find(Boolean);
  if (!match) return "";

  try {
    return decodeURIComponent(match.replace(/\+/g, " ")).trim();
  } catch {
    return match.replace(/\+/g, " ").trim();
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClasses()}>{label}</span>
      {children}
    </label>
  );
}

function LockedNote() {
  return <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">Campo travado para evitar alteração operacional depois do evento configurado.</p>;
}

function MediaUploadField({
  label,
  value,
  kind,
  onChange,
}: {
  label: string;
  value: string;
  kind: "banner" | "cover" | "thumbnail" | "mobile-banner" | "sector-map";
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const previewUrl = normalizePublicUrl(value);

  async function upload(file?: File) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem precisa ter no máximo 5 MB.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    setUploading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/uploads/event-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(typeof result?.message === "string" ? result.message : "Erro ao enviar imagem.");
      }

      const nextUrl = String(result?.url || result?.path || "");
      if (!nextUrl) throw new Error("A API não retornou a URL da imagem.");
      onChange(normalizePublicUrl(nextUrl));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="h-32 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white md:w-56">
          {previewUrl ? <img src={previewUrl} alt={label} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.18em] text-slate-300">Sem imagem</div>}
        </div>

        <div className="min-w-0 flex-1">
          <p className={labelClasses()}>{label}</p>
          <input className={inputClasses()} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Cole uma URL ou envie uma nova imagem" />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-sky-700">
              {uploading ? "Enviando..." : "Enviar nova imagem"}
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" disabled={uploading} className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
            </label>

            {value ? (
              <button type="button" onClick={() => onChange("")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-100">
                Remover
              </button>
            ) : null}
          </div>

          {error ? <p className="mt-2 text-xs font-black text-rose-600">{error}</p> : null}
        </div>
      </div>
    </div>
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
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [mapMessage, setMapMessage] = useState("");
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Erro ao carregar evento.");

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

  const previewTitle = useMemo(() => form?.name || event?.name || "Evento", [event?.name, form?.name]);

  function updateField<K extends keyof EditForm>(key: K, value: EditForm[K]) {
    setSavedMessage("");
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function lookupCep(cepValue: string) {
    const cep = onlyDigits(cepValue);
    setCepMessage("");

    if (cep.length !== 8) {
      setCepMessage("Digite um CEP com 8 números para preencher endereço, bairro, cidade e estado.");
      return;
    }

    setCepLoading(true);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await response.json()) as ViaCepResponse;

      if (!response.ok || data.erro) {
        setCepMessage("CEP não encontrado.");
        return;
      }

      setForm((current) => {
        if (!current) return current;

        return {
          ...current,
          zipCode: data.cep || cep,
          addressLine1: data.logradouro || current.addressLine1,
          neighborhood: data.bairro || current.neighborhood,
          city: data.localidade || current.city,
          state: data.uf || current.state,
          addressLine2: current.addressLine2 || data.complemento || "",
        };
      });

      setCepMessage("Endereço atualizado pelo CEP.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP agora.");
    } finally {
      setCepLoading(false);
    }
  }

  function applyMapUrl(value: string) {
    updateField("mapUrl", value);
    setMapMessage("");

    const placeName = extractPlaceNameFromMapUrl(value);
    if (!placeName) return;

    setForm((current) => {
      if (!current) return current;
      if (current.venueName.trim()) return current;
      return { ...current, venueName: placeName };
    });

    setMapMessage(`Nome do local sugerido pelo link: ${placeName}`);
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
        mobileBannerUrl: form.mobileBannerUrl.trim() || undefined,
        sectorMapImageUrl: form.sectorMapImageUrl.trim() || undefined,
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Erro ao salvar evento.");

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
        <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">Carregando evento...</div>
      </main>
    );
  }

  if (error && !form) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm">
          <p className="text-xl font-black">Erro ao carregar evento</p>
          <p className="mt-2 text-sm">{error}</p>
          <Link href="/admin/events" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Voltar para eventos</Link>
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
            <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-300">Editar evento</p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">{previewTitle}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Edite endereço, textos, políticas e imagens. Categoria, status, visibilidade e início continuam travados para proteger a operação.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/events/${eventId}`} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15">Voltar ao evento</Link>
            <Link href={`/events/${eventId}`} target="_blank" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-100">Página pública</Link>
          </div>
        </div>
      </section>

      {savedMessage ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">{savedMessage}</div> : null}
      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700">{error}</div> : null}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">Dados principais</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Identidade do evento</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2"><Field label="Nome"><input className={inputClasses()} value={form.name} onChange={(event) => updateField("name", event.target.value)} /></Field></div>
              <Field label="Slug"><input className={inputClasses()} value={form.slug} onChange={(event) => updateField("slug", event.target.value)} placeholder="nome-do-evento" /></Field>
              <Field label="Categoria"><input className={lockedInputClasses()} value={form.category} disabled readOnly /><LockedNote /></Field>
              <Field label="Status"><input className={lockedInputClasses()} value={getStatusLabel(form.status)} disabled readOnly /><LockedNote /></Field>
              <Field label="Visibilidade"><input className={lockedInputClasses()} value={getVisibilityLabel(form.visibility)} disabled readOnly /><LockedNote /></Field>
              <Field label="Capacidade geral"><input type="number" min={1} className={inputClasses()} value={form.capacity} onChange={(event) => updateField("capacity", event.target.value)} /></Field>
              <Field label="Início do evento"><input type="datetime-local" className={lockedInputClasses()} value={form.startDate} disabled readOnly /><LockedNote /></Field>
              <Field label="Fim do evento"><input type="datetime-local" className={inputClasses()} value={form.endDate} onChange={(event) => updateField("endDate", event.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Descrição curta"><textarea className={`${inputClasses()} min-h-[90px]`} value={form.shortDescription} onChange={(event) => updateField("shortDescription", event.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Descrição principal"><textarea className={`${inputClasses()} min-h-[140px]`} value={form.description} onChange={(event) => updateField("description", event.target.value)} /></Field></div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">Conteúdo público</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Textos da página pública</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Chamada"><input className={inputClasses()} value={form.headline} onChange={(event) => updateField("headline", event.target.value)} /></Field>
              <Field label="Resumo"><input className={inputClasses()} value={form.summary} onChange={(event) => updateField("summary", event.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Descrição completa"><textarea className={`${inputClasses()} min-h-[150px]`} value={form.fullDescription} onChange={(event) => updateField("fullDescription", event.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Atrações"><textarea className={`${inputClasses()} min-h-[110px]`} value={form.attractions} onChange={(event) => updateField("attractions", event.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Informações importantes"><textarea className={`${inputClasses()} min-h-[110px]`} value={form.importantInfo} onChange={(event) => updateField("importantInfo", event.target.value)} /></Field></div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">Local</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Endereço e mapa</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nome do local"><input className={inputClasses()} value={form.venueName} onChange={(event) => updateField("venueName", event.target.value)} /></Field>
              <Field label="CEP"><input className={inputClasses()} value={form.zipCode} onChange={(event) => updateField("zipCode", onlyDigits(event.target.value).slice(0, 8))} onBlur={(event) => void lookupCep(event.target.value)} placeholder="Digite o CEP" /></Field>
              <Field label="Cidade"><input className={inputClasses()} value={form.city} onChange={(event) => updateField("city", event.target.value)} /></Field>
              <Field label="Estado"><input className={inputClasses()} value={form.state} onChange={(event) => updateField("state", event.target.value.toUpperCase().slice(0, 2))} /></Field>
              <div className="md:col-span-2"><Field label="Endereço"><input className={inputClasses()} value={form.addressLine1} onChange={(event) => updateField("addressLine1", event.target.value)} /></Field></div>
              <Field label="Complemento"><input className={inputClasses()} value={form.addressLine2} onChange={(event) => updateField("addressLine2", event.target.value)} /></Field>
              <Field label="Bairro"><input className={inputClasses()} value={form.neighborhood} onChange={(event) => updateField("neighborhood", event.target.value)} /></Field>

              <div className="md:col-span-2">
                <Field label="Link do mapa">
                  <input className={inputClasses()} value={form.mapUrl} onChange={(event) => applyMapUrl(event.target.value)} placeholder="Cole o link do Google Maps" />
                </Field>
              </div>

              <div className="md:col-span-2">
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs font-bold leading-5 text-sky-800">
                  {cepLoading ? "Consultando CEP..." : cepMessage || "Ao sair do campo CEP, endereço, bairro, cidade e estado são atualizados automaticamente quando o CEP existir."}
                  {mapMessage ? <span className="mt-1 block">{mapMessage}</span> : null}
                </div>
              </div>

              <div className="md:col-span-2"><Field label="Instruções de acesso"><textarea className={`${inputClasses()} min-h-[100px]`} value={form.instructions} onChange={(event) => updateField("instructions", event.target.value)} /></Field></div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">Imagens</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Upload de mídia do evento</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Agora a edição usa o mesmo endpoint de upload da criação do evento.</p>

            <div className="mt-6 grid gap-4">
              <MediaUploadField label="Banner" kind="banner" value={form.bannerImageUrl} onChange={(value) => updateField("bannerImageUrl", value)} />
              <MediaUploadField label="Capa" kind="cover" value={form.coverImageUrl} onChange={(value) => updateField("coverImageUrl", value)} />
              <MediaUploadField label="Miniatura" kind="thumbnail" value={form.thumbnailUrl} onChange={(value) => updateField("thumbnailUrl", value)} />
              <MediaUploadField label="Banner mobile" kind="mobile-banner" value={form.mobileBannerUrl} onChange={(value) => updateField("mobileBannerUrl", value)} />
              <MediaUploadField label="Mapa de setores" kind="sector-map" value={form.sectorMapImageUrl} onChange={(value) => updateField("sectorMapImageUrl", value)} />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-sky-600">Políticas</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Regras públicas</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Classificação indicativa"><input className={inputClasses()} value={form.ageRating} onChange={(event) => updateField("ageRating", event.target.value)} /></Field>
              <Field label="Referência"><input className={inputClasses()} value={form.reference} onChange={(event) => updateField("reference", event.target.value)} /></Field>
              <div className="md:col-span-2"><Field label="Política de reembolso"><textarea className={`${inputClasses()} min-h-[100px]`} value={form.refundPolicy} onChange={(event) => updateField("refundPolicy", event.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Meia-entrada"><textarea className={`${inputClasses()} min-h-[100px]`} value={form.halfEntryPolicy} onChange={(event) => updateField("halfEntryPolicy", event.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Transferência"><textarea className={`${inputClasses()} min-h-[100px]`} value={form.transferPolicy} onChange={(event) => updateField("transferPolicy", event.target.value)} /></Field></div>
              <div className="md:col-span-2"><Field label="Termos e observações"><textarea className={`${inputClasses()} min-h-[100px]`} value={form.termsNotes} onChange={(event) => updateField("termsNotes", event.target.value)} /></Field></div>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 xl:sticky xl:top-24">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">Salvar</p>
            <h3 className="mt-2 text-xl font-black text-slate-950">Publicação</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Depois de enviar uma imagem ou alterar endereço, clique em salvar para gravar no evento.</p>

            <button type="submit" disabled={saving} className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button type="button" onClick={() => router.push(`/admin/events/${eventId}`)} className="mt-3 w-full rounded-2xl border border-slate-200 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50">Cancelar</button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.26em] text-slate-400">Acesso rápido</p>
            <div className="mt-4 grid gap-3">
              <Link href={`/admin/events/${eventId}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50">Ver detalhes</Link>
              <Link href={`/events/${eventId}`} target="_blank" className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50">Página pública</Link>
              <Link href={`/admin/orders?search=${encodeURIComponent(eventId)}`} className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:bg-slate-50">Pedidos deste evento</Link>
            </div>
          </div>
        </aside>
      </form>
    </main>
  );
}
