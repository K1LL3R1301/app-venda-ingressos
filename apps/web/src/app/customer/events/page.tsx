"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
    label: "Teatro e palco",
    icon: "🎭",
    eyebrow: "Cultura",
    fallbackGradient: "from-fuchsia-500 via-purple-600 to-indigo-700",
    keywords: ["teatro", "espetáculo", "espetaculo", "musical", "palco"],
  },
  {
    id: "comedy",
    label: "Comedy",
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
    label: "Passeios",
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

const fallbackGradients = [
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-fuchsia-500 via-purple-600 to-indigo-700",
  "from-emerald-500 via-teal-500 to-cyan-700",
  "from-orange-400 via-orange-500 to-amber-500",
  "from-rose-500 via-pink-500 to-fuchsia-600",
  "from-slate-700 via-slate-800 to-slate-950",
];

const sectionMeta: Record<string, { title: string; description: string }> = {
  hot: {
    title: "Bombando agora",
    description:
      "Aqui entram os eventos mais fortes da vitrine, priorizando publicados e prontos para clique.",
  },
  urgency: {
    title: "Última chance para garantir",
    description:
      "Essa visão destaca os eventos mais próximos para acelerar a decisão do cliente.",
  },
  week: {
    title: "Hoje e nos próximos dias",
    description:
      "Uma lista pensada para quem quer encontrar algo acontecendo logo.",
  },
  culture: {
    title: "Passeios, cultura e experiências",
    description:
      "Uma visão mais alinhada com cultura, passeio e descoberta por estilo.",
  },
  organizers: {
    title: "Quem está brilhando na plataforma",
    description:
      "Lista aberta a partir do bloco de organizadores em destaque da dashboard.",
  },
  upcoming: {
    title: "Próxima experiência",
    description:
      "Uma visão da agenda mais próxima para o cliente continuar a jornada sem se perder.",
  },
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

function previewText(value?: string, max = 120) {
  if (!value) {
    return "Descubra os detalhes deste evento e continue sua jornada de compra.";
  }

  if (value.length <= max) return value;

  return `${value.slice(0, max).trim()}...`;
}

function normalizeText(value?: string) {
  return (value || "").toLowerCase();
}

function getEventTimestamp(value?: string) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function getOrganizerName(event: EventItem) {
  return (
    event.organizer?.tradeName ||
    event.organizer?.legalName ||
    "Organizador parceiro"
  );
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

function matchCollection(event: EventItem, index = 0) {
  const haystack = [
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

function getQuickFilterLabel(id: string) {
  return quickFilters.find((item) => item.id === id)?.label || "Tudo";
}

function getCollectionLabel(id: string) {
  return collections.find((item) => item.id === id)?.label || "Todas as experiências";
}

function isValidQuickFilter(id: string) {
  return quickFilters.some((item) => item.id === id);
}

function isValidCollection(id: string) {
  return id === "all" || collections.some((item) => item.id === id);
}

function sectionMatchesEvent(
  event: EventItem,
  index: number,
  section?: string,
) {
  const normalizedStatus = normalizeText(event.status);
  const collectionId = matchCollection(event, index).id;

  if (section === "hot") {
    return normalizedStatus.includes("published");
  }

  if (section === "urgency") {
    return isSoon(event.eventDate);
  }

  if (section === "week" || section === "upcoming") {
    return isThisWeek(event.eventDate);
  }

  if (section === "culture") {
    return ["teatro", "tours", "business"].includes(collectionId);
  }

  return true;
}

function sortEventsBySection(events: EventItem[], section?: string) {
  const currentTime = Date.now();
  const list = [...events];

  if (section === "organizers") {
    return list.sort((a, b) =>
      getOrganizerName(a).localeCompare(getOrganizerName(b), "pt-BR"),
    );
  }

  if (section === "urgency" || section === "week" || section === "upcoming") {
    return list.sort(
      (a, b) => getEventTimestamp(a.eventDate) - getEventTimestamp(b.eventDate),
    );
  }

  if (section === "hot") {
    return list.sort((a, b) => {
      const aScore =
        (normalizeText(a.status).includes("published") ? 2 : 0) +
        (getEventTimestamp(a.eventDate) >= currentTime ? 1 : 0);
      const bScore =
        (normalizeText(b.status).includes("published") ? 2 : 0) +
        (getEventTimestamp(b.eventDate) >= currentTime ? 1 : 0);

      if (bScore !== aScore) return bScore - aScore;

      return getEventTimestamp(a.eventDate) - getEventTimestamp(b.eventDate);
    });
  }

  if (section === "culture") {
    return list.sort((a, b) => {
      const aCulture = ["teatro", "tours", "business"].includes(matchCollection(a).id)
        ? 1
        : 0;
      const bCulture = ["teatro", "tours", "business"].includes(matchCollection(b).id)
        ? 1
        : 0;

      if (bCulture !== aCulture) return bCulture - aCulture;

      return getEventTimestamp(a.eventDate) - getEventTimestamp(b.eventDate);
    });
  }

  return list.sort(
    (a, b) => getEventTimestamp(a.eventDate) - getEventTimestamp(b.eventDate),
  );
}

export default function CustomerEventsPage() {
  const searchParams = useSearchParams();

  const querySection = searchParams.get("section") || "";
  const queryQuickFilter = searchParams.get("quickFilter") || "all";
  const queryCollection = searchParams.get("collection") || "all";
  const queryTitle = searchParams.get("title") || "";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState("all");
  const [activeCollection, setActiveCollection] = useState("all");

  useEffect(() => {
    async function loadEvents() {
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
        console.error("CUSTOMER EVENTS ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  useEffect(() => {
    setActiveQuickFilter(isValidQuickFilter(queryQuickFilter) ? queryQuickFilter : "all");
    setActiveCollection(isValidCollection(queryCollection) ? queryCollection : "all");
  }, [queryQuickFilter, queryCollection]);

  function goTo(path: string) {
    window.location.href = path;
  }

  function clearAllFilters() {
    setSearch("");
    setActiveQuickFilter("all");
    setActiveCollection("all");
    window.location.href = "/customer/events";
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) =>
        getEventTimestamp(first.eventDate) - getEventTimestamp(second.eventDate),
    );
  }, [events]);

  const contextTitle =
    queryTitle || sectionMeta[querySection]?.title || "Explore eventos";

  const contextDescription =
    sectionMeta[querySection]?.description ||
    "Descubra experiências, encontre o estilo ideal e continue sua jornada a partir da dashboard.";

  const baseFilteredEvents = useMemo(() => {
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

      const collectionMatches =
        activeCollection === "all"
          ? true
          : matchCollection(event, index).id === activeCollection;

      const contextMatches = sectionMatchesEvent(event, index, querySection);

      return searchMatches && quickFilterMatches && collectionMatches && contextMatches;
    });
  }, [sortedEvents, search, activeQuickFilter, activeCollection, querySection]);

  const filteredEvents = useMemo(() => {
    return sortEventsBySection(baseFilteredEvents, querySection);
  }, [baseFilteredEvents, querySection]);

  const featuredEvent = filteredEvents[0] || sortedEvents[0];

  const publishedCount = sortedEvents.filter((event) =>
    normalizeText(event.status).includes("published"),
  ).length;

  const upcomingCount = sortedEvents.filter(
    (event) => getEventTimestamp(event.eventDate) >= Date.now(),
  ).length;

  if (loading) {
    return (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-lg font-medium text-slate-800">
            Carregando eventos...
          </p>
        </div>
      </div>
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
                placeholder="Buscar shows, festivais, tours, esportes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <button
              type="button"
              onClick={() => goTo("/customer/dashboard")}
              className="h-14 rounded-2xl border border-sky-100 bg-sky-50 px-5 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
            >
              Voltar para home
            </button>

            <button
              type="button"
              onClick={clearAllFilters}
              className="h-14 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Limpar filtros
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

          {(querySection || activeCollection !== "all" || activeQuickFilter !== "all") && (
            <div className="mt-4 flex flex-wrap gap-2">
              {querySection ? (
                <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                  Origem: {contextTitle}
                </span>
              ) : null}

              {activeQuickFilter !== "all" ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  Filtro: {getQuickFilterLabel(activeQuickFilter)}
                </span>
              ) : null}

              {activeCollection !== "all" ? (
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                  Coleção: {getCollectionLabel(activeCollection)}
                </span>
              ) : null}
            </div>
          )}
        </div>
      </section>

      {featuredEvent ? (
        <section className="mt-8">
          <div className="overflow-hidden rounded-[36px] border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative min-h-[400px] overflow-hidden rounded-[30px]">
              {getEventImage(featuredEvent) ? (
                <img
                  src={getEventImage(featuredEvent)}
                  alt={featuredEvent.name || "Evento"}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700" />
              )}

              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/25" />

              <div className="relative z-10 grid min-h-[400px] content-end p-8 text-white md:p-10">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur">
                      {contextTitle}
                    </span>

                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                      {getRelativeLabel(featuredEvent.eventDate)}
                    </span>

                    <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur">
                      {getStatusLabel(featuredEvent.status)}
                    </span>
                  </div>

                  <h1 className="mt-6 text-4xl font-black leading-tight md:text-6xl">
                    {contextTitle}
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
                    {contextDescription}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/85">
                    <span>🎟️ {filteredEvents.length} evento(s) nesta visão</span>
                    <span>📅 {formatDate(featuredEvent.eventDate)}</span>
                    <span>📍 {getLocationLabel(featuredEvent)}</span>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => goTo(`/customer/events/${featuredEvent.id}`)}
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100"
                    >
                      Ver evento em destaque
                    </button>

                    <button
                      type="button"
                      onClick={() => goTo("/customer/dashboard")}
                      className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15"
                    >
                      Voltar para dashboard
                    </button>
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
            Catálogo completo pronto para descoberta.
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
            Eventos em estado ideal para venda.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Próximos eventos
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {upcomingCount}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Agenda viva para os próximos dias.
          </p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Resultado atual
          </p>
          <p className="mt-3 text-3xl font-black text-slate-950">
            {filteredEvents.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Eventos encontrados com os filtros aplicados.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600">
            Catálogo
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950 md:text-3xl">
            {contextTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            A lista abaixo acompanha o contexto do clique feito na dashboard.
          </p>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
            Nenhum evento encontrado com esse contexto e esses filtros.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredEvents.map((event, index) => {
              const image = getCardImage(event);
              const collection = matchCollection(event, index);

              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => goTo(`/customer/events/${event.id}`)}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative h-56 overflow-hidden">
                    {image ? (
                      <img
                        src={image}
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

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

                    <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white">
                      <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur">
                        {collection.label}
                      </span>

                      <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                        {getRelativeLabel(event.eventDate)}
                      </span>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <h3 className="line-clamp-2 text-2xl font-black leading-tight">
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
                        event.content?.summary ||
                          event.shortDescription ||
                          event.description,
                        100,
                      )}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p>📍 {getLocationLabel(event)}</p>
                      <p>👥 Capacidade: {event.capacity ?? 0}</p>
                    </div>

                    <div className="mt-6">
                      <span className="inline-flex rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
                        Ver evento
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}