"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

const MAX_TICKETS_PER_PURCHASE = 4;

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

  if (Number.isNaN(numeric)) return `R$ ${value}`;

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

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toLowerCase();

  if (normalized.includes("published")) return "Publicado";
  if (normalized.includes("draft")) return "Rascunho";
  if (normalized.includes("canceled")) return "Cancelado";
  if (normalized.includes("active")) return "Ativo";
  if (normalized.includes("sold")) return "Esgotando";

  return status || "Disponível";
}

function getStatusClass(status?: string) {
  const normalized = String(status || "").toLowerCase();

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
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)) || []
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
          unitTotal,
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

  function goTo(path: string) {
    window.location.href = path;
  }

  function updateSelectedQuantity(ticketType: TicketTypeItem, quantity: number) {
    setSelectedItems((current) => {
      const minimum = Math.max(0, ticketType.minPerOrder ?? 0);

      const maximumByRule =
        typeof ticketType.maxPerOrder === "number" && ticketType.maxPerOrder > 0
          ? ticketType.maxPerOrder
          : Number.MAX_SAFE_INTEGER;

      const maximumByStock =
        typeof ticketType.quantity === "number" && ticketType.quantity > 0
          ? ticketType.quantity
          : Number.MAX_SAFE_INTEGER;

      const selectedInOtherTickets = Object.entries(current).reduce(
        (sum, [ticketId, selectedQuantity]) =>
          ticketId === ticketType.id ? sum : sum + selectedQuantity,
        0,
      );

      const remainingGlobalSlots = Math.max(
        0,
        MAX_TICKETS_PER_PURCHASE - selectedInOtherTickets,
      );

      const maximum = Math.min(
        maximumByRule,
        maximumByStock,
        remainingGlobalSlots,
      );

      const nextValue = Math.max(0, Math.min(quantity, maximum));
      const next = { ...current };

      if (nextValue <= 0) {
        delete next[ticketType.id];
        return next;
      }

      if (minimum > 1 && nextValue < minimum) {
        next[ticketType.id] = Math.min(minimum, maximum);
        return next;
      }

      next[ticketType.id] = nextValue;
      return next;
    });
  }

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

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    if (items.length === 0) {
      alert("Selecione pelo menos um ingresso");
      return;
    }

    if (totalItems > MAX_TICKETS_PER_PURCHASE) {
      alert("Cada compra pode ter no máximo 4 ingressos");
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

  const coverImage =
    event.media?.bannerImageUrl ||
    event.media?.coverImageUrl ||
    event.media?.thumbnailUrl ||
    event.media?.mobileBannerUrl ||
    undefined;

  const displaySummary =
    event.content?.summary ||
    event.shortDescription ||
    event.description ||
    "Confira os detalhes do evento e escolha seu ingresso.";

  const displayDescription =
    event.content?.fullDescription || event.description || "";

  const dateText = formatDate(event.startDate || event.eventDate);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 pb-32 xl:pb-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3">
              {event.highlightTag ? (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  {event.highlightTag}
                </span>
              ) : null}

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClass(
                  event.status,
                )}`}
              >
                {getStatusLabel(event.status)}
              </span>

              {event.policy?.ageRating ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {event.policy.ageRating}
                </span>
              ) : null}
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-950 md:text-5xl">
              {event.name || "Evento sem nome"}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
              {displaySummary}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Quando
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {dateText}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Local
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {getLocationLabel(event.location)}
                </p>
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Organizador
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {organizerName}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 p-6 xl:border-l xl:border-t-0">
            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={event.name || "Evento"}
                  className="h-[260px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[260px] items-center justify-center bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 px-6 text-center text-3xl font-black text-white">
                  {event.name || "Evento"}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/customer/events")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleContinueCheckout}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continuar compra
              </button>

              {event.location?.mapUrl ? (
                <a
                  href={event.location.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ver mapa
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
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
              <h2 className="text-2xl font-black text-slate-950">Fotos do evento</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {galleryImages.slice(0, 4).map((image, index) => (
                  <div
                    key={`${image}-${index}`}
                    className="overflow-hidden rounded-[24px] border border-slate-100 bg-slate-50"
                  >
                    <img
                      src={image}
                      alt={`Foto ${index + 1}`}
                      className="h-[260px] w-full object-cover"
                    />
                  </div>
                ))}
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
              </div>

              {hasText(event.location?.instructions) ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Instruções de acesso</p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    {textLines(event.location?.instructions).map((line, index) => (
                      <p key={`location-${index}`}>{line}</p>
                    ))}
                  </div>
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

              <div className="mt-5 space-y-5">
                {hasText(event.policy?.refundPolicy) ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Cancelamento e reembolso
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                      {textLines(event.policy?.refundPolicy).map((line, index) => (
                        <p key={`refund-${index}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasText(event.policy?.halfEntryPolicy) ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Meia-entrada
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                      {textLines(event.policy?.halfEntryPolicy).map((line, index) => (
                        <p key={`half-${index}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasText(event.policy?.transferPolicy) ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Transferência
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                      {textLines(event.policy?.transferPolicy).map((line, index) => (
                        <p key={`transfer-${index}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hasText(event.policy?.entryRules) ? (
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Regras de entrada
                    </p>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-slate-600">
                      {textLines(event.policy?.entryRules).map((line, index) => (
                        <p key={`entry-${index}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Escolha seu setor e lote
              </p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">
                Ingressos
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Garanta seus ingressos antes da virada de lote.
              </p>
            </div>

            <div className="px-4 py-4">
              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {visibleTicketTypes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    Nenhum ingresso disponível no momento.
                  </div>
                ) : (
                  visibleTicketTypes.map((ticket) => {
                    const selectedQuantity = selectedItems[ticket.id] || 0;
                    const availableQuantity =
                      typeof ticket.quantity === "number" ? ticket.quantity : 0;

                    const maximumByRule =
                      typeof ticket.maxPerOrder === "number" &&
                      ticket.maxPerOrder > 0
                        ? ticket.maxPerOrder
                        : Number.MAX_SAFE_INTEGER;

                    const selectedInOtherTickets =
                      totalSelectedTickets - selectedQuantity;

                    const remainingGlobalSlots = Math.max(
                      0,
                      MAX_TICKETS_PER_PURCHASE - selectedInOtherTickets,
                    );

                    const maxSelector = Math.max(
                      0,
                      Math.min(
                        maximumByRule,
                        availableQuantity || Number.MAX_SAFE_INTEGER,
                        remainingGlobalSlots,
                      ),
                    );

                    const unitPrice = toNumber(ticket.price);
                    const feeAmount = toNumber(ticket.feeAmount);
                    const unitTotal = unitPrice + feeAmount;
                    const isSoldOut = availableQuantity <= 0;
                    const disablePlus =
                      isSoldOut || selectedQuantity >= maxSelector;
                    const disableMinus = selectedQuantity <= 0;

                    return (
                      <div
                        key={ticket.id}
                        className="rounded-[22px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {ticket.lotLabel ? (
                                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                                  {ticket.lotLabel}
                                </span>
                              ) : null}

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusClass(
                                  ticket.status,
                                )}`}
                              >
                                {getStatusLabel(ticket.status)}
                              </span>

                              <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                {availableQuantity} disp.
                              </span>
                            </div>

                            <h3 className="mt-3 text-xl font-black text-slate-950">
                              {ticket.name || "Ingresso"}
                            </h3>

                            {ticket.description ? (
                              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                                {ticket.description}
                              </p>
                            ) : null}

                            {ticket.benefitDescription ? (
                              <p className="mt-2 text-xs font-medium text-emerald-700">
                                {ticket.benefitDescription}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-3xl font-black text-slate-950">
                              {formatMoney(unitTotal)}
                            </p>
                            {feeAmount > 0 ? (
                              <p className="mt-1 text-xs text-slate-400">
                                + {formatMoney(feeAmount)} taxa
                              </p>
                            ) : null}
                          </div>

                          {ticket.salesEndAt ? (
                            <p className="text-right text-[11px] text-slate-400">
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
                              disabled={disableMinus}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-base font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              -
                            </button>

                            <div className="min-w-[44px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-900">
                              {selectedQuantity}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                updateSelectedQuantity(ticket, selectedQuantity + 1)
                              }
                              disabled={disablePlus}
                              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-base font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>

                          <div className="text-right text-[11px] text-slate-500">
                            {isSoldOut ? (
                              <span className="font-semibold text-rose-600">
                                Esgotado
                              </span>
                            ) : maxSelector <= 0 && selectedQuantity <= 0 ? (
                              <span className="font-semibold text-amber-700">
                                Limite atingido
                              </span>
                            ) : (
                              <span>
                                máximo agora:{" "}
                                <strong className="text-slate-900">
                                  {maxSelector}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-3">
                  {selectedItemsDetailed.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum ingresso selecionado ainda.
                    </p>
                  ) : (
                    selectedItemsDetailed.map((item) => (
                      <div
                        key={`summary-${item.ticket.id}`}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.ticket.name || "Ingresso"}
                          </p>
                          <p className="text-slate-500">
                            {item.quantity} x {formatMoney(item.unitTotal)}
                          </p>
                        </div>

                        <p className="font-semibold text-slate-900">
                          {formatMoney(item.total)}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Ingressos</span>
                    <span className="font-semibold text-slate-900">
                      {totalSelectedTickets}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(totalSelectedAmount)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-base font-semibold text-slate-700">
                      Total
                    </span>
                    <span className="text-3xl font-black text-slate-950">
                      {formatMoney(totalSelectedAmount)}
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 rounded-2xl border p-4 text-sm ${
                  totalSelectedTickets === 0
                    ? "border-slate-200 bg-slate-50 text-slate-700"
                    : totalSelectedTickets === MAX_TICKETS_PER_PURCHASE
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700"
                }`}
              >
                <p className="font-semibold">Validação da compra</p>
                <p className="mt-2">
                  {totalSelectedTickets === 0
                    ? "Selecione pelo menos 1 ingresso."
                    : totalSelectedTickets === MAX_TICKETS_PER_PURCHASE
                      ? "Você atingiu o limite máximo de 4 ingressos."
                      : `Você ainda pode selecionar ${
                          MAX_TICKETS_PER_PURCHASE - totalSelectedTickets
                        } ingresso(s).`}
                </p>
              </div>

              <button
                type="button"
                onClick={handleContinueCheckout}
                disabled={totalSelectedTickets === 0}
                className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}