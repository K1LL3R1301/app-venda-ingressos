"use client";

import { useEffect, useMemo, useState } from "react";

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  sectorMapImageUrl?: string;
  gallery?: string[];
};

type EventContent = {
  headline?: string;
  summary?: string;
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
  latitude?: number | string;
  longitude?: number | string;
};

type EventItem = {
  id: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  status?: string;
  category?: string;
  highlightTag?: string;
  organizer?: {
    id?: string;
    tradeName?: string;
    legalName?: string;
    logoUrl?: string;
    bannerUrl?: string;
    city?: string;
    state?: string;
  };
  media?: EventMedia | null;
  content?: EventContent | null;
  location?: EventLocation | null;
};

type CollectionItem = {
  id: string;
  label: string;
  icon: string;
  eyebrow: string;
  keywords: string[];
  fallbackGradient: string;
};

type OrganizerSpotlight = {
  id: string;
  name: string;
  totalEvents: number;
  eventSample?: EventItem;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type CityOption = {
  key: string;
  city: string;
  state: string;
  label: string;
};

const collections: CollectionItem[] = [
  {
    id: "shows",
    label: "Festas e shows",
    icon: "🎵",
    eyebrow: "Noite",
    fallbackGradient: "from-sky-500 via-blue-600 to-indigo-700",
    keywords: ["show", "festa", "festival", "balada", "dj", "música", "musica"],
  },
  {
    id: "teatro",
    label: "Teatros e espetáculos",
    icon: "🎭",
    eyebrow: "Palco",
    fallbackGradient: "from-fuchsia-500 via-purple-600 to-indigo-700",
    keywords: ["teatro", "espetáculo", "espetaculo", "musical", "palco"],
  },
  {
    id: "comedy",
    label: "Stand up comedy",
    icon: "🎤",
    eyebrow: "Humor",
    fallbackGradient: "from-amber-400 via-orange-500 to-rose-500",
    keywords: ["stand up", "comedy", "humor", "comédia", "comediante"],
  },
  {
    id: "sports",
    label: "Esportes",
    icon: "⚽",
    eyebrow: "Energia",
    fallbackGradient: "from-emerald-500 via-teal-500 to-cyan-700",
    keywords: ["esporte", "futebol", "corrida", "luta", "arena", "campeonato"],
  },
  {
    id: "tours",
    label: "Passeios e tours",
    icon: "🌎",
    eyebrow: "Descobrir",
    fallbackGradient: "from-cyan-500 via-sky-500 to-blue-700",
    keywords: ["tour", "passeio", "excursão", "excursao", "visita", "experiência"],
  },
  {
    id: "business",
    label: "Congressos",
    icon: "🏛️",
    eyebrow: "Networking",
    fallbackGradient: "from-slate-600 via-slate-700 to-slate-900",
    keywords: ["congresso", "feira", "summit", "networking", "palestra", "evento corporativo"],
  },
  {
    id: "kids",
    label: "Infantil",
    icon: "🎈",
    eyebrow: "Família",
    fallbackGradient: "from-pink-500 via-rose-500 to-fuchsia-600",
    keywords: ["infantil", "família", "familia", "criança", "crianca", "kids"],
  },
  {
    id: "food",
    label: "Gastronomia",
    icon: "🍔",
    eyebrow: "Sabores",
    fallbackGradient: "from-orange-400 via-orange-500 to-amber-500",
    keywords: ["gastronomia", "food", "vinho", "cerveja", "hambúrguer", "hamburguer", "festival gastronômico"],
  },
];

const faqItems = [
  {
    question: "Como cancelo um ingresso ou peço reembolso?",
    answer:
      "Quando a política do evento permitir, o cancelamento ou o pedido de reembolso pode ser iniciado dentro da área dos seus pedidos. Em cenários com crédito em carteira, o saldo também pode voltar para a wallet.",
  },
  {
    question: "Como localizar meus ingressos?",
    answer:
      "Todos os ingressos ficam centralizados em “Meus pedidos”. Lá você consegue visualizar o pedido, o status do pagamento e o acesso ao ingresso digital.",
  },
  {
    question: "Como trocar a titularidade do ingresso?",
    answer:
      "A troca depende das regras do evento. Quando a funcionalidade estiver liberada, ela aparecerá dentro do próprio pedido do cliente.",
  },
  {
    question: "Como funciona o saldo da wallet?",
    answer:
      "A wallet funciona como saldo de plataforma. Ela pode receber créditos de ajustes, cancelamentos elegíveis ou campanhas, e depois ser usada em compras futuras.",
  },
];

const fallbackGradients = [
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-fuchsia-500 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-700",
  "from-orange-400 via-orange-500 to-amber-500",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-slate-700 via-slate-800 to-slate-950",
];

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

function previewText(value?: string, max = 110) {
  if (!value) {
    return "Descubra os detalhes deste evento e acompanhe novidades na plataforma.";
  }

  if (value.length <= max) return value;

  return `${value.slice(0, max).trim()}...`;
}

function normalizeText(value?: string) {
  return (value || "").toLowerCase();
}

function normalizePlainText(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getCollectionPoster(collection: CollectionItem) {
  const palettes: Record<string, { start: string; end: string; accent: string }> = {
    shows: { start: "#1d4ed8", end: "#4338ca", accent: "#93c5fd" },
    teatro: { start: "#9333ea", end: "#3730a3", accent: "#f0abfc" },
    comedy: { start: "#f59e0b", end: "#b45309", accent: "#fde68a" },
    sports: { start: "#059669", end: "#155e75", accent: "#6ee7b7" },
    tours: { start: "#0891b2", end: "#1d4ed8", accent: "#67e8f9" },
    business: { start: "#1f2937", end: "#0f172a", accent: "#cbd5e1" },
    kids: { start: "#e11d48", end: "#a21caf", accent: "#f9a8d4" },
    food: { start: "#ea580c", end: "#92400e", accent: "#fdba74" },
  };

  const palette = palettes[collection.id] || palettes.shows;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700" fill="none">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="700" gradientUnits="userSpaceOnUse">
          <stop stop-color="${palette.start}" />
          <stop offset="1" stop-color="${palette.end}" />
        </linearGradient>
      </defs>

      <rect width="1200" height="700" rx="36" fill="url(#bg)" />
      <circle cx="1030" cy="120" r="170" fill="${palette.accent}" opacity="0.14" />
      <circle cx="920" cy="590" r="220" fill="#ffffff" opacity="0.08" />
      <circle cx="180" cy="90" r="120" fill="#ffffff" opacity="0.07" />

      <rect x="72" y="74" width="220" height="56" rx="28" fill="#000000" fill-opacity="0.22" />
      <text x="102" y="111" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="700" fill="#ffffff" letter-spacing="3">${escapeXml(
        collection.eyebrow.toUpperCase(),
      )}</text>

      <text x="72" y="258" font-family="Arial, Helvetica, sans-serif" font-size="88" font-weight="700" fill="#ffffff">${escapeXml(
        collection.icon,
      )}</text>
      <text x="72" y="360" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800" fill="#ffffff">${escapeXml(
        collection.label,
      )}</text>
      <text x="72" y="420" font-family="Arial, Helvetica, sans-serif" font-size="28" fill="#ffffff" fill-opacity="0.84">Descubra experiências desta coleção</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getOrganizerName(event: EventItem) {
  return (
    event.organizer?.tradeName ||
    event.organizer?.legalName ||
    "Organizador parceiro"
  );
}

function getEventTimestamp(value?: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function buildRepeatingSection(events: EventItem[], start: number, count: number) {
  if (events.length === 0) return [];

  const output: EventItem[] = [];

  for (let index = 0; index < count; index += 1) {
    output.push(events[(start + index) % events.length]);
  }

  return output;
}

function getRelativeLabel(value?: string) {
  if (!value) return "Sem data";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Em breve";

  const diffMs = date.getTime() - Date.now();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 0) return "Já começou";
  if (diffHours <= 24) return "Hoje";
  if (diffDays <= 3) return "Próximos dias";
  if (diffDays <= 7) return "Nesta semana";

  return "Programar rolê";
}

function getStatusLabel(status?: string) {
  const normalized = normalizeText(status);

  if (normalized.includes("published")) return "Publicado";
  if (normalized.includes("draft")) return "Rascunho";
  if (normalized.includes("canceled")) return "Cancelado";
  if (normalized.includes("sold")) return "Esgotando";

  return status || "Disponível";
}

function getStatusClass(status?: string) {
  const normalized = normalizeText(status);

  if (normalized.includes("published")) {
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

function getEventImage(event?: EventItem | null) {
  if (!event) return undefined;

  return (
    event.media?.bannerImageUrl ||
    event.media?.coverImageUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.thumbnailUrl ||
    event.media?.gallery?.[0] ||
    undefined
  );
}

function getCardImage(event?: EventItem | null) {
  if (!event) return undefined;

  return (
    event.media?.coverImageUrl ||
    event.media?.thumbnailUrl ||
    event.media?.bannerImageUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.gallery?.[0] ||
    undefined
  );
}

function getLocationLabel(event?: EventItem | null) {
  if (!event?.location) return "Local a confirmar";

  const pieces = [
    event.location.venueName,
    [event.location.city, event.location.state].filter(Boolean).join(" - "),
  ].filter(Boolean);

  return pieces.length > 0 ? pieces.join(", ") : "Local a confirmar";
}

function parseCoordinate(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getEventCoordinates(event?: EventItem | null) {
  const latitude = parseCoordinate(event?.location?.latitude);
  const longitude = parseCoordinate(event?.location?.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function getDistanceInKm(origin: Coordinates, destination: Coordinates) {
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const earthRadiusKm = 6371;
  const deltaLat = toRadians(destination.latitude - origin.latitude);
  const deltaLon = toRadians(destination.longitude - origin.longitude);

  const lat1 = toRadians(origin.latitude);
  const lat2 = toRadians(destination.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function getManualLocationScore(event: EventItem, city?: string, state?: string) {
  const normalizedCity = normalizePlainText(city);
  const normalizedState = normalizePlainText(state);
  const eventCity = normalizePlainText(event.location?.city);
  const eventState = normalizePlainText(event.location?.state);

  if (!normalizedCity && !normalizedState) return 99;
  if (normalizedCity && normalizedState && eventCity === normalizedCity && eventState === normalizedState) {
    return 0;
  }
  if (normalizedCity && eventCity === normalizedCity) {
    return 1;
  }
  if (normalizedState && eventState === normalizedState) {
    return 2;
  }

  return 3;
}

function sortEventsByLocation(
  events: EventItem[],
  mode: "none" | "current" | "manual",
  currentCoords: Coordinates | null,
  manualCity: string,
  manualState: string,
) {
  const list = [...events];

  return list.sort((first, second) => {
    if (mode === "current" && currentCoords) {
      const firstCoords = getEventCoordinates(first);
      const secondCoords = getEventCoordinates(second);

      const firstDistance = firstCoords
        ? getDistanceInKm(currentCoords, firstCoords)
        : null;
      const secondDistance = secondCoords
        ? getDistanceInKm(currentCoords, secondCoords)
        : null;

      if (firstDistance !== null && secondDistance !== null && firstDistance !== secondDistance) {
        return firstDistance - secondDistance;
      }

      if (firstDistance !== null && secondDistance === null) return -1;
      if (firstDistance === null && secondDistance !== null) return 1;
    }

    if (mode === "manual") {
      const firstScore = getManualLocationScore(first, manualCity, manualState);
      const secondScore = getManualLocationScore(second, manualCity, manualState);

      if (firstScore !== secondScore) {
        return firstScore - secondScore;
      }
    }

    return getEventTimestamp(first.eventDate) - getEventTimestamp(second.eventDate);
  });
}

function matchCollection(event: EventItem, index = 0) {
  const haystack = [
    event.name,
    event.description,
    event.shortDescription,
    event.category,
    event.organizer?.tradeName,
    event.organizer?.legalName,
    event.status,
  ]
    .join(" ")
    .toLowerCase();

  const found = collections.find((collection) =>
    collection.keywords.some((keyword) => haystack.includes(keyword)),
  );

  return found || collections[index % collections.length];
}

function SectionHeader({
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>

      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function CollectionFilterCard({
  collection,
  active,
  onSelect,
}: {
  collection: CollectionItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`min-w-[300px] overflow-hidden rounded-[28px] border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
        active ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200"
      }`}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={getCollectionPoster(collection)}
          alt={collection.label}
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white">
          <p className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
            {collection.eyebrow}
          </p>

          <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            filtro
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h3 className="text-2xl font-black leading-tight">{collection.label}</h3>
          <p className="mt-2 text-sm text-white/85">
            Toque para filtrar a vitrine por esse clima.
          </p>
        </div>
      </div>

      <div className="p-5">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
            active
              ? "bg-slate-900 text-white"
              : "border border-slate-200 bg-white text-slate-700"
          }`}
        >
          {active ? "Filtro ativo" : "Aplicar filtro"}
        </span>
      </div>
    </button>
  );
}

function EventCarouselCard({
  event,
  fallbackGradient,
  eyebrow,
  posterCollection,
  onOpen,
}: {
  event: EventItem;
  fallbackGradient: string;
  eyebrow: string;
  posterCollection: CollectionItem;
  onOpen: () => void;
}) {
  const image = getCardImage(event);
  const fallbackPoster = getCollectionPoster(posterCollection);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="min-w-[300px] overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative h-48 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <img
              src={fallbackPoster}
              alt={posterCollection.label}
              className="h-full w-full object-cover"
            />
            <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradient} opacity-20`} />
          </>
        )}

        <div
          className={`absolute inset-0 ${
            image
              ? "bg-gradient-to-t from-black/80 via-black/35 to-black/10"
              : "bg-gradient-to-t from-black/72 via-black/28 to-black/10"
          }`}
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white">
          <p className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
            {eyebrow}
          </p>

          <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            {getRelativeLabel(event.eventDate)}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <h3 className="text-2xl font-black leading-tight">
            {event.name || "Evento sem nome"}
          </h3>
          <p className="mt-2 text-sm text-white/85">
            {getOrganizerName(event)}
          </p>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">
            {formatDate(event.eventDate)}
          </p>

          <span
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClass(
              event.status,
            )}`}
          >
            {getStatusLabel(event.status)}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {previewText(
            event.content?.summary || event.shortDescription || event.description,
            95,
          )}
        </p>

        <p className="mt-4 text-sm text-slate-600">
          📍 {getLocationLabel(event)}
        </p>
      </div>
    </button>
  );
}

export default function CustomerDashboardPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [activeCollection, setActiveCollection] = useState("all");

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<"none" | "current" | "manual">("none");
  const [currentCoords, setCurrentCoords] = useState<Coordinates | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const res = await fetch("http://localhost:3001/v1/events", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          alert(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar eventos",
          );
          return;
        }

        setEvents(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("CUSTOMER DASHBOARD ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  function openLocationModal() {
    setLocationError("");
    setLocationModalOpen(true);
  }

  function closeLocationModal() {
    setLocationModalOpen(false);
    setLocationSearch("");
  }

  function requestCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationError("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationMode("current");
        setIsLocating(false);
        closeLocationModal();
      },
      () => {
        setIsLocating(false);
        setLocationError(
          "Não consegui acessar sua localização atual. Escolha uma cidade ou continue em qualquer lugar.",
        );
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 10,
        timeout: 10000,
      },
    );
  }

  function chooseGeneralMode() {
    setLocationMode("none");
    setCurrentCoords(null);
    setManualCity("");
    setManualState("");
    setLocationError("");
    closeLocationModal();
  }

  function chooseManualLocation(city: string, state: string) {
    setManualCity(city);
    setManualState(state);
    setLocationMode("manual");
    setLocationError("");
    closeLocationModal();
  }

  function goTo(path: string) {
    window.location.href = path;
  }

  function goToEventsWithContext(params?: {
    section?: string;
    quickFilter?: string;
    collection?: string;
    title?: string;
  }) {
    const query = new URLSearchParams();

    if (params?.section) query.set("section", params.section);
    if (params?.quickFilter) query.set("quickFilter", params.quickFilter);
    if (params?.collection) query.set("collection", params.collection);
    if (params?.title) query.set("title", params.title);

    if (locationMode === "manual") {
      if (manualCity) query.set("city", manualCity);
      if (manualState) query.set("state", manualState);
    }

    if (locationMode === "current" && currentCoords) {
      query.set("origin", "current");
      query.set("lat", String(currentCoords.latitude));
      query.set("lng", String(currentCoords.longitude));
    }

    const queryString = query.toString();

    window.location.href = queryString
      ? `/customer/events?${queryString}`
      : "/customer/events";
  }

  const locationButtonLabel = useMemo(() => {
    if (locationMode === "current" && currentCoords) {
      return "Minha localização";
    }

    if (locationMode === "manual") {
      if (manualCity && manualState) return `${manualCity} - ${manualState}`;
      if (manualCity) return manualCity;
      if (manualState) return manualState;
    }

    return "Qualquer lugar";
  }, [locationMode, currentCoords, manualCity, manualState]);

  const locationDescription = useMemo(() => {
    if (locationMode === "current" && currentCoords) {
      return "Mostrando primeiro os eventos mais próximos da sua localização atual.";
    }

    if (locationMode === "manual") {
      if (manualCity && manualState) {
        return `Mostrando primeiro os eventos de ${manualCity} - ${manualState}.`;
      }
      if (manualCity) {
        return `Mostrando primeiro os eventos de ${manualCity}.`;
      }
      if (manualState) {
        return `Mostrando primeiro os eventos do estado ${manualState}.`;
      }
    }

    return "Você está vendo a home em modo geral, sem filtro de localização.";
  }, [locationMode, currentCoords, manualCity, manualState]);

  const dateSortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) =>
        getEventTimestamp(first.eventDate) - getEventTimestamp(second.eventDate),
    );
  }, [events]);

  const locationAwareEvents = useMemo(() => {
    return sortEventsByLocation(
      dateSortedEvents,
      locationMode,
      currentCoords,
      manualCity,
      manualState,
    );
  }, [dateSortedEvents, locationMode, currentCoords, manualCity, manualState]);

  const cityOptions = useMemo<CityOption[]>(() => {
    const map = new Map<string, CityOption>();

    dateSortedEvents.forEach((event) => {
      const city = (event.location?.city || "").trim();
      const state = (event.location?.state || "").trim();

      if (!city) return;

      const key = `${normalizePlainText(city)}-${normalizePlainText(state)}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          city,
          state,
          label: state ? `${city} - ${state}` : city,
        });
      }
    });

    return Array.from(map.values()).sort((first, second) =>
      first.label.localeCompare(second.label, "pt-BR"),
    );
  }, [dateSortedEvents]);

  const filteredCityOptions = useMemo(() => {
    const term = normalizePlainText(locationSearch);

    if (!term) return cityOptions;

    return cityOptions.filter((option) =>
      normalizePlainText(`${option.city} ${option.state} ${option.label}`).includes(term),
    );
  }, [cityOptions, locationSearch]);

  const filteredEvents = useMemo(() => {
    return locationAwareEvents.filter((event, index) => {
      const text = [
        event.name,
        event.description,
        event.shortDescription,
        event.category,
        event.content?.summary,
        event.organizer?.tradeName,
        event.organizer?.legalName,
        event.status,
        event.location?.venueName,
        event.location?.city,
        event.location?.state,
      ]
        .join(" ")
        .toLowerCase();

      const searchMatches = search.trim()
        ? text.includes(search.trim().toLowerCase())
        : true;

      const collectionMatches =
        activeCollection === "all"
          ? true
          : matchCollection(event, index).id === activeCollection;

      return searchMatches && collectionMatches;
    });
  }, [locationAwareEvents, search, activeCollection]);

  const hasActiveFilters = Boolean(search.trim()) || activeCollection !== "all";

  const showcasedEvents =
    filteredEvents.length > 0 ? filteredEvents : locationAwareEvents;

  useEffect(() => {
    setActiveHeroIndex(0);
  }, [search, activeCollection, locationMode, manualCity, manualState, showcasedEvents.length]);

  const heroEvents = showcasedEvents.slice(0, 6);

  useEffect(() => {
    if (heroEvents.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveHeroIndex((previous) => (previous + 1) % heroEvents.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [heroEvents]);

  const featuredEvent =
    heroEvents.length > 0 ? heroEvents[activeHeroIndex % heroEvents.length] : null;

  const nextEvent = locationAwareEvents.find(
    (event) => getEventTimestamp(event.eventDate) >= Date.now(),
  );

  const hotNowSection = buildRepeatingSection(showcasedEvents, 0, 8);
  const weekendSection = buildRepeatingSection(showcasedEvents, 2, 8);

  const cultureCandidates = showcasedEvents.filter(
    (event, index) =>
      ["teatro", "tours", "business"].includes(matchCollection(event, index).id),
  );

  const cultureSection =
    cultureCandidates.length > 0
      ? buildRepeatingSection(cultureCandidates, 0, Math.min(8, cultureCandidates.length))
      : buildRepeatingSection(showcasedEvents, 4, 8);

  const urgencySection = [...showcasedEvents]
    .filter((event) => getEventTimestamp(event.eventDate) >= Date.now())
    .sort(
      (first, second) =>
        getEventTimestamp(first.eventDate) - getEventTimestamp(second.eventDate),
    )
    .slice(0, 8);

  const organizerSpotlights = useMemo(() => {
    const map = new Map<string, OrganizerSpotlight>();

    locationAwareEvents.forEach((event) => {
      const organizerId =
        event.organizer?.id ||
        getOrganizerName(event).toLowerCase().replace(/\s+/g, "-");
      const organizerName = getOrganizerName(event);

      if (!map.has(organizerId)) {
        map.set(organizerId, {
          id: organizerId,
          name: organizerName,
          totalEvents: 0,
          eventSample: event,
        });
      }

      const current = map.get(organizerId);

      if (current) {
        current.totalEvents += 1;

        if (!getEventImage(current.eventSample) && getEventImage(event)) {
          current.eventSample = event;
        }
      }
    });

    return Array.from(map.values())
      .sort((first, second) => second.totalEvents - first.totalEvents)
      .slice(0, 6);
  }, [locationAwareEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7fb]">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-lg font-semibold text-slate-800">
              Montando a nova vitrine com fotos reais dos eventos...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (dateSortedEvents.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-[30px] bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 px-8 py-12 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/75">
              Sua nova vitrine
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              A home está pronta para vender muito assim que os eventos entrarem.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              No momento ainda não existem eventos cadastrados para exibir por aqui.
              Assim que você cadastrar no painel, a home vai preencher hero,
              vitrines, coleções e destaques automaticamente.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => goTo("/customer/events")}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
              >
                Ir para eventos
              </button>

              <button
                type="button"
                onClick={() => goTo("/customer/orders")}
                className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Ver meus pedidos
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-[34px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="rounded-[28px] bg-gradient-to-r from-slate-50 via-white to-sky-50 p-4 md:p-5">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="flex h-14 flex-1 items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <span className="mr-3 text-lg text-slate-400">🔎</span>

                <input
                  type="text"
                  placeholder="Buscar experiências, festivais, tours, esportes..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={openLocationModal}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                <span>📍</span>
                <span>{locationButtonLabel}</span>
                <span className="text-xs">▾</span>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {locationDescription}
              </span>

              {locationMode !== "none" ? (
                <button
                  type="button"
                  onClick={chooseGeneralMode}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  Voltar para qualquer lugar
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {hasActiveFilters && filteredEvents.length === 0 ? (
          <section className="mt-6 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            Nenhum evento encontrou esses filtros por enquanto. Estou exibindo os
            destaques gerais para a home não ficar vazia.
          </section>
        ) : null}

        {featuredEvent ? (
          <section className="mt-8">
            <div className="relative overflow-hidden rounded-[36px] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="relative min-h-[520px] overflow-hidden rounded-[30px]">
                {getEventImage(featuredEvent) ? (
                  <img
                    src={getEventImage(featuredEvent)}
                    alt={featuredEvent.name || "Evento"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={getCollectionPoster(matchCollection(featuredEvent))}
                    alt={matchCollection(featuredEvent).label}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/62 to-black/38" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_30%)]" />

                <div className="relative z-10 grid gap-8 p-8 text-white md:p-10 xl:grid-cols-[1.25fr_0.75fr]">
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] backdrop-blur">
                          Evento em destaque
                        </span>

                        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                          {getRelativeLabel(featuredEvent.eventDate)}
                        </span>

                        <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                          {getStatusLabel(featuredEvent.status)}
                        </span>

                        {featuredEvent.highlightTag ? (
                          <span className="rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-white shadow-sm">
                            {featuredEvent.highlightTag}
                          </span>
                        ) : null}
                      </div>

                      <h1 className="mt-6 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                        {featuredEvent.name || "Evento sem nome"}
                      </h1>

                      <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                        {previewText(
                          featuredEvent.content?.summary ||
                            featuredEvent.shortDescription ||
                            featuredEvent.description,
                          220,
                        )}
                      </p>

                      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                            Quando
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {formatDate(featuredEvent.startDate || featuredEvent.eventDate)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                            Organizador
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {getOrganizerName(featuredEvent)}
                          </p>
                        </div>

                        <div className="rounded-[22px] border border-white/18 bg-white/10 px-4 py-4 backdrop-blur">
                          <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                            Local
                          </p>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {getLocationLabel(featuredEvent)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-8 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => goTo(`/customer/events/${featuredEvent.id}`)}
                          className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm hover:bg-sky-50"
                        >
                          Ver evento
                        </button>

                        <button
                          type="button"
                          onClick={() => goTo(`/customer/events/${featuredEvent.id}`)}
                          className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                        >
                          Comprar ingresso
                        </button>
                      </div>
                    </div>

                    {heroEvents.length > 1 ? (
                      <div className="mt-8 flex flex-wrap items-center gap-3">
                        {heroEvents.map((event, index) => {
                          const active = event.id === featuredEvent.id;

                          return (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => setActiveHeroIndex(index)}
                              className={`h-3 rounded-full transition ${
                                active
                                  ? "w-12 bg-white"
                                  : "w-3 bg-white/45 hover:bg-white/70"
                              }`}
                              aria-label={`Abrir slide ${index + 1}`}
                            />
                          );
                        })}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveHeroIndex((previous) =>
                            heroEvents.length === 0
                              ? 0
                              : (previous - 1 + heroEvents.length) % heroEvents.length,
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-bold backdrop-blur hover:bg-white/20"
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveHeroIndex((previous) =>
                            heroEvents.length === 0
                              ? 0
                              : (previous + 1) % heroEvents.length,
                          )
                        }
                        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-lg font-bold backdrop-blur hover:bg-white/20"
                      >
                        ›
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {heroEvents.slice(0, 4).map((event, index) => {
                        const active = event.id === featuredEvent.id;
                        const thumb = getCardImage(event);
                        const collection = matchCollection(event, index);

                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setActiveHeroIndex(index)}
                            className={`overflow-hidden rounded-[24px] border text-left backdrop-blur transition ${
                              active
                                ? "border-white/35 bg-white/14"
                                : "border-white/15 bg-white/8 hover:bg-white/14"
                            }`}
                          >
                            <div className="flex items-stretch">
                              <div className="relative h-[108px] w-[108px] shrink-0 overflow-hidden">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt={event.name || "Evento"}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <img
                                    src={getCollectionPoster(collection)}
                                    alt={collection.label}
                                    className="h-full w-full object-cover"
                                  />
                                )}

                                <div className="absolute inset-0 bg-black/20" />
                              </div>

                              <div className="flex-1 p-4 text-white">
                                <p className="text-[11px] uppercase tracking-[0.2em] text-white/65">
                                  Destaque
                                </p>
                                <p className="mt-2 text-base font-bold leading-tight">
                                  {event.name || "Evento"}
                                </p>
                                <p className="mt-2 text-sm text-white/75">
                                  {formatDate(event.eventDate)}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <SectionHeader
            eyebrow="Descobrir"
            title="Explore por coleção"
            description="Agora essa faixa funciona como filtro visual da vitrine."
          />

          <div className="flex gap-5 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => setActiveCollection("all")}
              className={`min-w-[300px] overflow-hidden rounded-[28px] border bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                activeCollection === "all"
                  ? "border-slate-900 ring-2 ring-slate-900/10"
                  : "border-slate-200"
              }`}
            >
              <div className="relative h-48 overflow-hidden">
                <img
                  src={getCollectionPoster({
                    id: "all",
                    label: "Todas as experiências",
                    icon: "✨",
                    eyebrow: "Geral",
                    keywords: [],
                    fallbackGradient: "",
                  })}
                  alt="Todas as experiências"
                  className="h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white">
                  <p className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] backdrop-blur">
                    geral
                  </p>

                  <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                    filtro
                  </span>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <h3 className="text-2xl font-black leading-tight">
                    Todas as experiências
                  </h3>
                  <p className="mt-2 text-sm text-white/85">
                    Mistura completa da vitrine.
                  </p>
                </div>
              </div>

              <div className="p-5">
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    activeCollection === "all"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {activeCollection === "all" ? "Filtro ativo" : "Aplicar filtro"}
                </span>
              </div>
            </button>

            {collections.map((collection) => (
              <CollectionFilterCard
                key={collection.id}
                collection={collection}
                active={activeCollection === collection.id}
                onSelect={() => setActiveCollection(collection.id)}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Em alta"
            title="Bombando agora"
            description="Uma faixa mais comercial, agora com cara de vitrine real."
            actionLabel="Ver todos"
            onAction={() =>
              goToEventsWithContext({
                section: "hot",
                title: "Bombando agora",
              })
            }
          />

          <div className="flex gap-5 overflow-x-auto pb-2">
            {hotNowSection.map((event, index) => {
              const collection = matchCollection(event, index);

              return (
                <EventCarouselCard
                  key={`${event.id}-hot-${index}`}
                  event={event}
                  fallbackGradient={fallbackGradients[index % fallbackGradients.length]}
                  eyebrow="Em alta"
                  posterCollection={collection}
                  onOpen={() => goTo(`/customer/events/${event.id}`)}
                />
              );
            })}
          </div>
        </section>

        {nextEvent ? (
          <section className="mt-12">
            <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
              <div className="relative min-h-[340px]">
                {getEventImage(nextEvent) ? (
                  <img
                    src={getEventImage(nextEvent)}
                    alt={nextEvent.name || "Evento"}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={getCollectionPoster(matchCollection(nextEvent))}
                    alt={matchCollection(nextEvent).label}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />

                <div className="relative z-10 grid gap-6 p-8 text-white lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-white/70">
                      Próxima experiência
                    </p>

                    <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
                      {nextEvent.name || "Evento em destaque"}
                    </h2>

                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                      {previewText(
                        nextEvent.content?.summary ||
                          nextEvent.shortDescription ||
                          nextEvent.description,
                        180,
                      )}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/85">
                      <span>📅 {formatDate(nextEvent.eventDate)}</span>
                      <span>📍 {getLocationLabel(nextEvent)}</span>
                      <span>👤 {getOrganizerName(nextEvent)}</span>
                    </div>

                    <div className="mt-7 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => goTo(`/customer/events/${nextEvent.id}`)}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
                      >
                        Ver evento
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          goToEventsWithContext({
                            section: "upcoming",
                            quickFilter: "week",
                            title: "Próxima experiência",
                          })
                        }
                        className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                      >
                        Explorar agenda completa
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 self-end">
                    {heroEvents.slice(0, 3).map((event, index) => {
                      const image = getCardImage(event);
                      const collection = matchCollection(event, index);

                      return (
                        <button
                          key={`${event.id}-mini-highlight`}
                          type="button"
                          onClick={() => goTo(`/customer/events/${event.id}`)}
                          className="overflow-hidden rounded-[24px] border border-white/15 bg-white/8 text-left backdrop-blur transition hover:bg-white/14"
                        >
                          <div className="flex items-stretch">
                            <div className="relative h-[96px] w-[96px] shrink-0 overflow-hidden">
                              {image ? (
                                <img
                                  src={image}
                                  alt={event.name || "Evento"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <img
                                  src={getCollectionPoster(collection)}
                                  alt={collection.label}
                                  className="h-full w-full object-cover"
                                />
                              )}

                              <div className="absolute inset-0 bg-black/20" />
                            </div>

                            <div className="flex-1 p-4 text-white">
                              <p className="text-[11px] uppercase tracking-[0.2em] text-white/65">
                                Descobrir
                              </p>
                              <p className="mt-2 text-sm font-bold leading-tight">
                                {event.name || "Evento"}
                              </p>
                              <p className="mt-2 text-xs text-white/75">
                                {formatDate(event.eventDate)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <SectionHeader
            eyebrow="Urgência"
            title="Última chance para garantir"
            description="Eventos mais próximos para criar decisão rápida sem perder o visual premium."
            actionLabel="Ver agenda"
            onAction={() =>
              goToEventsWithContext({
                section: "urgency",
                quickFilter: "soon",
                title: "Última chance para garantir",
              })
            }
          />

          {urgencySection.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
              Nenhum evento próximo por enquanto.
            </div>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-2">
              {urgencySection.map((event, index) => {
                const collection = matchCollection(event, index);

                return (
                  <EventCarouselCard
                    key={`${event.id}-urgency-${index}`}
                    event={event}
                    fallbackGradient={fallbackGradients[(index + 2) % fallbackGradients.length]}
                    eyebrow="Última chance"
                    posterCollection={collection}
                    onOpen={() => goTo(`/customer/events/${event.id}`)}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Organizadores"
            title="Quem está brilhando na plataforma"
            description="Agora com foto real do universo do evento, em vez de bloco chapado."
            actionLabel="Explorar eventos"
            onAction={() =>
              goToEventsWithContext({
                section: "organizers",
                title: "Quem está brilhando na plataforma",
              })
            }
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {organizerSpotlights.map((organizer, index) => {
              const image = getEventImage(organizer.eventSample);
              const collection = organizer.eventSample
                ? matchCollection(organizer.eventSample, index)
                : collections[index % collections.length];

              return (
                <div
                  key={organizer.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative h-48">
                    {image ? (
                      <img
                        src={image}
                        alt={organizer.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img
                        src={getCollectionPoster(collection)}
                        alt={collection.label}
                        className="h-full w-full object-cover"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/70">
                        Organizador em destaque
                      </p>
                      <h3 className="mt-2 text-2xl font-black">{organizer.name}</h3>
                    </div>
                  </div>

                  <div className="p-5">
                    <p className="text-sm leading-6 text-slate-500">
                      {organizer.totalEvents} evento
                      {organizer.totalEvents > 1 ? "s" : ""} abastecendo a vitrine do
                      cliente agora.
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        goToEventsWithContext({
                          section: "organizers",
                          title: "Quem está brilhando na plataforma",
                        })
                      }
                      className="mt-5 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Ver eventos desse parceiro
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Curadoria"
            title="Hoje e nos próximos dias"
            description="Mais uma faixa com fotos reais para reforçar navegação e descoberta."
            actionLabel="Ver agenda"
            onAction={() =>
              goToEventsWithContext({
                section: "week",
                quickFilter: "week",
                title: "Hoje e nos próximos dias",
              })
            }
          />

          <div className="flex gap-5 overflow-x-auto pb-2">
            {weekendSection.map((event, index) => {
              const collection = matchCollection(event, index);

              return (
                <EventCarouselCard
                  key={`${event.id}-week-${index}`}
                  event={event}
                  fallbackGradient={fallbackGradients[(index + 3) % fallbackGradients.length]}
                  eyebrow="Curadoria"
                  posterCollection={collection}
                  onOpen={() => goTo(`/customer/events/${event.id}`)}
                />
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <SectionHeader
            eyebrow="Descobrir"
            title="Passeios, cultura e experiências"
            description="Uma segunda vitrine para dar variedade visual sem cair em repetição."
            actionLabel="Ver tudo"
            onAction={() =>
              goToEventsWithContext({
                section: "culture",
                collection: "tours",
                title: "Passeios, cultura e experiências",
              })
            }
          />

          <div className="flex gap-5 overflow-x-auto pb-2">
            {cultureSection.map((event, index) => {
              const collection = matchCollection(event, index);

              return (
                <EventCarouselCard
                  key={`${event.id}-culture-${index}`}
                  event={event}
                  fallbackGradient={fallbackGradients[(index + 4) % fallbackGradients.length]}
                  eyebrow="Cultura"
                  posterCollection={collection}
                  onOpen={() => goTo(`/customer/events/${event.id}`)}
                />
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">
              Tire suas dúvidas aqui
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Deixei esse bloco sozinho para a home respirar melhor e não competir com atalhos.
            </p>

            <div className="mt-5 space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-semibold text-slate-800">
                    <span>{item.question}</span>
                    <span className="text-lg text-slate-400 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>

                  <p className="mt-4 text-sm leading-6 text-slate-500">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {locationModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 px-4 py-12">
          <div className="w-full max-w-[560px] rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-[32px] font-black leading-tight text-slate-950">
                  Localização
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Escolha uma cidade ou use sua localização atual.
                </p>
              </div>

              <button
                type="button"
                onClick={closeLocationModal}
                className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="flex h-14 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                <span className="mr-3 text-lg text-slate-400">🔎</span>
                <input
                  type="text"
                  placeholder="Onde?"
                  value={locationSearch}
                  onChange={(event) => setLocationSearch(event.target.value)}
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                type="button"
                onClick={requestCurrentLocation}
                className={`mt-4 flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                  locationMode === "current"
                    ? "border-sky-200 bg-sky-50"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className="mt-1 text-xl text-sky-600">📍</span>

                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900">
                    {isLocating ? "Buscando sua localização..." : "Usar minha localização atual"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Encontre eventos perto de você
                  </p>
                </div>
              </button>

              <div className="mt-4 max-h-[340px] overflow-y-auto rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={chooseGeneralMode}
                  className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-4 text-left transition ${
                    locationMode === "none" ? "bg-slate-100" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="text-sky-600">📍</span>
                  <span className="text-base font-medium text-slate-800">
                    Qualquer lugar
                  </span>
                </button>

                {filteredCityOptions.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    Nenhuma cidade encontrada.
                  </div>
                ) : (
                  filteredCityOptions.map((option) => {
                    const active =
                      locationMode === "manual" &&
                      normalizePlainText(manualCity) === normalizePlainText(option.city) &&
                      normalizePlainText(manualState) === normalizePlainText(option.state);

                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => chooseManualLocation(option.city, option.state)}
                        className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-4 text-left transition last:border-b-0 ${
                          active ? "bg-slate-100" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-sky-600">📍</span>
                        <span className="text-base font-medium text-slate-800">
                          {option.label}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {locationError ? (
                <p className="mt-4 text-sm leading-6 text-rose-600">
                  {locationError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}