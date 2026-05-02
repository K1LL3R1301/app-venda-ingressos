"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type TicketTypeItem = {
  id: string;
  name?: string;
  lotLabel?: string;
  description?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
  salesStartAt?: string;
  salesEndAt?: string;
  minPerOrder?: number;
  maxPerOrder?: number;
  displayOrder?: number;
  feeAmount?: string | number;
  feeDescription?: string;
  benefitDescription?: string;
  isHidden?: boolean;
};

type EventContent = {
  headline?: string;
  summary?: string;
  fullDescription?: string;
  attractions?: string;
  schedule?: string;
  sectorDetails?: string;
  importantInfo?: string;
  faq?: string;
  producerDescription?: string;
  purchaseInstructions?: string;
};

type EventLocation = {
  mode?: string;
  venueName?: string;
  addressLine1?: string;
  addressLine2?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  reference?: string;
  mapUrl?: string;
  instructions?: string;
  latitude?: string | number;
  longitude?: string | number;
};

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  sectorMapImageUrl?: string;
  gallery?: string[];
};

type EventPolicy = {
  ageRating?: string;
  refundPolicy?: string;
  halfEntryPolicy?: string;
  transferPolicy?: string;
  termsNotes?: string;
  entryRules?: string;
  documentRules?: string;
};

type OrganizerInfo = {
  id?: string;
  tradeName?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  bio?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  whatsapp?: string;
  logoUrl?: string;
  bannerUrl?: string;
  city?: string;
  state?: string;
};

type EventDetail = {
  id: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  saleStartAt?: string;
  saleEndAt?: string;
  capacity?: number;
  status?: string;
  category?: string;
  highlightTag?: string;
  checkoutTitle?: string;
  checkoutSubtitle?: string;
  organizer?: OrganizerInfo;
  ticketTypes?: TicketTypeItem[];
  content?: EventContent | null;
  location?: EventLocation | null;
  media?: EventMedia | null;
  policy?: EventPolicy | null;
};

