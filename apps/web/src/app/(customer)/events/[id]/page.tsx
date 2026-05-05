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

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number) {
  const numeric = toNumber(value);

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numeric);
}

function formatDate(value?: string | null) {
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

function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeOnly(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PUBLISHED") return "Publicado";
  if (normalized === "DRAFT") return "Rascunho";
  if (normalized === "CANCELED") return "Cancelado";
  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "INACTIVE") return "Indisponível";
  if (normalized === "SOLD_OUT") return "Esgotado";
  if (normalized.includes("SOLD")) return "Esgotando";

  return status || "Disponível";
}

function getStatusClass(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "PUBLISHED" ||
    normalized === "ACTIVE" ||
    normalized === "AVAILABLE"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "DRAFT" || normalized === "PAUSED") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    normalized === "CANCELED" ||
    normalized === "INACTIVE" ||
    normalized === "SOLD_OUT"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-sky-200 bg-sky-50 text-sky-700";
}

function getLocationLabel(location?: EventLocation | null) {
  if (!location) return "Local a confirmar";

  if (String(location.mode || "").toUpperCase() === "ONLINE") {
    return "Evento online";
  }

  const cityState = [location.city, location.state].filter(Boolean).join(" - ");

  return [location.venueName, cityState].filter(Boolean).join(", ") ||
    "Local a confirmar";
}

