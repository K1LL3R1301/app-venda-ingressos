"use client";

import { useEffect, useMemo, useState } from "react";

type StoredUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type EventMedia = {
  coverImageUrl?: string;
  bannerImageUrl?: string;
  thumbnailUrl?: string;
  mobileBannerUrl?: string;
  gallery?: string[];
};

type EventLocation = {
  venueName?: string;
  city?: string;
  state?: string;
  addressLine1?: string;
  neighborhood?: string;
};

type EventItem = {
  id: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  eventDate?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  category?: string;
  highlightTag?: string;
  media?: EventMedia | null;
  location?: EventLocation | null;
  organizer?: {
    id?: string;
    tradeName?: string;
    legalName?: string;
    logoUrl?: string;
  };
  ticketTypes?: Array<{
    id: string;
    name?: string;
    price?: string | number;
    quantity?: number;
    status?: string;
  }>;
};

type OrderItem = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: string | number;
  status?: string;
  createdAt?: string;
  expiresAt?: string | null;
  event?: {
    id?: string;
    name?: string;
    description?: string;
    eventDate?: string;
    startDate?: string;
  };
  items?: Array<{
    id: string;
    quantity?: number;
    ticketType?: {
      id?: string;
      name?: string;
    };
    tickets?: Array<{
      id: string;
      code?: string;
      status?: string;
      currentOwnerUserId?: string | null;
    }>;
  }>;
};

type TransferUserInfo = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  cpfNormalized?: string;
};

type TicketTransferRequestItem = {
  id: string;
  status?: string;
  responseReason?: string;
  requestedAt?: string;
  respondedAt?: string;
  expiresAt?: string;
  requestedByName?: string;
  requestedByEmail?: string;
  requestedByCpf?: string;
  fromName?: string;
  fromEmail?: string;
  fromCpf?: string;
  toName?: string;
  toEmail?: string;
  toCpf?: string;
  mode?: string;
  returnOfTransferRequestId?: string | null;
  ticket?: {
    id: string;
    code?: string;
    status?: string;
    holderName?: string;
    holderEmail?: string;
    holderCpf?: string;
    currentOwnerUserId?: string | null;
    orderItem?: {
      id?: string;
      ticketType?: {
        id?: string;
        name?: string;
      };
      order?: {
        id?: string;
        event?: {
          id?: string;
          name?: string;
          description?: string;
          eventDate?: string;
          startDate?: string;
        };
      };
    };
  };
  order?: {
    id?: string;
    event?: {
      id?: string;
      name?: string;
      description?: string;
      eventDate?: string;
      startDate?: string;
    };
  };
  requestedByUser?: TransferUserInfo;
  fromUser?: TransferUserInfo;
  toUser?: TransferUserInfo;
};

type CategoryItem = {
  id: string;
  label: string;
  icon: string;
  image: string;
  keywords: string[];
  targetId?: string;
};

const categories: CategoryItem[] = [
  {
    id: "shows",
    label: "Shows",
    icon: "🎤",
    targetId: "section-shows",
    image:
      "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=80",
    keywords: ["show", "festa", "festival", "balada", "dj", "música", "musica"],
  },
  {
    id: "theater",
    label: "Teatro",
    icon: "🎭",
    targetId: "section-culture",
    image:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=900&q=80",
    keywords: ["teatro", "espetáculo", "espetaculo", "palco", "musical"],
  },
  {
    id: "comedy",
    label: "Comedy",
    icon: "😂",
    targetId: "section-culture",
    image:
      "https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=900&q=80",
    keywords: ["stand", "comedy", "humor", "comédia", "comedia"],
  },
  {
    id: "sports",
    label: "Esportes",
    icon: "⚽",
    targetId: "section-sports",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
    keywords: ["esporte", "futebol", "corrida", "luta", "arena", "campeonato"],
  },
  {
    id: "business",
    label: "Congressos",
    icon: "🏛️",
    targetId: "section-business",
    image:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=80",
    keywords: ["congresso", "feira", "summit", "palestra", "corporativo"],
  },
  {
    id: "food",
    label: "Gastronomia",
    icon: "🍔",
    targetId: "section-food",
    image:
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
    keywords: [
      "gastronomia",
      "food",
      "vinho",
      "cerveja",
      "hambúrguer",
      "hamburguer",
    ],
  },
  {
    id: "kids",
    label: "Infantil",
    icon: "🎈",
    targetId: "section-kids",
    image:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&q=80",
    keywords: ["infantil", "família", "familia", "criança", "crianca", "kids"],
  },
  {
    id: "tours",
    label: "Passeios",
    icon: "🌎",
    targetId: "section-culture",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    keywords: ["tour", "passeio", "excursão", "excursao", "visita"],
  },
  {
    id: "online",
    label: "Online",
    icon: "💻",
    targetId: "section-most-bought",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    keywords: ["online", "digital", "remoto", "streaming"],
  },
  {
    id: "my",
    label: "Meus pedidos",
    icon: "🎟️",
    image:
      "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=900&q=80",
    keywords: [],
  },
];

