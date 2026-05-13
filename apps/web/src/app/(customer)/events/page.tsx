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
  ticketTypes?: Array<{
    id: string;
    name?: string;
    price?: string | number;
    quantity?: number;
    status?: string;
  }>;
  location?: EventLocation | null;
};

type CategoryItem = {
  id: string;
  label: string;
  title: string;
  shortLabel: string;
  keywords: string[];
};

type DateFilter = "all" | "today" | "week" | "weekend" | "soon";
type PriceFilter = "all" | "free" | "paid";
type SortFilter = "relevance" | "date" | "price";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const categories: CategoryItem[] = [
  {
    id: "shows",
    label: "Festas e Shows",
    title: "Festas e Shows",
    shortLabel: "Shows",
    keywords: ["show", "shows", "festa", "festas", "festival", "balada", "dj", "musica", "música", "FESTAS_SHOWS"],
  },
  {
    id: "theater",
    label: "Teatros e Espetáculos",
    title: "Teatros e Espetáculos",
    shortLabel: "Teatro",
    keywords: ["teatro", "teatros", "espetaculo", "espetáculo", "palco", "musical", "TEATROS_ESPETACULOS"],
  },
  {
    id: "party",
    label: "Festas Juninas",
    title: "Festas Juninas",
    shortLabel: "Festas",
    keywords: ["junina", "arraia", "arraiá", "quadrilha", "sao joao", "são joão"],
  },
  {
    id: "comedy",
    label: "Stand Up Comedy",
    title: "Stand Up Comedy",
    shortLabel: "Comedy",
    keywords: ["stand", "stand-up", "comedy", "humor", "comedia", "comédia", "STAND_UP_COMEDY"],
  },
  {
    id: "sports",
    label: "Esportes",
    title: "Esportes",
    shortLabel: "Esportes",
    keywords: ["esporte", "esportes", "futebol", "corrida", "luta", "arena", "campeonato", "ESPORTES"],
  },
  {
    id: "tours",
    label: "Passeios e Tours",
    title: "Passeios e Tours",
    shortLabel: "Passeios",
    keywords: ["tour", "passeio", "passeios", "excursao", "excursão", "visita", "PASSEIOS_TOURS"],
  },
  {
    id: "discounts",
    label: "Descontos exclusivos",
    title: "Descontos exclusivos",
    shortLabel: "Descontos",
    keywords: ["desconto", "promo", "promocao", "promoção", "social", "meia"],
  },
  {
    id: "business",
    label: "Congressos e Palestras",
    title: "Congressos e Palestras",
    shortLabel: "Congressos",
    keywords: ["congresso", "congressos", "feira", "summit", "palestra", "corporativo", "CONGRESSOS"],
  },
  {
    id: "kids",
    label: "Infantil",
    title: "Infantil",
    shortLabel: "Infantil",
    keywords: ["infantil", "familia", "família", "crianca", "criança", "kids", "INFANTIL"],
  },
];

const viewTitles: Record<string, string> = {
  recent: "Vistos recentemente",
  "most-bought": "Eventos mais comprados nas últimas 24h",
  today: "O que fazer hoje",
  "last-call": "Última chamada",
  shows: "Festas, shows e festivais",
  business: "Eventos corporativos",
  culture: "Passeios e eventos culturais",
  comedy: "Peças de teatro e stand-up comedy",
  sports: "Eventos esportivos",
  kids: "Eventos e atividades para crianças",
  gastronomy: "Eventos gastronômicos",
  courses: "Cursos e workshops",
};

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;

  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
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

