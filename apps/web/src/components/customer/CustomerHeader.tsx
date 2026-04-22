"use client";

import { useState } from "react";

export type CustomerHeaderUser = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type CustomerHeaderProps = {
  user: CustomerHeaderUser | null;
  activeNav?: "dashboard" | "orders" | "wallet";
  showSearch?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

function getInitial(user: CustomerHeaderUser | null) {
  return (user?.name?.[0] || "U").toUpperCase();
}

function goTo(path: string) {
  window.location.href = path;
}

function getTopNavClasses(isActive: boolean) {
  return isActive
    ? "text-sm font-semibold text-sky-600"
    : "text-sm font-medium text-gray-600 hover:text-gray-900";
}

export default function CustomerHeader({
  user,
  activeNav = "dashboard",
  showSearch = false,
  searchPlaceholder = "Buscar",
  searchValue = "",
  onSearchChange,
}: CustomerHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4">
        <button
          type="button"
          onClick={() => goTo("/customer/dashboard")}
          className="shrink-0 text-3xl font-black tracking-tight text-sky-600"
        >
          Sympla
        </button>

        {showSearch ? (
          <div className="hidden flex-1 items-center gap-3 md:flex">
            <div className="flex h-12 flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
              <span className="mr-3 text-gray-400">🔎</span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <nav className="ml-auto hidden items-center gap-5 md:flex">
          <button
            type="button"
            onClick={() => goTo("/customer/orders")}
            className={getTopNavClasses(activeNav === "orders")}
          >
            Meus pedidos
          </button>

          <button
            type="button"
            onClick={() => goTo("/customer/wallet")}
            className={getTopNavClasses(activeNav === "wallet")}
          >
            Wallet
          </button>
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

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="border-b border-gray-100 px-4 py-4">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.name || "Usuário"}
                </p>
                <p className="mt-1 break-all text-xs text-gray-500">
                  {user?.email || "-"}
                </p>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={() => goTo("/customer/dashboard")}
                  className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Início
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/orders")}
                  className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Meus pedidos
                </button>

                <button
                  type="button"
                  onClick={() => goTo("/customer/wallet")}
                  className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Wallet
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSearch ? (
        <div className="mx-auto px-4 pb-4 md:hidden">
          <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-white px-4 shadow-sm">
            <span className="mr-3 text-gray-400">🔎</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}