const cityCards = [
  {
    city: "São Paulo",
    gradient: "from-slate-800 via-slate-700 to-slate-950",
  },
  {
    city: "Belo Horizonte",
    gradient: "from-blue-700 via-sky-700 to-cyan-700",
  },
  {
    city: "Salvador",
    gradient: "from-cyan-700 via-teal-700 to-emerald-700",
  },
  {
    city: "Rio de Janeiro",
    gradient: "from-sky-700 via-blue-700 to-indigo-800",
  },
];

const faqItems = [
  "Como eu cancelo ou peço reembolso de ingressos?",
  "Como localizar meus ingressos?",
  "Como trocar a titularidade do ingresso?",
  "Como acessar minha wallet?",
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

function getOrderEventDate(order?: OrderItem | null) {
  return order?.event?.startDate || order?.event?.eventDate;
}

function getFutureTimestamp(value?: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return Number.MAX_SAFE_INTEGER;

  return date.getTime();
}

function getStatusLabel(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "PAID") return "Pago";
  if (normalized === "PENDING") return "Pendente";
  if (normalized === "PENDING_PAYMENT") return "Aguardando pagamento";
  if (normalized === "AVAILABLE") return "Disponível";
  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "PENDING_ACCEPTANCE") return "Aguardando aceite";
  if (normalized === "TRANSFER_PENDING") return "Transferência pendente";
  if (normalized === "ACCEPTED") return "Aceita";
  if (normalized === "RETURNED") return "Devolvido";
  if (normalized === "REJECTED") return "Recusada";
  if (normalized === "TRANSFERRED") return "Transferido";
  if (normalized === "USED") return "Utilizado";
  if (normalized === "CANCELED") return "Cancelado";
  if (normalized === "PUBLISHED") return "Publicado";
  if (normalized === "DRAFT") return "Rascunho";

  return status || "Disponível";
}

