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
    ? "text-sm font-black text-sky-600"
    : "text-sm font-semibold text-gray-600 hover:text-gray-900";
}

function getMenuItemClasses(isActive: boolean) {
  return isActive
    ? "flex w-full items-center gap-3 rounded-xl bg-sky-50 px-3 py-3 text-left text-sm font-black text-sky-700"
    : "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50";
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
    { label: "Meus ingressos", href: "/orders" },
    { label: "Wallet", href: "/wallet" },
  ];

  const topItems = useMemo(() => {
    if (isAdminArea) return adminTopItems;
    if (isOperatorArea) return operatorTopItems;

    return customerTopItems;
  }, [isAdminArea, isOperatorArea]);

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
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
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

        <div className="border-t border-gray-100 px-2 pb-2 pt-2">
          <button
            type="button"
            onClick={() => handleGo("/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
          <p className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
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

        <div className="border-t border-gray-100 px-2 pb-2 pt-2">
          <button
            type="button"
            onClick={() => handleGo("/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
        <button
          type="button"
          onClick={() => handleGo("/dashboard")}
          className={getMenuItemClasses(activeNav === "dashboard")}
        >
          <span className="w-5 text-center">🏠</span>
          <span>Início</span>
        </button>

        <button
          type="button"
          onClick={() => handleGo("/support")}
          className={getMenuItemClasses(activeNav === "support")}
        >
          <span className="w-5 text-center">💬</span>
          <span>Suporte</span>
        </button>

        <button
          type="button"
          onClick={() => handleGo("/wallet")}
          className={getMenuItemClasses(activeNav === "wallet")}
        >
          <span className="w-5 text-center">👛</span>
          <span>Wallet</span>
        </button>

        {canAccessAdmin ? (
          <button
            type="button"
            onClick={() => handleGo("/admin/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="w-5 text-center">🛠️</span>
            <span>Painel Admin</span>
          </button>
        ) : null}

        {canAccessOperator ? (
          <button
            type="button"
            onClick={() => handleGo("/operator/dashboard")}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="w-5 text-center">🎧</span>
            <span>Painel Operador</span>
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
        <button
          type="button"
          onClick={() => goTo(isAdminArea ? "/admin/dashboard" : "/dashboard")}
          className="shrink-0 text-3xl font-black tracking-tight text-sky-600"
        >
          Sympla
        </button>

        {showSearch ? (
          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="mx-auto flex h-12 w-full max-w-xl items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
              <span className="mr-3 text-gray-400">🔎</span>

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
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
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
              {item.label}
            </button>
          ))}
        </nav>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex h-12 items-center gap-3 rounded-full border border-gray-200 bg-white px-3 shadow-sm hover:bg-gray-50"
          >
            <span className="text-lg">☰</span>

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
              {getInitial(user)}
            </span>
          </button>

          {menuOpen ? (
            <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="border-b border-gray-100 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-gray-900">
                      {user?.name || "Usuário"}
                    </p>

                    <p className="mt-1 break-all text-xs text-gray-500">
                      {user?.email || "-"}
                    </p>

                    {user?.cpf ? (
                      <p className="mt-1 text-xs text-gray-400">
                        CPF: {user.cpf}
                      </p>
                    ) : null}
                  </div>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    {role || "USER"}
                  </span>
                </div>
              </div>

              {isAdminArea
                ? renderAdminMenu()
                : isOperatorArea
                  ? renderOperatorMenu()
                  : renderCustomerMenu()}

              <div className="border-t border-gray-100 p-2">
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
          <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
            <span className="mr-3 text-gray-400">🔎</span>

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
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}