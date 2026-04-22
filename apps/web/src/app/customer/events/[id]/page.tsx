"use client";

import { useEffect, useMemo, useState } from "react";

type TicketTypeItem = {
  id: string;
  name?: string;
  lotLabel?: string;
  description?: string;
  price?: string | number;
  quantity?: number;
  status?: string;
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
  organizer?: {
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
    month: "2-digit",
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

function buildDateRange(start?: string, end?: string) {
  if (!start && !end) return "-";
  if (start && !end) return formatDate(start);
  if (!start && end) return formatDate(end);

  return `${formatDate(start)} até ${formatDate(end)}`;
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function getHeroImage(event: EventDetail | null) {
  return (
    event?.media?.bannerImageUrl ||
    event?.media?.coverImageUrl ||
    event?.media?.mobileBannerUrl ||
    event?.media?.thumbnailUrl ||
    undefined
  );
}

function getLocationLabel(location?: EventLocation | null) {
  if (!location) return "-";

  const pieces = [
    location.venueName,
    [location.city, location.state].filter(Boolean).join(" - "),
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(", ") : "-";
}

function TextBlock({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  if (!hasText(value)) return null;

  const lines = String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      <div className="mt-5 space-y-3 text-sm leading-7 text-gray-700">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}

export default function CustomerEventDetailPage() {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  const eventId = useMemo(() => {
    if (typeof window === "undefined") return "";

    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1] || "";
  }, []);

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

  function goTo(path: string) {
    window.location.href = path;
  }

  const visibleTicketTypes =
    event?.ticketTypes?.filter(
      (ticket) => ticket.status === "ACTIVE" && !ticket.isHidden,
    ) || [];

  function updateSelectedQuantity(ticketType: TicketTypeItem, nextQuantity: number) {
    const maxAllowed =
      typeof ticketType.quantity === "number" && ticketType.quantity > 0
        ? ticketType.quantity
        : undefined;

    const normalized = Math.max(0, nextQuantity);
    const finalQuantity =
      maxAllowed !== undefined ? Math.min(normalized, maxAllowed) : normalized;

    setSelectedItems((prev) => {
      const copy = { ...prev };

      if (finalQuantity <= 0) {
        delete copy[ticketType.id];
        return copy;
      }

      copy[ticketType.id] = finalQuantity;
      return copy;
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

    if (items.length === 0) {
      alert("Selecione pelo menos um ingresso");
      return;
    }

    const encodedItems = encodeURIComponent(JSON.stringify(items));
    window.location.href = `/customer/checkout?eventId=${event.id}&items=${encodedItems}`;
  }

  const selectedItemsDetailed = useMemo(() => {
    return visibleTicketTypes
      .filter((ticket) => (selectedItems[ticket.id] || 0) > 0)
      .map((ticket) => {
        const quantity = selectedItems[ticket.id] || 0;
        const unitPrice = toNumber(ticket.price);
        const total = unitPrice * quantity;

        return {
          ticket,
          quantity,
          unitPrice,
          total,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
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
          <div className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-medium text-gray-800">
              Evento não encontrado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const heroImage = getHeroImage(event);
  const organizerName =
    event.organizer?.tradeName || event.organizer?.legalName || "Organizador";
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
    <div className="mx-auto max-w-7xl px-4 py-8 pb-28 xl:pb-8">
      <section className="relative overflow-hidden rounded-[34px] bg-slate-950 text-white shadow-sm">
        {heroImage ? (
          <div className="absolute inset-0">
            <img
              src={heroImage}
              alt={event.name || "Evento"}
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div
          className={`absolute inset-0 ${
            heroImage
              ? "bg-gradient-to-r from-black/85 via-black/70 to-black/45"
              : "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-700"
          }`}
        />

        <div className="relative z-10 grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {hasText(event.content?.headline) ? (
                  <span className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] backdrop-blur">
                    {event.content?.headline}
                  </span>
                ) : null}

                {hasText(event.highlightTag) ? (
                  <span className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white shadow-sm">
                    {event.highlightTag}
                  </span>
                ) : null}

                {hasText(event.policy?.ageRating) ? (
                  <span className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold backdrop-blur">
                    {event.policy?.ageRating}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                {event.name || "Evento sem nome"}
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
                {displaySummary}
              </p>

              <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/85">
                <span>📅 {dateRange}</span>
                <span>📍 {getLocationLabel(event.location)}</span>
                <span>🏷️ {event.category || event.status || "Evento"}</span>
                <span>👤 {organizerName}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/customer/events")}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
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

          <div className="flex items-start justify-end">
            <div className="w-full max-w-[360px] overflow-hidden rounded-[28px] border border-white/15 bg-white/10 p-3 backdrop-blur">
              <div className="overflow-hidden rounded-[22px] bg-black/20">
                {event.media?.coverImageUrl || event.media?.thumbnailUrl ? (
                  <img
                    src={event.media?.coverImageUrl || event.media?.thumbnailUrl}
                    alt={event.name || "Evento"}
                    className="h-[240px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[240px] items-center justify-center bg-gradient-to-br from-fuchsia-500/70 via-purple-500/70 to-indigo-600/70 px-6 text-center text-2xl font-black text-white">
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
                    Encerramento
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

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Data do evento</p>
          <h2 className="mt-3 text-xl font-bold text-gray-900">{dateRange}</h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Local</p>
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            {getLocationLabel(event.location)}
          </h2>
        </div>

        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Capacidade</p>
          <h2 className="mt-3 text-xl font-bold text-gray-900">
            {event.capacity ?? 0}
          </h2>
        </div>
      </section>

      <section className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-6">
          {hasText(displayDescription) ? (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Descrição do evento
              </h2>
              <div className="mt-5 space-y-3 text-sm leading-7 text-gray-700">
                {String(displayDescription)
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, index) => (
                    <p key={`description-${index}`}>{line}</p>
                  ))}
              </div>
            </section>
          ) : null}

          <TextBlock title="Atrações" value={event.content?.attractions} />
          <TextBlock title="Programação" value={event.content?.schedule} />
          <TextBlock
            title="Informações importantes"
            value={event.content?.importantInfo}
          />

          {event.media?.sectorMapImageUrl || hasText(event.content?.sectorDetails) ? (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Setores e mapa</h2>

              {event.media?.sectorMapImageUrl ? (
                <div className="mt-5 overflow-hidden rounded-[24px] border border-gray-100 bg-gray-50">
                  <img
                    src={event.media.sectorMapImageUrl}
                    alt="Mapa de setores"
                    className="w-full object-cover"
                  />
                </div>
              ) : null}

              {hasText(event.content?.sectorDetails) ? (
                <div className="mt-5 space-y-3 text-sm leading-7 text-gray-700">
                  {String(event.content?.sectorDetails)
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, index) => (
                      <p key={`sector-${index}`}>{line}</p>
                    ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {event.media?.gallery && event.media.gallery.length > 0 ? (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Galeria</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {event.media.gallery.map((imageUrl, index) => (
                  <div
                    key={`${imageUrl}-${index}`}
                    className="overflow-hidden rounded-[24px] border border-gray-100 bg-gray-50"
                  >
                    <img
                      src={imageUrl}
                      alt={`Galeria ${index + 1}`}
                      className="h-[240px] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {(hasText(event.policy?.refundPolicy) ||
            hasText(event.policy?.halfEntryPolicy) ||
            hasText(event.policy?.transferPolicy) ||
            hasText(event.policy?.entryRules) ||
            hasText(event.policy?.documentRules) ||
            hasText(event.policy?.termsNotes)) ? (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">
                Política do evento
              </h2>

              <div className="mt-5 grid gap-4">
                <TextBlock title="Cancelamento" value={event.policy?.refundPolicy} />
                <TextBlock
                  title="Meia-entrada"
                  value={event.policy?.halfEntryPolicy}
                />
                <TextBlock
                  title="Transferência"
                  value={event.policy?.transferPolicy}
                />
                <TextBlock title="Regras de entrada" value={event.policy?.entryRules} />
                <TextBlock
                  title="Regras de documentos"
                  value={event.policy?.documentRules}
                />
                <TextBlock title="Observações" value={event.policy?.termsNotes} />
              </div>
            </section>
          ) : null}

          {(event.location?.venueName ||
            event.location?.addressLine1 ||
            event.location?.city ||
            event.location?.state ||
            hasText(event.location?.instructions)) ? (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Local</h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Nome do local</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {event.location?.venueName || "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Endereço</p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {[
                      event.location?.addressLine1,
                      event.location?.addressLine2,
                      event.location?.neighborhood,
                      event.location?.city,
                      event.location?.state,
                      event.location?.zipCode,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </p>
                </div>

                {hasText(event.location?.reference) ? (
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Referência</p>
                    <p className="mt-1 font-semibold text-gray-900">
                      {event.location?.reference}
                    </p>
                  </div>
                ) : null}

                {hasText(event.location?.instructions) ? (
                  <div className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Instruções</p>
                    <div className="mt-2 space-y-2 text-sm leading-7 text-gray-700">
                      {String(event.location?.instructions)
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, index) => (
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
                    className="inline-flex w-fit rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    Ver no mapa
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          {(hasText(event.content?.producerDescription) ||
            hasText(event.organizer?.bio) ||
            event.organizer?.websiteUrl ||
            event.organizer?.instagramUrl ||
            event.organizer?.facebookUrl ||
            event.organizer?.youtubeUrl) ? (
            <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900">Sobre o produtor</h2>

              <div className="mt-5 flex items-start gap-4">
                {event.organizer?.logoUrl ? (
                  <img
                    src={event.organizer.logoUrl}
                    alt={organizerName}
                    className="h-16 w-16 rounded-2xl border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-xl font-black text-gray-700">
                    {(organizerName[0] || "O").toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-lg font-bold text-gray-900">{organizerName}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {[event.organizer?.city, event.organizer?.state]
                      .filter(Boolean)
                      .join(" - ") || "Produtor do evento"}
                  </p>
                </div>
              </div>

              {hasText(event.content?.producerDescription || event.organizer?.bio) ? (
                <div className="mt-5 space-y-3 text-sm leading-7 text-gray-700">
                  {String(
                    event.content?.producerDescription || event.organizer?.bio,
                  )
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line, index) => (
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
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Site
                  </a>
                ) : null}

                {event.organizer?.instagramUrl ? (
                  <a
                    href={event.organizer.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Instagram
                  </a>
                ) : null}

                {event.organizer?.facebookUrl ? (
                  <a
                    href={event.organizer.facebookUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Facebook
                  </a>
                ) : null}

                {event.organizer?.youtubeUrl ? (
                  <a
                    href={event.organizer.youtubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    YouTube
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="overflow-hidden rounded-[30px] border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500">
                {event.checkoutTitle || "Monte seu pedido"}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-gray-900">
                Ingressos
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                {event.checkoutSubtitle ||
                  event.content?.purchaseInstructions ||
                  "Selecione vários setores e lotes no mesmo pedido."}
              </p>
            </div>

            <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">
              {visibleTicketTypes.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-500">
                  Nenhum ingresso ativo disponível no momento.
                </div>
              ) : (
                visibleTicketTypes.map((ticket) => {
                  const selectedQuantity = selectedItems[ticket.id] || 0;
                  const availableQuantity =
                    typeof ticket.quantity === "number" ? ticket.quantity : 0;

                  return (
                    <div
                      key={ticket.id}
                      className="rounded-[20px] border border-gray-200 bg-white p-4"
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

                      <h3 className="mt-3 text-lg font-bold text-gray-900">
                        {ticket.name || "Ingresso"}
                      </h3>

                      {hasText(ticket.description) ? (
                        <p className="mt-1 text-sm text-gray-600">
                          {ticket.description}
                        </p>
                      ) : null}

                      <div className="mt-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-2xl font-black text-gray-900">
                            {formatMoney(ticket.price)}
                          </p>
                          {ticket.feeAmount ? (
                            <p className="mt-1 text-xs text-gray-500">
                              + {formatMoney(ticket.feeAmount)} de taxa
                            </p>
                          ) : null}
                        </div>

                        {ticket.salesEndAt ? (
                          <p className="text-right text-xs text-gray-500">
                            até {formatDate(ticket.salesEndAt)}
                          </p>
                        ) : null}
                      </div>

                      {hasText(ticket.benefitDescription) ? (
                        <p className="mt-2 text-xs text-gray-500">
                          {ticket.benefitDescription}
                        </p>
                      ) : null}

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedQuantity(ticket, selectedQuantity - 1)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-base font-bold text-gray-700 hover:bg-gray-50"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={availableQuantity || undefined}
                            value={selectedQuantity}
                            onChange={(e) =>
                              updateSelectedQuantity(
                                ticket,
                                Number(e.target.value || 0),
                              )
                            }
                            className="w-16 rounded-2xl border border-gray-300 bg-white px-3 py-2 text-center outline-none focus:border-sky-500"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateSelectedQuantity(ticket, selectedQuantity + 1)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 bg-white text-base font-bold text-gray-700 hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                            Total
                          </p>
                          <p className="text-lg font-black text-gray-900">
                            {formatMoney(toNumber(ticket.price) * selectedQuantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden border-t border-gray-100 bg-white p-4 xl:block">
              <div className="mb-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-500">Selecionados</p>
                  <p className="text-lg font-bold text-gray-900">
                    {totalSelectedTickets} ingresso(s)
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-gray-500">Subtotal</p>
                  <p className="text-xl font-black text-gray-900">
                    {formatMoney(totalSelectedAmount)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueCheckout}
                className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Continuar compra
              </button>
            </div>
          </div>
        </aside>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-4 backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-gray-500">{totalSelectedTickets} ingresso(s)</p>
            <p className="text-xl font-black text-gray-900">
              {formatMoney(totalSelectedAmount)}
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinueCheckout}
            className="shrink-0 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}