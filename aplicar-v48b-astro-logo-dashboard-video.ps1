# aplicar-v48b-astro-logo-dashboard-video.ps1
# Aplicador autocontido: nao depende de arquivos ao lado do script.
# Rode na raiz do projeto plataforma-ingressos:
# powershell -ExecutionPolicy Bypass -File ".\aplicar-v48b-astro-logo-dashboard-video.ps1"

$ErrorActionPreference = "Stop"

$Root = Get-Location
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"

function Write-TextFile($RelativePath, $Content) {
  $Target = Join-Path $Root $RelativePath
  $TargetDir = Split-Path $Target -Parent

  if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  }

  if (Test-Path $Target) {
    $Backup = "$Target.bak-v48b-$Stamp"
    Copy-Item $Target $Backup -Force
    Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
  }

  Set-Content -Path $Target -Value $Content -Encoding UTF8
  Write-Host "Atualizado: $RelativePath" -ForegroundColor Green
}

function Write-Base64File($RelativePath, $Base64Content) {
  $Target = Join-Path $Root $RelativePath
  $TargetDir = Split-Path $Target -Parent

  if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
  }

  if (Test-Path $Target) {
    $Backup = "$Target.bak-v48b-$Stamp"
    Copy-Item $Target $Backup -Force
    Write-Host "Backup criado: $Backup" -ForegroundColor DarkGray
  }

  [System.IO.File]::WriteAllBytes($Target, [Convert]::FromBase64String($Base64Content))
  Write-Host "Atualizado: $RelativePath" -ForegroundColor Green
}

$HeaderContent = @'
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

export type CustomerHeaderUser = {
  id?: string;
  name?: string;
  email?: string;
  cpf?: string;
  role?: string;
};