function getFullAddress(location?: EventLocation | null) {
  if (!location) return "Endereço não informado";

  if (String(location.mode || "").toUpperCase() === "ONLINE") {
    return "O acesso será enviado ao participante pelos canais do evento.";
  }

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

function getOrganizerName(event?: EventDetail | null) {
  return (
    event?.organizer?.tradeName ||
    event?.organizer?.legalName ||
    "Organizador parceiro"
  );
}

function getCoverImage(event?: EventDetail | null) {
  if (!event) return "";

  return (
    event.media?.bannerImageUrl ||
    event.media?.coverImageUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.thumbnailUrl ||
    event.media?.gallery?.[0] ||
    ""
  );
}

function getMinimumPrice(ticketTypes: TicketTypeItem[]) {
  const prices = ticketTypes
    .map((ticket) => toNumber(ticket.price) + toNumber(ticket.feeAmount))
    .filter((price) => price > 0);

  if (prices.length === 0) return null;

  return Math.min(...prices);
}

function getTicketAvailableQuantity(ticket: TicketTypeItem) {
  if (typeof ticket.quantity === "number") return Math.max(0, ticket.quantity);

  return Number.MAX_SAFE_INTEGER;
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
    <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-[22px] font-black text-slate-950">{title}</h2>

      <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  );
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
    <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
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
        const response = await fetch(`http://localhost:3001/v1/events/${eventId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          alert(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar evento",
          );
          window.location.href = "/events";
          return;
        }

        setEvent(data);
      } catch (error) {
        console.error("CUSTOMER EVENT DETAIL ERROR:", error);
        alert("Erro ao conectar com a API");
        window.location.href = "/events";
      } finally {
        setLoading(false);
      }
    }

    if (!eventId) {
      window.location.href = "/events";
      return;
    }

    loadEvent();
  }, [eventId]);

  const visibleTicketTypes = useMemo(() => {
    return (
      event?.ticketTypes
        ?.filter((ticket) => ticket.status !== "INACTIVE" && !ticket.isHidden)
        .sort((first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0)) || []
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

  const totalSelectedTickets = useMemo(() => {
    return selectedItemsDetailed.reduce((sum, item) => sum + item.quantity, 0);
  }, [selectedItemsDetailed]);

  const totalSelectedAmount = useMemo(() => {
    return selectedItemsDetailed.reduce((sum, item) => sum + item.total, 0);
  }, [selectedItemsDetailed]);

  const minimumPrice = useMemo(() => {
    return getMinimumPrice(visibleTicketTypes);
  }, [visibleTicketTypes]);

  function goTo(path: string) {
    window.location.href = path;
  }

  function updateSelectedQuantity(ticketType: TicketTypeItem, quantity: number) {
    setSelectedItems((current) => {
      const maximumByRule =
        typeof ticketType.maxPerOrder === "number" && ticketType.maxPerOrder > 0
          ? ticketType.maxPerOrder
          : Number.MAX_SAFE_INTEGER;

      const maximumByStock = getTicketAvailableQuantity(ticketType);

      const selectedInOtherTickets = Object.entries(current).reduce(
        (sum, [ticketId, selectedQuantity]) =>
          ticketId === ticketType.id ? sum : sum + selectedQuantity,
        0,
      );

      const remainingGlobalSlots = Math.max(
        0,
        MAX_TICKETS_PER_PURCHASE - selectedInOtherTickets,
      );

      const maximum = Math.min(maximumByRule, maximumByStock, remainingGlobalSlots);
      const nextValue = Math.max(0, Math.min(quantity, maximum));
      const next = { ...current };

      if (nextValue <= 0) {
        delete next[ticketType.id];
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
    window.location.href = `/checkout?eventId=${event.id}&items=${encodedItems}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              Carregando evento...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1180px] px-4 py-10">
          <div className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              Evento não encontrado.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const coverImage = getCoverImage(event);
  const organizerName = getOrganizerName(event);
  const eventDate = event.startDate || event.eventDate;
  const eventSummary =
    event.content?.summary ||
    event.shortDescription ||
    event.description ||
    "Confira os detalhes do evento, escolha seus ingressos e finalize sua compra.";
  const eventDescription = event.content?.fullDescription || event.description || "";
  const locationLabel = getLocationLabel(event.location);

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <div className="mx-auto max-w-[1180px] px-4 pb-28 pt-7 lg:pb-12">
        <section className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
          <button
            type="button"
            onClick={() => goTo("/dashboard")}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Página inicial
          </button>
          <span>&gt;</span>
          <button
            type="button"
            onClick={() => goTo("/events")}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Eventos
          </button>
          <span>&gt;</span>
          <span className="font-semibold text-slate-700">
            {event.name || "Detalhes"}
          </span>
        </section>

        <section className="overflow-hidden rounded-[26px] bg-white shadow-sm">
          <div className="relative h-[280px] bg-slate-900 md:h-[360px]">
            {coverImage ? (
              <img
                src={coverImage}
                alt={event.name || "Evento"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-sky-600 via-blue-700 to-indigo-900" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {event.category || event.highlightTag ? (
                  <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-slate-800">
                    {event.highlightTag || event.category}
                  </span>
                ) : null}

                <span
                  className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClass(
                    event.status,
                  )}`}
                >
                  {getStatusLabel(event.status)}
                </span>

                {event.policy?.ageRating ? (
                  <span className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-black text-slate-800">
                    {event.policy.ageRating}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 max-w-4xl text-[34px] font-black leading-tight md:text-[52px]">
                {event.name || "Evento sem nome"}
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/85 md:text-base">
                {eventSummary}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard
            label="Data"
            value={formatDateOnly(eventDate)}
            detail={formatTimeOnly(eventDate)}
          />
          <InfoCard label="Local" value={locationLabel} detail={getFullAddress(event.location)} />
          <InfoCard
            label="Ingressos"
            value={
              minimumPrice === null
                ? "Consultar valores"
                : `A partir de ${formatMoney(minimumPrice)}`
            }
            detail={`${visibleTicketTypes.length} lote(s) disponível(is)`}
          />
        </section>

        <section className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            {hasText(eventDescription) ? (
              <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-[22px] font-black text-slate-950">
                  Sobre o evento
                </h2>

                <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
                  {textLines(eventDescription).map((line, index) => (
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
              <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-[22px] font-black text-slate-950">
                  Setores e mapa
                </h2>

                {event.media?.sectorMapImageUrl ? (
                  <div className="mt-5 overflow-hidden rounded-[18px] border border-slate-100 bg-slate-50">
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

            {galleryImages.length > 1 ? (
              <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-[22px] font-black text-slate-950">
                  Fotos do evento
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {galleryImages.slice(0, 4).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="overflow-hidden rounded-[18px] border border-slate-100 bg-slate-50"
                    >
                      <img
                        src={image}
                        alt={`Foto ${index + 1}`}
                        className="h-[220px] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[22px] font-black text-slate-950">Local</h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[16px] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Nome do local
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    {event.location?.venueName || "Não informado"}
                  </p>
                </div>

                <div className="rounded-[16px] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Cidade / estado
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    {[event.location?.city, event.location?.state]
                      .filter(Boolean)
                      .join(" - ") || "Não informado"}
                  </p>
                </div>

                <div className="rounded-[16px] bg-slate-50 p-4 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Endereço
                  </p>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    {getFullAddress(event.location)}
                  </p>
                </div>
              </div>

              {hasText(event.location?.instructions) ? (
                <div className="mt-5 rounded-[16px] bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Instruções de acesso
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-7 text-slate-600">
                    {textLines(event.location?.instructions).map((line, index) => (
                      <p key={`location-${index}`}>{line}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {event.location?.mapUrl ? (
                <a
                  href={event.location.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 hover:bg-sky-100"
                >
                  Abrir mapa
                </a>
              ) : null}
            </section>

            {(hasText(event.policy?.refundPolicy) ||
              hasText(event.policy?.halfEntryPolicy) ||
              hasText(event.policy?.transferPolicy) ||
              hasText(event.policy?.entryRules) ||
              hasText(event.policy?.documentRules) ||
              hasText(event.policy?.termsNotes)) ? (
              <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-[22px] font-black text-slate-950">
                  Política do evento
                </h2>

                <div className="mt-5 space-y-4">
                  {hasText(event.policy?.refundPolicy) ? (
                    <div className="rounded-[16px] bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">
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
                    <div className="rounded-[16px] bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">
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
                    <div className="rounded-[16px] bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">
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
                    <div className="rounded-[16px] bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">
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

            <section className="rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-[22px] font-black text-slate-950">
                Organizador
              </h2>

              <div className="mt-5 flex items-center gap-4">
                {event.organizer?.logoUrl ? (
                  <img
                    src={event.organizer.logoUrl}
                    alt={organizerName}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-xl font-black text-sky-600">
                    {organizerName.slice(0, 1).toUpperCase()}
                  </div>
                )}

                <div>
                  <p className="text-lg font-black text-slate-950">
                    {organizerName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {[event.organizer?.city, event.organizer?.state]
                      .filter(Boolean)
                      .join(" - ") || "Produtor do evento"}
                  </p>
                </div>
              </div>

              {hasText(event.organizer?.bio) ? (
                <p className="mt-5 text-sm leading-7 text-slate-600">
                  {event.organizer?.bio}
                </p>
              ) : null}
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Escolha seus ingressos
                </p>
                <h2 className="mt-2 text-[28px] font-black text-slate-950">
                  Ingressos
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Selecione até {MAX_TICKETS_PER_PURCHASE} ingresso(s) por compra.
                </p>
              </div>

              <div className="max-h-[470px] space-y-3 overflow-y-auto p-4">
                {visibleTicketTypes.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    Nenhum ingresso disponível no momento.
                  </div>
                ) : (
                  visibleTicketTypes.map((ticket) => {
                    const selectedQuantity = selectedItems[ticket.id] || 0;
                    const availableQuantity = getTicketAvailableQuantity(ticket);
                    const unitPrice = toNumber(ticket.price);
                    const feeAmount = toNumber(ticket.feeAmount);
                    const unitTotal = unitPrice + feeAmount;
                    const isSoldOut = availableQuantity <= 0;

                    const selectedInOtherTickets =
                      totalSelectedTickets - selectedQuantity;

                    const maximumByRule =
                      typeof ticket.maxPerOrder === "number" && ticket.maxPerOrder > 0
                        ? ticket.maxPerOrder
                        : Number.MAX_SAFE_INTEGER;

                    const remainingGlobalSlots = Math.max(
                      0,
                      MAX_TICKETS_PER_PURCHASE - selectedInOtherTickets,
                    );

                    const maximumSelectable = Math.min(
                      maximumByRule,
                      availableQuantity,
                      remainingGlobalSlots,
                    );

                    const disableMinus = selectedQuantity <= 0;
                    const disablePlus = isSoldOut || selectedQuantity >= maximumSelectable;

                    return (
                      <div
                        key={ticket.id}
                        className="rounded-[18px] border border-slate-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {ticket.lotLabel ? (
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                              {ticket.lotLabel}
                            </span>
                          ) : null}

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${getStatusClass(
                              ticket.status,
                            )}`}
                          >
                            {getStatusLabel(ticket.status)}
                          </span>

                          {availableQuantity !== Number.MAX_SAFE_INTEGER ? (
                            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                              {availableQuantity} disp.
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 text-lg font-black text-slate-950">
                          {ticket.name || "Ingresso"}
                        </h3>

                        {ticket.description ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                            {ticket.description}
                          </p>
                        ) : null}

                        {ticket.benefitDescription ? (
                          <p className="mt-2 text-xs font-bold text-emerald-700">
                            {ticket.benefitDescription}
                          </p>
                        ) : null}

                        <div className="mt-4 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-2xl font-black text-slate-950">
                              {unitTotal === 0 ? "Grátis" : formatMoney(unitTotal)}
                            </p>
                            {feeAmount > 0 ? (
                              <p className="mt-1 text-xs text-slate-400">
                                inclui {formatMoney(feeAmount)} de taxa
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                            <button
                              type="button"
                              disabled={disableMinus}
                              onClick={() =>
                                updateSelectedQuantity(ticket, selectedQuantity - 1)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-black text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              −
                            </button>

                            <span className="w-10 text-center text-sm font-black text-slate-950">
                              {selectedQuantity}
                            </span>

                            <button
                              type="button"
                              disabled={disablePlus}
                              onClick={() =>
                                updateSelectedQuantity(ticket, selectedQuantity + 1)
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {ticket.salesEndAt ? (
                          <p className="mt-3 text-xs text-slate-400">
                            Vendas até {formatDate(ticket.salesEndAt)}
                          </p>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-5">
                <div className="space-y-2">
                  {selectedItemsDetailed.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nenhum ingresso selecionado ainda.
                    </p>
                  ) : (
                    selectedItemsDetailed.map((item) => (
                      <div
                        key={item.ticket.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="line-clamp-1 text-slate-600">
                          {item.quantity}x {item.ticket.name}
                        </span>
                        <span className="font-bold text-slate-950">
                          {formatMoney(item.total)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Total
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {totalSelectedTickets} ingresso(s)
                    </p>
                  </div>

                  <p className="text-2xl font-black text-slate-950">
                    {formatMoney(totalSelectedAmount)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleContinueCheckout}
                  disabled={totalSelectedTickets === 0}
                  className="mt-5 w-full rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continuar compra
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/events")}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Voltar para eventos
                </button>
              </div>
            </div>
          </aside>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white p-4 shadow-2xl lg:hidden">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              Total
            </p>
            <p className="text-lg font-black text-slate-950">
              {formatMoney(totalSelectedAmount)}
            </p>
            <p className="text-xs text-slate-500">
              {totalSelectedTickets} ingresso(s)
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinueCheckout}
            disabled={totalSelectedTickets === 0}
            className="rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Comprar
          </button>
        </div>
      </div>
    </main>
  );
}