type SelectedItem = {
  ticketTypeId: string;
  quantity: number;
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

function formatMoney(value?: string | number) {
  if (value === undefined || value === null) return "R$ 0,00";

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (Number.isNaN(numeric)) {
    return `R$ ${value}`;
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function textLines(value?: string | null) {
  if (!hasText(value)) return [];
  return String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function buildDateRange(start?: string, end?: string) {
  if (!start && !end) return "-";
  if (start && !end) return formatDate(start);
  if (!start && end) return formatDate(end);
  return `${formatDate(start)} até ${formatDate(end)}`;
}

function getHeroImage(event: EventDetail | null) {
  return (
    event?.media?.bannerImageUrl ||
    event?.media?.coverImageUrl ||
    event?.media?.mobileBannerUrl ||
    event?.media?.thumbnailUrl ||
    event?.media?.gallery?.[0] ||
    undefined
  );
}

function getCardImage(event: EventDetail | null) {
  return (
    event?.media?.coverImageUrl ||
    event?.media?.thumbnailUrl ||
    event?.media?.bannerImageUrl ||
    event?.media?.mobileBannerUrl ||
    event?.media?.gallery?.[0] ||
    undefined
  );
}

function getLocationLabel(location?: EventLocation | null) {
  if (!location) return "Local a confirmar";

  const pieces = [
    location.venueName,
    [location.city, location.state].filter(Boolean).join(" - "),
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(", ") : "Local a confirmar";
}

function getFullAddress(location?: EventLocation | null) {
  if (!location) return "Endereço não informado";

  const pieces = [
    location.addressLine1,
    location.addressLine2,
    location.neighborhood,
    location.city,
    location.state,
    location.zipCode,
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(", ") : "Endereço não informado";
}

function getStatusLabel(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("published")) return "Publicado";
  if (normalized.includes("draft")) return "Rascunho";
  if (normalized.includes("canceled")) return "Cancelado";
  if (normalized.includes("active")) return "Ativo";
  if (normalized.includes("sold")) return "Esgotando";

  return status || "Disponível";
}

function getStatusClass(status?: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("published") || normalized.includes("active")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized.includes("draft")) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized.includes("canceled")) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function SectionBlock({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  const lines = textLines(value);

  if (lines.length === 0) return null;

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export default function CustomerEventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    async function loadEvent() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/v1/events/${eventId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();

        if (!res.ok) {
          alert(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar evento",
          );
          window.location.href = "/customer/events";
          return;
        }

        setEvent(data);
      } catch (error) {
        console.error("CUSTOMER EVENT DETAIL ERROR:", error);
        alert("Erro ao conectar com a API");
        window.location.href = "/customer/events";
      } finally {
        setLoading(false);
      }
    }

    if (!eventId) {
      window.location.href = "/customer/events";
      return;
    }

    loadEvent();
  }, [eventId]);

  const organizerName =
    event?.organizer?.tradeName ||
    event?.organizer?.legalName ||
    "Organizador parceiro";

  const visibleTicketTypes = useMemo(() => {
    return (
      event?.ticketTypes
        ?.filter((ticket) => ticket.status !== "INACTIVE" && !ticket.isHidden)
        .sort(
          (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
        ) || []
    );
  }, [event?.ticketTypes]);

  const galleryImages = useMemo(() => {
    if (!event) return [];

    const images = [
      event.media?.bannerImageUrl,
      event.media?.coverImageUrl,
      event.media?.thumbnailUrl,
      event.media?.mobileBannerUrl,
      ...(event.media?.gallery || []),
      event.media?.sectorMapImageUrl,
    ].filter(Boolean) as string[];

    return Array.from(new Set(images));
  }, [event]);

  useEffect(() => {
    setGalleryIndex(0);
  }, [event?.id]);

  function goTo(path: string) {
    window.location.href = path;
  }

  function updateSelectedQuantity(ticketType: TicketTypeItem, quantity: number) {
    const minimum = Math.max(0, ticketType.minPerOrder ?? 0);
    const maximumByRule =
      typeof ticketType.maxPerOrder === "number" && ticketType.maxPerOrder > 0
        ? ticketType.maxPerOrder
        : Number.MAX_SAFE_INTEGER;
    const maximumByStock =
      typeof ticketType.quantity === "number" && ticketType.quantity > 0
        ? ticketType.quantity
        : Number.MAX_SAFE_INTEGER;

    const maximum = Math.min(maximumByRule, maximumByStock);
    const nextValue = Math.max(0, Math.min(quantity, maximum));

    setSelectedItems((current) => {
      const next = { ...current };

      if (nextValue <= 0) {
        delete next[ticketType.id];
        return next;
      }

      if (minimum > 1 && nextValue < minimum) {
        next[ticketType.id] = minimum;
        return next;
      }

      next[ticketType.id] = nextValue;
      return next;
    });
  }

  const selectedItemsDetailed = useMemo(() => {
    return visibleTicketTypes
      .filter((ticket) => (selectedItems[ticket.id] || 0) > 0)
      .map((ticket) => {
        const quantity = selectedItems[ticket.id] || 0;
        const unitPrice = toNumber(ticket.price);
        const feeAmount = toNumber(ticket.feeAmount);
        const unitTotal = unitPrice + feeAmount;

        return {
          ticket,
          quantity,
          unitPrice,
          feeAmount,
          total: unitTotal * quantity,
        };
      });
  }, [visibleTicketTypes, selectedItems]);

  const totalSelectedTickets = useMemo(
    () => selectedItemsDetailed.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItemsDetailed],
  );

  const totalSelectedAmount = useMemo(
    () => selectedItemsDetailed.reduce((sum, item) => sum + item.total, 0),
    [selectedItemsDetailed],
  );

  function handleContinueCheckout() {
    if (!event?.id) {
      alert("Evento inválido");
      return;
    }

    const items: SelectedItem[] = Object.entries(selectedItems)
      .map(([ticketTypeId, quantity]) => ({
        ticketTypeId,
        quantity,
      }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      alert("Selecione pelo menos um ingresso");
      return;
    }

    const encodedItems = encodeURIComponent(JSON.stringify(items));
    window.location.href = `/customer/checkout?eventId=${event.id}&items=${encodedItems}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Carregando evento...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-slate-800">
              Evento não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const heroImage = getHeroImage(event);
  const cardImage = getCardImage(event);
  const displaySummary =
    event.content?.summary ||
    event.shortDescription ||
    event.description ||
    "Confira os detalhes deste evento e escolha seus ingressos.";
  const displayDescription =
    event.content?.fullDescription || event.description || "";
  const dateRange = buildDateRange(
    event.startDate || event.eventDate,
    event.endDate,
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-32 xl:pb-8">
      <section className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-slate-950 text-white shadow-sm">
        {heroImage ? (
          <img
            src={heroImage}
            alt={event.name || "Evento"}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        <div
          className={`absolute inset-0 ${
            heroImage
              ? "bg-gradient-to-r from-black/88 via-black/68 to-black/34"
              : "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700"
          }`}
        />

        <div className="relative z-10 grid gap-8 p-8 md:p-10 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {hasText(event.content?.headline) ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur">
                    {event.content?.headline}
                  </span>
                ) : null}

                {hasText(event.highlightTag) ? (
                  <span className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white shadow-sm">
                    {event.highlightTag}
                  </span>
                ) : null}

                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                  {getStatusLabel(event.status)}
                </span>

                {hasText(event.policy?.ageRating) ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                    {event.policy?.ageRating}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                {event.name || "Evento sem nome"}
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
                {displaySummary}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Quando
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {dateRange}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Local
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {getLocationLabel(event.location)}
                  </p>
                </div>

                <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Organizador
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {organizerName}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goTo("/customer/events")}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
                >
                  Voltar para eventos
                </button>

                <button
                  type="button"
                  onClick={handleContinueCheckout}
                  className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Continuar compra
                </button>

                {event.location?.mapUrl ? (
                  <a
                    href={event.location.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-white/25 bg-transparent px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
                  >
                    Ver no mapa
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-start justify-end">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/15 bg-white/10 p-3 backdrop-blur">
              <div className="overflow-hidden rounded-[22px] bg-black/20">
                {cardImage ? (
                  <img
                    src={cardImage}
                    alt={event.name || "Evento"}
                    className="h-[240px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[240px] items-center justify-center bg-gradient-to-br from-fuchsia-500/80 via-purple-500/80 to-indigo-600/80 px-6 text-center text-2xl font-black text-white">
                    {event.name || "Evento"}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                    Início das vendas
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {event.saleStartAt ? formatDate(event.saleStartAt) : "Em breve"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                    Encerramento das vendas
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {event.saleEndAt ? formatDate(event.saleEndAt) : "Até o evento"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/65">
                    Selecionados
                  </p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {totalSelectedTickets} ingresso(s)
                  </p>
                  <p className="mt-1 text-sm text-white/80">
                    {formatMoney(totalSelectedAmount)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Data do evento
          </p>
          <p className="mt-3 text-lg font-black text-slate-950">{dateRange}</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Local
          </p>
          <p className="mt-3 text-lg font-black text-slate-950">
            {getLocationLabel(event.location)}
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Categoria
          </p>
          <p className="mt-3 text-lg font-black text-slate-950">
            {event.category || "Evento"}
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Capacidade
          </p>
          <p className="mt-3 text-lg font-black text-slate-950">
            {event.capacity ?? 0}
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
        <div className="space-y-6">
          {hasText(displayDescription) ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Sobre o evento
              </h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                {textLines(displayDescription).map((line, index) => (
                  <p key={`description-${index}`}>{line}</p>
                ))}
              </div>
            </section>
          ) : null}

          <SectionBlock title="Atrações" value={event.content?.attractions} />
          <SectionBlock title="Programação" value={event.content?.schedule} />
          <SectionBlock
            title="Informações importantes"
            value={event.content?.importantInfo}
          />
          <SectionBlock
            title="Como comprar"
            value={event.content?.purchaseInstructions}
          />

          {event.media?.sectorMapImageUrl || hasText(event.content?.sectorDetails) ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Setores e mapa
              </h2>

              {event.media?.sectorMapImageUrl ? (
                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50">
                  <img
                    src={event.media.sectorMapImageUrl}
                    alt="Mapa de setores"
                    className="w-full object-cover"
                  />
                </div>
              ) : null}

              {hasText(event.content?.sectorDetails) ? (
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                  {textLines(event.content?.sectorDetails).map((line, index) => (
                    <p key={`sector-${index}`}>{line}</p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {galleryImages.length > 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-slate-950">Galeria</h2>

                {galleryImages.length > 1 ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryIndex((current) =>
                          current === 0 ? galleryImages.length - 1 : current - 1,
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-700 hover:bg-slate-50"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setGalleryIndex((current) =>
                          current === galleryImages.length - 1 ? 0 : current + 1,
                        )
                      }
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-700 hover:bg-slate-50"
                    >
                      ›
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50">
                <img
                  src={galleryImages[galleryIndex]}
                  alt={`Galeria ${galleryIndex + 1}`}
                  className="h-[360px] w-full object-cover"
                />
              </div>

              {galleryImages.length > 1 ? (
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setGalleryIndex(index)}
                      className={`overflow-hidden rounded-2xl border ${
                        galleryIndex === index
                          ? "border-slate-900"
                          : "border-slate-200"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Miniatura ${index + 1}`}
                        className="h-20 w-28 object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {(hasText(event.policy?.refundPolicy) ||
            hasText(event.policy?.halfEntryPolicy) ||
            hasText(event.policy?.transferPolicy) ||
            hasText(event.policy?.entryRules) ||
            hasText(event.policy?.documentRules) ||
            hasText(event.policy?.termsNotes)) ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Política do evento
              </h2>

              <div className="mt-5 grid gap-5">
                <SectionBlock
                  title="Cancelamento e reembolso"
                  value={event.policy?.refundPolicy}
                />
                <SectionBlock
                  title="Meia-entrada"
                  value={event.policy?.halfEntryPolicy}
                />
                <SectionBlock
                  title="Transferência"
                  value={event.policy?.transferPolicy}
                />
                <SectionBlock
                  title="Regras de entrada"
                  value={event.policy?.entryRules}
                />
                <SectionBlock
                  title="Documentos"
                  value={event.policy?.documentRules}
                />
                <SectionBlock
                  title="Observações"
                  value={event.policy?.termsNotes}
                />
              </div>
            </section>
          ) : null}

          {(event.location?.venueName ||
            event.location?.addressLine1 ||
            event.location?.city ||
            event.location?.state ||
            hasText(event.location?.instructions)) ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Local</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Nome do local</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {event.location?.venueName || "Não informado"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Cidade / estado</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {[event.location?.city, event.location?.state]
                      .filter(Boolean)
                      .join(" - ") || "Não informado"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm text-slate-500">Endereço</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {getFullAddress(event.location)}
                  </p>
                </div>

                {hasText(event.location?.reference) ? (
                  <div className="rounded-2xl bg-slate-50 p-4 md:col-span-2">
                    <p className="text-sm text-slate-500">Referência</p>
                    <p className="mt-2 font-semibold text-slate-900">
                      {event.location?.reference}
                    </p>
                  </div>
                ) : null}
              </div>

              {hasText(event.location?.instructions) ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Instruções de acesso</p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    {textLines(event.location?.instructions).map((line, index) => (
                      <p key={`location-instructions-${index}`}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {event.location?.mapUrl ? (
                <a
                  href={event.location.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Abrir no mapa
                </a>
              ) : null}
            </section>
          ) : null}

          {(hasText(event.content?.producerDescription) ||
            hasText(event.organizer?.bio) ||
            event.organizer?.websiteUrl ||
            event.organizer?.instagramUrl ||
            event.organizer?.facebookUrl ||
            event.organizer?.youtubeUrl) ? (
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Sobre o produtor
              </h2>

              <div className="mt-5 flex items-start gap-4">
                {event.organizer?.logoUrl ? (
                  <img
                    src={event.organizer.logoUrl}
                    alt={organizerName}
                    className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-700">
                    {(organizerName[0] || "O").toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-lg font-black text-slate-950">
                    {organizerName}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {[event.organizer?.city, event.organizer?.state]
                      .filter(Boolean)
                      .join(" - ") || "Produtor do evento"}
                  </p>
                </div>
              </div>

              {hasText(event.content?.producerDescription || event.organizer?.bio) ? (
                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                  {textLines(
                    event.content?.producerDescription || event.organizer?.bio,
                  ).map((line, index) => (
                    <p key={`producer-${index}`}>{line}</p>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {event.organizer?.websiteUrl ? (
                  <a
                    href={event.organizer.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Site
                  </a>
                ) : null}

                {event.organizer?.instagramUrl ? (
                  <a
                    href={event.organizer.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Instagram
                  </a>
                ) : null}

                {event.organizer?.facebookUrl ? (
                  <a
                    href={event.organizer.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Facebook
                  </a>
                ) : null}

                {event.organizer?.youtubeUrl ? (
                  <a
                    href={event.organizer.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    YouTube
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {event.checkoutTitle || "Monte seu pedido"}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Ingressos
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {event.checkoutSubtitle ||
                  event.content?.purchaseInstructions ||
                  "Selecione seus lotes e continue para o checkout."}
              </p>
            </div>

            <div className="max-h-[460px] space-y-3 overflow-y-auto p-4">
              {visibleTicketTypes.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  Nenhum ingresso ativo disponível no momento.
                </div>
              ) : (
                visibleTicketTypes.map((ticket) => {
                  const selectedQuantity = selectedItems[ticket.id] || 0;
                  const availableQuantity =
                    typeof ticket.quantity === "number" ? ticket.quantity : 0;
                  const maxPerOrder =
                    typeof ticket.maxPerOrder === "number" && ticket.maxPerOrder > 0
                      ? ticket.maxPerOrder
                      : availableQuantity || 99;
                  const maxSelector = Math.max(
                    1,
                    Math.min(maxPerOrder, availableQuantity || maxPerOrder),
                  );

                  return (
                    <div
                      key={ticket.id}
                      className="rounded-[20px] border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {hasText(ticket.lotLabel) ? (
                            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                              {ticket.lotLabel}
                            </span>
                          ) : null}
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {availableQuantity} disp.
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-black text-slate-950">
                        {ticket.name || "Ingresso"}
                      </h3>

                      {hasText(ticket.description) ? (
                        <p className="mt-2 text-sm text-slate-600">
                          {ticket.description}
                        </p>
                      ) : null}

                      {hasText(ticket.benefitDescription) ? (
                        <p className="mt-2 text-sm font-medium text-emerald-700">
                          {ticket.benefitDescription}
                        </p>
                      ) : null}

                      <div className="mt-4 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-2xl font-black text-slate-950">
                            {formatMoney(ticket.price)}
                          </p>
                          {ticket.feeAmount ? (
                            <p className="mt-1 text-xs text-slate-500">
                              + {formatMoney(ticket.feeAmount)} de taxa
                            </p>
                          ) : null}
                        </div>

                        {ticket.salesEndAt ? (
                          <p className="text-right text-xs text-slate-500">
                            até {formatDate(ticket.salesEndAt)}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedQuantity(ticket, selectedQuantity - 1)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-700 hover:bg-slate-50"
                          >
                            -
                          </button>

                          <div className="flex h-10 min-w-[52px] items-center justify-center rounded-full border border-slate-200 px-3 text-sm font-semibold text-slate-900">
                            {selectedQuantity}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedQuantity(ticket, selectedQuantity + 1)
                            }
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-700 hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>

                        <select
                          value={selectedQuantity}
                          onChange={(e) =>
                            updateSelectedQuantity(ticket, Number(e.target.value))
                          }
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                        >
                          {Array.from({ length: maxSelector + 1 }).map((_, index) => (
                            <option key={`${ticket.id}-${index}`} value={index}>
                              {index}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-5">
              {selectedItemsDetailed.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Selecione um ou mais ingressos para continuar.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedItemsDetailed.map((item) => (
                    <div
                      key={item.ticket.id}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {item.ticket.name}
                        </p>
                        <p className="text-slate-500">
                          {item.quantity} x {formatMoney(item.unitPrice + item.feeAmount)}
                        </p>
                      </div>

                      <p className="font-semibold text-slate-900">
                        {formatMoney(item.total)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                <div>
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-2xl font-black text-slate-950">
                    {formatMoney(totalSelectedAmount)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleContinueCheckout}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Selecionados
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {totalSelectedTickets} ingresso(s)
            </p>
            <p className="text-lg font-black text-slate-950">
              {formatMoney(totalSelectedAmount)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinueCheckout}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continuar
          </button>
        </div>
      </div>
    </main>
  );
}