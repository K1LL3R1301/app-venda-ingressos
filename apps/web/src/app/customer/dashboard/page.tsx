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
  venueName?: string;
  city?: string;
  state?: string;
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
    eyebrow: "Rir alto",
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

const quickFilters = [
  { id: "all", label: "Tudo" },
  { id: "published", label: "Publicados" },
  { id: "week", label: "Esta semana" },
  { id: "weekend", label: "Fim de semana" },
  { id: "soon", label: "Última chance" },
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

function isThisWeek(value?: string) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const diffMs = date.getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= 7;
}

function isWeekend(value?: string) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const day = date.getDay();
  const diffMs = date.getTime() - Date.now();

  return diffMs >= 0 && (day === 5 || day === 6 || day === 0);
}

function isSoon(value?: string) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const diffMs = date.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= 0 && diffHours <= 72;
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

function EventCarouselCard({
  event,
  fallbackGradient,
  eyebrow,
  onOpen,
}: {
  event: EventItem;
  fallbackGradient: string;
  eyebrow: string;
  onOpen: () => void;
}) {
  const image = getCardImage(event);

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
          <div className={`h-full w-full bg-gradient-to-br ${fallbackGradient}`} />
        )}

        <div
          className={`absolute inset-0 ${
            image
              ? "bg-gradient-to-t from-black/80 via-black/35 to-black/10"
              : "bg-black/15"
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
  const [activeQuickFilter, setActiveQuickFilter] = useState("all");

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

  function goTo(path: string) {
    window.location.href = path;
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) =>
        getEventTimestamp(first.eventDate) - getEventTimestamp(second.eventDate),
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    return sortedEvents.filter((event, index) => {
      const text = [
        event.name,
        event.description,
        event.shortDescription,
        event.category,
        event.content?.summary,
        event.organizer?.tradeName,
        event.organizer?.legalName,
        event.status,
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

      const quickFilterMatches =
        activeQuickFilter === "all"
          ? true
          : activeQuickFilter === "published"
            ? normalizeText(event.status).includes("published")
            : activeQuickFilter === "week"
              ? isThisWeek(event.eventDate)
              : activeQuickFilter === "weekend"
                ? isWeekend(event.eventDate)
                : activeQuickFilter === "soon"
                  ? isSoon(event.eventDate)
                  : true;

      return searchMatches && collectionMatches && quickFilterMatches;
    });
  }, [sortedEvents, search, activeCollection, activeQuickFilter]);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    activeCollection !== "all" ||
    activeQuickFilter !== "all";

  const showcasedEvents =
    filteredEvents.length > 0 ? filteredEvents : sortedEvents;

  useEffect(() => {
    setActiveHeroIndex(0);
  }, [search, activeCollection, activeQuickFilter, showcasedEvents.length]);

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

  const nextEvent = sortedEvents.find(
    (event) => getEventTimestamp(event.eventDate) >= Date.now(),
  );

  const publishedCount = sortedEvents.filter((event) =>
    normalizeText(event.status).includes("published"),
  ).length;

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

    sortedEvents.forEach((event) => {
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
  }, [sortedEvents]);

  const collectionCounts = useMemo(() => {
    return collections.map((collection) => {
      const matchingEvents = sortedEvents.filter(
        (event, index) => matchCollection(event, index).id === collection.id,
      );

      return {
        ...collection,
        total: matchingEvents.length,
        sampleEvent: matchingEvents[0],
      };
    });
  }, [sortedEvents]);

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

  if (sortedEvents.length === 0) {
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
    <main className="mx-auto max-w-7xl px-4 py-8">
      <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-white p-4 shadow-sm">
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
              onClick={() => goTo("/customer/events")}
              className="h-14 rounded-2xl border border-sky-100 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              📍 Qualquer lugar
            </button>

            <button
              type="button"
              onClick={() => goTo("/customer/events")}
              className="h-14 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Explorar eventos
            </button>
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {quickFilters.map((filter) => {
              const active = activeQuickFilter === filter.id;

              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveQuickFilter(filter.id)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
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
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${
                    fallbackGradients[activeHeroIndex % fallbackGradients.length]
                  }`}
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
                                <div
                                  className={`h-full w-full bg-gradient-to-br ${
                                    fallbackGradients[index % fallbackGradients.length]
                                  }`}
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

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Eventos no radar
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {sortedEvents.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Sua home agora já usa cadastro real para montar uma vitrine viva.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Organizadores
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {organizerSpotlights.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Marcas e produtores aparecendo com mais força na descoberta.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Publicados
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {publishedCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Eventos prontos para venda e navegação do cliente.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Próximo destaque
          </p>
          <p className="mt-3 text-base font-black text-slate-950">
            {nextEvent?.name || "Sem próximos eventos"}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {nextEvent
              ? formatDate(nextEvent.eventDate)
              : "Cadastre mais eventos para alimentar a agenda."}
          </p>
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Descobrir"
          title="Explore por coleção"
          description="Agora as coleções também usam fotos reais como referência visual."
          actionLabel={activeCollection === "all" ? "Ver tudo" : "Limpar filtro"}
          onAction={() => setActiveCollection("all")}
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => setActiveCollection("all")}
            className={`overflow-hidden rounded-[26px] border text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
              activeCollection === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-2xl">✨</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                  geral
                </span>
              </div>

              <h3 className="mt-5 text-xl font-black">Todas as experiências</h3>
              <p
                className={`mt-2 text-sm ${
                  activeCollection === "all" ? "text-white/75" : "text-slate-500"
                }`}
              >
                Mistura completa da vitrine para o cliente explorar sem barreira.
              </p>
            </div>
          </button>

          {collectionCounts.map((collection, index) => {
            const active = activeCollection === collection.id;
            const image = getCardImage(collection.sampleEvent);

            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => setActiveCollection(collection.id)}
                className="overflow-hidden rounded-[26px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative h-[220px]">
                  {image ? (
                    <img
                      src={image}
                      alt={collection.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-br ${collection.fallbackGradient}`}
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10" />

                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 text-white">
                    <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
                      {collection.eyebrow}
                    </span>

                    <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                      {collection.total} eventos
                    </span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{collection.icon}</span>
                      <h3 className="text-xl font-black">{collection.label}</h3>
                    </div>

                    <p className="mt-2 text-sm text-white/80">
                      {collection.sampleEvent
                        ? previewText(
                            collection.sampleEvent.shortDescription ||
                              collection.sampleEvent.description,
                            72,
                          )
                        : "Descubra eventos desta coleção."}
                    </p>

                    {active ? (
                      <span className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-900">
                        Filtro ativo
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Em alta"
          title="Bombando agora"
          description="Uma faixa mais comercial, agora com cara de vitrine real."
          actionLabel="Ver todos"
          onAction={() => goTo("/customer/events")}
        />

        <div className="flex gap-5 overflow-x-auto pb-2">
          {hotNowSection.map((event, index) => (
            <EventCarouselCard
              key={`${event.id}-hot-${index}`}
              event={event}
              fallbackGradient={fallbackGradients[index % fallbackGradients.length]}
              eyebrow="Em alta"
              onOpen={() => goTo(`/customer/events/${event.id}`)}
            />
          ))}
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
                <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-950" />
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
                      onClick={() => goTo("/customer/events")}
                      className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Explorar agenda completa
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 self-end">
                  {heroEvents.slice(0, 3).map((event, index) => {
                    const image = getCardImage(event);

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
                              <div
                                className={`h-full w-full bg-gradient-to-br ${
                                  fallbackGradients[(index + 2) % fallbackGradients.length]
                                }`}
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
          onAction={() => goTo("/customer/events")}
        />

        {urgencySection.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
            Nenhum evento próximo por enquanto.
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-2">
            {urgencySection.map((event, index) => (
              <EventCarouselCard
                key={`${event.id}-urgency-${index}`}
                event={event}
                fallbackGradient={fallbackGradients[(index + 2) % fallbackGradients.length]}
                eyebrow="Última chance"
                onOpen={() => goTo(`/customer/events/${event.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Organizadores"
          title="Quem está brilhando na plataforma"
          description="Agora com foto real do universo do evento, em vez de bloco chapado."
          actionLabel="Explorar eventos"
          onAction={() => goTo("/customer/events")}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {organizerSpotlights.map((organizer, index) => {
            const image = getEventImage(organizer.eventSample);

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
                    <div
                      className={`h-full w-full bg-gradient-to-br ${
                        fallbackGradients[index % fallbackGradients.length]
                      }`}
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
                    onClick={() => goTo("/customer/events")}
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
          onAction={() => goTo("/customer/events")}
        />

        <div className="flex gap-5 overflow-x-auto pb-2">
          {weekendSection.map((event, index) => (
            <EventCarouselCard
              key={`${event.id}-week-${index}`}
              event={event}
              fallbackGradient={fallbackGradients[(index + 3) % fallbackGradients.length]}
              eyebrow="Curadoria"
              onOpen={() => goTo(`/customer/events/${event.id}`)}
            />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <SectionHeader
          eyebrow="Descobrir"
          title="Passeios, cultura e experiências"
          description="Uma segunda vitrine para dar variedade visual sem cair em repetição."
          actionLabel="Ver tudo"
          onAction={() => goTo("/customer/events")}
        />

        <div className="flex gap-5 overflow-x-auto pb-2">
          {cultureSection.map((event, index) => (
            <EventCarouselCard
              key={`${event.id}-culture-${index}`}
              event={event}
              fallbackGradient={fallbackGradients[(index + 4) % fallbackGradients.length]}
              eyebrow="Cultura"
              onOpen={() => goTo(`/customer/events/${event.id}`)}
            />
          ))}
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
  );
}