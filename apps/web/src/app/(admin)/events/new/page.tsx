"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type OrganizerItem = {
  id: string;
  tradeName?: string;
  legalName?: string;
  document?: string;
  email?: string;
  phone?: string;
  status?: string;
};

type TicketTypeFormItem = {
  localId: string;
  name: string;
  lotLabel: string;
  description: string;
  price: string;
  quantity: string;
  salesStartAt: string;
  salesEndAt: string;
  minPerOrder: string;
  maxPerOrder: string;
  displayOrder: string;
  feeAmount: string;
  feeDescription: string;
  benefitDescription: string;
  isHidden: boolean;
  status: string;
};

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toIsoOrUndefined(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function toNumberOrUndefined(value: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseGallery(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasDefinedValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasDefinedValue);
  }

  return false;
}

function createEmptyTicketType(index: number): TicketTypeFormItem {
  return {
    localId: `ticket-type-${Date.now()}-${index}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    name: "",
    lotLabel: `${index + 1}º Lote`,
    description: "",
    price: "",
    quantity: "100",
    salesStartAt: "",
    salesEndAt: "",
    minPerOrder: "1",
    maxPerOrder: "",
    displayOrder: String(index),
    feeAmount: "",
    feeDescription: "",
    benefitDescription: "",
    isHidden: false,
    status: "ACTIVE",
  };
}

export default function NewEventPage() {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [saving, setSaving] = useState(false);

  const [organizerId, setOrganizerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("DRAFT");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [eventDate, setEventDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saleStartAt, setSaleStartAt] = useState("");
  const [saleEndAt, setSaleEndAt] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [featured, setFeatured] = useState(false);
  const [highlightTag, setHighlightTag] = useState("");
  const [checkoutTitle, setCheckoutTitle] = useState("");
  const [checkoutSubtitle, setCheckoutSubtitle] = useState("");

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [attractions, setAttractions] = useState("");
  const [schedule, setSchedule] = useState("");
  const [sectorDetails, setSectorDetails] = useState("");
  const [importantInfo, setImportantInfo] = useState("");
  const [faq, setFaq] = useState("");
  const [producerDescription, setProducerDescription] = useState("");
  const [purchaseInstructions, setPurchaseInstructions] = useState("");

  const [mode, setMode] = useState("PRESENTIAL");
  const [venueName, setVenueName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [reference, setReference] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mobileBannerUrl, setMobileBannerUrl] = useState("");
  const [sectorMapImageUrl, setSectorMapImageUrl] = useState("");
  const [galleryText, setGalleryText] = useState("");

  const [ageRating, setAgeRating] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [halfEntryPolicy, setHalfEntryPolicy] = useState("");
  const [transferPolicy, setTransferPolicy] = useState("");
  const [termsNotes, setTermsNotes] = useState("");
  const [entryRules, setEntryRules] = useState("");
  const [documentRules, setDocumentRules] = useState("");

  const [ticketTypes, setTicketTypes] = useState<TicketTypeFormItem[]>([
    createEmptyTicketType(0),
  ]);

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

  const galleryPreview = useMemo(() => parseGallery(galleryText), [galleryText]);

  function updateTicketType(localId: string, field: keyof TicketTypeFormItem, value: string | boolean) {
    setTicketTypes((prev) =>
      prev.map((ticketType) =>
        ticketType.localId === localId
          ? {
              ...ticketType,
              [field]: value,
            }
          : ticketType,
      ),
    );
  }

  function handleAddTicketType() {
    setTicketTypes((prev) => [...prev, createEmptyTicketType(prev.length)]);
  }

  function handleRemoveTicketType(localId: string) {
    setTicketTypes((prev) => {
      if (prev.length === 1) {
        return [createEmptyTicketType(0)];
      }

      return prev.filter((ticketType) => ticketType.localId !== localId);
    });
  }

  async function handleSubmit(e: FormEvent) {
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
      alert("Informe a data principal do evento");
      return;
    }

    if (!capacity || Number(capacity) < 1) {
      alert("Informe uma capacidade válida");
      return;
    }

    const validTicketTypes = ticketTypes
      .map((ticketType, index) => ({
        name: ticketType.name.trim(),
        lotLabel: normalizeText(ticketType.lotLabel),
        description: normalizeText(ticketType.description),
        price: normalizeText(ticketType.price),
        quantity: toNumberOrUndefined(ticketType.quantity),
        salesStartAt: toIsoOrUndefined(ticketType.salesStartAt),
        salesEndAt: toIsoOrUndefined(ticketType.salesEndAt),
        minPerOrder: toNumberOrUndefined(ticketType.minPerOrder),
        maxPerOrder: toNumberOrUndefined(ticketType.maxPerOrder),
        displayOrder: toNumberOrUndefined(ticketType.displayOrder) ?? index,
        feeAmount: normalizeText(ticketType.feeAmount),
        feeDescription: normalizeText(ticketType.feeDescription),
        benefitDescription: normalizeText(ticketType.benefitDescription),
        isHidden: ticketType.isHidden,
        status: normalizeText(ticketType.status) || "ACTIVE",
      }))
      .filter(
        (ticketType) =>
          Boolean(ticketType.name) &&
          Boolean(ticketType.price) &&
          Boolean(ticketType.quantity && ticketType.quantity > 0),
      );

    const content = {
      headline: normalizeText(headline),
      summary: normalizeText(summary),
      fullDescription: normalizeText(fullDescription),
      attractions: normalizeText(attractions),
      schedule: normalizeText(schedule),
      sectorDetails: normalizeText(sectorDetails),
      importantInfo: normalizeText(importantInfo),
      faq: normalizeText(faq),
      producerDescription: normalizeText(producerDescription),
      purchaseInstructions: normalizeText(purchaseInstructions),
    };

    const location = {
      mode: normalizeText(mode),
      venueName: normalizeText(venueName),
      addressLine1: normalizeText(addressLine1),
      addressLine2: normalizeText(addressLine2),
      neighborhood: normalizeText(neighborhood),
      city: normalizeText(city),
      state: normalizeText(stateName),
      zipCode: normalizeText(zipCode),
      reference: normalizeText(reference),
      mapUrl: normalizeText(mapUrl),
      instructions: normalizeText(instructions),
      latitude: normalizeText(latitude),
      longitude: normalizeText(longitude),
    };

    const media = {
      coverImageUrl: normalizeText(coverImageUrl),
      bannerImageUrl: normalizeText(bannerImageUrl),
      thumbnailUrl: normalizeText(thumbnailUrl),
      mobileBannerUrl: normalizeText(mobileBannerUrl),
      sectorMapImageUrl: normalizeText(sectorMapImageUrl),
      gallery: galleryPreview.length > 0 ? galleryPreview : undefined,
    };

    const policy = {
      ageRating: normalizeText(ageRating),
      refundPolicy: normalizeText(refundPolicy),
      halfEntryPolicy: normalizeText(halfEntryPolicy),
      transferPolicy: normalizeText(transferPolicy),
      termsNotes: normalizeText(termsNotes),
      entryRules: normalizeText(entryRules),
      documentRules: normalizeText(documentRules),
    };

    const payload = {
      organizerId,
      name: name.trim(),
      description: normalizeText(description),
      eventDate: new Date(eventDate).toISOString(),
      capacity: Number(capacity),

      slug: normalizeText(slug),
      shortDescription: normalizeText(shortDescription),
      category: normalizeText(category),
      status: normalizeText(status),
      visibility: normalizeText(visibility),
      timezone: normalizeText(timezone),
      startDate: toIsoOrUndefined(startDate),
      endDate: toIsoOrUndefined(endDate),
      saleStartAt: toIsoOrUndefined(saleStartAt),
      saleEndAt: toIsoOrUndefined(saleEndAt),
      featured,
      highlightTag: normalizeText(highlightTag),
      checkoutTitle: normalizeText(checkoutTitle),
      checkoutSubtitle: normalizeText(checkoutSubtitle),

      content: hasDefinedValue(content) ? content : undefined,
      location: hasDefinedValue(location) ? location : undefined,
      media: hasDefinedValue(media) ? media : undefined,
      policy: hasDefinedValue(policy) ? policy : undefined,
      ticketTypes: validTicketTypes.length > 0 ? validTicketTypes : undefined,
    };

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
    <div className="max-w-6xl rounded-2xl bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Novo evento 🎫</h1>
          <p className="mt-1 text-gray-600">
            Cadastre o evento completo com conteúdo, local, mídia, políticas e
            lotes em um único fluxo.
          </p>
        </div>

        <Link href="/events" className="rounded border bg-white px-4 py-2">
          Voltar
        </Link>
      </div>

      {loadingOrganizers ? (
        <p>Carregando organizadores...</p>
      ) : organizers.length === 0 ? (
        <div className="rounded-2xl border bg-gray-50 p-6">
          <p className="font-medium">Nenhum organizador encontrado.</p>
          <p className="mt-2 text-gray-600">
            Você precisa criar um organizador antes de cadastrar um evento.
          </p>

          <Link
            href="/organizers/new"
            className="mt-4 inline-block rounded bg-black px-4 py-2 text-white"
          >
            Criar organizador
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">1. Dados principais</h2>
            <p className="mt-1 text-sm text-gray-500">
              Informações-base do evento e da vitrine.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Organizador *
                </label>
                <select
                  className="w-full rounded border p-3"
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Nome do evento *
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Festival de Verão 2026"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Slug</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="festival-de-verao-2026"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Categoria
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Show, Teatro, Esporte..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  className="w-full rounded border p-3"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="CANCELED">CANCELED</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Visibilidade
                </label>
                <select
                  className="w-full rounded border p-3"
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                >
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="PRIVATE">PRIVATE</option>
                  <option value="UNLISTED">UNLISTED</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Timezone</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="America/Sao_Paulo"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Capacidade *
                </label>
                <input
                  type="number"
                  className="w-full rounded border p-3"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  min={1}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Data principal *
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded border p-3"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Início do evento
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded border p-3"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Fim do evento
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded border p-3"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Início das vendas
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded border p-3"
                  value={saleStartAt}
                  onChange={(e) => setSaleStartAt(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Fim das vendas
                </label>
                <input
                  type="datetime-local"
                  className="w-full rounded border p-3"
                  value={saleEndAt}
                  onChange={(e) => setSaleEndAt(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Descrição curta
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Resumo rápido que aparece na vitrine"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Descrição base
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição principal do evento"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Tag de destaque
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={highlightTag}
                  onChange={(e) => setHighlightTag(e.target.value)}
                  placeholder="Ex: Últimos ingressos"
                />
              </div>

              <div className="flex items-center gap-3 rounded border p-3">
                <input
                  id="featured"
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                />
                <label htmlFor="featured" className="text-sm font-medium">
                  Evento em destaque
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Título do checkout
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={checkoutTitle}
                  onChange={(e) => setCheckoutTitle(e.target.value)}
                  placeholder="Escolha seu ingresso"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Subtítulo do checkout
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={checkoutSubtitle}
                  onChange={(e) => setCheckoutSubtitle(e.target.value)}
                  placeholder="Selecione o lote ideal"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">2. Conteúdo da página</h2>
            <p className="mt-1 text-sm text-gray-500">
              Textos que vão montar a landing page do evento.
            </p>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Headline</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Uma chamada forte para vender o evento"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Resumo</label>
                <textarea
                  className="min-h-[100px] w-full rounded border p-3"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Resumo do evento para o topo da página"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Descrição completa
                </label>
                <textarea
                  className="min-h-[180px] w-full rounded border p-3"
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder="Conteúdo principal da página de compra"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Atrações
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={attractions}
                  onChange={(e) => setAttractions(e.target.value)}
                  placeholder="Line-up, artistas, convidados, atividades..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Programação
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  placeholder="Horários, abertura, shows, intervalos..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Detalhes de setores
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={sectorDetails}
                  onChange={(e) => setSectorDetails(e.target.value)}
                  placeholder="Informações sobre pistas, camarotes, mesas..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Informações importantes
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={importantInfo}
                  onChange={(e) => setImportantInfo(e.target.value)}
                  placeholder="Regras de acesso, horários, abertura dos portões..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">FAQ</label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={faq}
                  onChange={(e) => setFaq(e.target.value)}
                  placeholder="Dúvidas frequentes"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sobre o produtor
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={producerDescription}
                  onChange={(e) => setProducerDescription(e.target.value)}
                  placeholder="Descrição do organizador/produtor para a página"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Instruções de compra
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={purchaseInstructions}
                  onChange={(e) => setPurchaseInstructions(e.target.value)}
                  placeholder="Mensagens para orientar o comprador"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">3. Local e acesso</h2>
            <p className="mt-1 text-sm text-gray-500">
              Dados do local que aparecem na página pública.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">Modo</label>
                <select
                  className="w-full rounded border p-3"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="PRESENTIAL">PRESENTIAL</option>
                  <option value="ONLINE">ONLINE</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Nome do local
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Ex: Arena Central"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Endereço principal
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Rua, número"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Complemento
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Bloco, sala, portão..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Bairro</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">CEP</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Cidade</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Estado</label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Ex: SP"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Latitude
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-23.550520"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Longitude
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-46.633308"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  URL do mapa
                </label>
                <input
                  type="url"
                  className="w-full rounded border p-3"
                  value={mapUrl}
                  onChange={(e) => setMapUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Referência
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Próximo ao metrô / entrada pelo portão B"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Instruções de chegada
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Estacionamento, portões, transporte, acesso..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">4. Mídia</h2>
            <p className="mt-1 text-sm text-gray-500">
              Imagens e banners usados na vitrine do evento.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Capa do evento
                </label>
                <input
                  type="url"
                  className="w-full rounded border p-3"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Banner</label>
                <input
                  type="url"
                  className="w-full rounded border p-3"
                  value={bannerImageUrl}
                  onChange={(e) => setBannerImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Thumbnail
                </label>
                <input
                  type="url"
                  className="w-full rounded border p-3"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Banner mobile
                </label>
                <input
                  type="url"
                  className="w-full rounded border p-3"
                  value={mobileBannerUrl}
                  onChange={(e) => setMobileBannerUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Imagem do mapa/setores
                </label>
                <input
                  type="url"
                  className="w-full rounded border p-3"
                  value={sectorMapImageUrl}
                  onChange={(e) => setSectorMapImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Galeria
                </label>
                <textarea
                  className="min-h-[140px] w-full rounded border p-3"
                  value={galleryText}
                  onChange={(e) => setGalleryText(e.target.value)}
                  placeholder={"Cole 1 URL por linha\nhttps://...\nhttps://..."}
                />
                {galleryPreview.length > 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    {galleryPreview.length} imagem(ns) detectada(s)
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <h2 className="text-xl font-semibold">5. Políticas e regras</h2>
            <p className="mt-1 text-sm text-gray-500">
              Regras que aparecem na página de compra e no evento.
            </p>

            <div className="mt-5 grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Classificação etária
                </label>
                <input
                  type="text"
                  className="w-full rounded border p-3"
                  value={ageRating}
                  onChange={(e) => setAgeRating(e.target.value)}
                  placeholder="Ex: 18 anos"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Política de cancelamento
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={refundPolicy}
                  onChange={(e) => setRefundPolicy(e.target.value)}
                  placeholder="Descreva cancelamento, estorno, prazos..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Política de meia-entrada
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={halfEntryPolicy}
                  onChange={(e) => setHalfEntryPolicy(e.target.value)}
                  placeholder="Regras e documentos exigidos"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Política de transferência
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={transferPolicy}
                  onChange={(e) => setTransferPolicy(e.target.value)}
                  placeholder="Pode transferir? Até quando? Como?"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Regras de entrada
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={entryRules}
                  onChange={(e) => setEntryRules(e.target.value)}
                  placeholder="Abertura dos portões, itens proibidos, acesso..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Regras de documentos
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={documentRules}
                  onChange={(e) => setDocumentRules(e.target.value)}
                  placeholder="Documento oficial, comprovante de meia..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Observações e termos
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded border p-3"
                  value={termsNotes}
                  onChange={(e) => setTermsNotes(e.target.value)}
                  placeholder="Observações finais, termos e avisos"
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">6. Lotes e ingressos</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Defina todos os lotes agora, no mesmo cadastro do evento.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddTicketType}
                className="rounded bg-black px-4 py-2 text-white"
              >
                + Adicionar lote
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {ticketTypes.map((ticketType, index) => (
                <div
                  key={ticketType.localId}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Lote {index + 1}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Configure nome, preço, quantidade e regras de venda.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveTicketType(ticketType.localId)}
                      className="rounded border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Nome do ingresso *
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border p-3"
                        value={ticketType.name}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "name",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: Ingresso VIP"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Nome do lote
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border p-3"
                        value={ticketType.lotLabel}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "lotLabel",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: 1º Lote"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Descrição
                      </label>
                      <textarea
                        className="min-h-[100px] w-full rounded border p-3"
                        value={ticketType.description}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="Descreva este ingresso/lote"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Preço *
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border p-3"
                        value={ticketType.price}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "price",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: 120.00"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Quantidade *
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded border p-3"
                        value={ticketType.quantity}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "quantity",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Início das vendas
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded border p-3"
                        value={ticketType.salesStartAt}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "salesStartAt",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Fim das vendas
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full rounded border p-3"
                        value={ticketType.salesEndAt}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "salesEndAt",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Mínimo por pedido
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded border p-3"
                        value={ticketType.minPerOrder}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "minPerOrder",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Máximo por pedido
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="w-full rounded border p-3"
                        value={ticketType.maxPerOrder}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "maxPerOrder",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Ordem de exibição
                      </label>
                      <input
                        type="number"
                        min={0}
                        className="w-full rounded border p-3"
                        value={ticketType.displayOrder}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "displayOrder",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Status
                      </label>
                      <select
                        className="w-full rounded border p-3"
                        value={ticketType.status}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "status",
                            e.target.value,
                          )
                        }
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="SOLD_OUT">SOLD_OUT</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Taxa
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border p-3"
                        value={ticketType.feeAmount}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "feeAmount",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: 12.00"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Descrição da taxa
                      </label>
                      <input
                        type="text"
                        className="w-full rounded border p-3"
                        value={ticketType.feeDescription}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "feeDescription",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: Taxa de serviço"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium">
                        Benefícios
                      </label>
                      <textarea
                        className="min-h-[100px] w-full rounded border p-3"
                        value={ticketType.benefitDescription}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "benefitDescription",
                            e.target.value,
                          )
                        }
                        placeholder="Ex: Área VIP + fila preferencial"
                      />
                    </div>

                    <div className="flex items-center gap-3 rounded border bg-white p-3">
                      <input
                        id={`isHidden-${ticketType.localId}`}
                        type="checkbox"
                        checked={ticketType.isHidden}
                        onChange={(e) =>
                          updateTicketType(
                            ticketType.localId,
                            "isHidden",
                            e.target.checked,
                          )
                        }
                      />
                      <label
                        htmlFor={`isHidden-${ticketType.localId}`}
                        className="text-sm font-medium"
                      >
                        Ocultar lote na vitrine
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-black px-5 py-3 text-white"
            >
              {saving ? "Salvando..." : "Criar evento"}
            </button>

            <Link href="/events" className="rounded border px-5 py-3">
              Cancelar
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}