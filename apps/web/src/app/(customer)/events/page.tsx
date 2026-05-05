"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
  ticketTypes?: Array<{
    id: string;
    name?: string;
    price?: string | number;
    quantity?: number;
    status?: string;
  }>;
};

type CategoryItem = {
  id: string;
  label: string;
  title: string;
  shortLabel: string;
  icon: string;
  image: string;
  keywords: string[];
};

type DateFilter = "all" | "today" | "week" | "weekend" | "soon";
type PriceFilter = "all" | "free" | "paid";
type SortFilter = "relevance" | "date" | "price";

const categories: CategoryItem[] = [
  {
    id: "shows",
    label: "Festas e Shows",
    title: "Festas e Shows em Qualquer lugar",
    shortLabel: "Shows",
    icon: "🎤",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    keywords: ["show", "shows", "festa", "festas", "festival", "balada", "dj", "música", "musica"],
  },
  {
    id: "theater",
    label: "Teatro",
    title: "Peças de teatro em Qualquer lugar",
    shortLabel: "Teatro",
    icon: "🎭",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
    keywords: ["teatro", "espetáculo", "espetaculo", "palco", "musical"],
  },
  {
    id: "comedy",
    label: "Comedy",
    title: "Eventos de comedy em Qualquer lugar",
    shortLabel: "Comedy",
    icon: "😂",
    image:
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=900&q=80",
    keywords: ["stand", "comedy", "humor", "comédia", "comedia", "risada", "risadas"],
  },
  {
    id: "sports",
    label: "Esportes",
    title: "Eventos esportivos em Qualquer lugar",
    shortLabel: "Esportes",
    icon: "⚽",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
    keywords: ["esporte", "esportes", "futebol", "corrida", "luta", "arena", "campeonato", "fight"],
  },
  {
    id: "business",
    label: "Congressos",
    title: "Congressos e eventos profissionais em Qualquer lugar",
    shortLabel: "Congressos",
    icon: "🏛️",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80",
    keywords: [
      "congresso",
      "congressos",
      "feira",
      "summit",
      "palestra",
      "corporativo",
      "networking",
      "negócios",
      "negocios",
      "tech",
    ],
  },
  {
    id: "food",
    label: "Gastronomia",
    title: "Eventos gastronômicos em Qualquer lugar",
    shortLabel: "Gastronomia",
    icon: "🍔",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
    keywords: [
      "gastronomia",
      "gastronômico",
      "gastronomico",
      "food",
      "vinho",
      "cerveja",
      "hambúrguer",
      "hamburguer",
      "gourmet",
      "degustação",
      "degustacao",
    ],
  },
  {
    id: "kids",
    label: "Infantil",
    title: "Eventos para crianças em Qualquer lugar",
    shortLabel: "Infantil",
    icon: "🎈",
    image:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
    keywords: ["infantil", "família", "familia", "criança", "crianca", "kids", "crianças", "criancas"],
  },
  {
    id: "tours",
    label: "Passeios",
    title: "Passeios e experiências em Qualquer lugar",
    shortLabel: "Passeios",
    icon: "🌎",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    keywords: [
      "passeio",
      "passeios",
      "tour",
      "excursão",
      "excursao",
      "visita",
      "rota",
      "histórico",
      "historico",
      "natureza",
      "cultural",
      "fotográfica",
      "fotografica",
    ],
  },
  {
    id: "online",
    label: "Online",
    title: "Eventos online",
    shortLabel: "Online",
    icon: "💻",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    keywords: ["online", "digital", "remoto", "streaming", "workshop", "mentoria"],
  },
];

const cityCards = [
  {
    city: "São Paulo",
    state: "SP",
    image:
      "https://images.unsplash.com/photo-1543059080-f9b1272213d5?auto=format&fit=crop&w=900&q=80",
  },
  {
    city: "Rio de Janeiro",
    state: "RJ",
    image:
      "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=900&q=80",
  },
  {
    city: "Belo Horizonte",
    state: "MG",
    image:
      "https://images.unsplash.com/photo-1604449345680-88025e44ac85?auto=format&fit=crop&w=900&q=80",
  },
  {
    city: "Salvador",
    state: "BA",
    image:
      "https://images.unsplash.com/photo-1589820296156-2454bb8a6ad1?auto=format&fit=crop&w=900&q=80",
  },
];

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
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