function getStatusClasses(status?: string) {
  const normalized = String(status || "").toUpperCase();

  if (
    normalized === "PAID" ||
    normalized === "AVAILABLE" ||
    normalized === "ACTIVE" ||
    normalized === "ACCEPTED" ||
    normalized === "PUBLISHED"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "PENDING" ||
    normalized === "PENDING_ACCEPTANCE" ||
    normalized === "TRANSFER_PENDING"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (normalized === "PENDING_PAYMENT") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (normalized === "RETURNED" || normalized === "TRANSFERRED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (normalized === "REJECTED" || normalized === "CANCELED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function isPendingOrder(order?: OrderItem | null) {
  return order?.status === "PENDING" || order?.status === "PENDING_PAYMENT";
}

function isVisibleTransfer(transfer?: TicketTransferRequestItem | null) {
  if (!transfer) return false;

  return String(transfer.status || "").toUpperCase() !== "RETURNED";
}

function getTransferEventName(transfer?: TicketTransferRequestItem | null) {
  return (
    transfer?.ticket?.orderItem?.order?.event?.name ||
    transfer?.order?.event?.name ||
    "Transferência recebida"
  );
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
      event.organizer?.tradeName,
      event.organizer?.legalName,
      event.location?.venueName,
      event.location?.city,
      event.location?.state,
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
      event.organizer?.tradeName,
      event.organizer?.legalName,
    ].join(" "),
  );

  return category.keywords.some((keyword) =>
    haystack.includes(normalizeText(keyword)),
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

function getCategoryForEvent(event: EventItem) {
  return (
    categories.find(
      (category) =>
        category.id !== "my" &&
        category.keywords.length > 0 &&
        eventMatchesCategory(event, category),
    ) || categories[0]
  );
}

function buildSection(events: EventItem[], start: number, count = 4) {
  if (events.length === 0) return [];

  const result: EventItem[] = [];

  for (let index = 0; index < Math.min(count, events.length); index += 1) {
    result.push(events[(start + index) % events.length]);
  }

  return result;
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
    <div className="mb-3 flex items-center justify-between gap-4">
      <h2 className="text-[18px] font-bold text-slate-950">{title}</h2>

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
  compact = false,
  onOpen,
}: {
  event: EventItem;
  index: number;
  compact?: boolean;
  onOpen: () => void;
}) {
  const image = getEventImage(event);
  const price = getMinimumPrice(event);
  const category = getCategoryForEvent(event);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-w-0 overflow-hidden rounded-[10px] bg-white text-left transition hover:-translate-y-0.5"
    >
      <div
        className={`relative overflow-hidden rounded-[10px] bg-gradient-to-r ${getEventGradient(
          index,
        )} ${compact ? "h-[92px]" : "h-[128px]"}`}
      >
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
          {category.label}
        </span>
      </div>

      <div className="pt-2">
        <h3 className="line-clamp-2 text-[13px] font-bold leading-4 text-slate-950">
          {event.name || "Evento sem nome"}
        </h3>

        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
          {formatDate(getEventDate(event))}
        </p>

        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
          {getLocationLabel(event)}
        </p>

        <p className="mt-1 text-[11px] font-bold text-slate-900">
          {price === null ? "Consultar valores" : `A partir de ${formatMoney(price)}`}
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
      className="grid grid-cols-[112px_1fr] gap-3 rounded-[10px] bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div
        className={`h-[64px] overflow-hidden rounded-[8px] bg-gradient-to-r ${getEventGradient(
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

      <div className="min-w-0">
        <h3 className="line-clamp-1 text-[13px] font-bold text-slate-950">
          {event.name || "Evento sem nome"}
        </h3>
        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
          {formatDate(getEventDate(event))}
        </p>
        <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
          {getOrganizerName(event)}
        </p>
      </div>
    </button>
  );
}

export default function CustomerDashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<
    TicketTransferRequestItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [pageWarning, setPageWarning] = useState("");
  const [search, setSearch] = useState("");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

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
    async function loadDashboard() {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      if (rawUser) {
        try {
          setUser(JSON.parse(rawUser) as StoredUser);
        } catch (error) {
          console.error("Erro ao ler usuário:", error);
        }
      }

      try {
        const [eventsRes, ordersRes, transfersRes] = await Promise.allSettled([
          fetch("http://localhost:3001/v1/events", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:3001/v1/orders/customer", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch("http://localhost:3001/v1/tickets/customer/transfers/incoming", {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        const warningParts: string[] = [];

        if (eventsRes.status === "fulfilled") {
          const data = await safeJson<any>(eventsRes.value);

          if (eventsRes.value.ok) {
            setEvents(Array.isArray(data) ? data : []);
          } else {
            setEvents([]);
            warningParts.push("eventos");
          }
        } else {
          setEvents([]);
          warningParts.push("eventos");
        }

        if (ordersRes.status === "fulfilled") {
          const data = await safeJson<any>(ordersRes.value);

          if (ordersRes.value.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "/login";
            return;
          }

          if (ordersRes.value.ok) {
            setOrders(Array.isArray(data) ? data : []);
          } else {
            setOrders([]);
            warningParts.push("pedidos");
          }
        } else {
          setOrders([]);
          warningParts.push("pedidos");
        }

        if (transfersRes.status === "fulfilled") {
          const data = await safeJson<any>(transfersRes.value);

          if (transfersRes.value.ok) {
            setIncomingTransfers(Array.isArray(data) ? data : []);
          } else {
            setIncomingTransfers([]);
            warningParts.push("transferências");
          }
        } else {
          setIncomingTransfers([]);
          warningParts.push("transferências");
        }

        if (warningParts.length > 0) {
          setPageWarning(
            `Parte da página não carregou agora: ${warningParts.join(
              ", ",
            )}. O restante segue disponível.`,
          );
        } else {
          setPageWarning("");
        }
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

  function updateSearch(value: string) {
    setSearch(value);

    window.dispatchEvent(
      new CustomEvent("customer-header-search-sync", {
        detail: value,
      }),
    );
  }

  function handleCategoryClick(category: CategoryItem) {
    if (category.id === "my") {
      goTo("/orders");
      return;
    }

    const params = new URLSearchParams({
      collection: category.id,
    });

    goTo(`/events?${params.toString()}`);
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) =>
        getFutureTimestamp(getEventDate(first)) -
        getFutureTimestamp(getEventDate(second)),
    );
  }, [events]);

  const searchedEvents = useMemo(() => {
    return sortedEvents.filter((event) => eventMatchesSearch(event, search));
  }, [sortedEvents, search]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => isPendingOrder(order));
  }, [orders]);

  const visibleTransfers = useMemo(() => {
    return incomingTransfers.filter((transfer) => isVisibleTransfer(transfer));
  }, [incomingTransfers]);

  const pendingTransfers = useMemo(() => {
    return visibleTransfers.filter(
      (transfer) => transfer.status === "PENDING_ACCEPTANCE",
    );
  }, [visibleTransfers]);

  const heroEvents = searchedEvents.slice(0, 9);
  const activeHero =
    heroEvents.length > 0
      ? heroEvents[activeHeroIndex % heroEvents.length]
      : undefined;

  useEffect(() => {
    if (heroEvents.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveHeroIndex((current) => (current + 1) % heroEvents.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [heroEvents.length]);

  useEffect(() => {
    if (activeHeroIndex >= heroEvents.length) {
      setActiveHeroIndex(0);
    }
  }, [activeHeroIndex, heroEvents.length]);

  function previousHero() {
    if (heroEvents.length === 0) return;

    setActiveHeroIndex((current) =>
      current === 0 ? heroEvents.length - 1 : current - 1,
    );
  }

  function nextHero() {
    if (heroEvents.length === 0) return;

    setActiveHeroIndex((current) => (current + 1) % heroEvents.length);
  }

  const mostBought = buildSection(searchedEvents, 0, 4);
  const todayEvents = buildSection(searchedEvents, 2, 4);
  const lastCall = buildSection(searchedEvents, 4, 6);

  const shows = searchedEvents.filter((event) =>
    eventMatchesCategory(event, categories[0]),
  );
  const business = searchedEvents.filter((event) =>
    eventMatchesCategory(event, categories[4]),
  );
  const sports = searchedEvents.filter((event) =>
    eventMatchesCategory(event, categories[3]),
  );
  const kids = searchedEvents.filter((event) =>
    eventMatchesCategory(event, categories[6]),
  );
  const food = searchedEvents.filter((event) =>
    eventMatchesCategory(event, categories[5]),
  );
  const culture = searchedEvents.filter(
    (event) =>
      eventMatchesCategory(event, categories[1]) ||
      eventMatchesCategory(event, categories[2]) ||
      eventMatchesCategory(event, categories[7]),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[980px] px-4 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              Carregando sua página...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f7] text-slate-950">
      <div className="mx-auto max-w-[980px] px-4 pb-14 pt-6">
        {pageWarning ? (
          <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {pageWarning}
          </section>
        ) : null}

        <section className="mb-12">
          <div className="mb-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Olá, {user?.name || "cliente"}
            </p>
            <h1 className="mt-1 text-[28px] font-black text-slate-950 md:text-[34px]">
              Encontre sua próxima experiência
            </h1>
          </div>

          <div className="relative mx-auto h-[390px] max-w-[980px] overflow-visible">
            {heroEvents.map((event, index) => {
              const normalizedIndex =
                (index - activeHeroIndex + heroEvents.length) % heroEvents.length;

              if (normalizedIndex > 8) return null;

              const positions = [
                "left-1/2 top-8 z-30 h-[250px] w-[520px] -translate-x-1/2 rotate-0 opacity-100",
                "left-[170px] top-[72px] z-20 h-[220px] w-[330px] rotate-[-5deg] opacity-90",
                "right-[170px] top-[72px] z-20 h-[220px] w-[330px] rotate-[5deg] opacity-90",
                "left-[58px] top-[96px] z-10 h-[190px] w-[285px] rotate-[-8deg] opacity-78",
                "right-[58px] top-[96px] z-10 h-[190px] w-[285px] rotate-[8deg] opacity-78",
                "left-[250px] top-0 z-0 h-[150px] w-[230px] rotate-[-3deg] opacity-55",
                "right-[250px] top-0 z-0 h-[150px] w-[230px] rotate-[3deg] opacity-55",
                "left-[248px] bottom-[46px] z-0 h-[145px] w-[225px] rotate-[4deg] opacity-50",
                "right-[248px] bottom-[46px] z-0 h-[145px] w-[225px] rotate-[-4deg] opacity-50",
              ];

              return (
                <button
                  key={`${event.id}-${index}`}
                  type="button"
                  onClick={() => goTo(`/events/${event.id}`)}
                  className={`absolute hidden overflow-hidden rounded-2xl bg-gradient-to-r ${getEventGradient(
                    index,
                  )} text-left shadow-xl transition-all duration-500 md:block ${positions[normalizedIndex]}`}
                >
                  {getEventImage(event) ? (
                    <img
                      src={getEventImage(event)}
                      alt={event.name || "Evento"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                  {normalizedIndex === 0 ? (
                    <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                      <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-white/80">
                        Destaque
                      </p>
                      <h2 className="mt-2 line-clamp-2 text-[34px] font-black leading-[38px]">
                        {event.name || "Evento sem nome"}
                      </h2>
                      <p className="mt-3 text-[13px] font-semibold text-white/85">
                        {formatDate(getEventDate(event))}
                      </p>
                    </div>
                  ) : null}
                </button>
              );
            })}

            {activeHero ? (
              <button
                type="button"
                onClick={() => goTo(`/events/${activeHero.id}`)}
                className={`absolute left-1/2 top-8 z-30 h-[245px] w-[350px] -translate-x-1/2 overflow-hidden rounded-2xl bg-gradient-to-r ${getEventGradient(
                  activeHeroIndex,
                )} text-left shadow-xl md:hidden`}
              >
                {getEventImage(activeHero) ? (
                  <img
                    src={getEventImage(activeHero)}
                    alt={activeHero.name || "Evento"}
                    className="h-full w-full object-cover"
                  />
                ) : null}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
                    Destaque
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-[28px] font-black leading-[32px]">
                    {activeHero.name || "Evento sem nome"}
                  </h2>
                  <p className="mt-2 text-[12px] text-white/85">
                    {formatDate(getEventDate(activeHero))}
                  </p>
                </div>
              </button>
            ) : (
              <div className="absolute left-1/2 top-8 z-30 flex h-[245px] w-[350px] -translate-x-1/2 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-center text-white shadow-xl md:w-[520px]">
                <div>
                  <p className="text-[42px] font-black">🎟️</p>
                  <p className="mt-2 text-xl font-black">Eventos em breve</p>
                </div>
              </div>
            )}

            {heroEvents.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={previousHero}
                  className="absolute left-0 top-[160px] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-600 shadow-lg hover:bg-slate-50"
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={nextHero}
                  className="absolute right-0 top-[160px] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-600 shadow-lg hover:bg-slate-50"
                >
                  ›
                </button>
              </>
            ) : null}
          </div>

          {activeHero ? (
            <div className="-mt-8 text-center md:-mt-12">
              <h3 className="text-[18px] font-black text-slate-950">
                {activeHero.name}
              </h3>
              <p className="mt-1 text-[13px] text-slate-500">
                {getLocationLabel(activeHero)}
              </p>

              {heroEvents.length > 1 ? (
                <div className="mt-3 flex justify-center gap-1.5">
                  {heroEvents.map((event, index) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setActiveHeroIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === activeHeroIndex
                          ? "w-7 bg-[#006bff]"
                          : "w-1.5 bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section className="mb-8">
          <SectionTitle title="Explore nossas coleções" />

          <div className="grid gap-3 md:grid-cols-5">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className="group relative h-[126px] overflow-hidden rounded-[18px] bg-slate-900 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <img
                  src={category.image}
                  alt={category.label}
                  className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/5" />

                <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg shadow-sm">
                  {category.icon}
                </div>

                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    Coleção
                  </p>
                  <p className="mt-1 text-base font-black leading-tight">
                    {category.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {pendingOrders.length > 0 || pendingTransfers.length > 0 ? (
          <section className="mb-8 rounded-[14px] border border-sky-100 bg-white p-4 shadow-sm">
            <SectionTitle
              title="Sua área"
              actionLabel="Abrir pedidos"
              onAction={() => goTo("/orders")}
            />

            <div className="grid gap-3 md:grid-cols-2">
              {pendingOrders.slice(0, 2).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => goTo(`/orders/${order.id}`)}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"
                >
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getStatusClasses(
                      order.status,
                    )}`}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                  <p className="mt-2 line-clamp-1 text-sm font-black text-slate-950">
                    {order.event?.name || "Pedido pendente"}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {formatMoney(order.totalAmount)} ·{" "}
                    {formatDate(getOrderEventDate(order))}
                  </p>
                </button>
              ))}

              {pendingTransfers.slice(0, 2).map((transfer) => (
                <button
                  key={transfer.id}
                  type="button"
                  onClick={() => goTo(`/orders/transfer_${transfer.id}`)}
                  className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-left"
                >
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${getStatusClasses(
                      transfer.status,
                    )}`}
                  >
                    {getStatusLabel(transfer.status)}
                  </span>
                  <p className="mt-2 line-clamp-1 text-sm font-black text-slate-950">
                    {getTransferEventName(transfer)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Transferência recebida
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {search.trim() ? (
          <section className="mb-8">
            <SectionTitle
              title={`Resultados para "${search}"`}
              actionLabel="Limpar"
              onAction={() => updateSearch("")}
            />

            {searchedEvents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                Nenhum resultado encontrado.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
                {searchedEvents.slice(0, 8).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!search.trim() ? (
          <>
            <section id="section-most-bought" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Eventos mais comprados nas últimas 24h"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {mostBought.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="scroll-mt-20 mb-8">
              <SectionTitle
                title="O que fazer hoje"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {todayEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 2}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section className="mb-8">
              <SectionTitle
                title="Última chamada"
                onAction={() => goTo("/events")}
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

            <section id="section-shows" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Festas, shows e festivais"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {buildSection(shows.length > 0 ? shows : searchedEvents, 0, 4).map(
                  (event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      index={index + 4}
                      onOpen={() => goTo(`/events/${event.id}`)}
                    />
                  ),
                )}
              </div>
            </section>

            <section id="section-business" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Eventos corporativos"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {buildSection(
                  business.length > 0 ? business : searchedEvents,
                  0,
                  4,
                ).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 7}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section id="section-culture" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Passeios e eventos culturais"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {buildSection(
                  culture.length > 0 ? culture : searchedEvents,
                  1,
                  4,
                ).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 10}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section id="section-sports" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Eventos esportivos"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {buildSection(
                  sports.length > 0 ? sports : searchedEvents,
                  2,
                  4,
                ).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 13}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section id="section-kids" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Eventos e atividades para crianças"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {buildSection(
                  kids.length > 0 ? kids : searchedEvents,
                  2,
                  4,
                ).map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    index={index + 15}
                    onOpen={() => goTo(`/events/${event.id}`)}
                  />
                ))}
              </div>
            </section>

            <section id="section-food" className="scroll-mt-20 mb-8">
              <SectionTitle
                title="Eventos gastronômicos"
                onAction={() => goTo("/events")}
              />

              <div className="grid gap-4 md:grid-cols-4">
                {buildSection(
                  food.length > 0 ? food : searchedEvents,
                  3,
                  4,
                ).map((event, index) => (
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
        ) : null}

        <section className="mb-8">
          <SectionTitle title="Descubra o que fazer na sua cidade" />

          <div className="grid gap-4 md:grid-cols-4">
            {cityCards.map((city) => (
              <button
                key={city.city}
                type="button"
                onClick={() => updateSearch(city.city)}
                className={`h-[132px] overflow-hidden rounded-xl bg-gradient-to-br ${city.gradient} p-4 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
                  Cidade
                </p>
                <p className="mt-12 text-xl font-black">{city.city}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-xl bg-[#ebe5ff] p-6">
          <div className="grid gap-6 md:grid-cols-[1fr_0.75fr] md:items-center">
            <div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-bold text-white">
                Para produtores
              </span>
              <h2 className="mt-5 max-w-md text-3xl font-black leading-tight text-[#5b35ff]">
                Crie eventos, divulgue e venda ingressos com facilidade
              </h2>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-lg font-black text-[#5b35ff]">✦</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Publique e acompanhe suas vendas.
                  </p>
                </div>

                <div>
                  <p className="text-lg font-black text-[#5b35ff]">✧</p>
                  <p className="mt-1 text-sm font-semibold text-slate-700">
                    Controle pedidos, check-in e operação.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => goTo("/admin/events")}
                  className="rounded-lg bg-[#006bff] px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Criar evento
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/admin/dashboard")}
                  className="rounded-lg border border-[#006bff] bg-white px-5 py-3 text-sm font-bold text-[#006bff] hover:bg-blue-50"
                >
                  Ver minha dashboard
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 h-3 w-28 rounded-full bg-slate-200" />
                <div className="grid h-28 grid-cols-6 items-end gap-2">
                  {[30, 70, 45, 88, 55, 100].map((height, index) => (
                    <div
                      key={index}
                      className="rounded-t bg-[#006bff]"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <SectionTitle title="Tire suas dúvidas aqui" actionLabel="" />

          <div className="space-y-2">
            {faqItems.map((item, index) => {
              const active = activeFaq === index;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActiveFaq(active ? null : index)}
                  className="w-full rounded-lg bg-white px-4 py-4 text-left shadow-sm"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-bold text-slate-800">{item}</p>
                    <span className="text-lg font-black text-[#006bff]">
                      {active ? "−" : "+"}
                    </span>
                  </div>

                  {active ? (
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Acesse sua área do cliente em Meus pedidos para acompanhar
                      status, ingressos, transferências, cancelamentos e wallet.
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="text-xl font-black text-[#006bff]">Sympla</p>
              <p className="mt-2 text-sm text-slate-500">
                Plataforma de eventos e ingressos.
              </p>
            </div>

            <div className="grid gap-4 text-sm text-slate-500 md:grid-cols-4">
              <div>
                <p className="font-bold text-slate-800">Cliente</p>
                <button
                  type="button"
                  onClick={() => goTo("/orders")}
                  className="mt-2 block hover:text-slate-900"
                >
                  Meus pedidos
                </button>
                <button
                  type="button"
                  onClick={() => goTo("/wallet")}
                  className="mt-2 block hover:text-slate-900"
                >
                  Wallet
                </button>
              </div>

              <div>
                <p className="font-bold text-slate-800">Eventos</p>
                <button
                  type="button"
                  onClick={() => goTo("/events")}
                  className="mt-2 block hover:text-slate-900"
                >
                  Explorar
                </button>
              </div>

              <div>
                <p className="font-bold text-slate-800">Produtor</p>
                <button
                  type="button"
                  onClick={() => goTo("/admin/dashboard")}
                  className="mt-2 block hover:text-slate-900"
                >
                  Dashboard
                </button>
              </div>

              <div>
                <p className="font-bold text-slate-800">Conta</p>
                <p className="mt-2 break-all">{user?.email || "-"}</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