type CustomerHeaderProps = {
  user: CustomerHeaderUser | null;
  activeNav?: "dashboard" | "orders" | "wallet" | "support";
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

type HeaderMenuItem = {
  label: string;
  href: string;
  emoji?: string;
};

function getInitial(user: CustomerHeaderUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
}

function goTo(path: string) {
  window.location.href = path;
}

function getTopNavClasses(isActive: boolean) {
  return isActive
    ? "text-sm font-black text-neutral-950"
    : "text-sm font-semibold text-neutral-600 hover:text-neutral-950";
}

function getMenuItemClasses(isActive: boolean) {
  return isActive
    ? "flex w-full items-center gap-3 rounded-xl bg-neutral-950 px-3 py-3 text-left text-sm font-black text-white"
    : "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50";
}

export default function CustomerHeader({
  user,
  activeNav = "dashboard",
  showSearch = false,
  searchPlaceholder = "Buscar experiências",
  searchValue = "",
  onSearchChange,
}: CustomerHeaderProps) {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const role = String(user?.role || "").toUpperCase();
  const canAccessAdmin = role === "ADMIN";
  const canAccessOperator = role === "OPERATOR";

  const isAdminArea = pathname.startsWith("/admin");
  const isOperatorArea = pathname.startsWith("/operator");

  const adminTopItems: HeaderMenuItem[] = [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Validação", href: "/admin/validation" },
  ];

  const adminMenuItems: HeaderMenuItem[] = [
    { label: "Dashboard", href: "/admin/dashboard", emoji: "🎟️" },
    { label: "Organizadores", href: "/admin/organizers", emoji: "🏢" },
    { label: "Eventos", href: "/admin/events", emoji: "🎫" },
    { label: "Pedidos", href: "/admin/orders", emoji: "🧾" },
    { label: "Atendimentos", href: "/admin/support", emoji: "💬" },
    { label: "Validação / Check-in", href: "/admin/validation", emoji: "✅" },
  ];

  const operatorTopItems: HeaderMenuItem[] = [
    { label: "Dashboard", href: "/operator/dashboard" },
    { label: "Eventos", href: "/operator/events" },
    { label: "Pedidos", href: "/operator/orders" },
    { label: "Check-in", href: "/operator/checkin" },
  ];

  const operatorMenuItems: HeaderMenuItem[] = [
    { label: "Dashboard", href: "/operator/dashboard", emoji: "🎟️" },
    { label: "Eventos", href: "/operator/events", emoji: "🎫" },
    { label: "Pedidos", href: "/operator/orders", emoji: "🧾" },
    { label: "Check-in", href: "/operator/checkin", emoji: "✅" },
  ];

  const customerTopItems: HeaderMenuItem[] = [
    { label: "Criar evento", href: "/admin/events/new", emoji: "⊕" },
    { label: "Meus eventos", href: "/admin/events", emoji: "□" },
    { label: "Meus ingressos", href: "/orders", emoji: "▱" },
  ];

  const topItems = useMemo(() => {
    if (isAdminArea) return adminTopItems;
    if (isOperatorArea) return operatorTopItems;

    return customerTopItems;
  }, [isAdminArea, isOperatorArea, canAccessAdmin]);

  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  useEffect(() => {
    function handleExternalSearchSync(event: Event) {
      const customEvent = event as CustomEvent<string>;
      setLocalSearch(customEvent.detail || "");
    }

    window.addEventListener(
      "customer-header-search-sync",
      handleExternalSearchSync as EventListener,
    );

    return () => {
      window.removeEventListener(
        "customer-header-search-sync",
        handleExternalSearchSync as EventListener,
      );
    };
  }, []);

  function isActivePath(href: string) {
    if (pathname === href) return true;
    return pathname.startsWith(`${href}/`);
  }

  function getCustomerActiveState(href: string) {
    if (href === "/orders") return activeNav === "orders";
    if (href === "/wallet") return activeNav === "wallet";
    if (href === "/support") return activeNav === "support";
    if (href === "/dashboard") return activeNav === "dashboard";

    return isActivePath(href);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  function handleGo(path: string) {
    setMenuOpen(false);
    goTo(path);
  }

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    onSearchChange?.(value);

    window.dispatchEvent(
      new CustomEvent("customer-header-search", {
        detail: value,
      }),
    );
  }

  function handleSearchSubmit() {
    window.dispatchEvent(
      new CustomEvent("customer-header-search", {
        detail: localSearch,
      }),
    );

    if (!window.location.pathname.startsWith("/dashboard")) {
      window.location.href = "/dashboard";
    }
  }

  function renderAdminMenu() {
    return (
      <>
        <div className="px-2 pb-2 pt-1">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
            Administração
          </p>

          <div className="mt-2 space-y-1">
            {adminMenuItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => handleGo(item.href)}
                className={getMenuItemClasses(isActivePath(item.href))}
              >
                <span className="w-5 text-center">{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-100 px-2 pb-2 pt-2">
          <button
            type="button"
            onClick={() => handleGo("/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <span className="w-5 text-center">🏠</span>
            <span>Tela principal</span>
          </button>
        </div>
      </>
    );
  }

  function renderOperatorMenu() {
    return (
      <>
        <div className="px-2 pb-2 pt-1">
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">
            Operador
          </p>

          <div className="mt-2 space-y-1">
            {operatorMenuItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => handleGo(item.href)}
                className={getMenuItemClasses(isActivePath(item.href))}
              >
                <span className="w-5 text-center">{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-100 px-2 pb-2 pt-2">
          <button
            type="button"
            onClick={() => handleGo("/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <span className="w-5 text-center">🏠</span>
            <span>Tela principal</span>
          </button>
        </div>
      </>
    );
  }

  function renderCustomerMenu() {
    return (
      <div className="p-2">
        <button type="button" onClick={() => handleGo("/dashboard")} className={getMenuItemClasses(activeNav === "dashboard")}>
          <span className="w-5 text-center">🏠</span>
          <span>Início</span>
        </button>

        <button type="button" onClick={() => handleGo("/orders")} className={getMenuItemClasses(activeNav === "orders")}>
          <span className="w-5 text-center">🎟️</span>
          <span>Meus ingressos</span>
        </button>

        <button type="button" onClick={() => handleGo("/support")} className={getMenuItemClasses(activeNav === "support")}>
          <span className="w-5 text-center">💬</span>
          <span>Suporte</span>
        </button>

        <button type="button" onClick={() => handleGo("/wallet")} className={getMenuItemClasses(activeNav === "wallet")}>
          <span className="w-5 text-center">👛</span>
          <span>Wallet</span>
        </button>

        {canAccessAdmin ? (
          <button
            type="button"
            onClick={() => handleGo("/admin/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <span className="w-5 text-center">🛠️</span>
            <span>Painel Admin</span>
          </button>
        ) : null}

        {canAccessOperator ? (
          <button
            type="button"
            onClick={() => handleGo("/operator/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <span className="w-5 text-center">🎧</span>
            <span>Painel Operador</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-5 px-5 py-3">
        <button
          type="button"
          onClick={() => goTo(isAdminArea ? "/admin/dashboard" : "/dashboard")}
          className="flex shrink-0 items-center"
          aria-label="Astro Ingressos"
        >
          <img
            src="/astro-ingressos-logo.png"
            alt="Astro Ingressos"
            className="h-16 w-auto object-contain"
          />
        </button>

        {showSearch ? (
          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="mx-auto flex h-12 w-full max-w-xl items-center rounded-2xl border border-neutral-200 bg-white px-4 shadow-sm">
              <span className="mr-3 text-neutral-400">🔎</span>

              <input
                type="text"
                placeholder={searchPlaceholder}
                value={localSearch}
                onChange={(event) => handleSearchChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearchSubmit();
                  }
                }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <nav className="ml-auto hidden items-center gap-5 md:flex">
          {topItems.map((item) => (
            <button
              key={item.href}
              type="button"
              onClick={() => goTo(item.href)}
              className={getTopNavClasses(
                isAdminArea || isOperatorArea
                  ? isActivePath(item.href)
                  : getCustomerActiveState(item.href),
              )}
            >
              <span className="mr-1 text-neutral-500">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-12 items-center gap-3 rounded-full border border-neutral-200 bg-white px-3 shadow-sm hover:bg-neutral-50"
          >
            <span className="text-lg">☰</span>

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700">
              {getInitial(user)}
            </span>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
              <div className="border-b border-neutral-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-neutral-900">
                      {user?.name || "Usuário"}
                    </p>

                    <p className="mt-1 break-all text-xs text-neutral-500">
                      {user?.email || "-"}
                    </p>

                    {user?.cpf ? (
                      <p className="mt-1 text-xs text-neutral-400">CPF: {user.cpf}</p>
                    ) : null}
                  </div>

                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-neutral-500">
                    {role || "USER"}
                  </span>
                </div>
              </div>

              {isAdminArea ? renderAdminMenu() : isOperatorArea ? renderOperatorMenu() : renderCustomerMenu()}

              <div className="border-t border-neutral-100 p-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  <span className="w-5 text-center">🚪</span>
                  <span>Sair</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {showSearch ? (
        <div className="mx-auto px-4 pb-4 md:hidden">
          <div className="flex h-12 items-center rounded-2xl border border-neutral-200 bg-white px-4 shadow-sm">
            <span className="mr-3 text-neutral-400">🔎</span>

            <input
              type="text"
              placeholder={searchPlaceholder}
              value={localSearch}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}

'@

$LayoutContent = @'
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import CustomerHeader, {
  type CustomerHeaderUser,
} from "../../components/customer/CustomerHeader";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [user, setUser] = useState<CustomerHeaderUser | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    try {
      const rawUser = localStorage.getItem("user");

      if (!rawUser) {
        setUser(null);
        return;
      }

      const parsedUser = JSON.parse(rawUser) as CustomerHeaderUser;
      setUser(parsedUser);
    } catch (error) {
      console.error("Erro ao ler usuário do localStorage:", error);
      setUser(null);
    }
  }, []);

  function getActiveNav(): "dashboard" | "orders" | "wallet" | "support" {
    if (pathname.startsWith("/orders")) return "orders";
    if (pathname.startsWith("/wallet")) return "wallet";
    if (pathname.startsWith("/support")) return "support";
    return "dashboard";
  }

  const shouldShowSearch = pathname.startsWith("/events");

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <CustomerHeader
        user={user}
        activeNav={getActiveNav()}
        showSearch={shouldShowSearch}
        searchPlaceholder="Buscar experiências"
      />
      {children}
    </div>
  );
}

'@

$DashboardContent = @'
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
  status?: string;
};

type CategoryItem = {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  keywords: string[];
};

type SectionDefinition = {
  id: string;
  title: string;
  view: "most-bought" | "today" | "last-call";
  events: EventItem[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

const PAGE_SIZE = 4;
const MAX_SECTION_PAGE = 2;

const categories: CategoryItem[] = [
  {
    id: "shows",
    label: "Festas e Shows",
    shortLabel: "Shows",
    icon: "♪",
    keywords: ["show", "shows", "festa", "festival", "balada", "dj", "música", "musica", "FESTAS_SHOWS"],
  },
  {
    id: "theater",
    label: "Teatros e Espetáculos",
    shortLabel: "Teatro",
    icon: "▣",
    keywords: ["teatro", "espetáculo", "espetaculo", "palco", "musical", "TEATROS_ESPETACULOS"],
  },
  {
    id: "party",
    label: "Festas Juninas",
    shortLabel: "Festas",
    icon: "♨",
    keywords: ["festa", "junina", "festival", "arraia", "arraiá", "FESTAS_SHOWS"],
  },
  {
    id: "comedy",
    label: "Stand Up Comedy",
    shortLabel: "Comedy",
    icon: "〰",
    keywords: ["stand", "stand-up", "comedy", "humor", "comédia", "comedia", "STAND_UP_COMEDY"],
  },
  {
    id: "sports",
    label: "Esportes",
    shortLabel: "Esportes",
    icon: "▰",
    keywords: ["esporte", "esportes", "futebol", "corrida", "luta", "arena", "campeonato", "ESPORTES"],
  },
  {
    id: "tours",
    label: "Passeios e Tours",
    shortLabel: "Passeios",
    icon: "◌",
    keywords: ["tour", "passeio", "passeios", "excursão", "excursao", "visita", "PASSEIOS_TOURS"],
  },
  {
    id: "business",
    label: "Congressos e Palestras",
    shortLabel: "Congressos",
    icon: "☷",
    keywords: ["congresso", "congressos", "feira", "summit", "palestra", "corporativo", "CONGRESSOS"],
  },
  {
    id: "kids",
    label: "Infantil",
    shortLabel: "Infantil",
    icon: "⌂",
    keywords: ["infantil", "família", "familia", "criança", "crianca", "kids", "INFANTIL"],
  },
];

function toNumber(value?: string | number) {
  if (value === undefined || value === null) return 0;
  const numeric = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isNaN(numeric) ? 0 : numeric;
}

function formatMoney(value?: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(toNumber(value));
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
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
  const cityState = [event?.location?.city, event?.location?.state].filter(Boolean).join(" - ");
  return cityState || event?.location?.venueName || "Local a confirmar";
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
      event.location?.venueName,
      event.location?.city,
      event.location?.state,
    ].join(" "),
  );

  return category.keywords.some((keyword) => haystack.includes(normalizeText(keyword)));
}

function getCategoryForEvent(event: EventItem) {
  return categories.find((category) => eventMatchesCategory(event, category)) || categories[0];
}

function getEventGradient(index: number) {
  const gradients = [
    "from-neutral-950 via-neutral-800 to-neutral-700",
    "from-zinc-950 via-zinc-800 to-stone-700",
    "from-slate-950 via-neutral-900 to-zinc-700",
    "from-neutral-900 via-stone-800 to-black",
    "from-zinc-800 via-neutral-950 to-slate-800",
  ];

  return gradients[index % gradients.length];
}

function buildCollectionUrl(collection: string, title: string) {
  const params = new URLSearchParams();
  params.set("collection", collection);
  params.set("title", title);
  return `/events?${params.toString()}`;
}

function buildViewUrl(view: SectionDefinition["view"], title: string) {
  const params = new URLSearchParams();
  params.set("view", view);
  params.set("title", title);
  return `/events?${params.toString()}`;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
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
  const price = getMinimumPrice(event);
  const category = getCategoryForEvent(event);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-w-0 bg-transparent text-left transition hover:-translate-y-0.5"
    >
      <div className={`relative h-[154px] overflow-hidden rounded-[8px] bg-gradient-to-r ${getEventGradient(index)}`}>
        {image ? (
          <img
            src={image}
            alt={event.name || "Evento"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-neutral-700 shadow-sm">
          {category.shortLabel}
        </span>
      </div>

      <div className="pt-2">
        <h3 className="line-clamp-1 text-[14px] font-black text-neutral-950">
          {event.name || "Evento sem nome"}
        </h3>

        <p className="mt-1 line-clamp-1 text-[12px] text-neutral-500">
          {formatDate(getEventDate(event))}
        </p>

        <p className="mt-1 line-clamp-1 text-[12px] text-neutral-500">
          {getLocationLabel(event)}
        </p>

        <p className="mt-2 text-[12px] font-black text-neutral-950">
          {price === null ? "Consultar valores" : `A partir de ${formatMoney(price)}`}
        </p>
      </div>
    </button>
  );
}

function SectionArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-[72px] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl font-black text-neutral-950 shadow-xl ring-1 ring-neutral-100 transition ${
        direction === "prev" ? "-left-6" : "-right-6"
      } ${disabled ? "cursor-not-allowed opacity-20" : "hover:-translate-y-0.5 hover:bg-neutral-50"}`}
      aria-label={direction === "prev" ? "Voltar página" : "Avançar página"}
    >
      {direction === "prev" ? "‹" : "›"}
    </button>
  );
}

function EventCarouselSection({
  section,
  page,
  onPrevious,
  onNext,
  onSeeAll,
  onOpenEvent,
}: {
  section: SectionDefinition;
  page: number;
  onPrevious: () => void;
  onNext: () => void;
  onSeeAll: () => void;
  onOpenEvent: (event: EventItem) => void;
}) {
  const maxPage = Math.min(MAX_SECTION_PAGE, Math.max(0, Math.ceil(section.events.length / PAGE_SIZE) - 1));
  const safePage = Math.min(page, maxPage);
  const visibleEvents = section.events.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (section.events.length === 0) return null;

  return (
    <section id={section.id} className="mb-11">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-[22px] font-black text-neutral-900">{section.title}</h2>

        <button
          type="button"
          onClick={onSeeAll}
          className="text-[14px] font-black text-neutral-950 hover:text-neutral-600"
        >
          Ver tudo
        </button>
      </div>

      <div className="relative">
        <SectionArrow direction="prev" disabled={safePage <= 0} onClick={onPrevious} />

        <div className="grid grid-cols-4 gap-5">
          {visibleEvents.map((event, index) => (
            <EventCard
              key={`${section.id}-${event.id}`}
              event={event}
              index={safePage * PAGE_SIZE + index}
              onOpen={() => onOpenEvent(event)}
            />
          ))}
        </div>

        <SectionArrow direction="next" disabled={safePage >= maxPage} onClick={onNext} />
      </div>

      <div className="mt-4 flex justify-center gap-1.5">
        {Array.from({ length: maxPage + 1 }).map((_, index) => (
          <span
            key={`${section.id}-dot-${index}`}
            className={`h-1.5 rounded-full transition ${index === safePage ? "w-7 bg-neutral-950" : "w-1.5 bg-neutral-300"}`}
          />
        ))}
      </div>
    </section>
  );
}

function HeroCard({
  event,
  index,
  position,
  onClick,
}: {
  event: EventItem;
  index: number;
  position: -2 | -1 | 0 | 1 | 2;
  onClick: () => void;
}) {
  const image = getEventImage(event);

  const styleByPosition = {
    [-2]: "z-0 -translate-x-[550px] scale-[0.66] opacity-85",
    [-1]: "z-10 -translate-x-[350px] scale-[0.82] opacity-88",
    [0]: "z-30 translate-x-0 scale-100 opacity-100",
    [1]: "z-10 translate-x-[350px] scale-[0.82] opacity-88",
    [2]: "z-0 translate-x-[550px] scale-[0.66] opacity-85",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 overflow-hidden rounded-[8px] bg-neutral-900 shadow-2xl transition-all duration-300 ${styleByPosition[position]}`}
    >
      {image ? (
        <img src={image} alt={event.name || "Evento em destaque"} className="h-full w-full object-cover" />
      ) : (
        <div className={`h-full w-full bg-gradient-to-r ${getEventGradient(index)}`} />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

      {position === 0 ? (
        <div className="absolute bottom-8 left-9 right-9 text-left">
          <p className="text-[12px] font-black uppercase tracking-[0.22em] text-white/70">Destaque</p>
          <h2 className="mt-2 line-clamp-2 text-[42px] font-black leading-none text-white">
            {event.name}
          </h2>
        </div>
      ) : null}
    </button>
  );
}

export default function CustomerDashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageWarning, setPageWarning] = useState("");
  const [search, setSearch] = useState("");
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});

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
        const [eventsRes, ordersRes] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/events`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_BASE_URL}/orders/customer`, {
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

        setPageWarning(warningParts.length ? `Parte da página não carregou agora: ${warningParts.join(", ")}.` : "");
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

  function openEvent(event: EventItem) {
    goTo(`/events/${event.id}`);
  }

  function handleCategoryClick(category: CategoryItem) {
    goTo(buildCollectionUrl(category.id, category.label));
  }

  function setSectionPage(sectionId: string, nextPage: number) {
    setSectionPages((current) => ({
      ...current,
      [sectionId]: Math.max(0, Math.min(MAX_SECTION_PAGE, nextPage)),
    }));
  }

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (first, second) => getTimestamp(getEventDate(first)) - getTimestamp(getEventDate(second)),
    );
  }, [events]);

  const searchedEvents = useMemo(() => {
    return sortedEvents.filter((event) => eventMatchesSearch(event, search));
  }, [sortedEvents, search]);

  const heroEvents = searchedEvents.slice(0, 9);
  const activeHero =
    heroEvents.length > 0 ? heroEvents[activeHeroIndex % heroEvents.length] : undefined;

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
    setActiveHeroIndex((current) => (current === 0 ? heroEvents.length - 1 : current - 1));
  }

  function nextHero() {
    if (heroEvents.length === 0) return;
    setActiveHeroIndex((current) => (current + 1) % heroEvents.length);
  }

  function getHeroEvent(offset: -2 | -1 | 0 | 1 | 2) {
    if (heroEvents.length === 0) return null;
    const nextIndex = (activeHeroIndex + offset + heroEvents.length) % heroEvents.length;
    return { event: heroEvents[nextIndex], index: nextIndex };
  }

  const sections = useMemo<SectionDefinition[]>(() => {
    const mostBought = [...searchedEvents]
      .sort((first, second) => getTotalTicketQuantity(second) - getTotalTicketQuantity(first))
      .slice(0, 36);

    const todayOrSoon = searchedEvents.filter((event) => {
      const timestamp = getTimestamp(getEventDate(event));
      const diffDays = (timestamp - Date.now()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });

    const lastCall = [...searchedEvents]
      .filter((event) => getTimestamp(getEventDate(event)) >= Date.now())
      .sort((first, second) => getTimestamp(getEventDate(first)) - getTimestamp(getEventDate(second)))
      .slice(0, 36);

    return [
      {
        id: "section-most-bought",
        title: "Eventos mais comprados nas últimas 24h",
        view: "most-bought",
        events: mostBought,
      },
      {
        id: "section-today",
        title: "O que fazer hoje",
        view: "today",
        events: todayOrSoon.length > 0 ? todayOrSoon : searchedEvents.slice(0, 36),
      },
      {
        id: "section-last-call",
        title: "Última chamada",
        view: "last-call",
        events: lastCall,
      },
    ].filter((section) => section.events.length > 0);
  }, [searchedEvents]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => order.status === "PENDING" || order.status === "PENDING_PAYMENT");
  }, [orders]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7]">
        <div className="mx-auto max-w-[1240px] px-4 py-10">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-neutral-700">Carregando sua página...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto max-w-[1320px] px-4 pb-16 pt-8">
        {pageWarning ? (
          <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {pageWarning}
          </section>
        ) : null}

        <section className="mb-12 text-center">
          <div className="mx-auto mb-8 grid max-w-[880px] grid-cols-[1fr_170px] gap-4">
            <div className="flex h-14 items-center rounded-[10px] border border-neutral-200 bg-white px-5 shadow-lg shadow-neutral-200/60">
              <span className="mr-3 text-neutral-400">🔎</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar experiências"
                className="w-full bg-transparent text-sm font-semibold text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </div>

            <button
              type="button"
              onClick={() => goTo("/events")}
              className="flex h-14 items-center justify-center gap-2 rounded-[10px] bg-neutral-950 px-4 text-sm font-black text-white shadow-lg shadow-neutral-200/60 hover:bg-neutral-800"
            >
              <span>⌖</span>
              <span>Qualquer lugar</span>
            </button>
          </div>

          <div className="relative mx-auto h-[420px] max-w-[1280px] overflow-hidden">
            {([-2, -1, 0, 1, 2] as const).map((position) => {
              const item = getHeroEvent(position);
              if (!item) return null;

              return (
                <HeroCard
                  key={`${position}-${item.event.id}`}
                  event={item.event}
                  index={item.index}
                  position={position}
                  onClick={() => openEvent(item.event)}
                />
              );
            })}

            <button
              type="button"
              onClick={previousHero}
              className="absolute left-[195px] top-[155px] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-black text-neutral-950 shadow-xl ring-1 ring-neutral-100 transition hover:-translate-y-0.5"
              aria-label="Voltar destaque"
            >
              ‹
            </button>

            <button
              type="button"
              onClick={nextHero}
              className="absolute right-[195px] top-[155px] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-black text-neutral-950 shadow-xl ring-1 ring-neutral-100 transition hover:-translate-y-0.5"
              aria-label="Avançar destaque"
            >
              ›
            </button>
          </div>

          {activeHero ? (
            <div className="mt-2">
              <h1 className="text-[24px] font-black uppercase tracking-tight text-neutral-800">
                {activeHero.name}
              </h1>
              <p className="mt-2 text-sm font-semibold text-neutral-500">
                {getLocationLabel(activeHero)} • {formatDate(getEventDate(activeHero))}
              </p>

              <div className="mt-5 flex justify-center gap-2">
                {heroEvents.map((event, index) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setActiveHeroIndex(index)}
                    className={`h-2 rounded-full transition ${index === activeHeroIndex ? "w-7 bg-neutral-950" : "w-2 bg-neutral-300"}`}
                    aria-label={`Selecionar destaque ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-[24px] font-black text-neutral-900">Explore nossas coleções</h2>

            <button
              type="button"
              onClick={() => goTo("/events")}
              className="text-sm font-black text-neutral-950 hover:text-neutral-600"
            >
              Ver tudo
            </button>
          </div>

          <div className="grid grid-cols-8 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategoryClick(category)}
                className="group flex h-[112px] flex-col items-center justify-center rounded-[10px] border border-neutral-200 bg-white px-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-50 text-[15px] font-black text-neutral-500 ring-1 ring-neutral-200 group-hover:bg-neutral-950 group-hover:text-white">
                  {category.icon}
                </span>

                <span className="mt-3 line-clamp-2 text-[12px] font-black leading-4 text-neutral-500 group-hover:text-neutral-950">
                  {category.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-5 text-[24px] font-black text-neutral-900">Vistos recentemente</h2>

          <div className="grid grid-cols-4 gap-5">
            {searchedEvents.slice(0, 4).map((event, index) => (
              <EventCard
                key={`recent-${event.id}`}
                event={event}
                index={index}
                onOpen={() => openEvent(event)}
              />
            ))}
          </div>
        </section>

        {sections.map((section) => {
          const page = sectionPages[section.id] || 0;
          const maxPage = Math.min(MAX_SECTION_PAGE, Math.max(0, Math.ceil(section.events.length / PAGE_SIZE) - 1));

          return (
            <EventCarouselSection
              key={section.id}
              section={section}
              page={Math.min(page, maxPage)}
              onPrevious={() => setSectionPage(section.id, page - 1)}
              onNext={() => setSectionPage(section.id, page + 1)}
              onSeeAll={() => goTo(buildViewUrl(section.view, section.title))}
              onOpenEvent={openEvent}
            />
          );
        })}

        {pendingOrders.length > 0 ? (
          <section className="mt-10 rounded-[18px] border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
                  Atenção
                </p>
                <h2 className="mt-1 text-[20px] font-black text-neutral-950">
                  Você tem pedidos pendentes
                </h2>
                <p className="mt-1 text-sm font-semibold text-neutral-600">
                  Existem {pendingOrders.length} pedido(s) aguardando ação.
                </p>
              </div>

              <button
                type="button"
                onClick={() => goTo("/orders")}
                className="rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white hover:bg-neutral-800"
              >
                Ver pedidos
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

'@

$LogoBase64 = "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"

Write-Host "Aplicando v48b - Astro logo + dashboard..." -ForegroundColor Cyan

Write-TextFile "apps\web\src\components\customer\CustomerHeader.tsx" $HeaderContent
Write-TextFile "apps\web\src\app\(customer)\layout.tsx" $LayoutContent
Write-TextFile "apps\web\src\app\(customer)\dashboard\page.tsx" $DashboardContent
Write-Base64File "apps\web\public\astro-ingressos-logo.png" $LogoBase64

Write-Host ""
Write-Host "v48b aplicada com sucesso." -ForegroundColor Green
Write-Host "Agora reinicie o web:" -ForegroundColor Cyan
Write-Host 'cd "C:\Users\march\OneDrive\Área de Trabalho\plataforma-ingressos\apps\web"' -ForegroundColor Cyan
Write-Host "npm run dev" -ForegroundColor Cyan