function normalizeText(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getEventDate(event?: EventItem | null) {
  return event?.startDate || event?.eventDate;
}

function getFutureTimestamp(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function getEventImage(event?: EventItem | null) {
  if (!event) return "";

  return (
    event.media?.coverImageUrl ||
    event.media?.bannerImageUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.thumbnailUrl ||
    event.media?.gallery?.[0] ||
    ""
  );
}

function getLocationLabel(event?: EventItem | null) {
  const venue = event?.location?.venueName;
  const cityState = [event?.location?.city, event?.location?.state]
    .filter(Boolean)
    .join(" - ");

  return [venue, cityState].filter(Boolean).join(", ") || "Local a confirmar";
}

function getOrganizerName(event?: EventItem | null) {
  return (
    event?.organizer?.tradeName ||
    event?.organizer?.legalName ||
    "Organizador parceiro"
  );
}

function getMinimumPrice(event?: EventItem | null) {
  const prices =
    event?.ticketTypes
      ?.map((ticketType) => toNumber(ticketType.price))
      .filter((price) => price > 0) || [];

  if (prices.length === 0) return null;

  return Math.min(...prices);
}

function eventMatchesSearch(event: EventItem, search: string) {
  const term = normalizeText(search);

  if (!term) return true;

  const haystack = normalizeText(
    [
      event.id,
      event.name,
      event.description,
      event.shortDescription,
      event.category,
      event.highlightTag,
      event.content?.headline,
      event.content?.summary,
      event.organizer?.tradeName,
      event.organizer?.legalName,
      event.location?.venueName,
      event.location?.city,
      event.location?.state,
      event.status,
    ].join(" "),
  );

  return haystack.includes(term);
}

function eventMatchesCategory(event: EventItem, category: CategoryItem) {
  const directCategoryText = normalizeText(
    [event.category, event.highlightTag].join(" "),
  );

  const categoryLabel = normalizeText(category.label);
  const categoryShortLabel = normalizeText(category.shortLabel);

  if (
    directCategoryText.includes(categoryLabel) ||
    directCategoryText.includes(categoryShortLabel)
  ) {
    return true;
  }

  const haystack = normalizeText(
    [
      event.name,
      event.description,
      event.shortDescription,
      event.category,
      event.highlightTag,
      event.organizer?.tradeName,
      event.organizer?.legalName,
      event.location?.venueName,
      event.location?.city,
      event.location?.state,
    ].join(" "),
  );

  return category.keywords.some((keyword) =>
    haystack.includes(normalizeText(keyword)),
  );
}

function getCategoryById(id: string) {
  return categories.find((category) => category.id === id) || null;
}

function getCategoryForEvent(event: EventItem, index = 0) {
  return (
    categories.find((category) => eventMatchesCategory(event, category)) ||
    categories[index % categories.length]
  );
}

function getEventGradient(index: number) {
  const gradients = [
    "from-sky-600 via-blue-600 to-indigo-700",
    "from-fuchsia-600 via-purple-600 to-indigo-700",
    "from-emerald-500 via-teal-500 to-cyan-700",
    "from-orange-500 via-amber-500 to-yellow-500",
    "from-rose-500 via-pink-500 to-fuchsia-700",
    "from-slate-800 via-slate-900 to-slate-950",
    "from-cyan-500 via-sky-600 to-blue-800",
    "from-lime-500 via-emerald-600 to-teal-800",
    "from-violet-500 via-indigo-600 to-slate-950",
  ];

  return gradients[index % gradients.length];
}

function isToday(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  const today = new Date();

  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function isThisWeek(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const diffMs = date.getTime() - Date.now();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  return diffDays >= 0 && diffDays <= 7;
}

function isWeekend(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const diffMs = date.getTime() - Date.now();
  const day = date.getDay();

  return diffMs >= 0 && (day === 5 || day === 6 || day === 0);
}

function isSoon(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const diffMs = date.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= 0 && diffHours <= 72;
}

function buildSection(events: EventItem[], start: number, count = 4) {
  if (events.length === 0) return [];

  const result: EventItem[] = [];

  for (let index = 0; index < Math.min(count, events.length); index += 1) {
    result.push(events[(start + index) % events.length]);
  }

  return result;
}

function getPageTitle(activeCategory: string, queryTitle: string, city: string) {
  if (queryTitle) return queryTitle;

  if (activeCategory !== "all") {
    const category = getCategoryById(activeCategory);

    if (category?.title) {
      if (city) return category.title.replace("Qualquer lugar", city);
      return category.title;
    }
  }

  if (city) return `Eventos em ${city}`;

  return "Eventos em Qualquer lugar";
}

function getDateFilterLabel(filter: DateFilter) {
  if (filter === "today") return "Hoje";
  if (filter === "week") return "Esta semana";
  if (filter === "weekend") return "Fim de semana";
  if (filter === "soon") return "Última chamada";

  return "Qualquer data";
}

function getPriceFilterLabel(filter: PriceFilter) {
  if (filter === "free") return "Grátis";
  if (filter === "paid") return "Pago";

  return "Todos os preços";
}

function getSortFilterLabel(filter: SortFilter) {
  if (filter === "date") return "Data mais próxima";
  if (filter === "price") return "Menor preço";

  return "Relevância";
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function SectionTitle({
  title,
  actionLabel = "Ver tudo",
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[20px] font-black text-slate-950">{title}</h2>

      {onAction && actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-bold text-sky-600 hover:text-sky-700"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function EventCard({
  event,
  index,
  onOpen,
}: {
  event: EventItem;
  index: number;
  onOpen: () => void;
}) {
  const image = getEventImage(event);
  const category = getCategoryForEvent(event, index);
  const minimumPrice = getMinimumPrice(event);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-w-0 overflow-hidden bg-transparent text-left transition"
    >
      <div
        className={`relative h-[150px] overflow-hidden rounded-[8px] bg-gradient-to-r ${getEventGradient(
          index,
        )}`}
      >
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
          {category.shortLabel}
        </span>
      </div>

      <div className="pt-2">
        <h3 className="line-clamp-2 text-[14px] font-black leading-5 text-slate-950">
          {event.name || "Evento sem nome"}
        </h3>

        <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">
          {formatDate(getEventDate(event))}
        </p>

        <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">
          {getLocationLabel(event)}
        </p>

        <p className="mt-2 text-[12px] font-black text-slate-950">
          {minimumPrice === null
            ? "Consultar valores"
            : `A partir de ${formatMoney(minimumPrice)}`}
        </p>
      </div>
    </button>
  );
}

function WideEventCard({
  event,
  index,
  onOpen,
}: {
  event: EventItem;
  index: number;
  onOpen: () => void;
}) {
  const image = getEventImage(event);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid grid-cols-[128px_1fr] gap-3 rounded-[8px] bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`h-[76px] overflow-hidden rounded-[7px] bg-gradient-to-r ${getEventGradient(
          index,
        )}`}
      >
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 self-center">
        <h3 className="line-clamp-1 text-[14px] font-black text-slate-950">
          {event.name || "Evento sem nome"}
        </h3>
        <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">
          {formatDate(getEventDate(event))}
        </p>
        <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">
          {getOrganizerName(event)}
        </p>
      </div>
    </button>
  );
}

function CustomerEventsPageContent() {
  const searchParams = useSearchParams();

  const queryTitle = searchParams.get("title") || "";
  const queryCollection = searchParams.get("collection") || "";
  const queryCity = searchParams.get("city") || "";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("relevance");

  useEffect(() => {
    function handleHeaderSearch(event: Event) {
      const customEvent = event as CustomEvent<string>;
      setSearch(customEvent.detail || "");
    }

    window.addEventListener(
      "customer-header-search",
      handleHeaderSearch as EventListener,
    );

    return () => {
      window.removeEventListener(
        "customer-header-search",
        handleHeaderSearch as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    const categoryFromUrl = getCategoryById(queryCollection);

    if (categoryFromUrl) {
      setActiveCategory(categoryFromUrl.id);
      return;
    }

    setActiveCategory("all");
  }, [queryCollection]);

  useEffect(() => {
    async function loadEvents() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch("http://localhost:3001/v1/events", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await safeJson<any>(response);

        if (response.status === 401) {
          localStorage.removeItem("token");
          window.location.href = "/login";
          return;
        }

        if (!response.ok) {
          alert(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar eventos",
          );
          return;
        }

        const eventList = Array.isArray(data) ? data : [];

        const detailedEvents = await Promise.all(
          eventList.map(async (event: EventItem) => {
            try {
              const detailResponse = await fetch(
                `http://localhost:3001/v1/events/${event.id}`,
                {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                },
              );

              const detailData = await safeJson<EventItem>(detailResponse);

              if (detailResponse.ok && detailData) {
                return {
                  ...event,
                  ...detailData,
                };
              }

              return event;
            } catch {
              return event;
            }
          }),
        );

        setEvents(detailedEvents);
      } catch (error) {
        console.error("CUSTOMER EVENTS ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    loadEvents();
  }, []);

  function goTo(path: string) {
    window.location.href = path;
  }

  function updateSearch(value: string) {
    setSearch(value);

    window.dispatchEvent(
      new CustomEvent("customer-header-search-sync", {
        detail: value,
      }),
    );
  }

  function clearFilters() {
    updateSearch("");
    setDateFilter("all");
    setPriceFilter("all");
    setSortFilter("relevance");
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) =>
        getFutureTimestamp(getEventDate(first)) -
        getFutureTimestamp(getEventDate(second)),
    );
  }, [events]);

  const collectionEvents = useMemo(() => {
    if (activeCategory === "all") return sortedEvents;

    const category = getCategoryById(activeCategory);

    if (!category) return sortedEvents;

    return sortedEvents.filter((event) => eventMatchesCategory(event, category));
  }, [sortedEvents, activeCategory]);

  const filteredEvents = useMemo(() => {
    const base = collectionEvents.filter((event) => {
      const matchesSearch = eventMatchesSearch(event, search);

      const matchesDate =
        dateFilter === "all"
          ? true
          : dateFilter === "today"
            ? isToday(getEventDate(event))
            : dateFilter === "week"
              ? isThisWeek(getEventDate(event))
              : dateFilter === "weekend"
                ? isWeekend(getEventDate(event))
                : dateFilter === "soon"
                  ? isSoon(getEventDate(event))
                  : true;

      const minimumPrice = getMinimumPrice(event);

      const matchesPrice =
        priceFilter === "all"
          ? true
          : priceFilter === "free"
            ? minimumPrice === null || minimumPrice === 0
            : minimumPrice !== null && minimumPrice > 0;

      const matchesCity = queryCity
        ? normalizeText(event.location?.city).includes(normalizeText(queryCity)) ||
          normalizeText(event.location?.state).includes(normalizeText(queryCity))
        : true;

      return matchesSearch && matchesDate && matchesPrice && matchesCity;
    });

    return [...base].sort((first, second) => {
      if (sortFilter === "date") {
        return (
          getFutureTimestamp(getEventDate(first)) -
          getFutureTimestamp(getEventDate(second))
        );
      }

      if (sortFilter === "price") {
        const firstPrice = getMinimumPrice(first);
        const secondPrice = getMinimumPrice(second);

        return (firstPrice ?? 999999) - (secondPrice ?? 999999);
      }

      const firstStatus = String(first.status || "").toUpperCase();
      const secondStatus = String(second.status || "").toUpperCase();

      if (firstStatus === "PUBLISHED" && secondStatus !== "PUBLISHED") return -1;
      if (firstStatus !== "PUBLISHED" && secondStatus === "PUBLISHED") return 1;

      return (
        getFutureTimestamp(getEventDate(first)) -
        getFutureTimestamp(getEventDate(second))
      );
    });
  }, [
    collectionEvents,
    search,
    dateFilter,
    priceFilter,
    sortFilter,
    queryCity,
  ]);

  const pageTitle = getPageTitle(activeCategory, queryTitle, queryCity);
  const activeCategoryData = getCategoryById(activeCategory);

  const hotEvents = buildSection(filteredEvents, 0, 4);
  const showEvents = buildSection(filteredEvents, 1, 4);
  const partyEvents = buildSection(filteredEvents, 2, 4);
  const nearEvents = buildSection(filteredEvents, 3, 4);
  const lastCall = buildSection(
    filteredEvents.filter((event) => isSoon(getEventDate(event))).length > 0
      ? filteredEvents.filter((event) => isSoon(getEventDate(event)))
      : filteredEvents,
    0,
    6,
  );

  if (loading) {
    return (
      <main className="mx-auto max-w-[980px] px-4 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            Carregando eventos...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <div className="mx-auto max-w-[980px] px-4 pb-14 pt-7">
        <section className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
            <button
              type="button"
              onClick={() => goTo("/dashboard")}
              className="font-semibold text-sky-600 hover:text-sky-700"
            >
              Página inicial
            </button>
            <span>&gt;</span>
            <span>Coleções</span>
            <span>&gt;</span>
            <span className="font-semibold text-slate-700">
              {activeCategoryData?.label || "Eventos"}
            </span>
          </div>

          <h1 className="text-[34px] font-black leading-tight text-slate-950 md:text-[44px]">
            {pageTitle}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Encontre eventos, compare opções, filtre por data ou preço e abra o
            evento para continuar sua compra.
          </p>
        </section>

        <section className="mb-8 rounded-[14px] bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_210px]">
            <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-white px-4">
              <span className="mr-3 text-slate-400">🔎</span>
              <input
                type="text"
                placeholder="Buscar por nome, cidade, local ou produtor"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <select
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value as DateFilter)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Data</option>
              <option value="today">Hoje</option>
              <option value="week">Esta semana</option>
              <option value="weekend">Fim de semana</option>
              <option value="soon">Última chamada</option>
            </select>

            <select
              value={priceFilter}
              onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="all">Preço</option>
              <option value="free">Grátis</option>
              <option value="paid">Pago</option>
            </select>

            <select
              value={sortFilter}
              onChange={(event) => setSortFilter(event.target.value as SortFilter)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none"
            >
              <option value="relevance">Ordenar por Relevância</option>
              <option value="date">Data mais próxima</option>
              <option value="price">Menor preço</option>
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              {filteredEvents.length} resultado(s)
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              {getDateFilterLabel(dateFilter)}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              {getPriceFilterLabel(priceFilter)}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
              {getSortFilterLabel(sortFilter)}
            </span>

            {search ||
            dateFilter !== "all" ||
            priceFilter !== "all" ||
            sortFilter !== "relevance" ? (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100"
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        </section>

        {filteredEvents.length === 0 ? (
          <section className="rounded-[18px] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-black text-slate-950">
              Nenhum evento encontrado
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Tente mudar os filtros ou criar eventos dessa coleção no seed.
            </p>
          </section>
        ) : (
          <>
            <section className="mb-10">
              <SectionTitle
                title={
                  activeCategory === "shows"
                    ? "Festas e shows que estão em alta"
                    : "Eventos que estão em alta"
                }
                actionLabel="Ver tudo"
                onAction={() => clearFilters()}
              />

              <div className="grid gap-5 md:grid-cols-4">
                {hotEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="mb-10">
              <SectionTitle
                title={
                  activeCategory === "shows"
                    ? "Shows para curtir muito"
                    : "Eventos para curtir muito"
                }
                actionLabel="Ver tudo"
                onAction={() => setDateFilter("week")}
              />

              <div className="grid gap-5 md:grid-cols-4">
                {showEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 4}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="mb-10">
              <SectionTitle
                title={
                  activeCategory === "shows"
                    ? "Festas e baladas"
                    : "Experiências selecionadas"
                }
                actionLabel="Ver tudo"
                onAction={() => setSortFilter("date")}
              />

              <div className="grid gap-5 md:grid-cols-4">
                {partyEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 8}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="mb-10">
              <SectionTitle
                title="Última chamada"
                actionLabel="Ver tudo"
                onAction={() => setDateFilter("soon")}
              />

              <div className="grid gap-3 md:grid-cols-2">
                {lastCall.map((event, index) => (
                  <WideEventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="mb-10">
              <SectionTitle
                title="Eventos próximos"
                actionLabel="Ver tudo"
                onAction={() => setSortFilter("date")}
              />

              <div className="grid gap-5 md:grid-cols-4">
                {nearEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 12}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="mb-10">
              <SectionTitle title="Todos os resultados" actionLabel="" />

              <div className="grid gap-5 md:grid-cols-4">
                {filteredEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 16}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
        

        <section className="mb-8">
          <SectionTitle title="Descubra o que fazer na sua cidade" actionLabel="" />

          <div className="grid gap-4 md:grid-cols-4">
            {cityCards.map((city) => (
              <button
                key={`${city.city}-${city.state}`}
                type="button"
                onClick={() => updateSearch(city.city)}
                className="group relative h-[150px] overflow-hidden rounded-[14px] bg-slate-900 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <img
                  src={city.image}
                  alt={city.city}
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                    Cidade
                  </p>
                  <p className="mt-1 text-xl font-black">{city.city}</p>
                  <p className="text-sm text-white/75">{city.state}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
    
  );
}
function EventsPageLoading() {
  return (
    <main className="mx-auto max-w-[980px] px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">
          Carregando eventos...
        </p>
      </div>
    </main>
  );
}

export default function CustomerEventsPage() {
  return (
    <Suspense fallback={<EventsPageLoading />}>
      <CustomerEventsPageContent />
    </Suspense>
  );
}