function getTimestamp(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function getEventImage(event?: EventItem | null) {
  return (
    event?.media?.coverImageUrl ||
    event?.media?.bannerImageUrl ||
    event?.media?.mobileBannerUrl ||
    event?.media?.thumbnailUrl ||
    event?.media?.gallery?.[0] ||
    ""
  );
}

function getLocationLabel(event?: EventItem | null) {
  const venue = event?.location?.venueName;
  const cityState = [event?.location?.city, event?.location?.state].filter(Boolean).join(" - ");

  return [venue, cityState].filter(Boolean).join(", ") || "Local a confirmar";
}

function getMinimumPrice(event?: EventItem | null) {
  const prices =
    event?.ticketTypes?.map((ticketType) => toNumber(ticketType.price)).filter((price) => price > 0) || [];

  if (prices.length === 0) return null;

  return Math.min(...prices);
}

function getTotalTicketQuantity(event?: EventItem | null) {
  return event?.ticketTypes?.reduce((sum, ticketType) => sum + Number(ticketType.quantity || 0), 0) || 0;
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
  const haystack = normalizeText(
    [
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
    ].join(" "),
  );

  const directCategory = normalizeText([event.category, event.highlightTag].join(" "));

  return (
    directCategory.includes(normalizeText(category.label)) ||
    directCategory.includes(normalizeText(category.shortLabel)) ||
    category.keywords.some((keyword) => haystack.includes(normalizeText(keyword)))
  );
}

function getCategoryById(id: string) {
  return categories.find((category) => category.id === id) || null;
}

function getCategoryForEvent(event: EventItem, fallbackIndex = 0) {
  return categories.find((category) => eventMatchesCategory(event, category)) || categories[fallbackIndex % categories.length];
}

function getEventGradient(index: number) {
  const gradients = [
    "from-orange-500 via-orange-600 to-[#19002f]",
    "from-[#19002f] via-zinc-900 to-orange-600",
    "from-neutral-950 via-neutral-800 to-orange-600",
    "from-orange-400 via-orange-700 to-neutral-950",
    "from-[#19002f] via-orange-700 to-orange-500",
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

  const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

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

  const diffHours = (date.getTime() - Date.now()) / (1000 * 60 * 60);

  return diffHours >= 0 && diffHours <= 72;
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

function inferViewCollection(view: string) {
  if (view === "shows") return "shows";
  if (view === "business") return "business";
  if (view === "comedy") return "comedy";
  if (view === "sports") return "sports";
  if (view === "kids") return "kids";
  if (view === "culture") return "tours";

  return "";
}

function inferDateFromView(view: string): DateFilter {
  if (view === "today") return "today";
  if (view === "last-call") return "soon";

  return "all";
}

function getPageTitle(collection: string, view: string, title: string, city: string) {
  if (title) return title;

  const category = getCategoryById(collection);

  if (category) return city ? `${category.title} em ${city}` : `${category.title} em Qualquer lugar`;

  if (view && viewTitles[view]) return city ? `${viewTitles[view]} em ${city}` : viewTitles[view];

  if (city) return `Eventos em ${city}`;

  return "Eventos em Qualquer lugar";
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getRecentIds() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(localStorage.getItem("astro_recent_events") || "[]");

    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecentEvent(id: string) {
  try {
    const previous = getRecentIds();
    const next = [id, ...previous.filter((item) => item !== id)].slice(0, 24);

    localStorage.setItem("astro_recent_events", JSON.stringify(next));
  } catch {
    // localStorage can fail in private mode. Navigation should still work.
  }
}

function buildRealViewBase(events: EventItem[], view: string) {
  const byDate = [...events].sort((first, second) => getTimestamp(getEventDate(first)) - getTimestamp(getEventDate(second)));

  if (view === "recent") {
    const recentIds = getRecentIds();

    if (recentIds.length > 0) {
      const byId = new Map(events.map((event) => [event.id, event]));
      return recentIds.map((id) => byId.get(id)).filter(Boolean) as EventItem[];
    }

    return byDate.slice(0, 24);
  }

  if (view === "most-bought") {
    return [...events]
      .sort((first, second) => getTotalTicketQuantity(second) - getTotalTicketQuantity(first))
      .slice(0, 48);
  }

  if (view === "today") {
    return events.filter((event) => isToday(getEventDate(event)));
  }

  if (view === "last-call") {
    return events.filter((event) => isSoon(getEventDate(event)));
  }

  if (view === "gastronomy") {
    return events.filter((event) => {
      const haystack = normalizeText([event.name, event.description, event.category, event.highlightTag].join(" "));
      return ["gastronomia", "gastronomico", "gastronômico", "food", "vinho", "cerveja"].some((keyword) =>
        haystack.includes(normalizeText(keyword)),
      );
    });
  }

  if (view === "courses") {
    return events.filter((event) => {
      const haystack = normalizeText([event.name, event.description, event.category, event.highlightTag].join(" "));
      return ["curso", "workshop", "aula", "treinamento", "mentoria"].some((keyword) =>
        haystack.includes(normalizeText(keyword)),
      );
    });
  }

  return events;
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-xs font-black transition ${
        active
          ? "bg-[#19002f] text-white shadow-sm"
          : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-orange-50 hover:text-[#19002f]"
      }`}
    >
      {children}
    </button>
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
      className="group min-w-0 overflow-hidden rounded-[12px] bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`relative h-[164px] overflow-hidden bg-gradient-to-r ${getEventGradient(index)}`}>
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-[#19002f] shadow-sm">
          {category.shortLabel}
        </span>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 min-h-[40px] text-[15px] font-black leading-5 text-neutral-950">
          {event.name || "Evento sem nome"}
        </h3>

        <p className="mt-2 line-clamp-1 text-[12px] font-semibold text-neutral-500">
          {formatDate(getEventDate(event))}
        </p>

        <p className="mt-1 line-clamp-1 text-[12px] text-neutral-500">
          {getLocationLabel(event)}
        </p>

        <p className="mt-3 text-[12px] font-black text-neutral-950">
          {minimumPrice === null ? "Consultar valores" : `A partir de ${formatMoney(minimumPrice)}`}
        </p>
      </div>
    </button>
  );
}

function CustomerEventsPageContent() {
  const searchParams = useSearchParams();

  const queryTitle = searchParams.get("title") || "";
  const queryCollection = searchParams.get("collection") || "";
  const queryView = searchParams.get("view") || "";
  const queryCity = searchParams.get("city") || "";
  const queryDate = searchParams.get("date") || "";
  const queryPrice = searchParams.get("price") || "";
  const querySort = searchParams.get("sort") || "";
  const querySearch = searchParams.get("q") || "";

  const inferredCollection = queryCollection || inferViewCollection(queryView);
  const inferredDate = (queryDate || inferDateFromView(queryView)) as DateFilter;

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(querySearch);
  const [activeCategory, setActiveCategory] = useState(inferredCollection || "all");
  const [dateFilter, setDateFilter] = useState<DateFilter>(
    ["all", "today", "week", "weekend", "soon"].includes(inferredDate) ? inferredDate : "all",
  );
  const [priceFilter, setPriceFilter] = useState<PriceFilter>(
    ["all", "free", "paid"].includes(queryPrice) ? (queryPrice as PriceFilter) : "all",
  );
  const [sortFilter, setSortFilter] = useState<SortFilter>(
    ["relevance", "date", "price"].includes(querySort) ? (querySort as SortFilter) : "relevance",
  );
  const [city, setCity] = useState(queryCity);
  const [lockedView, setLockedView] = useState(queryView);

  useEffect(() => {
    function handleHeaderSearch(event: Event) {
      const customEvent = event as CustomEvent<string>;
      setSearch(customEvent.detail || "");
    }

    window.addEventListener("customer-header-search", handleHeaderSearch as EventListener);

    return () => {
      window.removeEventListener("customer-header-search", handleHeaderSearch as EventListener);
    };
  }, []);

  useEffect(() => {
    setSearch(querySearch);
    setActiveCategory(inferredCollection || "all");
    setDateFilter(["all", "today", "week", "weekend", "soon"].includes(inferredDate) ? inferredDate : "all");
    setPriceFilter(["all", "free", "paid"].includes(queryPrice) ? (queryPrice as PriceFilter) : "all");
    setSortFilter(["relevance", "date", "price"].includes(querySort) ? (querySort as SortFilter) : "relevance");
    setCity(queryCity);
    setLockedView(queryView);
  }, [querySearch, inferredCollection, inferredDate, queryPrice, querySort, queryCity, queryView]);

  useEffect(() => {
    async function loadEvents() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/events`, {
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
          alert(typeof data?.message === "string" ? data.message : "Erro ao carregar eventos");
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

  function goTo(path: string) {
    window.location.href = path;
  }

  function setUrl(next: {
    category?: string;
    date?: DateFilter;
    price?: PriceFilter;
    sort?: SortFilter;
    city?: string;
    q?: string;
    view?: string;
    title?: string;
  }) {
    const params = new URLSearchParams();

    const nextView = next.view ?? lockedView;
    const nextCategory = next.category ?? activeCategory;
    const nextDate = next.date ?? dateFilter;
    const nextPrice = next.price ?? priceFilter;
    const nextSort = next.sort ?? sortFilter;
    const nextCity = next.city ?? city;
    const nextSearch = next.q ?? search;
    const nextTitle = next.title;

    if (nextView) {
      params.set("view", nextView);
      params.set("title", nextTitle || viewTitles[nextView] || queryTitle || "Eventos");
    }

    if (nextCategory && nextCategory !== "all") {
      params.set("collection", nextCategory);

      if (!nextView) {
        const category = getCategoryById(nextCategory);
        if (category) params.set("title", category.title);
      }
    }

    if (nextDate && nextDate !== "all") params.set("date", nextDate);
    if (nextPrice && nextPrice !== "all") params.set("price", nextPrice);
    if (nextSort && nextSort !== "relevance") params.set("sort", nextSort);
    if (nextCity) params.set("city", nextCity);
    if (nextSearch) params.set("q", nextSearch);

    const query = params.toString();

    window.history.pushState(null, "", query ? `/events?${query}` : "/events");
  }

  function updateSearch(value: string) {
    setSearch(value);
    setUrl({ q: value });

    window.dispatchEvent(
      new CustomEvent("customer-header-search-sync", {
        detail: value,
      }),
    );
  }

  function updateCategory(value: string) {
    setActiveCategory(value);
    setLockedView("");
    setUrl({ category: value, view: "" });
  }

  function updateView(value: string) {
    const category = inferViewCollection(value);

    setLockedView(value);
    setActiveCategory(category || "all");
    setDateFilter(inferDateFromView(value));
    setUrl({
      view: value,
      category: category || "all",
      date: inferDateFromView(value),
      title: viewTitles[value] || "Eventos",
    });
  }

  function updateDate(value: DateFilter) {
    setDateFilter(value);
    setLockedView("");
    setUrl({ date: value, view: "" });
  }

  function updatePrice(value: PriceFilter) {
    setPriceFilter(value);
    setUrl({ price: value });
  }

  function updateSort(value: SortFilter) {
    setSortFilter(value);
    setUrl({ sort: value });
  }

  function updateCity(value: string) {
    setCity(value);
    setUrl({ city: value });
  }

  function clearFilters() {
    setSearch("");
    setActiveCategory("all");
    setDateFilter("all");
    setPriceFilter("all");
    setSortFilter("relevance");
    setCity("");
    setLockedView("");

    window.history.pushState(null, "", "/events");

    window.dispatchEvent(
      new CustomEvent("customer-header-search-sync", {
        detail: "",
      }),
    );
  }

  function openEvent(event: EventItem) {
    rememberRecentEvent(event.id);
    goTo(`/events/${event.id}`);
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) => getTimestamp(getEventDate(first)) - getTimestamp(getEventDate(second)),
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    const baseByView = buildRealViewBase(sortedEvents, lockedView);

    const base = baseByView.filter((event) => {
      const category = getCategoryById(activeCategory);
      const matchesCategory = activeCategory === "all" || !category ? true : eventMatchesCategory(event, category);

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

      const matchesCity = city
        ? normalizeText(event.location?.city).includes(normalizeText(city)) ||
          normalizeText(event.location?.state).includes(normalizeText(city)) ||
          normalizeText(event.location?.venueName).includes(normalizeText(city))
        : true;

      return matchesCategory && matchesSearch && matchesDate && matchesPrice && matchesCity;
    });

    return [...base].sort((first, second) => {
      if (sortFilter === "date") {
        return getTimestamp(getEventDate(first)) - getTimestamp(getEventDate(second));
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

      if (lockedView === "most-bought") {
        return getTotalTicketQuantity(second) - getTotalTicketQuantity(first);
      }

      return getTimestamp(getEventDate(first)) - getTimestamp(getEventDate(second));
    });
  }, [sortedEvents, lockedView, activeCategory, search, dateFilter, priceFilter, city, sortFilter]);

  const pageTitle = getPageTitle(activeCategory, lockedView, queryTitle, city);
  const activeCategoryData = getCategoryById(activeCategory);

  const activeBadges = [
    lockedView ? viewTitles[lockedView] || lockedView : null,
    activeCategoryData?.label || "Todos os eventos",
    getDateFilterLabel(dateFilter),
    getPriceFilterLabel(priceFilter),
    getSortFilterLabel(sortFilter),
    city || "Qualquer lugar",
  ].filter(Boolean);

  if (loading) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-neutral-700">Carregando eventos...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] text-neutral-950">
      <div className="mx-auto max-w-[1180px] px-4 pb-14 pt-7">
        <section className="mb-6 rounded-[24px] bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-[13px] text-neutral-500">
            <button
              type="button"
              onClick={() => goTo("/dashboard")}
              className="font-black text-[#19002f] hover:text-orange-700"
            >
              Página inicial
            </button>
            <span>&gt;</span>
            <span>Eventos</span>
            {activeCategoryData ? (
              <>
                <span>&gt;</span>
                <span className="font-black text-neutral-700">{activeCategoryData.label}</span>
              </>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_270px] lg:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
                Filtros funcionais
              </p>

              <h1 className="mt-2 max-w-4xl text-[34px] font-black leading-tight text-neutral-950 md:text-[46px]">
                {pageTitle}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-500">
                Os filtros abaixo mudam a lista de verdade e também atualizam a URL da tela.
              </p>
            </div>

            <div className="rounded-[18px] bg-gradient-to-r from-orange-500 to-[#19002f] p-5 text-white">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                Resultado
              </p>
              <p className="mt-2 text-[34px] font-black leading-none">{filteredEvents.length}</p>
              <p className="mt-1 text-sm font-semibold text-white/75">evento(s) encontrados</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {activeBadges.map((badge) => (
              <span
                key={String(badge)}
                className="rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-black text-[#19002f] ring-1 ring-orange-100"
              >
                {badge}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-6 rounded-[20px] bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_180px_auto]">
            <div className="flex h-12 items-center rounded-xl border border-neutral-200 bg-white px-4">
              <span className="mr-3 text-neutral-400">⌕</span>
              <input
                type="text"
                placeholder="Buscar por nome, cidade, local ou produtor"
                value={search}
                onChange={(event) => updateSearch(event.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </div>

            <select
              value={city}
              onChange={(event) => updateCity(event.target.value)}
              className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700 outline-none focus:border-[#19002f]"
            >
              <option value="">Qualquer lugar</option>
              <option value="São Paulo">São Paulo</option>
              <option value="Rio de Janeiro">Rio de Janeiro</option>
              <option value="Belo Horizonte">Belo Horizonte</option>
              <option value="Curitiba">Curitiba</option>
              <option value="Ribeirão Preto">Ribeirão Preto</option>
              <option value="Campinas">Campinas</option>
            </select>

            <select
              value={dateFilter}
              onChange={(event) => updateDate(event.target.value as DateFilter)}
              className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700 outline-none focus:border-[#19002f]"
            >
              <option value="all">Qualquer data</option>
              <option value="today">Hoje</option>
              <option value="week">Esta semana</option>
              <option value="weekend">Fim de semana</option>
              <option value="soon">Última chamada</option>
            </select>

            <select
              value={priceFilter}
              onChange={(event) => updatePrice(event.target.value as PriceFilter)}
              className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-bold text-neutral-700 outline-none focus:border-[#19002f]"
            >
              <option value="all">Todos os preços</option>
              <option value="free">Grátis</option>
              <option value="paid">Pago</option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="h-12 rounded-xl bg-[#19002f] px-5 text-sm font-black text-white hover:bg-[#2a0648]"
            >
              Limpar
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <FilterButton active={!lockedView && activeCategory === "all"} onClick={() => updateCategory("all")}>
              Todos
            </FilterButton>

            <FilterButton active={lockedView === "recent"} onClick={() => updateView("recent")}>
              Vistos recentemente
            </FilterButton>

            <FilterButton active={lockedView === "most-bought"} onClick={() => updateView("most-bought")}>
              Mais comprados
            </FilterButton>

            <FilterButton active={lockedView === "today"} onClick={() => updateView("today")}>
              Hoje
            </FilterButton>

            <FilterButton active={lockedView === "last-call"} onClick={() => updateView("last-call")}>
              Última chamada
            </FilterButton>

            {categories.map((category) => (
              <FilterButton
                key={category.id}
                active={!lockedView && activeCategory === category.id}
                onClick={() => updateCategory(category.id)}
              >
                {category.shortLabel}
              </FilterButton>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-neutral-500">
              Mostrando {filteredEvents.length} de {events.length} evento(s) carregados.
            </div>

            <select
              value={sortFilter}
              onChange={(event) => updateSort(event.target.value as SortFilter)}
              className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-black text-neutral-700 outline-none focus:border-[#19002f]"
            >
              <option value="relevance">Ordenar por Relevância</option>
              <option value="date">Ordenar por Data</option>
              <option value="price">Ordenar por Preço</option>
            </select>
          </div>
        </section>

        {filteredEvents.length > 0 ? (
          <section className="grid grid-cols-2 gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onOpen={() => openEvent(event)}
              />
            ))}
          </section>
        ) : (
          <section className="rounded-[22px] border border-neutral-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-[24px] font-black text-neutral-950">Nenhum evento encontrado</h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-neutral-500">
              Este filtro está vazio. Tente outra categoria, outra data, outra cidade ou limpe os filtros.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-xl bg-[#19002f] px-5 py-3 text-sm font-black text-white hover:bg-[#2a0648]"
            >
              Ver todos os eventos
            </button>
          </section>
        )}
      </div>
    </main>
  );
}

export default function CustomerEventsPage() {
  return (
    <Suspense fallback={<main className="p-8">Carregando...</main>}>
      <CustomerEventsPageContent />
    </Suspense>
  );
}
